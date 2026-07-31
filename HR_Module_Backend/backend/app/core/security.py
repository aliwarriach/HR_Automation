# app/core/security.py
"""Password hashing, generation, and reversible at-rest encryption.

Shared by the auth and employee-management routers. Two distinct password
representations are kept per employee:
  - hashed_password (bcrypt, one-way): used for login verification only.
  - recoverable_password (Fernet, reversible): lets a super_admin (or the
    employee themselves) view their password from the detail page if the
    welcome email failed to send. Never exposed to other roles.
"""
import secrets
import string

from cryptography.fernet import Fernet
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_PASSWORD_LENGTH = 8
_fernet = Fernet(settings.password_encryption_key.encode())


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def generate_password(length: int = _PASSWORD_LENGTH) -> str:
    """Generate a random password using a CSPRNG, guaranteed to mix letters and digits."""
    required = [secrets.choice(string.ascii_letters), secrets.choice(string.digits)]
    pool = string.ascii_letters + string.digits
    required += [secrets.choice(pool) for _ in range(length - len(required))]
    secrets.SystemRandom().shuffle(required)
    return "".join(required)


def encrypt_password(plain_password: str) -> str:
    return _fernet.encrypt(plain_password.encode()).decode()


def decrypt_password(encrypted_password: str) -> str:
    return _fernet.decrypt(encrypted_password.encode()).decode()
