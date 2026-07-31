# app/models/working_hours.py
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, Time, func

from app.database import Base


class WorkingHoursConfig(Base):
    """Global working-hours policy (same for every employee). Only one row is
    active at a time — creating a new config deactivates the previous one."""

    __tablename__ = "working_hours_config"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    hours_per_day = Column(Float, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
