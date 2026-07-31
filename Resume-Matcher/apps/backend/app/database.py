"""SQLAlchemy (SQLite) data layer for Resume Matcher.

This is a behavior-preserving replacement for the original TinyDB wrapper. The
``Database`` facade keeps the same method names/signatures and returns **plain
dicts** (never ORM rows), so the ~50 call sites only needed ``await`` added.

Two engines back one SQLite file:
- an **async** engine (``aiosqlite``) for the document tables;
- a **sync** engine for the encrypted ``api_keys`` table, which is read on the
  synchronous LLM hot path (``get_llm_config`` → ``resolve_api_key``).
"""

import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.db_engine import init_models_sync, make_async_engine, make_sync_engine
from app.models import ApiKey, CandidateMatch, Job, Resume

logger = logging.getLogger(__name__)

# Columns that are first-class on the jobs table; everything else the pipeline
# attaches dynamically is stored in ``metadata_json`` (see Job model).
_JOB_CORE_FIELDS = frozenset({"job_id", "content", "resume_id", "created_at"})


def _now() -> str:
    """Current UTC time as an ISO-8601 string (TinyDB-era format)."""
    return datetime.now(timezone.utc).isoformat()


class Database:
    """Async SQLAlchemy facade for resume matcher data."""

    def __init__(self, db_path: Path | None = None):
        self.db_path = db_path or settings.sqlite_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._async_engine = None
        self._async_session_factory: async_sessionmaker[AsyncSession] | None = None
        self._sync_engine = None
        self._sync_session_factory: sessionmaker[Session] | None = None
        self._initialized = False

    # -- engine / session plumbing ------------------------------------------

    def _ensure_initialized(self) -> None:
        """Create engines and tables once (idempotent).

        Tables are created via the **sync** engine so both the sync (api_keys)
        and async (docs) paths see them immediately, without needing an event
        loop. Both engines point at the same file.
        """
        if self._initialized:
            return
        self._sync_engine = make_sync_engine(self.db_path)
        self._sync_session_factory = sessionmaker(self._sync_engine, expire_on_commit=False)
        init_models_sync(self._sync_engine)
        self._async_engine = make_async_engine(self.db_path)
        self._async_session_factory = async_sessionmaker(
            self._async_engine, expire_on_commit=False
        )
        self._initialized = True

    @property
    def _session(self) -> async_sessionmaker[AsyncSession]:
        self._ensure_initialized()
        assert self._async_session_factory is not None
        return self._async_session_factory

    @property
    def _sync(self) -> sessionmaker[Session]:
        self._ensure_initialized()
        assert self._sync_session_factory is not None
        return self._sync_session_factory

    async def close(self) -> None:
        """Dispose engines and release file handles."""
        if self._async_engine is not None:
            await self._async_engine.dispose()
            self._async_engine = None
            self._async_session_factory = None
        if self._sync_engine is not None:
            self._sync_engine.dispose()
            self._sync_engine = None
            self._sync_session_factory = None
        self._initialized = False

    # -- row -> dict converters ---------------------------------------------

    @staticmethod
    def _resume_to_dict(row: Resume) -> dict[str, Any]:
        doc: dict[str, Any] = {
            "resume_id": row.resume_id,
            "content": row.content,
            "content_type": row.content_type,
            "filename": row.filename,
            "processed_data": row.processed_data,
            "processing_status": row.processing_status,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
        # Preserve TinyDB absence semantics: omit the key entirely when None.
        if row.original_markdown is not None:
            doc["original_markdown"] = row.original_markdown
        return doc

    @staticmethod
    def _job_to_dict(row: Job) -> dict[str, Any]:
        doc: dict[str, Any] = {
            "job_id": row.job_id,
            "content": row.content,
            "resume_id": row.resume_id,
            "created_at": row.created_at,
        }
        meta = row.metadata_json or {}
        if isinstance(meta, dict):
            doc.update(meta)  # flatten dynamic fields to top level
        return doc

    @staticmethod
    def _candidate_match_to_dict(row: CandidateMatch) -> dict[str, Any]:
        return {
            "id": row.id,
            "resume_id": row.resume_id,
            "job_posting_id": row.job_posting_id,
            "overall_score": row.overall_score,
            "keyword_match_score": row.keyword_match_score,
            "skills_coverage_score": row.skills_coverage_score,
            "section_completeness_score": row.section_completeness_score,
            "missing_keywords": row.missing_keywords,
            "injectable_keywords": row.injectable_keywords,
            "recommendations": row.recommendations,
            "status": row.status,
            "error_message": row.error_message,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    # -- Resume operations --------------------------------------------------

    async def create_resume(
        self,
        content: str,
        content_type: str = "md",
        filename: str | None = None,
        processed_data: dict[str, Any] | None = None,
        processing_status: str = "pending",
        original_markdown: str | None = None,
    ) -> dict[str, Any]:
        """Create a new resume entry.

        Every uploaded resume is independent (no master/tailored distinction).

        processing_status: "pending", "processing", "ready", "failed"
        """
        resume_id = str(uuid4())
        now = _now()
        async with self._session() as session:
            session.add(
                Resume(
                    resume_id=resume_id,
                    content=content,
                    content_type=content_type,
                    filename=filename,
                    processed_data=processed_data,
                    processing_status=processing_status,
                    original_markdown=original_markdown,
                    created_at=now,
                    updated_at=now,
                )
            )
            await session.commit()

        doc: dict[str, Any] = {
            "resume_id": resume_id,
            "content": content,
            "content_type": content_type,
            "filename": filename,
            "processed_data": processed_data,
            "processing_status": processing_status,
            "created_at": now,
            "updated_at": now,
        }
        if original_markdown is not None:
            doc["original_markdown"] = original_markdown
        return doc

    async def get_resume(self, resume_id: str) -> dict[str, Any] | None:
        """Get resume by ID."""
        async with self._session() as session:
            row = await session.get(Resume, resume_id)
            return self._resume_to_dict(row) if row else None

    async def update_resume(self, resume_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        """Update resume by ID.

        Raises:
            ValueError: If resume not found.
        """
        async with self._session() as session:
            row = await session.get(Resume, resume_id)
            if row is None:
                raise ValueError(f"Resume not found: {resume_id}")
            for key, value in updates.items():
                if hasattr(row, key):
                    setattr(row, key, value)
                else:
                    logger.warning("Ignoring unknown resume field on update: %s", key)
            row.updated_at = _now()
            await session.commit()
            return self._resume_to_dict(row)

    async def delete_resume(self, resume_id: str) -> bool:
        """Delete resume by ID."""
        async with self._session() as session:
            row = await session.get(Resume, resume_id)
            if row is None:
                return False
            await session.delete(row)
            await session.commit()
            return True

    async def list_resumes(self) -> list[dict[str, Any]]:
        """List all resumes."""
        async with self._session() as session:
            result = await session.execute(select(Resume).order_by(Resume.created_at))
            return [self._resume_to_dict(row) for row in result.scalars().all()]

    # -- Job operations -----------------------------------------------------

    async def create_job(self, content: str, resume_id: str | None = None) -> dict[str, Any]:
        """Create a new job description entry."""
        job_id = str(uuid4())
        now = _now()
        async with self._session() as session:
            session.add(
                Job(job_id=job_id, content=content, resume_id=resume_id, created_at=now, metadata_json={})
            )
            await session.commit()
        return {
            "job_id": job_id,
            "content": content,
            "resume_id": resume_id,
            "created_at": now,
        }

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        """Get job by ID (dynamic fields flattened to top level)."""
        async with self._session() as session:
            row = await session.get(Job, job_id)
            return self._job_to_dict(row) if row else None

    async def update_job(
        self, job_id: str, updates: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Update a job by ID.

        Core columns are set directly; every other key is merged into
        ``metadata_json`` so dynamic pipeline fields (``preview_hash``,
        ``job_keywords``, ``company``/``role``, …) round-trip through
        ``get_job`` as top-level keys.
        """
        async with self._session() as session:
            row = await session.get(Job, job_id)
            if row is None:
                return None
            meta = dict(row.metadata_json or {})
            for key, value in updates.items():
                if key in _JOB_CORE_FIELDS:
                    setattr(row, key, value)
                else:
                    meta[key] = value
            # Reassign so SQLAlchemy detects the JSON mutation.
            row.metadata_json = meta
            await session.commit()
            return self._job_to_dict(row)

    async def delete_job(self, job_id: str) -> bool:
        """Delete a job by ID (used to clean up an orphaned manual-add job)."""
        async with self._session() as session:
            row = await session.get(Job, job_id)
            if row is None:
                return False
            await session.delete(row)
            await session.commit()
            return True

    # -- Encrypted API key store (sync; read on the LLM hot path) -----------

    def get_api_key_ciphertexts(self) -> dict[str, str]:
        """Return ``{provider: ciphertext}`` for all stored keys (sync)."""
        with self._sync() as session:
            rows = session.execute(select(ApiKey)).scalars().all()
            return {row.provider: row.ciphertext for row in rows}

    def set_api_key_ciphertext(self, provider: str, ciphertext: str) -> None:
        """Upsert one provider's ciphertext (sync)."""
        with self._sync() as session:
            row = session.get(ApiKey, provider)
            if row is None:
                session.add(
                    ApiKey(provider=provider, ciphertext=ciphertext, updated_at=_now())
                )
            else:
                row.ciphertext = ciphertext
                row.updated_at = _now()
            session.commit()

    def delete_api_key(self, provider: str) -> None:
        """Delete one provider's key (sync)."""
        with self._sync() as session:
            row = session.get(ApiKey, provider)
            if row is not None:
                session.delete(row)
                session.commit()

    def clear_api_keys(self) -> None:
        """Delete all stored keys (sync)."""
        with self._sync() as session:
            session.execute(delete(ApiKey))
            session.commit()

    def replace_api_keys(self, ciphertexts: dict[str, str]) -> None:
        """Atomically replace the whole key store (clear + insert in one txn).

        A single transaction means a failure mid-write can't leave the store
        half-cleared and wipe a user's previously saved keys.
        """
        with self._sync() as session:
            session.execute(delete(ApiKey))
            now = _now()
            for provider, ciphertext in ciphertexts.items():
                if ciphertext:
                    session.add(
                        ApiKey(provider=provider, ciphertext=ciphertext, updated_at=now)
                    )
            session.commit()

    # -- Candidate match operations (bridges to the host app's own tables) --
    #
    # The host app's `resumes` / `job_postings` tables are read via raw SQL,
    # never mapped as ORM models here — this guarantees `init_models_sync`
    # (`Base.metadata.create_all`) can never touch or redefine them.

    async def get_host_resume(self, resume_id: int) -> dict[str, Any] | None:
        """Read-only lookup into the host app's own `resumes` table."""
        async with self._session() as session:
            row = (
                await session.execute(
                    text(
                        "SELECT id, sender_email, file_name, file_path "
                        "FROM resumes WHERE id = :id"
                    ),
                    {"id": resume_id},
                )
            ).mappings().first()
            return dict(row) if row else None

    async def get_host_job_posting(self, job_posting_id: int) -> dict[str, Any] | None:
        """Read-only lookup into the host app's own `job_postings` table."""
        async with self._session() as session:
            row = (
                await session.execute(
                    text(
                        "SELECT id, title, requirements "
                        "FROM job_postings WHERE id = :id"
                    ),
                    {"id": job_posting_id},
                )
            ).mappings().first()
            return dict(row) if row else None

    async def create_pending_candidate_match(
        self, resume_id: int, job_posting_id: int
    ) -> dict[str, Any]:
        """Create a pending match row, deduped on (resume_id, job_posting_id).

        ``resume_id``/``job_posting_id`` are the *host app's* integer IDs
        (``resumes.id`` / ``job_postings.id``), not this app's own String
        resume/job IDs. If a match for the same pair already exists it is
        returned as-is (survives double-submit / retried requests).
        """
        async with self._session() as session:
            existing = await session.execute(
                select(CandidateMatch).where(
                    CandidateMatch.resume_id == resume_id,
                    CandidateMatch.job_posting_id == job_posting_id,
                )
            )
            found = existing.scalars().first()
            if found is not None:
                return self._candidate_match_to_dict(found)

            now = _now()
            row = CandidateMatch(
                resume_id=resume_id,
                job_posting_id=job_posting_id,
                status="pending",
                created_at=now,
                updated_at=now,
            )
            session.add(row)
            try:
                await session.commit()
            except IntegrityError:
                # A concurrent create won the (resume_id, job_posting_id)
                # unique constraint — return the existing row instead of
                # duplicating.
                await session.rollback()
                dup = await session.execute(
                    select(CandidateMatch).where(
                        CandidateMatch.resume_id == resume_id,
                        CandidateMatch.job_posting_id == job_posting_id,
                    )
                )
                found = dup.scalars().first()
                if found is not None:
                    logger.debug(
                        "Deduped concurrent candidate match create for "
                        "resume=%s job_posting=%s",
                        resume_id,
                        job_posting_id,
                    )
                    return self._candidate_match_to_dict(found)
                raise
            await session.refresh(row)
            return self._candidate_match_to_dict(row)

    async def update_candidate_match(
        self, match_id: int, updates: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Update a candidate match row (e.g. to persist a computed score)."""
        async with self._session() as session:
            row = await session.get(CandidateMatch, match_id)
            if row is None:
                return None
            for key, value in updates.items():
                setattr(row, key, value)
            row.updated_at = _now()
            await session.commit()
            await session.refresh(row)
            return self._candidate_match_to_dict(row)

    async def get_candidate_match(self, match_id: int) -> dict[str, Any] | None:
        """Get a candidate match by its own ID."""
        async with self._session() as session:
            row = await session.get(CandidateMatch, match_id)
            return self._candidate_match_to_dict(row) if row else None

    async def list_candidate_matches(
        self,
        *,
        job_posting_id: int | None = None,
        resume_id: int | None = None,
    ) -> list[dict[str, Any]]:
        """List candidate matches, optionally filtered by job posting or resume."""
        async with self._session() as session:
            stmt = select(CandidateMatch)
            if job_posting_id is not None:
                stmt = stmt.where(CandidateMatch.job_posting_id == job_posting_id)
            if resume_id is not None:
                stmt = stmt.where(CandidateMatch.resume_id == resume_id)
            result = await session.execute(stmt)
            return [self._candidate_match_to_dict(row) for row in result.scalars().all()]

    # -- Stats / maintenance ------------------------------------------------

    async def get_stats(self) -> dict[str, Any]:
        """Get database statistics."""
        async with self._session() as session:
            resumes = await session.scalar(select(func.count()).select_from(Resume))
            jobs = await session.scalar(select(func.count()).select_from(Job))
            return {
                "total_resumes": int(resumes or 0),
                "total_jobs": int(jobs or 0),
            }

    async def reset_database(self) -> None:
        """Reset by truncating user-document tables and clearing uploads.

        Clears resumes and jobs. Encrypted ``api_keys`` and ``candidate_matches``
        (the HR-database bridge) are preserved — matching the pre-existing
        behavior where a reset never wiped the user's stored credentials or the
        HR-side match history.
        """
        async with self._session() as session:
            await session.execute(delete(Job))
            await session.execute(delete(Resume))
            await session.commit()

        uploads_dir = settings.data_dir / "uploads"
        if uploads_dir.exists():
            shutil.rmtree(uploads_dir)
            uploads_dir.mkdir(parents=True, exist_ok=True)


# Global database instance
db = Database()
