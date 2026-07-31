# app/schemas/shortlist.py
from datetime import date, datetime, time

from pydantic import BaseModel


class ShortlistCreate(BaseModel):
    resume_id: int


class ShortlistStatusUpdate(BaseModel):
    status: str


class ScheduleInterviewRequest(BaseModel):
    interview_date: date
    interview_time: time
    candidate_name: str | None = None


class ShortlistOut(BaseModel):
    id: int
    resume_id: int
    role: str | None
    status: str
    interview_date: date | None = None
    interview_time: time | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ShortlistDetailOut(ShortlistOut):
    """Adds resume file + ATS score, only needed on the detail view."""

    file_name: str | None = None
    ats_score: float | None = None
    google_event_link: str | None = None
