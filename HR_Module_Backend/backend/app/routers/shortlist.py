# app/routers/shortlist.py
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.config import settings
from app.database import get_db
from app.models.resume import Resume
from app.models.shortlist import Shortlist
from app.models.user import User
from app.schemas.shortlist import (
    ScheduleInterviewRequest,
    ShortlistCreate,
    ShortlistDetailOut,
    ShortlistOut,
    ShortlistStatusUpdate,
)
from app.services.interview_service import InterviewSchedulingError, schedule_interview

router = APIRouter(prefix="/shortlist", tags=["Shortlist"])


def _get_shortlist_or_404(shortlist_id: int, db: Session) -> Shortlist:
    entry = db.query(Shortlist).filter(Shortlist.id == shortlist_id).first()
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shortlisted candidate not found")
    return entry


@router.post("/", response_model=ShortlistOut, status_code=status.HTTP_201_CREATED)
def create_shortlist(
    payload: ShortlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("candidates", "create")),
):
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")

    existing = db.query(Shortlist).filter(Shortlist.resume_id == payload.resume_id).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Resume already shortlisted")

    duplicate_email = (
        db.query(Shortlist)
        .join(Resume, Resume.id == Shortlist.resume_id)
        .filter(Resume.sender_email == resume.sender_email)
        .first()
    )
    if duplicate_email:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"A candidate with email '{resume.sender_email}' is already shortlisted",
        )

    entry = Shortlist(resume_id=resume.id, role=resume.role)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/", response_model=list[ShortlistOut])
def list_shortlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("candidates", "read")),
):
    return db.query(Shortlist).order_by(Shortlist.created_at.desc()).all()


@router.get("/{shortlist_id}", response_model=ShortlistDetailOut)
def get_shortlist(
    shortlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("candidates", "read")),
):
    entry = _get_shortlist_or_404(shortlist_id, db)
    resume = db.query(Resume).filter(Resume.id == entry.resume_id).first()
    return ShortlistDetailOut(
        id=entry.id,
        resume_id=entry.resume_id,
        role=entry.role,
        status=entry.status,
        interview_date=entry.interview_date,
        interview_time=entry.interview_time,
        created_at=entry.created_at,
        file_name=resume.file_name if resume else None,
        ats_score=resume.ats_score if resume else None,
        google_event_link=entry.google_event_link,
    )


@router.post("/{shortlist_id}/interview", response_model=ShortlistDetailOut)
def schedule_interview_endpoint(
    shortlist_id: int,
    payload: ScheduleInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("candidates", "update")),
):
    """Create the Calendar event, email the candidate, and move status to 'interview'."""
    entry = _get_shortlist_or_404(shortlist_id, db)
    resume = db.query(Resume).filter(Resume.id == entry.resume_id).first()
    if not resume:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found for this candidate")

    interview_start = datetime.combine(payload.interview_date, payload.interview_time).replace(
        tzinfo=ZoneInfo(settings.interview_timezone)
    )

    try:
        schedule_interview(db, entry, resume, interview_start, candidate_name=payload.candidate_name)
    except InterviewSchedulingError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Failed to schedule interview ({exc.stage} step): {exc}",
        ) from exc

    return ShortlistDetailOut(
        id=entry.id,
        resume_id=entry.resume_id,
        role=entry.role,
        status=entry.status,
        interview_date=entry.interview_date,
        interview_time=entry.interview_time,
        created_at=entry.created_at,
        file_name=resume.file_name,
        ats_score=resume.ats_score,
        google_event_link=entry.google_event_link,
    )


@router.patch("/{shortlist_id}", response_model=ShortlistOut)
def update_shortlist_status(
    shortlist_id: int,
    payload: ShortlistStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("candidates", "update")),
):
    entry = _get_shortlist_or_404(shortlist_id, db)
    entry.status = payload.status
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{shortlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shortlist(
    shortlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("candidates", "delete")),
):
    entry = _get_shortlist_or_404(shortlist_id, db)
    db.delete(entry)
    db.commit()
