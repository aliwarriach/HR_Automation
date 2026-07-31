# app/services/role_service.py
"""Role & permission management for the Super Admin. "super_admin" and
"test_probe" are protected, seeded rows (see main.py bootstrap) - neither can
ever be edited or deleted via this API. Both always have full system access
via bypasses in app/core/permissions.py and app/auth/dependencies.py (keyed
off the `super_admin` UserRole enum / User.is_test_probe, not these rows), so
their stored permissions JSON here is informational only.
"""
import json

from sqlalchemy.orm import Session

from app.core.permission_taxonomy import PERMISSION_TAXONOMY
from app.models.role import Role
from app.models.user import User

PROTECTED_ROLE_NAMES = {"super_admin", "test_probe"}


def validate_permissions_against_taxonomy(permissions: dict[str, list[str]]) -> None:
    """Rejects any module/action not in PERMISSION_TAXONOMY, so a Role's
    stored permissions can never drift from what the taxonomy (and therefore
    has_permission() callers) actually understand."""
    for module, actions in permissions.items():
        if module not in PERMISSION_TAXONOMY:
            raise ValueError(f"Unknown permission module: '{module}'")
        allowed = set(PERMISSION_TAXONOMY[module])
        invalid = sorted(set(actions) - allowed)
        if invalid:
            raise ValueError(f"Invalid action(s) for module '{module}': {', '.join(invalid)}")


def serialize_list_item(role: Role) -> dict:
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "created_at": role.created_at,
    }


def serialize_detail(role: Role) -> dict:
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "permissions": json.loads(role.permissions),
        "created_at": role.created_at,
        "updated_at": role.updated_at,
    }


def list_roles(db: Session) -> list[dict]:
    return [serialize_list_item(r) for r in db.query(Role).order_by(Role.id).all()]


def create_role(db: Session, name: str, description: str | None, permissions: dict) -> Role:
    if db.query(Role).filter(Role.name == name).first():
        raise ValueError("A role with this name already exists")
    validate_permissions_against_taxonomy(permissions)

    role = Role(name=name, description=description, permissions=json.dumps(permissions))
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def update_role(db: Session, role: Role, updates: dict) -> Role:
    if role.name in PROTECTED_ROLE_NAMES:
        raise PermissionError(f"The {role.name} role cannot be modified")

    if "name" in updates and updates["name"] != role.name:
        if db.query(Role).filter(Role.name == updates["name"]).first():
            raise ValueError("A role with this name already exists")

    if "permissions" in updates:
        validate_permissions_against_taxonomy(updates["permissions"])
        updates["permissions"] = json.dumps(updates["permissions"])

    for field, value in updates.items():
        setattr(role, field, value)

    db.commit()
    db.refresh(role)
    return role


def delete_role(db: Session, role: Role) -> None:
    if role.name in PROTECTED_ROLE_NAMES:
        raise PermissionError(f"The {role.name} role cannot be deleted")

    if db.query(User).filter(User.role_id == role.id).first():
        raise ValueError("Cannot delete a role that is assigned to one or more employees")

    db.delete(role)
    db.commit()
