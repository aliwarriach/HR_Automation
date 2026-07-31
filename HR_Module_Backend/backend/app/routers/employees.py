# app/routers/employees.py
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.core.security import decrypt_password, encrypt_password, generate_password, hash_password
from app.database import get_db
from app.integrations.gmail import client as gmail_client
from app.integrations.gmail.client import GmailClientError
from app.models.role import Role
from app.models.user import User, UserRole
from app.schemas.employee import EmployeeCreate, EmployeeDetailOut, EmployeeListOut, EmployeeUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/employees", tags=["Employees"])


def _get_employee_or_404(employee_id: int, db: Session) -> User:
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    return employee


def _serialize_employee(employee: User, viewer: User) -> EmployeeDetailOut:
    """Include the recoverable password only for super_admin or the employee viewing their own record."""
    data = EmployeeDetailOut.model_validate(employee).model_dump()
    can_view_password = viewer.role == UserRole.super_admin or viewer.id == employee.id
    if can_view_password and employee.recoverable_password:
        data["password"] = decrypt_password(employee.recoverable_password)
    return EmployeeDetailOut(**data)


def _send_welcome_email(employee: User, plain_password: str) -> None:
    """Best-effort: a failed welcome email must never roll back employee creation."""
    subject = "Welcome to the Company"
    body = (
        f"Hi {employee.name},\n\n"
        "Welcome to the company! Your account has been created successfully.\n\n"
        "Here are your login credentials:\n\n"
        f"Email: {employee.email}\n"
        f"Password: {plain_password}\n\n"
        "Please log in and change your password after first login.\n\n"
        "Best regards,\nHR Team"
    )
    try:
        service = gmail_client.get_gmail_service()
        gmail_client.send_email(service, employee.email, subject, body)
    except GmailClientError:
        logger.exception("Welcome email failed for employee %s (%s)", employee.id, employee.email)


@router.post("/", response_model=EmployeeDetailOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employees", "create")),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    if payload.role_id is not None and not db.query(Role).filter(Role.id == payload.role_id).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "role_id does not reference an existing role")

    plain_password = generate_password()
    employee = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(plain_password),
        recoverable_password=encrypt_password(plain_password),
        role=payload.role,
        role_id=payload.role_id,
        employment_type=payload.employment_type,
        phone=payload.phone,
        designation=payload.designation,
        date_joined=payload.date_joined,
        address=payload.address,
        salary=payload.salary,
        experience_years=payload.experience_years,
        skills=json.dumps(payload.skills or []),
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    _send_welcome_email(employee, plain_password)

    return _serialize_employee(employee, viewer=current_user)


@router.get("/", response_model=list[EmployeeListOut])
def list_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employees", "read")),
):
    return db.query(User).order_by(User.id).all()


@router.get("/{employee_id}", response_model=EmployeeDetailOut)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employees", "read")),
):
    employee = _get_employee_or_404(employee_id, db)
    return _serialize_employee(employee, viewer=current_user)


@router.put("/{employee_id}", response_model=EmployeeDetailOut)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employees", "update")),
):
    employee = _get_employee_or_404(employee_id, db)

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("role_id") is not None and not db.query(Role).filter(Role.id == updates["role_id"]).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "role_id does not reference an existing role")

    for field, value in updates.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employees", "delete")),
):
    employee = _get_employee_or_404(employee_id, db)
    db.delete(employee)
    db.commit()
