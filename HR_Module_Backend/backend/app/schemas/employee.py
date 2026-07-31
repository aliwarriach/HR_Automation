# app/schemas/employee.py
import json
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, ConfigDict, field_validator

from app.models.user import EmploymentType, UserRole


class EmployeeCreate(BaseModel):
    """No password field — the backend generates and emails a random one on create."""

    name: str
    email: EmailStr
    role: UserRole = UserRole.employee
    role_id: int | None = None  # optional link into the roles table; see models/role.py
    employment_type: EmploymentType = EmploymentType.full_time
    phone: str | None = None
    designation: str | None = None
    date_joined: date | None = None
    address: str | None = None
    salary: float | None = None
    experience_years: float | None = None
    skills: list[str] | None = None


class EmployeeUpdate(BaseModel):
    """Only these fields may be changed after creation (see module requirements)."""

    model_config = ConfigDict(extra="forbid")

    role: UserRole | None = None
    role_id: int | None = None
    employment_type: EmploymentType | None = None
    designation: str | None = None


class EmployeeListOut(BaseModel):
    """Trimmed shape for GET /employees — list view only."""

    id: int
    name: str
    role: UserRole
    role_id: int | None
    employment_type: EmploymentType | None
    designation: str | None

    model_config = ConfigDict(from_attributes=True)


class EmployeeDetailOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    role_id: int | None
    employment_type: EmploymentType | None
    phone: str | None
    designation: str | None
    date_joined: date | None
    address: str | None
    salary: float | None
    experience_years: float | None
    skills: list[str] | None
    created_at: datetime
    # Populated only when the viewer is super_admin or the employee themselves; see routers/employees.py.
    password: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("skills", mode="before")
    @classmethod
    def parse_skills(cls, value):
        if isinstance(value, str):
            return json.loads(value)
        return value
