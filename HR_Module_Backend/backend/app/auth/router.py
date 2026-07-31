# app/auth/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.permissions import get_effective_permissions
from app.core.security import hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenOut, MeOut
from app.auth.jwt_handler import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    token = create_access_token(user.id, user.role)
    return TokenOut(access_token=token)


@router.get("/me", response_model=MeOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Session bootstrap: who the caller is, plus their fully resolved
    effective permissions - the frontend should call this once after login
    (and on refresh) and use `permissions` to decide which nav items, routes,
    and buttons to render. Not permission-gated itself - every authenticated
    user can always see their own profile/permissions."""
    return MeOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        role_id=current_user.role_id,
        role_name=current_user.role_obj.name if current_user.role_obj else None,
        is_test_probe=current_user.is_test_probe,
        permissions=get_effective_permissions(current_user),
    )