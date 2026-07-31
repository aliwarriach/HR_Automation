# app/auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.permissions import has_permission
from app.database import get_db
from app.models.user import User, UserRole
from app.auth.jwt_handler import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def require_roles(*allowed_roles: UserRole):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")
        return user
    return checker


def forbid_roles(*disallowed_roles: UserRole):
    """Deny-list counterpart to require_roles - for endpoints that should stay
    open to any authenticated user EXCEPT specific roles (e.g. super_admin
    must not use employee self-service attendance endpoints).

    is_test_probe accounts bypass this - see models/user.py. This is a
    deliberate, narrow QA escape hatch, not a relaxation of the rule for real
    super_admin accounts."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.is_test_probe:
            return user
        if user.role in disallowed_roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")
        return user
    return checker


def require_permission(module: str, action: str):
    """FastAPI-dependency wrapper around has_permission() for routes that want
    to gate on the Roles & Permissions system instead of (or alongside) the
    static require_roles() allow-list."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user, module, action):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this action")
        return user
    return checker