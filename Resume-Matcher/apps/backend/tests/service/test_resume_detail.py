"""Service tests for Resume Detail field extraction (LLM mocked)."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.resume_detail import extract_resume_detail_fields


class TestExtractResumeDetailFields:
    @patch("app.services.resume_detail.complete_json", new_callable=AsyncMock)
    async def test_normalizes_full_response(self, mock_complete):
        mock_complete.return_value = {
            "candidate_name": "Jane Doe",
            "university": "MIT",
            "education_status": "Graduate",
            "cgpa": "3.9/4.0",
            "current_city": "Boston, MA",
            "total_experience_years": 1.5,
            "headline_role": "Backend Engineer",
            "headline_company": "Acme Corp",
        }

        result = await extract_resume_detail_fields("# Jane Doe\n...")

        assert result["candidate_name"] == "Jane Doe"
        assert result["cgpa"] == "3.9/4.0"
        assert result["total_experience_years"] == 1.5

    @patch("app.services.resume_detail.complete_json", new_callable=AsyncMock)
    async def test_coerces_missing_fields_to_safe_defaults(self, mock_complete):
        mock_complete.return_value = {
            "candidate_name": None,
            "university": None,
            "education_status": None,
            "cgpa": None,
            "current_city": None,
            "total_experience_years": None,
            "headline_role": None,
            "headline_company": None,
        }

        result = await extract_resume_detail_fields("# No details resume")

        assert result["candidate_name"] == ""
        assert result["cgpa"] == "N/A"
        assert result["total_experience_years"] == 0.0
