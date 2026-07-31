"""SQLAlchemy ORM models for Resume Matcher.

A single declarative ``Base`` backs all tables (doc tables migrated from
TinyDB plus the ``api_keys`` table). The facade in ``app/database.py``
converts ORM rows to plain dicts so the rest of the app never sees ORM
objects — preserving the TinyDB-era contracts.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Float, JSON, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _utcnow_iso() -> str:
    """Return the current UTC time as an ISO-8601 string.

    Timestamps are stored as strings (not native datetimes) to preserve the
    TinyDB-era behavior: code compares them lexically and returns them to
    clients verbatim.
    """
    return datetime.now(timezone.utc).isoformat()


class Base(DeclarativeBase):
    """Declarative base shared by every table."""


class Resume(Base):
    """An uploaded resume document.

    Table is prefixed ``resume_matcher_`` because this database file is shared
    with an existing HR application that owns its own unrelated ``resumes``
    table (Gmail-ingested candidate files) — see ``CandidateMatch`` below for
    the bridge between the two.
    """

    __tablename__ = "resume_matcher_documents"

    resume_id: Mapped[str] = mapped_column(String, primary_key=True)
    content: Mapped[str] = mapped_column(Text)
    content_type: Mapped[str] = mapped_column(String, default="md")
    filename: Mapped[str | None] = mapped_column(String, nullable=True)
    processed_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    processing_status: Mapped[str] = mapped_column(String, default="pending")
    # original_markdown has *absence* semantics in the TinyDB era: the key was
    # omitted entirely when None. The facade reproduces that by only emitting
    # the key when this column is non-null.
    original_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String, default=_utcnow_iso)
    updated_at: Mapped[str] = mapped_column(String, default=_utcnow_iso)


class Job(Base):
    """A job description.

    Only the stable columns are first-class; everything the pipeline attaches
    dynamically (``job_keywords``, ``job_keywords_hash``, ``preview_hash``,
    ``preview_hashes``, ``preview_prompt_id``, ``company``, ``role``) lives in
    ``metadata_json``. The facade flattens that map to top-level keys on read
    and merges non-core keys into it on update, reproducing TinyDB semantics.
    """

    __tablename__ = "resume_matcher_jobs"

    job_id: Mapped[str] = mapped_column(String, primary_key=True)
    content: Mapped[str] = mapped_column(Text)
    resume_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[str] = mapped_column(String, default=_utcnow_iso)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class ApiKey(Base):
    """An encrypted LLM provider API key.

    ``provider`` is the *key-store* provider name (e.g. ``google`` for the
    ``gemini`` LLM provider, via ``_PROVIDER_KEY_MAP``). Only ciphertext is
    stored; plaintext exists in memory only at call time.
    """

    __tablename__ = "resume_matcher_api_keys"

    provider: Mapped[str] = mapped_column(String, primary_key=True)
    ciphertext: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[str] = mapped_column(String, default=_utcnow_iso)


class CandidateMatch(Base):
    """AI match/ATS score of an HR-ingested candidate resume against a job posting.

    Bridges this app's own tables to the host application's ``resumes`` and
    ``job_postings`` tables. ``resume_id`` here is an INTEGER foreign key into
    the *host app's* ``resumes.id`` — distinct from every other ``resume_id``
    in this codebase, which is a String UUID referencing
    ``resume_matcher_documents.resume_id``. Do not confuse the two.
    """

    __tablename__ = "candidate_matches"
    __table_args__ = (
        UniqueConstraint(
            "resume_id", "job_posting_id", name="uq_candidate_matches_resume_job"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resume_id: Mapped[int] = mapped_column(Integer, index=True)  # -> host app resumes.id
    job_posting_id: Mapped[int] = mapped_column(Integer, index=True)  # -> job_postings.id
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    keyword_match_score: Mapped[float] = mapped_column(Float, default=0.0)
    skills_coverage_score: Mapped[float] = mapped_column(Float, default=0.0)
    section_completeness_score: Mapped[float] = mapped_column(Float, default=0.0)
    missing_keywords: Mapped[list] = mapped_column(JSON, default=list)
    injectable_keywords: Mapped[list] = mapped_column(JSON, default=list)
    recommendations: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String, default="pending")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String, default=_utcnow_iso)
    updated_at: Mapped[str] = mapped_column(String, default=_utcnow_iso)
