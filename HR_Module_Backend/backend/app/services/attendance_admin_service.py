"""HR / Super Admin views over attendance: cross-employee dashboard, filtered
list, and a single employee's history + monthly rollup. Kept separate from
attendance_service.py, which holds the employee-facing self-service calculations
that only ever look at the current user's own records.

A day with no Attendance row for an employee means no action was ever taken
that day, which the admin views surface as the derived status "absent" — the
app never persists a row with status=not_checked_in (rows are only created on
first check-in or leave), so "no row" and "not_checked_in" are equivalent in
practice, but the schema still allows both per the module spec.
"""
from calendar import monthrange
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.attendance import Attendance, AttendanceStatus
from app.models.user import User
from app.services import working_hours_service


def _row_status(attendance: Attendance | None) -> str:
    return attendance.status.value if attendance else "absent"


def get_dashboard_summary(db: Session, target_date: date) -> dict:
    total_employees = db.query(User).count()
    records = db.query(Attendance).filter(Attendance.date == target_date).all()

    # "on_break" has no dedicated bucket in the dashboard shape, so it's folded
    # into "checked_in" (still clocked in / at work, just not currently active).
    checked_in = sum(
        1 for r in records if r.status in (AttendanceStatus.checked_in, AttendanceStatus.on_break)
    )
    checked_out = sum(1 for r in records if r.status == AttendanceStatus.checked_out)
    on_leave = sum(1 for r in records if r.status == AttendanceStatus.on_leave)

    return {
        "total_employees": total_employees,
        "present": checked_in + checked_out,
        "on_leave": on_leave,
        "checked_in": checked_in,
        "checked_out": checked_out,
    }


def get_attendance_list(
    db: Session,
    target_date: date,
    status: str | None = None,
    department: str | None = None,
    search: str | None = None,
) -> list[dict]:
    query = db.query(User)
    if department:
        # No dedicated "department" field on User yet — filtered via `designation`.
        query = query.filter(User.designation.ilike(f"%{department}%"))
    if search:
        query = query.filter(User.name.ilike(f"%{search}%"))
    employees = query.order_by(User.id).all()

    attendance_by_employee = {
        a.employee_id: a for a in db.query(Attendance).filter(Attendance.date == target_date).all()
    }

    rows = []
    for employee in employees:
        attendance = attendance_by_employee.get(employee.id)
        row_status = _row_status(attendance)
        if status and row_status != status:
            continue

        rows.append(
            {
                "employee_id": employee.id,
                "name": employee.name,
                "status": row_status,
                "work_mode": attendance.work_mode if attendance else None,
                "check_in_time": attendance.check_in_time if attendance else None,
                "check_out_time": attendance.check_out_time if attendance else None,
                "total_working_hours": attendance.total_working_hours if attendance else None,
                "pending_hours": attendance.pending_hours if attendance else None,
            }
        )
    return rows


def _working_days_elapsed(month_start: date, month_end: date) -> int:
    """Count of weekdays (Mon-Fri) between month_start and month_end (inclusive),
    capped at today — days that haven't happened yet can't count against
    expected hours."""
    range_end = min(month_end, date.today())
    if range_end < month_start:
        return 0

    count = 0
    current = month_start
    while current <= range_end:
        if current.weekday() < 5:
            count += 1
        current += timedelta(days=1)
    return count


def get_employee_detail(db: Session, employee_id: int, year: int, month: int) -> dict | None:
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        return None

    month_start = date(year, month, 1)
    month_end = date(year, month, monthrange(year, month)[1])

    records = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.date >= month_start,
            Attendance.date <= month_end,
        )
        .order_by(Attendance.date)
        .all()
    )

    history = [
        {
            "date": record.date,
            "check_in_time": record.check_in_time,
            "check_out_time": record.check_out_time,
            "status": record.status,
            "total_working_hours": record.total_working_hours,
            "breaks": [
                {
                    "break_type": br.break_type,
                    "start_time": br.start_time,
                    "end_time": br.end_time,
                }
                for br in record.breaks
            ],
        }
        for record in records
    ]

    hours_per_day = working_hours_service.get_hours_per_day(db)
    working_days = _working_days_elapsed(month_start, month_end)
    expected_hours = round(working_days * hours_per_day, 2)
    completed_hours = round(sum(r.total_working_hours or 0.0 for r in records), 2)

    return {
        "employee": employee,
        "history": history,
        "monthly_summary": {
            "year": year,
            "month": month,
            "expected_hours": expected_hours,
            "completed_hours": completed_hours,
            "pending_or_extra_hours": round(completed_hours - expected_hours, 2),
        },
    }
