# app/models/shortlist.py
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Time, UniqueConstraint, func

from app.database import Base


class Shortlist(Base):
    __tablename__ = "shortlisted_candidates"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    role = Column(String, nullable=True)
    status = Column(String, nullable=False, default="shortlisted", server_default="shortlisted")
    interview_date = Column(Date, nullable=True)
    interview_time = Column(Time, nullable=True)
    google_event_id = Column(String, nullable=True)
    google_event_link = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("resume_id", name="uq_shortlist_resume_id"),)
