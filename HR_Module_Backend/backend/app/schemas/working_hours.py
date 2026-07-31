# app/schemas/working_hours.py
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict


class WorkingHoursCreate(BaseModel):
    start_time: time
    end_time: time


class WorkingHoursOut(BaseModel):
    id: int
    start_time: time
    end_time: time
    hours_per_day: float
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
