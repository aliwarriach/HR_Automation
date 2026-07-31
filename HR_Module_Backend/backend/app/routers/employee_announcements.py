# app/routers/employee_announcements.py
"""Read-only announcement feed for employees. No create/edit/delete - see
routers/announcements.py for the HR/Super Admin management API."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import forbid_roles
from app.core.permissions import has_permission
from app.database import get_db
from app.models.announcement import Announcement
from app.models.user import User, UserRole
from app.schemas.announcement import EmployeeAnnouncementDetailOut, EmployeeAnnouncementListItemOut
from app.services import announcement_service

router = APIRouter(prefix="/employee/announcements", tags=["Employee Announcements"])


@router.get("/", response_model=list[EmployeeAnnouncementListItemOut])
def list_my_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(forbid_roles(UserRole.super_admin)),
):
    if not has_permission(current_user, "announcements", "view_own"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")
    return announcement_service.list_announcements_for_employee(db, current_user.role)


@router.get("/{announcement_id}", response_model=EmployeeAnnouncementDetailOut)
def get_my_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(forbid_roles(UserRole.super_admin)),
):
    if not has_permission(current_user, "announcements", "view_own"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")

    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement or not announcement_service.visible_to_employee(announcement, current_user.role):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Announcement not found")
    return announcement_service.serialize_for_employee_detail(db, announcement)
