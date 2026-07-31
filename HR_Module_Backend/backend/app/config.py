# app/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./hr_app.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 1 day, fine for prototype

    # Symmetric key for at-rest encryption of the super-admin-recoverable
    # employee password (separate from hashed_password, which is one-way
    # bcrypt and used for actual login). Override via env in production —
    # this default is dev-only, generated with Fernet.generate_key().
    password_encryption_key: str = "-IjI-2sTSZ-BAWQHCvz-WH2jpd9gAy_D-GDI8yX6te8="

    # Gmail resume ingestion
    gmail_credentials_file: str = "credentials/credentials.json"
    gmail_token_file: str = "credentials/token.json"
    gmail_query: str = "is:unread has:attachment filename:pdf"
    gmail_poll_interval_minutes: int = 5
    upload_dir: str = "uploads"

    # Resume Matcher ATS scoring microservice
    ats_base_url: str = "http://localhost:8000/api/v1"
    ats_timeout_seconds: float = 30.0

    # Interview scheduling
    interview_timezone: str = "UTC"
    interview_duration_minutes: int = 30

    # Announcement target-audience email notifications
    announcement_notification_poll_interval_minutes: int = 5

    class Config:
        env_file = ".env"


settings = Settings()