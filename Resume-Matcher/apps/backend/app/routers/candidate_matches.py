"""Candidate-to-job-posting AI matching endpoints.

Bridges this app's existing tailoring/ATS pipeline to the host application's
own ``resumes`` (Gmail-ingested candidate files) and ``job_postings`` tables.
Scoring only — candidate resumes are never rewritten or persisted here.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.database import db
from app.schemas.candidate_matches import (
    CandidateMatchCreateRequest,
    CandidateMatchListResponse,
    CandidateMatchResponse,
)
from app.services.candidate_matching import compute_candidate_match

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/candidate-matches", tags=["Candidate Matching"])


def _to_response(match: dict) -> CandidateMatchResponse:
    return CandidateMatchResponse(
        id=match["id"],
        resume_id=match["resume_id"],
        job_posting_id=match["job_posting_id"],
        status=match["status"],
        overall_score=match["overall_score"],
        sub_scores={
            "keyword_match": match["keyword_match_score"],
            "skills_coverage": match["skills_coverage_score"],
            "section_completeness": match["section_completeness_score"],
        },
        missing_keywords=match["missing_keywords"],
        injectable_keywords=match["injectable_keywords"],
        recommendations=match["recommendations"],
        error_message=match["error_message"],
        created_at=match["created_at"],
        updated_at=match["updated_at"],
    )


@router.post("", response_model=CandidateMatchResponse)
async def create_candidate_match(
    request: CandidateMatchCreateRequest,
) -> CandidateMatchResponse:
    """Score a candidate resume (host app) against a job posting (host app).

    Validates both IDs against the host app's own tables, then runs the
    existing parse -> keyword-extraction -> ATS-scoring pipeline. A match for
    the same (resume_id, job_posting_id) pair is deduped and re-scored in
    place rather than duplicated.
    """
    host_resume = await db.get_host_resume(request.resume_id)
    if not host_resume:
        raise HTTPException(status_code=404, detail="Candidate resume not found")

    host_job_posting = await db.get_host_job_posting(request.job_posting_id)
    if not host_job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")

    match = await db.create_pending_candidate_match(
        resume_id=request.resume_id, job_posting_id=request.job_posting_id
    )
    match = await db.update_candidate_match(match["id"], {"status": "processing"})

    try:
        ats_result = await asyncio.wait_for(
            compute_candidate_match(
                resume_file_path=host_resume["file_path"],
                job_requirements=host_job_posting["requirements"],
            ),
            timeout=settings.request_timeout_seconds,
        )
    except asyncio.TimeoutError:
        logger.error(
            "Candidate match timed out after %ss for resume=%s job_posting=%s",
            settings.request_timeout_seconds,
            request.resume_id,
            request.job_posting_id,
        )
        await db.update_candidate_match(
            match["id"], {"status": "failed", "error_message": "Match timed out"}
        )
        raise HTTPException(status_code=504, detail="Candidate match timed out. Please try again.")
    except FileNotFoundError as e:
        logger.error("Candidate match failed, resume file missing: %s", e)
        await db.update_candidate_match(
            match["id"],
            {"status": "failed", "error_message": "Candidate resume file not found"},
        )
        raise HTTPException(status_code=404, detail="Candidate resume file not found on disk")
    except Exception as e:
        logger.error(
            "Candidate match failed for resume=%s job_posting=%s: %s",
            request.resume_id,
            request.job_posting_id,
            e,
        )
        await db.update_candidate_match(
            match["id"],
            {
                "status": "failed",
                "error_message": "Failed to compute candidate match. Please try again.",
            },
        )
        raise HTTPException(status_code=500, detail="Failed to compute candidate match. Please try again.")

    updated = await db.update_candidate_match(
        match["id"],
        {
            "status": "ready",
            "overall_score": ats_result["overall_score"],
            "keyword_match_score": ats_result["sub_scores"]["keyword_match"],
            "skills_coverage_score": ats_result["sub_scores"]["skills_coverage"],
            "section_completeness_score": ats_result["sub_scores"]["section_completeness"],
            "missing_keywords": ats_result["missing_keywords"],
            "injectable_keywords": ats_result["injectable_keywords"],
            "recommendations": ats_result["recommendations"],
            "error_message": None,
        },
    )
    assert updated is not None
    return _to_response(updated)


@router.get("/{match_id}", response_model=CandidateMatchResponse)
async def get_candidate_match(match_id: int) -> CandidateMatchResponse:
    """Fetch a single candidate match result by its ID."""
    match = await db.get_candidate_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Candidate match not found")
    return _to_response(match)


@router.get("", response_model=CandidateMatchListResponse)
async def list_candidate_matches(
    job_posting_id: int | None = Query(None),
    resume_id: int | None = Query(None),
) -> CandidateMatchListResponse:
    """List candidate matches, optionally filtered by job posting or resume."""
    matches = await db.list_candidate_matches(
        job_posting_id=job_posting_id, resume_id=resume_id
    )
    return CandidateMatchListResponse(matches=[_to_response(m) for m in matches])
