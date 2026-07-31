"""Extract Resume Detail page summary fields for an HR-ingested candidate resume.

Bridges this app's parsing/LLM pipeline to the host application's own
``resumes`` table, mirroring ``candidate_matching.py``. Read-only: never
rewrites or persists the candidate's resume.
"""

import logging
from typing import Any

from app.llm import complete_json, get_llm_config, get_model_name, get_safe_max_tokens
from app.prompts import RESUME_DETAIL_EXTRACTION_PROMPT
from app.prompts.templates import RESUME_DETAIL_SCHEMA_EXAMPLE
from app.schemas.models import ResumeDetailInfo
from app.services.candidate_matching import resolve_host_file_path
from app.services.parser import parse_document

logger = logging.getLogger(__name__)


async def extract_resume_detail_fields(markdown_text: str) -> dict[str, Any]:
    """Run a targeted LLM extraction for the Resume Detail summary fields."""
    prompt = RESUME_DETAIL_EXTRACTION_PROMPT.format(
        schema=RESUME_DETAIL_SCHEMA_EXAMPLE,
        resume_text=markdown_text,
    )

    config = get_llm_config()
    model_name = get_model_name(config)
    result = await complete_json(
        prompt=prompt,
        system_prompt="You are a JSON extraction engine. Output only valid JSON, no explanations.",
        max_tokens=get_safe_max_tokens(model_name),
        retries=3,
        schema_type="keywords",
    )

    validated = ResumeDetailInfo.model_validate(result)
    return validated.model_dump()


async def compute_resume_detail(*, resume_file_path: str) -> dict[str, Any]:
    """Parse a host-app candidate resume file and extract its detail summary.

    Raises FileNotFoundError if the resume file is missing, and whatever
    ``parse_document``/``extract_resume_detail_fields`` raise on parse/LLM
    failure — the caller is responsible for turning those into an HTTP error.
    """
    resolved_path = resolve_host_file_path(resume_file_path)
    if not resolved_path.is_file():
        raise FileNotFoundError(f"Candidate resume file not found: {resolved_path}")

    file_bytes = resolved_path.read_bytes()
    markdown = await parse_document(file_bytes, resolved_path.name)
    return await extract_resume_detail_fields(markdown)
