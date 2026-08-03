# app/services/ats_client.py
"""Client for the standalone Resume Matcher ATS scoring microservice.

The ATS service reads our resumes/job_postings rows directly out of our
shared SQLite file (see EXTERNAL_DB_PATH in its own config) keyed off our
own integer IDs, so no upload step is needed - we just pass IDs. Wraps only
the 2 endpoints this project is scoped to use: candidate matching and resume
detail. Tailoring/enrichment endpoints (e.g. /resumes/improve/preview) are
intentionally not wrapped here.
"""
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AtsClientError(Exception):
    """Raised for any failure talking to the ATS microservice."""


class AtsResumeNotFoundError(AtsClientError):
    """Raised when the ATS service has no record of the given resume (404)."""


def create_candidate_match(resume_id: int, job_posting_id: int) -> dict:
    """Score `resume_id` (our own resumes.id) against `job_posting_id` (our
    own job_postings.id). Returns the match payload: overall_score,
    sub_scores, missing_keywords, injectable_keywords, recommendations."""
    try:
        response = httpx.post(
            f"{settings.ats_base_url}/candidate-matches",
            json={"resume_id": resume_id, "job_posting_id": job_posting_id},
            timeout=settings.ats_timeout_seconds,
        )
        if response.status_code == 404:
            detail = response.json().get("detail", "Candidate resume or job posting not found")
            raise AtsResumeNotFoundError(detail)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise AtsClientError(f"Candidate match failed: {exc}") from exc


def fetch_resume_detail(resume_id: int) -> dict:
    """Fetch LLM-extracted summary fields (name, university, CGPA, etc.) for a resume.

    `resume_id` is our own resumes.id, same id already passed to /candidate-matches.
    Raises AtsResumeNotFoundError on a 404 (candidate or its file missing upstream).
    """
    try:
        response = httpx.get(
            f"{settings.ats_base_url}/resume-detail/{resume_id}",
            timeout=settings.ats_timeout_seconds,
        )
        if response.status_code == 404:
            detail = response.json().get("detail", "Candidate resume not found")
            raise AtsResumeNotFoundError(detail)
        response.raise_for_status()
        return response.json()["data"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise AtsClientError(f"Resume detail extraction failed: {exc}") from exc
