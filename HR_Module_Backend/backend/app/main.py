# app/main.py
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.core.permission_taxonomy import PERMISSION_TAXONOMY
from app.database import Base, SessionLocal, engine
from app.models import announcement, attendance, role, user, job_posting, resume, shortlist, working_hours  # noqa: F401 (ensures tables are registered)
from app.models.role import Role
from app.models.user import User, UserRole
from app.auth.router import router as auth_router
from app.routers.announcements import router as announcements_router
from app.routers.attendance import router as attendance_router
from app.routers.employee_announcements import router as employee_announcements_router
from app.routers.employees import router as employees_router
from app.routers.job_postings import router as job_postings_router
from app.routers.resumes import router as resumes_router
from app.routers.roles import router as roles_router
from app.routers.shortlist import router as shortlist_router
from app.routers.working_hours import router as working_hours_router
from app.services.role_service import PROTECTED_ROLE_NAMES
from app.core.scheduler import start_scheduler, shutdown_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")

Base.metadata.create_all(bind=engine)


def _add_missing_columns(table_name: str, required_columns: dict[str, str]) -> None:
    """Additive column backfill for existing dev databases.

    There's no Alembic in this prototype, and `create_all` only creates
    missing tables, not new columns on ones that already exist. ADD COLUMN
    is safe/additive across SQLite/Postgres/MySQL, so this keeps pre-existing
    tables working after new fields are added to their models, without
    requiring a manual DB reset.
    """
    inspector = inspect(engine)
    existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
    with engine.begin() as conn:
        for name, col_type in required_columns.items():
            if name not in existing_columns:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {name} {col_type}"))


_add_missing_columns(
    "shortlisted_candidates",
    {
        "interview_date": "DATE",
        "interview_time": "TIME",
        "google_event_id": "VARCHAR",
        "google_event_link": "VARCHAR",
    },
)
_add_missing_columns(
    "users",
    {
        "employment_type": "VARCHAR",
        "phone": "VARCHAR",
        "designation": "VARCHAR",
        "date_joined": "DATE",
        "address": "VARCHAR",
        "salary": "FLOAT",
        "experience_years": "FLOAT",
        "skills": "TEXT",
        "recoverable_password": "TEXT",
        "role_id": "INTEGER",
        # DEFAULT 0 explicit: SQLite's ADD COLUMN doesn't backfill existing
        # rows with the Python-side model default, only NEW rows do - without
        # this every pre-existing user would read back as NULL here.
        "is_test_probe": "BOOLEAN DEFAULT 0",
    },
)
_add_missing_columns(
    "announcements",
    {
        "notified_at": "DATETIME",
    },
)


_DEFAULT_ROLE_PERMISSIONS: dict[str, dict[str, list[str]]] = {
    # Full access to every module/action currently defined - kept in sync with
    # PERMISSION_TAXONOMY automatically (see below). This Role row is
    # protected (see services/role_service.py) and always exists, even though
    # the actual super_admin access bypass is keyed off the UserRole enum, not
    # this row (see app/core/permissions.py) - it exists so "super_admin" is
    # visible/consistent in the Roles UI rather than a special case.
    "super_admin": dict(PERMISSION_TAXONOMY),
    # QA-only. Real bypass is User.is_test_probe (see app/core/permissions.py
    # and app/auth/dependencies.py's forbid_roles) - this row exists purely so
    # "test_probe" is visible/documented in the Roles UI, same rationale as
    # super_admin above. Kept in sync with the full taxonomy automatically.
    "test_probe": dict(PERMISSION_TAXONOMY),
    # Mirrors hr's actual current capability across every module: full
    # self-service attendance plus the admin dashboard/list/employee-detail
    # views, full CRUD on announcements/employees (today's require_roles
    # gates), full ownership of recruiting (resumes/candidates - hr is the
    # only role that meaningfully uses these), job posting creation (today's
    # require_roles(hr, super_admin) gate), and working-hours config.
    "hr": {
        "attendance": [
            "check_in_onsite", "check_in_wfh", "check_out",
            "start_break", "end_break", "mark_leave",
            "view_own", "view_all",
        ],
        "announcements": ["create", "read", "update", "delete", "view_own"],
        "employees": ["create", "read", "update", "delete"],
        "resumes": ["create", "read", "update", "delete"],
        "candidates": ["create", "read", "update", "delete"],
        "job_postings": ["create", "read"],
        "working_hours": ["read", "update"],
    },
    # manager has never appeared in any require_roles allow-list in this
    # codebase - today it has the same real capability as employee: self-
    # service attendance and their own announcement feed only. Dashboard
    # (attendance "view_all"), Job Postings, Resumes, Candidates, and
    # Employees are deliberately NOT granted here - HR/Super Admin only,
    # per explicit instruction, not just an unrestricted-by-default gap.
    "manager": {
        "attendance": [
            "check_in_onsite", "check_in_wfh", "check_out",
            "start_break", "end_break", "mark_leave", "view_own",
        ],
        "announcements": ["view_own"],
        "working_hours": ["read"],
    },
    "employee": {
        "attendance": [
            "check_in_onsite", "check_in_wfh", "check_out",
            "start_break", "end_break", "mark_leave", "view_own",
        ],
        "announcements": ["view_own"],
        "working_hours": ["read"],
    },
}


def _seed_default_roles() -> None:
    """One default Role per existing UserRole enum value, mirroring today's
    real behavior exactly (see _DEFAULT_ROLE_PERMISSIONS) - seeded so
    enforcement can be wired in against role_id/has_permission() with zero
    behavior change on rollout day.

    hr/manager/employee are admin-editable defaults: only inserted if missing,
    never overwritten, so a super_admin who customizes "hr" afterward won't
    have it silently reset on the next restart.

    super_admin and test_probe are different: both are protected (can never
    be edited via the API - see services/role_service.py PROTECTED_ROLE_NAMES)
    and are supposed to always mirror the full current taxonomy, so their
    permissions are re-synced on every startup rather than frozen at whatever
    they were when first seeded."""
    db = SessionLocal()
    try:
        for name, permissions in _DEFAULT_ROLE_PERMISSIONS.items():
            existing = db.query(Role).filter(Role.name == name).first()
            if existing:
                if name in PROTECTED_ROLE_NAMES:
                    existing.permissions = json.dumps(permissions)
                continue
            db.add(
                Role(
                    name=name,
                    description=(
                        f"Built-in and protected - cannot be edited or deleted. "
                        f"{'Full system access.' if name == 'super_admin' else 'QA-only account for testing every module and screen.'}"
                        if name in PROTECTED_ROLE_NAMES
                        else f"Default role for {name} accounts - mirrors pre-RBAC behavior. Editable."
                    ),
                    permissions=json.dumps(permissions),
                )
            )
        db.commit()
    finally:
        db.close()


def _backfill_role_id_from_enum() -> None:
    """Every existing user predates the roles table and has role_id = NULL.
    Point each one at the default Role matching their current `role` enum so
    has_permission() checks behave identically to today's require_roles
    checks the moment enforcement is wired in - nobody loses access on
    rollout. Only touches users with role_id IS NULL, so a super_admin who's
    since assigned someone a custom Role is never overwritten."""
    db = SessionLocal()
    try:
        default_roles = {r.name: r.id for r in db.query(Role).filter(Role.name.in_([e.value for e in UserRole]))}
        unassigned = db.query(User).filter(User.role_id.is_(None)).all()
        for u in unassigned:
            role_id = default_roles.get(u.role.value if hasattr(u.role, "value") else u.role)
            if role_id:
                u.role_id = role_id
        db.commit()
    finally:
        db.close()


_seed_default_roles()
_backfill_role_id_from_enum()


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(title="HR Automation Prototype", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # prototype only — tighten before production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(announcements_router)
app.include_router(attendance_router)
app.include_router(employee_announcements_router)
app.include_router(employees_router)
app.include_router(job_postings_router)
app.include_router(resumes_router)
app.include_router(roles_router)
app.include_router(shortlist_router)
app.include_router(working_hours_router)
