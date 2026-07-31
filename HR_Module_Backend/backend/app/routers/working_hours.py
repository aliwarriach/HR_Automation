# app/routers/working_hours.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.database import get_db
from app.models.user import User
from app.schemas.working_hours import WorkingHoursCreate, WorkingHoursOut
from app.services import working_hours_service

router = APIRouter(prefix="/working-hours", tags=["Working Hours"])


@router.get("/", response_model=WorkingHoursOut)
def get_working_hours(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("working_hours", "read")),
):
    return working_hours_service.get_active_config(db)


@router.post("/", response_model=WorkingHoursOut, status_code=status.HTTP_201_CREATED)
def set_working_hours(
    payload: WorkingHoursCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("working_hours", "update")),
):
    try:
        return working_hours_service.create_config(db, payload.start_time, payload.end_time)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
