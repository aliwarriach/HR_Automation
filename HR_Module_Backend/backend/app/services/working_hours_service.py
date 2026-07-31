"""Global working-hours configuration.

Single source of truth for "expected hours per day", used by the attendance
pending/extra calculations. Per the module spec, if HR has never configured
working hours yet, the system defaults to a 9:00-17:00 (8h) day — rather than
faking that default in memory on every read, the first access lazily persists
it as the one active row, so `is_active` truly always has exactly one row
once the app has been used.
"""
from datetime import time

from sqlalchemy.orm import Session

from app.models.working_hours import WorkingHoursConfig

_DEFAULT_START = time(9, 0)
_DEFAULT_END = time(17, 0)


def _hours_between(start_time: time, end_time: time) -> float:
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute
    return round((end_minutes - start_minutes) / 60, 2)


def create_config(db: Session, start_time: time, end_time: time) -> WorkingHoursConfig:
    hours_per_day = _hours_between(start_time, end_time)
    if hours_per_day <= 0:
        raise ValueError("end_time must be after start_time")

    db.query(WorkingHoursConfig).filter(WorkingHoursConfig.is_active.is_(True)).update(
        {"is_active": False}
    )

    config = WorkingHoursConfig(
        start_time=start_time,
        end_time=end_time,
        hours_per_day=hours_per_day,
        is_active=True,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def get_active_config(db: Session) -> WorkingHoursConfig:
    config = db.query(WorkingHoursConfig).filter(WorkingHoursConfig.is_active.is_(True)).first()
    if config:
        return config
    return create_config(db, _DEFAULT_START, _DEFAULT_END)


def get_hours_per_day(db: Session) -> float:
    return get_active_config(db).hours_per_day
