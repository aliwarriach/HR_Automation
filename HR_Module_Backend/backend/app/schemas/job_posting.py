# app/schemas/job_posting.py
from datetime import datetime
from pydantic import BaseModel, field_validator, model_validator


class JobPostingCreate(BaseModel):
    title: str
    requirements: str

    @field_validator("title", "requirements")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value


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