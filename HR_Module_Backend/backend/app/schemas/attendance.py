# app/schemas/attendance.py
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.models.attendance import AttendanceStatus, BreakType, WorkMode


class CheckInRequest(BaseModel):
    work_mode: WorkMode


class BreakStartRequest(BaseModel):
    break_type: BreakType


class BreakOut(BaseModel):
    id: int
    break_type: BreakType
    start_time: datetime
    end_time: datetime | None

    model_config = ConfigDict(from_attributes=True)


class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    date: date
    check_in_time: datetime | None
    check_out_time: datetime | None
    work_mode: WorkMode | None
    status: AttendanceStatus
    total_working_hours: float | None
    pending_hours: float | None

    model_config = ConfigDict(from_attributes=True)


class AttendanceTodayOut(BaseModel):
    """Status snapshot for today; still meaningful before any attendance row exists."""

    employee_id: int
    date: date
    check_in_time: datetime | None = None
    check_out_time: datetime | None = None
    work_mode: WorkMode | None = None
    status: AttendanceStatus = AttendanceStatus.not_checked_in
    total_working_hours: float | None = None
    pending_hours: float | None = None
    active_break: BreakOut | None = None


# --- HR / Super Admin views -------------------------------------------------

RowStatus = Literal["not_checked_in", "checked_in", "on_break", "checked_out", "on_leave", "absent"]


class DashboardSummaryOut(BaseModel):
    total_employees: int
    present: int
    on_leave: int
    checked_in: int
    checked_out: int


class AttendanceListItemOut(BaseModel):
    employee_id: int
    name: str
    status: RowStatus
    work_mode: WorkMode | None
    check_in_time: datetime | None
    check_out_time: datetime | None
    total_working_hours: float | None
    pending_hours: float | None


class BreakDetailOut(BaseModel):
    break_type: BreakType
    start_time: datetime
    end_time: datetime | None

    model_config = ConfigDict(from_attributes=True)


class EmployeeHistoryDayOut(BaseModel):
    date: date
    check_in_time: datetime | None
    check_out_time: datetime | None
    status: AttendanceStatus
    total_working_hours: float | None
    breaks: list[BreakDetailOut]


class MonthlySummaryOut(BaseModel):
    year: int
    month: int
    expected_hours: float
    completed_hours: float
    # Signed: positive = extra/overtime, negative = pending/deficit. Unlike the
    # per-day AttendanceOut.pending_hours (always a positive magnitude), HR's
    # monthly view needs to distinguish the two directions at a glance.
    pending_or_extra_hours: float


class EmployeeInfoOut(BaseModel):
    id: int
    name: str
    email: str
    designation: str | None

    model_config = ConfigDict(from_attributes=True)


class EmployeeAttendanceDetailOut(BaseModel):
    employee: EmployeeInfoOut
    history: list[EmployeeHistoryDayOut]
    monthly_summary: MonthlySummaryOut
