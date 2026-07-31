"""Working-hours math for the Attendance module.

Kept out of the router so the check-out endpoint stays thin and the
monthly rollup (needed for future payroll/reporting features) has a
single source of truth for what "pending" and "extra" hours mean.
"""
from datetime import datetime

from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.models.attendance import Attendance, AttendanceStatus
from app.services import working_hours_service


def _total_break_hours(attendance: Attendance) -> float:
    total_seconds = sum(
        (br.end_time - br.start_time).total_seconds()
        for br in attendance.breaks
        if br.end_time is not None
    )
    return total_seconds / 3600


def calculate_working_hours(attendance: Attendance, check_out_time: datetime) -> float:
    """Both timestamps are naive UTC (see app/routers/attendance.py) — SQLite drops
    tzinfo on read-back, so mixing aware/naive datetimes here would raise."""
    gross_hours = (check_out_time - attendance.check_in_time).total_seconds() / 3600
    worked_hours = gross_hours - _total_break_hours(attendance)
    return round(max(worked_hours, 0.0), 2)


def calculate_pending_hours(worked_hours: float, expected_hours: float) -> float:
    """Positive distance from the configured workday, whichever side it falls on."""
    return round(abs(worked_hours - expected_hours), 2)


def get_monthly_summary(db: Session, employee_id: int, year: int, month: int) -> dict:
    records = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            extract("year", Attendance.date) == year,
            extract("month", Attendance.date) == month,
        )
        .all()
    )

    expected_hours = working_hours_service.get_hours_per_day(db)

    days_present = 0
    days_on_leave = 0
    total_worked_hours = 0.0
    total_pending_hours = 0.0
    total_extra_hours = 0.0

    for record in records:
        if record.status == AttendanceStatus.on_leave:
            days_on_leave += 1
            continue
        if record.total_working_hours is None:
            continue

        days_present += 1
        total_worked_hours += record.total_working_hours
        if record.total_working_hours < expected_hours:
            total_pending_hours += expected_hours - record.total_working_hours
        elif record.total_working_hours > expected_hours:
            total_extra_hours += record.total_working_hours - expected_hours

    return {
        "year": year,
        "month": month,
        "days_present": days_present,
        "days_on_leave": days_on_leave,
        "total_worked_hours": round(total_worked_hours, 2),
        "total_pending_hours": round(total_pending_hours, 2),
        "total_extra_hours": round(total_extra_hours, 2),
    }
