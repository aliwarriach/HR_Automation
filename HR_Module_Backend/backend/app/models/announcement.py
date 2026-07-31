# app/models/announcement.py
import enum

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func

from app.database import Base


class AnnouncementTargetRole(str, enum.Enum):
    all = "all"
    super_admin = "super_admin"
    hr = "hr"
    manager = "manager"
    employee = "employee"


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    target_roles = Column(Text, nullable=False)  # JSON-encoded list[AnnouncementTargetRole]
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    publish_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    # Hard delete is used for removal (see routers/announcements.py), so this
    # never flips to False in practice - kept only because it's part of the
    # specified data model.
    is_active = Column(Boolean, nullable=False, default=True)
    # Set once the target-audience notification email has gone out (at
    # creation time if publish_at is now/past, or by the background sweep
    # once a scheduled publish_at arrives). Null = not sent yet. This is the
    # guard that makes notification one-time-only, even across edits and
    # repeated scheduler sweeps - see announcement_service.py.
    notified_at = Column(DateTime(timezone=True), nullable=True)
