# app/integrations/gmail/client.py
"""Thin wrapper around the Gmail API: auth, message listing, and attachment fetch.

Token refresh is handled transparently on every call site that needs a
service instance (`get_gmail_service`). Transient API errors (429/5xx) are
retried with backoff; anything else is wrapped in `GmailClientError` so
callers can log-and-continue without crashing the poller.
"""
import base64
import logging
import time
from email.mime.text import MIMEText

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import settings
from app.integrations import google_auth

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

_RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


class GmailClientError(Exception):
    """Raised when the Gmail client cannot authenticate or a call fails after retries."""


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
            raise GmailClientError(f"{action} failed: {exc}") from exc


def get_gmail_service():
    try:
        creds = google_auth.load_credentials(SCOPES)
    except google_auth.GoogleAuthError as exc:
        raise GmailClientError(str(exc)) from exc
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def list_new_messages(service) -> list[dict]:
    response = _execute(
        service.users().messages().list(userId="me", q=settings.gmail_query),
        "list_messages",
    )
    return response.get("messages", [])


def get_message(service, message_id: str) -> dict:
    return _execute(
        service.users().messages().get(userId="me", id=message_id, format="full"),
        f"get_message({message_id})",
    )


def get_attachment_data(service, message_id: str, attachment_id: str) -> bytes:
    attachment = _execute(
        service.users().messages().attachments().get(
            userId="me", messageId=message_id, id=attachment_id
        ),
        f"get_attachment({message_id}, {attachment_id})",
    )
    return base64.urlsafe_b64decode(attachment["data"])


def send_email(service, to: str, subject: str, body_text: str) -> dict:
    message = MIMEText(body_text)
    message["to"] = to
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return _execute(
        service.users().messages().send(userId="me", body={"raw": raw}),
        f"send_email({to})",
    )


def mark_as_read(service, message_id: str) -> None:
    try:
        _execute(
            service.users().messages().modify(
                userId="me", id=message_id, body={"removeLabelIds": ["UNREAD"]}
            ),
            f"mark_as_read({message_id})",
        )
    except GmailClientError:
        logger.warning("Failed to mark message %s as read; it may be reprocessed next poll.", message_id)


def extract_pdf_attachments(payload: dict) -> list[dict]:
    """Walk MIME parts recursively and return metadata for PDF attachments."""
    attachments: list[dict] = []

    def walk(part: dict) -> None:
        filename = part.get("filename") or ""
        body = part.get("body", {})
        if filename.lower().endswith(".pdf") and body.get("attachmentId"):
            attachments.append({"filename": filename, "attachment_id": body["attachmentId"]})
        for sub_part in part.get("parts", []) or []:
            walk(sub_part)

    walk(payload)
    return attachments


def get_header(payload: dict, name: str) -> str | None:
    for header in payload.get("headers", []):
        if header["name"].lower() == name.lower():
            return header["value"]
    return None


def extract_sender_email(from_header: str) -> str:
    """Extract the bare address from a From header like 'Name <email@x.com>'."""
    if "<" in from_header and ">" in from_header:
        return from_header.split("<", 1)[1].split(">", 1)[0].strip()
    return from_header.strip()
