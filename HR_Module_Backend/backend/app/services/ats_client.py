# app/services/ats_client.py
"""Client for the standalone Resume Matcher ATS scoring microservice.

Wraps only the 3 endpoints this project is scoped to use: resume upload,
job description upload, and score. Tailoring/enrichment endpoints
(e.g. /resumes/improve/preview) are intentionally not wrapped here.
"""
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AtsClientError(Exception):
    """Raised for any failure talking to the ATS microservice."""


class AtsResumeNotFoundError(AtsClientError):
    """Raised when the ATS service has no record of the given resume (404)."""


def upload_resume(file_path: str, file_name: str) -> tuple[str, str]:
    """Upload a resume file. Returns (resume_id, processing_status)."""
    content_type = (
        "application/pdf"
        if file_name.lower().endswith(".pdf")
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    try:
        with open(file_path, "rb") as f:
            response = httpx.post(
                f"{settings.ats_base_url}/resumes/upload",
                files={"file": (file_name, f, content_type)},
                timeout=settings.ats_timeout_seconds,
            )
        response.raise_for_status()
        data = response.json()
        return data["resume_id"], data["processing_status"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise AtsClientError(f"Resume upload failed: {exc}") from exc


def upload_job_description(job_description: str) -> str:
    """Upload a job description. Returns job_id."""
    try:
        response = httpx.post(
            f"{settings.ats_base_url}/jobs/upload",
            json={"job_descriptions": [job_description]},
            timeout=settings.ats_timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        return data["job_id"][0]
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        raise AtsClientError(f"Job description upload failed: {exc}") from exc


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


def score_resume(resume_id: str, job_id: str) -> dict:
    """Compute the ATS score for a resume against a job. Returns the `ats_score` payload."""
    try:
        response = httpx.post(
            f"{settings.ats_base_url}/resumes/{resume_id}/score",
            json={"job_id": job_id},
            timeout=settings.ats_timeout_seconds,
        )
        response.raise_for_status()
        return response.json()["ats_score"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise AtsClientError(f"Scoring failed: {exc}") from exc
