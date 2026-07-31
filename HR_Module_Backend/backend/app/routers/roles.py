# app/routers/roles.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.core.permission_taxonomy import PERMISSION_TAXONOMY
from app.database import get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.role import RoleCreate, RoleDetailOut, RoleListItemOut, RoleUpdate
from app.services import role_service

router = APIRouter(prefix="/roles", tags=["Roles & Permissions"])


def _get_role_or_404(role_id: int, db: Session) -> Role:
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Role not found")
    return role


@router.post("/", response_model=RoleDetailOut, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles", "create")),
):
    try:
        role = role_service.create_role(db, payload.name, payload.description, payload.permissions)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return role_service.serialize_detail(role)


@router.get("/", response_model=list[RoleListItemOut])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles", "read")),
):
    return role_service.list_roles(db)


@router.get("/permission-options", response_model=dict[str, list[str]])
def get_permission_options(
    current_user: User = Depends(require_permission("roles", "read")),
):
    """The enforced module/action taxonomy - drives the frontend's Create/Edit
    Role permission builder and is the same list validate_permissions_against_
    taxonomy() checks Role.permissions against. Registered before the dynamic
    "/{role_id}" route below so this literal path is matched first (same
    pattern as routers/attendance.py's "/dashboard" and "/list")."""
    return PERMISSION_TAXONOMY


@router.get("/{role_id}", response_model=RoleDetailOut)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles", "read")),
):
    role = _get_role_or_404(role_id, db)
    return role_service.serialize_detail(role)


@router.put("/{role_id}", response_model=RoleDetailOut)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles", "update")),
):
    role = _get_role_or_404(role_id, db)
    updates = payload.model_dump(exclude_unset=True)
    try:
        role = role_service.update_role(db, role, updates)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return role_service.serialize_detail(role)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles", "delete")),
):
    role = _get_role_or_404(role_id, db)
    try:
        role_service.delete_role(db, role)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
