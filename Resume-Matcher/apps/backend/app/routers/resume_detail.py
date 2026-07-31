"""Resume Detail summary endpoint for a host-app candidate resume.

Bridges this app's parsing/LLM pipeline to the host application's own
``resumes`` (Gmail-ingested candidate files) table. Read-only summary fields
for a Resume Detail page — never rewrites or persists the candidate's resume.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.database import db
from app.schemas.candidate_matches import ResumeDetailResponse
from app.services.resume_detail import compute_resume_detail

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resume-detail", tags=["Resume Detail"])


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
async def get_resume_detail(resume_id: int) -> ResumeDetailResponse:
    """Extract Resume Detail summary fields for a host-app candidate resume.

    ``resume_id`` is the host app's own integer ``resumes.id`` (Gmail-ingested
    candidate file), not this app's own String resume IDs used elsewhere.
    """
    host_resume = await db.get_host_resume(resume_id)
    if not host_resume:
        raise HTTPException(status_code=404, detail="Candidate resume not found")

    try:
        detail = await asyncio.wait_for(
            compute_resume_detail(resume_file_path=host_resume["file_path"]),
            timeout=settings.request_timeout_seconds,
        )
    except asyncio.TimeoutError:
        logger.error("Resume detail extraction timed out for resume=%s", resume_id)
        raise HTTPException(
            status_code=504, detail="Resume detail extraction timed out. Please try again."
        )
    except FileNotFoundError as e:
        logger.error("Resume detail extraction failed, resume file missing: %s", e)
        raise HTTPException(status_code=404, detail="Candidate resume file not found on disk")
    except Exception as e:
        logger.error("Resume detail extraction failed for resume=%s: %s", resume_id, e)
        raise HTTPException(
            status_code=500, detail="Failed to extract resume detail. Please try again."
        )

    return ResumeDetailResponse(resume_id=resume_id, data=detail)
