"""Pydantic schemas for candidate-to-job-posting AI matching.

``resume_id`` / ``job_posting_id`` throughout this module are the *host app's*
integer IDs (its own ``resumes.id`` / ``job_postings.id``) — not this app's own
String resume/job IDs used everywhere else in this codebase.
"""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.models import ATSSubScores, ResumeDetailInfo

CandidateMatchStatus = Literal["pending", "processing", "ready", "failed"]


class CandidateMatchCreateRequest(BaseModel):
    """Request to score one candidate resume against one job posting."""

    resume_id: int
    job_posting_id: int


class CandidateMatchResponse(BaseModel):
    """A single candidate/job-posting match result."""

    id: int
    resume_id: int
    job_posting_id: int
    status: CandidateMatchStatus
    overall_score: float = Field(default=0.0, ge=0.0, le=100.0)
    sub_scores: ATSSubScores = Field(default_factory=ATSSubScores)
    missing_keywords: list[str] = Field(default_factory=list)
    injectable_keywords: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    error_message: str | None = None
    created_at: str
    updated_at: str


class CandidateMatchListResponse(BaseModel):
    """Response for listing candidate matches."""

    matches: list[CandidateMatchResponse]


class ResumeDetailResponse(BaseModel):
    """Response for the Resume Detail summary of a host-app candidate resume."""

    resume_id: int
    data: ResumeDetailInfo
