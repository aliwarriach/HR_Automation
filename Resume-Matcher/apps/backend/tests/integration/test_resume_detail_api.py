"""Integration tests for the Resume Detail summary endpoint."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def client():
    from app.main import app

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


class TestGetResumeDetail:
    """GET /api/v1/resume-detail/{resume_id}"""

    @patch("app.routers.resume_detail.compute_resume_detail", new_callable=AsyncMock)
    @patch("app.routers.resume_detail.db", new_callable=AsyncMock)
    async def test_returns_extracted_detail(self, mock_db, mock_compute, client):
        mock_db.get_host_resume.return_value = {
            "id": 42,
            "file_path": "uploads/2026-01-01/resume.pdf",
        }
        mock_compute.return_value = {
            "candidate_name": "Jane Doe",
            "university": "University of California",
            "education_status": "Graduate",
            "cgpa": "3.8",
            "current_city": "San Francisco, CA",
            "total_experience_years": 2.5,
            "headline_role": "Senior Software Engineer",
            "headline_company": "Tech Corp",
        }

        async with client:
            resp = await client.get("/api/v1/resume-detail/42")

        assert resp.status_code == 200
        body = resp.json()
        assert body["resume_id"] == 42
        assert body["data"]["candidate_name"] == "Jane Doe"
        assert body["data"]["total_experience_years"] == 2.5
        mock_compute.assert_awaited_once_with(
            resume_file_path="uploads/2026-01-01/resume.pdf"
        )

    @patch("app.routers.resume_detail.db", new_callable=AsyncMock)
    async def test_missing_host_resume_returns_404(self, mock_db, client):
        mock_db.get_host_resume.return_value = None

        async with client:
            resp = await client.get("/api/v1/resume-detail/999")

        assert resp.status_code == 404
        assert "Candidate resume not found" in resp.json()["detail"]

    @patch("app.routers.resume_detail.compute_resume_detail", new_callable=AsyncMock)
    @patch("app.routers.resume_detail.db", new_callable=AsyncMock)
    async def test_missing_file_returns_404(self, mock_db, mock_compute, client):
        mock_db.get_host_resume.return_value = {"id": 1, "file_path": "gone.pdf"}
        mock_compute.side_effect = FileNotFoundError("gone.pdf")

        async with client:
            resp = await client.get("/api/v1/resume-detail/1")

        assert resp.status_code == 404
        assert "file not found on disk" in resp.json()["detail"]

    @patch("app.routers.resume_detail.compute_resume_detail", new_callable=AsyncMock)
    @patch("app.routers.resume_detail.db", new_callable=AsyncMock)
    async def test_llm_failure_returns_500(self, mock_db, mock_compute, client):
        mock_db.get_host_resume.return_value = {"id": 1, "file_path": "resume.pdf"}
        mock_compute.side_effect = RuntimeError("llm boom")

        async with client:
            resp = await client.get("/api/v1/resume-detail/1")

        assert resp.status_code == 500
