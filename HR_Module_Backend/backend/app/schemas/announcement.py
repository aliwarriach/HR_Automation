# app/schemas/announcement.py
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.announcement import AnnouncementTargetRole

AnnouncementStatus = Literal["scheduled", "active", "expired"]


def _to_naive_utc(value: datetime) -> datetime:
    """Normalize to naive UTC so comparisons against datetime.utcnow() (used
    everywhere else in this codebase, see attendance module) are apples-to-apples."""
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_roles: list[AnnouncementTargetRole]
    publish_at: datetime | None = None
    expires_at: datetime | None = None

    @field_validator("title", "content")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value

    @field_validator("target_roles")
    @classmethod
    def non_empty_roles(cls, value: list[AnnouncementTargetRole]) -> list[AnnouncementTargetRole]:
        if not value:
            raise ValueError("target_roles must include at least one role")
        return value

    @field_validator("publish_at", "expires_at")
    @classmethod
    def normalize_datetime(cls, value: datetime | None) -> datetime | None:
        return _to_naive_utc(value) if value else value

    @model_validator(mode="after")
    def check_expiry_after_publish(self) -> "AnnouncementCreate":
        publish_at = self.publish_at or datetime.utcnow()
        if self.expires_at and self.expires_at <= publish_at:
            raise ValueError("expires_at must be after publish_at")
        return self


class AnnouncementUpdate(BaseModel):
    """Partial update; expires_at/publish_at consistency is re-checked against
    the merged (existing + incoming) state in the service layer, since a PUT
    may only touch one of the two fields."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    content: str | None = None
    target_roles: list[AnnouncementTargetRole] | None = None
    publish_at: datetime | None = None
    expires_at: datetime | None = None

    @field_validator("title", "content")
    @classmethod
    def not_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("must not be blank")
        return value

    @field_validator("target_roles")
    @classmethod
    def non_empty_roles(
        cls, value: list[AnnouncementTargetRole] | None
    ) -> list[AnnouncementTargetRole] | None:
        if value is not None and not value:
            raise ValueError("target_roles must include at least one role")
        return value

    @field_validator("publish_at", "expires_at")
    @classmethod
    def normalize_datetime(cls, value: datetime | None) -> datetime | None:
        return _to_naive_utc(value) if value else value


class AnnouncementListItemOut(BaseModel):
    id: int
    title: str
    target_roles: list[AnnouncementTargetRole]
    created_by: int
    created_at: datetime
    publish_at: datetime
    expires_at: datetime | None
    status: AnnouncementStatus


class AnnouncementDetailOut(BaseModel):
    id: int
    title: str
    content: str
    target_roles: list[AnnouncementTargetRole]
    created_by: int
    created_at: datetime
    publish_at: datetime
    expires_at: datetime | None
    status: AnnouncementStatus


class EmployeeAnnouncementListItemOut(BaseModel):
    id: int
    title: str
    content_preview: str
    publish_at: datetime
    created_by_name: str


class EmployeeAnnouncementDetailOut(BaseModel):
    id: int
    title: str
    content: str
    publish_at: datetime
    expires_at: datetime | None
    created_by_name: str
