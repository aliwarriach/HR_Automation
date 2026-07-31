# app/schemas/role.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


def _validate_permissions(value: dict[str, list[str]]) -> dict[str, list[str]]:
    if not value:
        raise ValueError("permissions must include at least one module")
    for module, actions in value.items():
        if not module.strip():
            raise ValueError("permission module names must not be blank")
        if not actions:
            raise ValueError(f"module '{module}' must include at least one action")
    return value


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    permissions: dict[str, list[str]]

    @field_validator("name")
    @classmethod
    def not_blank_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("name must not be blank")
        return value

    @field_validator("permissions")
    @classmethod
    def check_permissions(cls, value: dict[str, list[str]]) -> dict[str, list[str]]:
        return _validate_permissions(value)


class RoleUpdate(BaseModel):
    """Partial update. Rejected outright for the super_admin role - see
    services/role_service.py."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    description: str | None = None
    permissions: dict[str, list[str]] | None = None

    @field_validator("name")
    @classmethod
    def not_blank_name(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("name must not be blank")
        return value

    @field_validator("permissions")
    @classmethod
    def check_permissions(cls, value: dict[str, list[str]] | None) -> dict[str, list[str]] | None:
        return _validate_permissions(value) if value is not None else value


class RoleListItemOut(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime


class RoleDetailOut(BaseModel):
    id: int
    name: str
    description: str | None
    permissions: dict[str, list[str]]
    created_at: datetime
    updated_at: datetime | None
