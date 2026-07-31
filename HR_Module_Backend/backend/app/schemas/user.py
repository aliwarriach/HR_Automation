# app/schemas/user.py
from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.employee


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeOut(BaseModel):
    """Session bootstrap payload: who the caller is, plus their fully
    resolved effective permissions (see app/core/permissions.py), so a
    frontend can gate every nav item/route/button from one call instead of
    guessing from `role` alone or probing endpoints with real requests."""

    id: int
    name: str
    email: EmailStr
    role: UserRole
    role_id: int | None
    role_name: str | None
    is_test_probe: bool
    permissions: dict[str, list[str]]