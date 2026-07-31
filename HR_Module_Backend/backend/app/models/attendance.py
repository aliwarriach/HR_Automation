# app/models/attendance.py
import enum

from sqlalchemy import Column, Date, DateTime, Enum, Float, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class WorkMode(str, enum.Enum):
    wfh = "wfh"
    onsite = "onsite"


class AttendanceStatus(str, enum.Enum):
    not_checked_in = "not_checked_in"
    checked_in = "checked_in"
    on_break = "on_break"
    checked_out = "checked_out"
    on_leave = "on_leave"


class BreakType(str, enum.Enum):
    tea = "tea"
    prayer = "prayer"
    meeting = "meeting"


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    work_mode = Column(Enum(WorkMode), nullable=True)
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.not_checked_in)
    total_working_hours = Column(Float, nullable=True)
    pending_hours = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    breaks = relationship("Break", back_populates="attendance", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("employee_id", "date", name="uq_attendance_employee_date"),)


class Break(Base):
    __tablename__ = "attendance_breaks"

    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendance.id"), nullable=False)
    break_type = Column(Enum(BreakType), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)

    attendance = relationship("Attendance", back_populates="breaks")
