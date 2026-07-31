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


def _match_role(subject: str | None, db: Session) -> tuple[str | None, str | None]:
    """Match an email subject against known job posting roles.

    Subject is slugified the same way job posting titles are, then each
    known role is checked as a substring of the subject slug so wording
    like "Application for Senior Backend Engineer" or punctuation/case
    variants still match. Ties broken by picking the longest role match.

    Returns (role, job_description) — job_description is the matched
    posting's `requirements` text, kept alongside role for ATS scoring.
    """
    if not subject:
        return None, None

    subject_slug = _slugify(subject)
    if not subject_slug:
        return None, None

    postings = db.query(JobPosting.title, JobPosting.requirements).distinct()

    best_role = None
    best_description = None
    best_len = 0
    for title, requirements in postings:
        role = _slugify(title)
        if not role:
            continue
        if role in subject_slug and len(role) > best_len:
            best_role = role
            best_description = requirements
            best_len = len(role)

    return best_role, best_description


def run_ats_scoring(db: Session, resume: Resume) -> None:
    """Upload a resume+JD to the ATS microservice and cache the resulting score.

    Best-effort: any failure is logged and leaves ats_status="failed" rather
    than raising, so scoring problems never block resume ingestion. Safe to
    call again later (e.g. via a retry endpoint) since /score is idempotent;
    upload steps are only redone here, matching current row state.
    """
    if not resume.job_description:
        return  # nothing to score against yet; stays "pending"

    try:
        ats_resume_id, processing_status = ats_client.upload_resume(resume.file_path, resume.file_name)
    except ats_client.AtsClientError:
        logger.exception("ATS resume upload failed for resume %s", resume.id)
        resume.ats_status = "failed"
        db.commit()
        return

    resume.ats_resume_id = ats_resume_id
    if processing_status != "ready":
        resume.ats_status = "failed"
        db.commit()
        logger.error("ATS resume %s not ready for resume %s: status=%s", ats_resume_id, resume.id, processing_status)
        return

    try:
        job_id = ats_client.upload_job_description(resume.job_description)
        ats_score = ats_client.score_resume(ats_resume_id, job_id)
    except ats_client.AtsClientError:
        logger.exception("ATS scoring failed for resume %s", resume.id)
        resume.ats_status = "failed"
        db.commit()
        return

    resume.ats_job_id = job_id
    resume.ats_score = ats_score.get("overall_score")
    resume.ats_missing_keywords = json.dumps(ats_score.get("missing_keywords") or [])
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
    role, job_description = _match_role(subject, db)

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
