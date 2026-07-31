"""One-time local script to create (or update) the QA "test_probe" account.

This account can open every screen and perform every action in the app,
including the ones that regular super_admin accounts are specifically
blocked from (employee self-service attendance, the employee announcement
feed) - see User.is_test_probe in app/models/user.py, and its two check
points in app/auth/dependencies.py (forbid_roles) and
app/core/permissions.py (has_permission). It is meant purely for manually
testing every module/screen/design, not for real use.

is_test_probe is deliberately NOT exposed on any API endpoint or schema, so
it can only ever be set by running this script directly against the database
- never through the running server. Run it once locally:

    python scripts/create_test_probe.py --email probe@yourcompany.test --password "some-password" --name "Test Probe"

Re-run it any time (e.g. to reset the password) - it's idempotent, matching
on email.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_password  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.role import Role  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Test Probe")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        probe_role = db.query(Role).filter(Role.name == "test_probe").first()
        if not probe_role:
            raise SystemExit(
                "No 'test_probe' Role found - start the FastAPI app at least once first "
                "so its startup seeding (app/main.py) creates it, then re-run this script."
            )

        user = db.query(User).filter(User.email == args.email).first()
        if user:
            user.name = args.name
            user.hashed_password = hash_password(args.password)
            user.role = UserRole.super_admin
            user.role_id = probe_role.id
            user.is_test_probe = True
            print(f"Updated existing account {args.email} -> test_probe.")
        else:
            user = User(
                name=args.name,
                email=args.email,
                hashed_password=hash_password(args.password),
                role=UserRole.super_admin,
                role_id=probe_role.id,
                is_test_probe=True,
            )
            db.add(user)
            print(f"Created new test_probe account: {args.email}.")

        db.commit()
        print("Log in with these credentials via the normal /auth/login flow. "
              "This account can access every screen, including ones super_admin cannot.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
