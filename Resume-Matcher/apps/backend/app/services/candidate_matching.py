"""Score an HR-ingested candidate resume against a job posting.

Bridges this app's tailoring/ATS pipeline to the host application's own
``resumes`` and ``job_postings`` tables. This only *scores* the resume as-is —
it never rewrites or tailors the candidate's content.
"""

import logging
from pathlib import Path
from typing import Any

from app.config import settings
from app.services.improver import extract_job_keywords
from app.services.parser import parse_document, parse_resume_to_json
from app.services.refiner import analyze_keyword_gaps
from app.services.ats import compute_ats_score

logger = logging.getLogger(__name__)


def resolve_host_file_path(file_path: str) -> Path:
    """Resolve a (possibly relative) path from the host app's ``resumes`` table.

    The host app's ``file_path`` values are relative to its own working
    directory, not this process's. Relative paths are resolved against the
    directory containing the shared SQLite file, which is that app's project
    root by convention.
    """
    path = Path(file_path)
    if path.is_absolute():
        return path
    return settings.sqlite_path.parent / path


async def compute_candidate_match(
    *,
    resume_file_path: str,
    job_requirements: str,
) -> dict[str, Any]:
    """Compute an ATS-style match score for one candidate resume vs one job posting.

    Reuses the existing parse -> keyword-extraction -> ATS-scoring pipeline
    (``parser.py``, ``improver.py``, ``refiner.py``, ``ats.py``) as-is.

    Raises FileNotFoundError if the resume file is missing, and whatever
    ``parse_document``/``parse_resume_to_json``/``extract_job_keywords`` raise
    on parse/LLM failure — the caller is responsible for turning those into a
    ``candidate_matches.status = "failed"`` row.
    """
    resolved_path = resolve_host_file_path(resume_file_path)
    if not resolved_path.is_file():
        raise FileNotFoundError(f"Candidate resume file not found: {resolved_path}")

    file_bytes = resolved_path.read_bytes()
    markdown = await parse_document(file_bytes, resolved_path.name)
    resume_data = await parse_resume_to_json(markdown)

    job_keywords = await extract_job_keywords(job_requirements)

    # No separate master resume exists for an HR-ingested candidate, so pass
    # the same resume for both slots — "injectable" (present in master, absent
    # from tailored) is naturally empty since there is nothing to tailor here.
    gap_analysis = analyze_keyword_gaps(job_keywords, resume_data, resume_data)

    return compute_ats_score(
        refined_resume=resume_data,
        job_keywords=job_keywords,
        keyword_match_percentage=gap_analysis.current_match_percentage,
        missing_keywords=gap_analysis.non_injectable_keywords,
        injectable_keywords=gap_analysis.injectable_keywords,
    )
