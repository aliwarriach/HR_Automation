# app/routers/announcements.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementDetailOut,
    AnnouncementListItemOut,
    AnnouncementStatus,
    AnnouncementUpdate,
)
from app.services import announcement_service

router = APIRouter(prefix="/announcements", tags=["Announcements"])


def _get_announcement_or_404(announcement_id: int, db: Session) -> Announcement:
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Announcement not found")
    return announcement


@router.post("/", response_model=AnnouncementDetailOut, status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("announcements", "create")),
):
    announcement = announcement_service.create_announcement(
        db,
        created_by=current_user.id,
        title=payload.title,
        content=payload.content,
        target_roles=[role.value for role in payload.target_roles],
        publish_at=payload.publish_at,
        expires_at=payload.expires_at,
    )
    return announcement_service.serialize(announcement)


@router.get("/", response_model=list[AnnouncementListItemOut])
def list_announcements(
    status_filter: AnnouncementStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("announcements", "read")),
):
    return announcement_service.list_announcements(db, status_filter, search)


@router.get("/{announcement_id}", response_model=AnnouncementDetailOut)
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("announcements", "read")),
):
    announcement = _get_announcement_or_404(announcement_id, db)
    return announcement_service.serialize(announcement)


@router.put("/{announcement_id}", response_model=AnnouncementDetailOut)
def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("announcements", "update")),
):
    announcement = _get_announcement_or_404(announcement_id, db)

    updates = payload.model_dump(exclude_unset=True)
    if "target_roles" in updates:
        updates["target_roles"] = [role.value for role in payload.target_roles]

    try:
        announcement = announcement_service.update_announcement(db, announcement, updates)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return announcement_service.serialize(announcement)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("announcements", "delete")),
):
    announcement = _get_announcement_or_404(announcement_id, db)
    db.delete(announcement)
    db.commit()
