# app/routers/attendance.py
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import forbid_roles, require_permission
from app.core.permissions import has_permission
from app.database import get_db
from app.models.attendance import Attendance, AttendanceStatus, Break, WorkMode
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceListItemOut,
    AttendanceOut,
    AttendanceTodayOut,
    BreakOut,
    BreakStartRequest,
    CheckInRequest,
    DashboardSummaryOut,
    EmployeeAttendanceDetailOut,
)
from app.services import attendance_admin_service, attendance_service, working_hours_service

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def _get_today_attendance(employee_id: int, db: Session) -> Attendance | None:
    return (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.date == date.today())
        .first()
    )


def _get_today_attendance_or_404(employee_id: int, db: Session) -> Attendance:
    attendance = _get_today_attendance(employee_id, db)
    if not attendance:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not checked in today")
    return attendance


def _active_break(attendance: Attendance) -> Break | None:
    return next((br for br in attendance.breaks if br.end_time is None), None)


@router.post("/check-in", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def check_in(
    payload: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(forbid_roles(UserRole.super_admin)),
):
    required_action = "check_in_wfh" if payload.work_mode == WorkMode.wfh else "check_in_onsite"
    if not has_permission(current_user, "attendance", required_action):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")

    attendance = _get_today_attendance(current_user.id, db)

    if attendance and attendance.status == AttendanceStatus.on_leave:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot check in - marked on leave today")
    if attendance and attendance.status != AttendanceStatus.not_checked_in:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Already checked in today")

    if attendance is None:
        attendance = Attendance(employee_id=current_user.id, date=date.today())
        db.add(attendance)

    attendance.check_in_time = datetime.utcnow()
    attendance.work_mode = payload.work_mode
    attendance.status = AttendanceStatus.checked_in
    db.commit()
    db.refresh(attendance)
    return attendance


@router.post("/check-out", response_model=AttendanceOut)
def check_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(forbid_roles(UserRole.super_admin)),
):
    if not has_permission(current_user, "attendance", "check_out"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")

    attendance = _get_today_attendance_or_404(current_user.id, db)
    if attendance.status != AttendanceStatus.checked_in:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot check out - not currently checked in")

    now = datetime.utcnow()
    expected_hours = working_hours_service.get_hours_per_day(db)
    attendance.check_out_time = now
    attendance.total_working_hours = attendance_service.calculate_working_hours(attendance, now)
    attendance.pending_hours = attendance_service.calculate_pending_hours(
        attendance.total_working_hours, expected_hours
    )
    attendance.status = AttendanceStatus.checked_out
    db.commit()
    db.refresh(attendance)
    return attendance


@router.post("/break/start", response_model=BreakOut, status_code=status.HTTP_201_CREATED)
def start_break(
    payload: BreakStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(forbid_roles(UserRole.super_admin)),
):
    if not has_permission(current_user, "attendance", "start_break"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")

    attendance = _get_today_attendance_or_404(current_user.id, db)
    if attendance.status != AttendanceStatus.checked_in:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Must be checked in to start a break")

    br = Break(
        attendance_id=attendance.id,
        break_type=payload.break_type,
        start_time=datetime.utcnow(),
    )
    attendance.status = AttendanceStatus.on_break
    db.add(br)
    db.commit()
    db.refresh(br)
    return br


@router.post("/break/end", response_model=BreakOut)
def end_break(
    db: Session = Depends(get_db),
    current_user: User = Depends(forbid_roles(UserRole.super_admin)),
):
    if not has_permission(current_user, "attendance", "end_break"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")

    attendance = _get_today_attendance_or_404(current_user.id, db)
    if attendance.status != AttendanceStatus.on_break:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No active break")

    active = _active_break(attendance)
    if not active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No active break")

    active.end_time = datetime.utcnow()
    attendance.status = AttendanceStatus.checked_in
    db.commit()
    db.refresh(active)
    return active


@router.post("/leave", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def mark_leave(
    db: Session = Depends(get_db),
    current_user: User = Depends(forbid_roles(UserRole.super_admin)),
):
    if not has_permission(current_user, "attendance", "mark_leave"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")

    attendance = _get_today_attendance(current_user.id, db)
    if attendance and attendance.status != AttendanceStatus.not_checked_in:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot mark leave - attendance already recorded today")

    if attendance is None:
        attendance = Attendance(employee_id=current_user.id, date=date.today())
        db.add(attendance)

    attendance.status = AttendanceStatus.on_leave
    db.commit()
    db.refresh(attendance)
    return attendance


@router.get("/today", response_model=AttendanceTodayOut)
def get_today_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(forbid_roles(UserRole.super_admin)),
):
    if not has_permission(current_user, "attendance", "view_own"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")

    attendance = _get_today_attendance(current_user.id, db)
    if not attendance:
        return AttendanceTodayOut(employee_id=current_user.id, date=date.today())

    return AttendanceTodayOut(
        employee_id=attendance.employee_id,
        date=attendance.date,
        check_in_time=attendance.check_in_time,
        check_out_time=attendance.check_out_time,
        work_mode=attendance.work_mode,
        status=attendance.status,
        total_working_hours=attendance.total_working_hours,
        pending_hours=attendance.pending_hours,
        active_break=_active_break(attendance),
    )


@router.get("/history", response_model=list[AttendanceOut])
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(forbid_roles(UserRole.super_admin)),
):
    if not has_permission(current_user, "attendance", "view_own"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")

    return (
        db.query(Attendance)
        .filter(Attendance.employee_id == current_user.id)
        .order_by(Attendance.date.desc())
        .all()
    )


# --- HR / Super Admin --------------------------------------------------------
# Registered before the dynamic "/{employee_id}" route below so literal paths
# like "/dashboard" and "/list" are matched first.


@router.get("/dashboard", response_model=DashboardSummaryOut)
def get_dashboard(
    target_date: date = Query(default_factory=date.today, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance", "view_all")),
):
    return attendance_admin_service.get_dashboard_summary(db, target_date)


@router.get("/list", response_model=list[AttendanceListItemOut])
def list_attendance(
    target_date: date = Query(default_factory=date.today, alias="date"),
    row_status: str | None = Query(default=None, alias="status"),
    department: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance", "view_all")),
):
    return attendance_admin_service.get_attendance_list(db, target_date, row_status, department, search)


@router.get("/{employee_id}", response_model=EmployeeAttendanceDetailOut)
def get_employee_attendance_detail(
    employee_id: int,
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance", "view_all")),
):
    today = date.today()
    detail = attendance_admin_service.get_employee_detail(
        db, employee_id, year or today.year, month or today.month
    )
    if not detail:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    return detail
