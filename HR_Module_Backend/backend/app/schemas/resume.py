# app/schemas/resume.py
import json
from datetime import datetime
from pydantic import BaseModel, field_validator


class ResumeOut(BaseModel):
    id: int
    message_id: str
    sender_email: str
    subject: str | None
    role: str | None
    job_description: str | None
    file_name: str
    file_path: str
    received_at: datetime
    created_at: datetime

    ats_score: float | None
    ats_missing_keywords: list[str] | None
    ats_status: str

    class Config:
        from_attributes = True

    @field_validator("ats_missing_keywords", mode="before")
    @classmethod
    def parse_missing_keywords(cls, value):
        if isinstance(value, str):
            return json.loads(value)
        return value


class ResumeDetailFields(BaseModel):
    """LLM-extracted summary fields from the Resume Matcher /resume-detail endpoint."""

    candidate_name: str
    university: str
    education_status: str
    cgpa: str
    current_city: str
    total_experience_years: float
    headline_role: str
    headline_company: str
