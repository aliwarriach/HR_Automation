# app/models/resume.py
from sqlalchemy import Column, ForeignKey, Integer, String, Text, DateTime, Float, func

from app.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String, nullable=False, index=True)
    sender_email = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=True)
    role = Column(String, nullable=True, index=True)
    job_description = Column(Text, nullable=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"), nullable=True)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ATS scoring (Resume Matcher microservice, /candidate-matches - looks
    # this row and job_posting_id up directly from our shared SQLite file,
    # no upload step or ATS-side IDs needed).
    ats_score = Column(Float, nullable=True)
    ats_missing_keywords = Column(Text, nullable=True)  # JSON-encoded list[str]
    ats_status = Column(String, nullable=False, default="pending", server_default="pending")
