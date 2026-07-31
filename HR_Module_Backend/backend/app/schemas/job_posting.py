# app/schemas/job_posting.py
from datetime import datetime
from pydantic import BaseModel, model_validator


class JobPostingCreate(BaseModel):
    title: str
    requirements: str


class JobPostingOut(BaseModel):
    id: int
    title: str
    role: str = ""
    requirements: str
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

    @model_validator(mode="after")
    def set_role(self):
        self.role = self.title.strip().lower().replace(" ", "-")
        return self