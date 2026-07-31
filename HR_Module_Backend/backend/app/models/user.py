# app/models/user.py
import enum
from sqlalchemy import Boolean, Column, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func  # type: ignore[import]
from sqlalchemy.orm import relationship  # type: ignore[import]

from app.database import Base


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    hr = "hr"
    manager = "manager"
    employee = "employee"


class EmploymentType(str, enum.Enum):
    full_time = "full_time"
    intern = "intern"
    contract = "contract"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    recoverable_password = Column(Text, nullable=True)  # Fernet-encrypted; see app/core/security.py
    role = Column(Enum(UserRole), nullable=False, default=UserRole.employee)
    # Nullable FK into the roles table (see models/role.py). This coexists with
    # the `role` enum above during the gradual migration to role-based
    # permissions - existing access control (require_roles) keeps using the
    # enum; only the new has_permission() utility (app/core/permissions.py)
    # consults this. super_admin always bypasses via the enum check regardless
    # of whether role_id is set.
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    role_obj = relationship("Role", foreign_keys=[role_id])
    # QA-only escape hatch: bypasses forbid_roles() and auto-passes
    # has_permission() regardless of role/role_id. Deliberately NOT exposed on
    # any schema/endpoint - only settable via scripts/create_test_probe.py, so
    # it can never be flipped on by accident through the normal employee API.
    is_test_probe = Column(Boolean, nullable=False, default=False)

    # Employee profile fields
    employment_type = Column(Enum(EmploymentType), nullable=True)
    phone = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    date_joined = Column(Date, nullable=True)
    address = Column(String, nullable=True)
    salary = Column(Float, nullable=True)
    experience_years = Column(Float, nullable=True)
    skills = Column(Text, nullable=True)  # JSON-encoded list[str]

    created_at = Column(DateTime(timezone=True), server_default=func.now())