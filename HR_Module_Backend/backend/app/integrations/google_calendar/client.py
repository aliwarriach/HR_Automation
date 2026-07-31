# app/integrations/google_calendar/client.py
"""Thin wrapper around the Google Calendar API: interview event creation.

Reuses the same OAuth token as the Gmail integration (see
app/integrations/google_auth.py). Transient API errors (429/5xx) are
retried with backoff, same policy as the Gmail client; anything else is
wrapped in CalendarClientError so callers can fail the scheduling flow
cleanly instead of crashing the request.
"""
import logging
import time
from datetime import datetime, timedelta

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.integrations import google_auth

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

_RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


class CalendarClientError(Exception):
    """Raised when the Calendar client cannot authenticate or a call fails after retries."""


def _execute(request, action: str, retries: int = 3, backoff_seconds: float = 1.0):
    for attempt in range(1, retries + 1):
        try:
            return request.execute()
        except HttpError as exc:
            status = getattr(exc.resp, "status", None)
            if status in _RETRYABLE_STATUSES and attempt < retries:
                logger.warning(
                    "%s failed (attempt %d/%d, status %s), retrying...",
                    action, attempt, retries, status,
                )
                time.sleep(backoff_seconds * attempt)
                continue
            raise CalendarClientError(f"{action} failed: {exc}") from exc


def get_calendar_service():
    try:
        creds = google_auth.load_credentials(SCOPES)
    except google_auth.GoogleAuthError as exc:
        raise CalendarClientError(str(exc)) from exc
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def create_interview_event(
    service,
    *,
    summary: str,
    description: str,
    start: datetime,
    candidate_email: str,
    duration_minutes: int,
    timezone_name: str,
) -> dict:
    """Create a Calendar event for an interview.

    sendUpdates is left at Calendar's default ("none") — the candidate gets
    a purpose-written email via the Gmail integration instead, with the
    event's htmlLink included, so they aren't sent two separate invites.
    Returns the created event resource (id, htmlLink, etc.).
    """
    end = start + timedelta(minutes=duration_minutes)
    body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start.isoformat(), "timeZone": timezone_name},
        "end": {"dateTime": end.isoformat(), "timeZone": timezone_name},
        "attendees": [{"email": candidate_email}],
    }
    return _execute(
        service.events().insert(calendarId="primary", body=body),
        "create_interview_event",
    )
