# app/core/permissions.py
"""Module-based permission check for the Roles & Permissions system.

super_admin (the built-in UserRole enum value) always bypasses this check and
gets full access, regardless of whether it has a role_id assigned - see
"Special Rule for Super Admin" in the module spec. Every other user's access
is governed by their assigned Role's `permissions` JSON (grouped by module,
e.g. {"employees": ["create", "read"]}) via User.role_id. A user with no
role_id assigned has no permissions.

is_test_probe accounts also always bypass, on top of the super_admin bypass -
see models/user.py. This is a deliberate QA escape hatch, not a general
relaxation: it's off by default and unreachable from any public endpoint.
"""
import json

from app.core.permission_taxonomy import PERMISSION_TAXONOMY
from app.models.user import User, UserRole


def has_permission(user: User, module: str, action: str) -> bool:
    if user.is_test_probe:
        return True

    if user.role == UserRole.super_admin:
        return True

    if not user.role_id or not user.role_obj:
        return False

    permissions: dict[str, list[str]] = json.loads(user.role_obj.permissions)
    return action in permissions.get(module, [])


def get_effective_permissions(user: User) -> dict[str, list[str]]:
    """The full resolved module->actions map has_permission() checks against
    for this user - lets a client (the frontend) determine everything it can
    do in one call instead of probing has_permission() per module/action.
    Mirrors has_permission()'s exact bypass rules."""
    if user.is_test_probe or user.role == UserRole.super_admin:
        return dict(PERMISSION_TAXONOMY)

    if not user.role_id or not user.role_obj:
        return {}

    return json.loads(user.role_obj.permissions)
