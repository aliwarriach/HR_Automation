# app/services/resume_ingestion_service.py
"""Orchestrates polling Gmail and ingesting resume PDF attachments.

Entry point is `poll_and_ingest`, intended to be called by the background
scheduler (app/core/scheduler.py) on its own DB session — never from a
request handler. A failure on one message is logged and does not stop the
rest of the batch from being processed.
"""
import json
import logging
import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.file_storage import is_valid_pdf, save_pdf
from app.integrations.gmail import client as gmail_client
from app.integrations.gmail.client import GmailClientError
from app.models.job_posting import JobPosting
from app.models.resume import Resume
from app.services import ats_client

logger = logging.getLogger(__name__)


def _slugify(text: str) -> str:
    """Normalize to the same 'role' convention used by /job-postings/ (lowercase, hyphen-separated)."""
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return slug.strip("-")


def _match_role(subject: str | None, db: Session) -> tuple[str | None, str | None, int | None]:
    """Match an email subject against known job posting roles.

    Subject is slugified the same way job posting titles are, then each
    known role is checked as a substring of the subject slug so wording
    like "Application for Senior Backend Engineer" or punctuation/case
    variants still match. Ties broken by picking the longest role match.

    Returns (role, job_description, job_posting_id) — job_description is the
    matched posting's `requirements` text (kept for display), job_posting_id
    is what ATS scoring actually needs (see run_ats_scoring).
    """
    if not subject:
        return None, None, None

    subject_slug = _slugify(subject)
    if not subject_slug:
        return None, None, None

    postings = db.query(JobPosting.id, JobPosting.title, JobPosting.requirements).distinct()

    best_role = None
    best_description = None
    best_id = None
    best_len = 0
    for posting_id, title, requirements in postings:
        role = _slugify(title)
        if not role:
            continue
        if role in subject_slug and len(role) > best_len:
            best_role = role
            best_description = requirements
            best_id = posting_id
            best_len = len(role)

    return best_role, best_description, best_id


def run_ats_scoring(db: Session, resume: Resume) -> None:
    """Score a resume against its matched job posting via the ATS
    microservice's /candidate-matches endpoint. That endpoint reads the
    resume file and job requirements directly out of our shared SQLite file
    (see EXTERNAL_DB_PATH in the ATS service's config) keyed off our own
    resumes.id/job_postings.id — no upload step needed.

    Best-effort: any failure is logged and leaves ats_status="failed" rather
    than raising, so scoring problems never block resume ingestion. Safe to
    call again later (e.g. via a retry endpoint) since a match for the same
    (resume_id, job_posting_id) pair is re-scored in place, not duplicated.
    """
    if not resume.job_posting_id:
        return  # no matched job posting to score against yet; stays "pending"

    try:
        match = ats_client.create_candidate_match(resume.id, resume.job_posting_id)
    except ats_client.AtsClientError:
        logger.exception("ATS scoring failed for resume %s", resume.id)
        resume.ats_status = "failed"
        # Clear any stale score from a prior successful attempt - a failed
        # re-score must not leave "failed" paired with an old passing score.
        resume.ats_score = None
        resume.ats_missing_keywords = None
        db.commit()
        return

    resume.ats_score = match.get("overall_score")
    resume.ats_missing_keywords = json.dumps(match.get("missing_keywords") or [])
    resume.ats_status = "scored"
    db.commit()


def _already_processed(db: Session, message_id: str) -> bool:
    return db.query(Resume.id).filter(Resume.message_id == message_id).first() is not None


def _process_message(db: Session, service, message_id: str) -> list[Resume]:
    message = gmail_client.get_message(service, message_id)
    payload = message.get("payload", {})

    attachments = gmail_client.extract_pdf_attachments(payload)
    if not attachments:
        gmail_client.mark_as_read(service, message_id)
        return []

    from_header = gmail_client.get_header(payload, "From") or ""
    sender_email = gmail_client.extract_sender_email(from_header)
    subject = gmail_client.get_header(payload, "Subject")
    received_at = datetime.fromtimestamp(int(message["internalDate"]) / 1000, tz=timezone.utc)
    role, job_description, job_posting_id = _match_role(subject, db)

    saved: list[Resume] = []
    for attachment in attachments:
        try:
            data = gmail_client.get_attachment_data(service, message_id, attachment["attachment_id"])
        except GmailClientError:
            logger.exception(
                "Skipping unreadable attachment %s on message %s", attachment["filename"], message_id
            )
            continue

        if not is_valid_pdf(data):
            logger.warning(
                "Skipping corrupted/non-PDF attachment %s on message %s", attachment["filename"], message_id
            )
            continue

        file_name, file_path = save_pdf(data, attachment["filename"])
        resume = Resume(
            message_id=message_id,
            sender_email=sender_email,
            subject=subject,
            role=role,
            job_description=job_description,
            job_posting_id=job_posting_id,
            file_name=file_name,
            file_path=file_path,
            received_at=received_at,
        )
        db.add(resume)
        saved.append(resume)

    db.commit()
    for resume in saved:
        db.refresh(resume)
        run_ats_scoring(db, resume)
    gmail_client.mark_as_read(service, message_id)
    logger.info("Processed message %s: saved %d resume(s) from %s", message_id, len(saved), sender_email)
    return saved


def poll_and_ingest(db: Session) -> list[Resume]:
    """Fetch unread Gmail messages, extract PDF resumes, and persist metadata.

    Returns the Resume rows created during this call (empty list if none).
    """
    new_resumes: list[Resume] = []

    try:
        service = gmail_client.get_gmail_service()
    except GmailClientError as exc:
        logger.error("Gmail polling skipped: %s", exc)
        return new_resumes

    try:
        messages = gmail_client.list_new_messages(service)
    except GmailClientError as exc:
        logger.error("Gmail polling failed while listing messages: %s", exc)
        return new_resumes

    for message_ref in messages:
        message_id = message_ref["id"]
        if _already_processed(db, message_id):
            continue
        try:
            new_resumes.extend(_process_message(db, service, message_id))
        except Exception:
            db.rollback()
            logger.exception("Failed to process message %s", message_id)

    return new_resumes
