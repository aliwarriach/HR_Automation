# app/services/announcement_service.py
"""HR/Super Admin company announcements. Status (scheduled/active/expired) is
never persisted - it's always derived from publish_at/expires_at against the
current time, so it's correct immediately with no background job needed to
flip it.

Target-audience email notification is a one-time action tied to an
announcement actually going live (see `notified_at` on the model): if
publish_at is now/past at creation time, the email goes out inline in the
same request (best-effort - see `_notify_recipients`). If publish_at is in
the future, nothing is sent at creation time; `send_due_notifications` is
polled periodically by the scheduler (app/core/scheduler.py) and catches it
once publish_at arrives. Editing an announcement never re-sends - only the
first transition into "active" ever triggers a notification.
"""
import json
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.integrations.gmail import client as gmail_client
from app.integrations.gmail.client import GmailClientError
from app.models.announcement import Announcement, AnnouncementTargetRole
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def _status(announcement: Announcement) -> str:
    now = datetime.utcnow()
    if now < announcement.publish_at:
        return "scheduled"
    if announcement.expires_at and now > announcement.expires_at:
        return "expired"
    return "active"


def serialize(announcement: Announcement) -> dict:
    return {
        "id": announcement.id,
        "title": announcement.title,
        "content": announcement.content,
        "target_roles": json.loads(announcement.target_roles),
        "created_by": announcement.created_by,
        "created_at": announcement.created_at,
        "publish_at": announcement.publish_at,
        "expires_at": announcement.expires_at,
        "status": _status(announcement),
    }


def _resolve_recipients(db: Session, target_roles: list[str]) -> list[User]:
    if AnnouncementTargetRole.all.value in target_roles:
        return db.query(User).all()
    roles = [UserRole(role) for role in target_roles]
    return db.query(User).filter(User.role.in_(roles)).all()


def _build_notification_email(announcement: Announcement) -> tuple[str, str]:
    subject = f"New Announcement: {announcement.title}"
    body = (
        f"{announcement.title}\n\n"
        f"{announcement.content}\n\n"
        "This is an automated notification from the HR Automation Panel."
    )
    return subject, body


def _notify_recipients(db: Session, announcement: Announcement) -> None:
    """Best-effort: a failed or unreachable Gmail integration must never block
    an announcement from being created/published, same policy as the
    employee welcome email (see routers/employees.py)."""
    recipients = _resolve_recipients(db, json.loads(announcement.target_roles))
    subject, body = _build_notification_email(announcement)

    try:
        service = gmail_client.get_gmail_service()
    except GmailClientError:
        logger.exception("Gmail unavailable - skipping notification for announcement %s", announcement.id)
        return

    for recipient in recipients:
        try:
            gmail_client.send_email(service, recipient.email, subject, body)
        except GmailClientError:
            logger.exception(
                "Notification email failed for announcement %s -> %s", announcement.id, recipient.email
            )

    announcement.notified_at = datetime.utcnow()
    db.commit()


def create_announcement(
    db: Session,
    created_by: int,
    title: str,
    content: str,
    target_roles: list[str],
    publish_at: datetime | None,
    expires_at: datetime | None,
) -> Announcement:
    effective_publish_at = publish_at or datetime.utcnow()
    announcement = Announcement(
        title=title,
        content=content,
        target_roles=json.dumps(target_roles),
        created_by=created_by,
        publish_at=effective_publish_at,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    if effective_publish_at <= datetime.utcnow():
        _notify_recipients(db, announcement)

    return announcement


def send_due_notifications(db: Session) -> None:
    """Scheduler entry point: catches announcements whose publish_at has
    arrived since creation (i.e. they were scheduled for the future)."""
    due = (
        db.query(Announcement)
        .filter(Announcement.notified_at.is_(None), Announcement.publish_at <= datetime.utcnow())
        .all()
    )
    for announcement in due:
        _notify_recipients(db, announcement)


def list_announcements(db: Session, status_filter: str | None, search: str | None) -> list[dict]:
    query = db.query(Announcement)
    if search:
        query = query.filter(Announcement.title.ilike(f"%{search}%"))
    announcements = query.order_by(Announcement.id.desc()).all()

    rows = [serialize(a) for a in announcements]
    if status_filter:
        rows = [row for row in rows if row["status"] == status_filter]
    return rows


_PREVIEW_LENGTH = 150


def _content_preview(content: str) -> str:
    if len(content) <= _PREVIEW_LENGTH:
        return content
    return content[:_PREVIEW_LENGTH].rstrip() + "..."


def visible_to_employee(announcement: Announcement, role: UserRole) -> bool:
    """Targeting + time-window check shared by the employee list and detail
    endpoints, so a role can never reach an announcement via direct ID lookup
    that it wouldn't also see in its own feed."""
    target_roles = json.loads(announcement.target_roles)
    if AnnouncementTargetRole.all.value not in target_roles and role.value not in target_roles:
        return False

    now = datetime.utcnow()
    if announcement.publish_at > now:
        return False
    if announcement.expires_at and now > announcement.expires_at:
        return False
    return True


def _created_by_name(db: Session, announcement: Announcement) -> str:
    creator = db.query(User).filter(User.id == announcement.created_by).first()
    return creator.name if creator else "Unknown"


def serialize_for_employee_list(db: Session, announcement: Announcement) -> dict:
    return {
        "id": announcement.id,
        "title": announcement.title,
        "content_preview": _content_preview(announcement.content),
        "publish_at": announcement.publish_at,
        "created_by_name": _created_by_name(db, announcement),
    }


def serialize_for_employee_detail(db: Session, announcement: Announcement) -> dict:
    return {
        "id": announcement.id,
        "title": announcement.title,
        "content": announcement.content,
        "publish_at": announcement.publish_at,
        "expires_at": announcement.expires_at,
        "created_by_name": _created_by_name(db, announcement),
    }


def list_announcements_for_employee(db: Session, role: UserRole) -> list[dict]:
    announcements = db.query(Announcement).order_by(Announcement.publish_at.desc()).all()
    visible = [a for a in announcements if visible_to_employee(a, role)]
    return [serialize_for_employee_list(db, a) for a in visible]


def update_announcement(db: Session, announcement: Announcement, updates: dict) -> Announcement:
    if "target_roles" in updates:
        updates["target_roles"] = json.dumps(updates["target_roles"])

    for field, value in updates.items():
        setattr(announcement, field, value)

    if announcement.expires_at and announcement.expires_at <= announcement.publish_at:
        db.rollback()
        raise ValueError("expires_at must be after publish_at")

    db.commit()
    db.refresh(announcement)
    return announcement
