# app/services/interview_service.py
"""Orchestrates interview scheduling: Calendar event, candidate email, DB status.

Entry point is `schedule_interview`, called from the shortlist router when
HR picks a date/time on the candidate detail page and clicks Interview.
Calendar and email calls happen before any DB write — if either external
call fails, the shortlist row is left untouched (still "shortlisted") and
InterviewSchedulingError is raised with the failing stage so the API layer
can report a specific, actionable error.
"""
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.config import settings
from app.integrations.gmail import client as gmail_client
from app.integrations.gmail.client import GmailClientError
from app.integrations.google_calendar import client as calendar_client
from app.integrations.google_calendar.client import CalendarClientError
from app.models.resume import Resume
from app.models.shortlist import Shortlist, ShortlistStatus

logger = logging.getLogger(__name__)


class InterviewSchedulingError(Exception):
    """Raised when the calendar or email step fails. `stage` is 'calendar' or 'email'."""

    def __init__(self, stage: str, message: str):
        self.stage = stage
        super().__init__(message)


def _build_email(candidate_name: str | None, role: str | None, interview_start: datetime, event_link: str) -> tuple[str, str]:
    greeting_name = candidate_name or "there"
    role_label = role.replace("-", " ").title() if role else "the position"
    subject = f"Interview Scheduled - {role_label}"
    date_str = interview_start.strftime("%A, %B %d, %Y")
    time_str = interview_start.strftime("%I:%M %p %Z").strip()

    body = (
        f"Hi {greeting_name},\n\n"
        f"Your interview for {role_label} is confirmed:\n\n"
        f"Date: {date_str}\n"
        f"Time: {time_str}\n\n"
        f"Calendar invite: {event_link}\n\n"
        "Please reply here if you need to reschedule.\n\n"
        "Best regards,\nHiring Team"
    )
    return subject, body


def schedule_interview(
    db: Session,
    shortlist: Shortlist,
    resume: Resume,
    interview_start: datetime,
    candidate_name: str | None = None,
) -> Shortlist:
    role_label = resume.role or "the position"

    try:
        calendar_service = calendar_client.get_calendar_service()
        event = calendar_client.create_interview_event(
            calendar_service,
            summary=f"Interview: {candidate_name or resume.sender_email} ({role_label})",
            description=f"Interview for {role_label} with {candidate_name or resume.sender_email}.",
            start=interview_start,
            candidate_email=resume.sender_email,
            duration_minutes=settings.interview_duration_minutes,
            timezone_name=settings.interview_timezone,
        )
    except CalendarClientError as exc:
        logger.exception("Calendar event creation failed for shortlist %s", shortlist.id)
        raise InterviewSchedulingError("calendar", str(exc)) from exc

    event_link = event.get("htmlLink", "")
    subject, body = _build_email(candidate_name, resume.role, interview_start, event_link)

    try:
        gmail_service = gmail_client.get_gmail_service()
        gmail_client.send_email(gmail_service, resume.sender_email, subject, body)
    except GmailClientError as exc:
        logger.exception("Interview email failed for shortlist %s", shortlist.id)
        raise InterviewSchedulingError("email", str(exc)) from exc

    shortlist.interview_date = interview_start.date()
    shortlist.interview_time = interview_start.time()
    shortlist.google_event_id = event.get("id")
    shortlist.google_event_link = event_link
    shortlist.status = ShortlistStatus.interview
    db.commit()
    db.refresh(shortlist)
    return shortlist
