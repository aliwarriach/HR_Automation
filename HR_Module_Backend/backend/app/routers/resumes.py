# app/routers/resumes.py
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import require_permission
from app.database import get_db
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import ResumeDetailFields, ResumeOut
from app.services import ats_client
from app.services.resume_ingestion_service import poll_and_ingest, run_ats_scoring

router = APIRouter(prefix="/resumes", tags=["Resumes"])

# In-memory cache for /resume-detail lookups (live LLM call upstream, not cached
# there). Process-lifetime only — fine for a prototype single-instance backend.
_resume_detail_cache: dict[int, dict] = {}


@router.post("/refresh", response_model=list[ResumeOut])
def refresh_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("resumes", "create")),
):
    """Poll the inbox now and return any newly ingested resumes."""
    return poll_and_ingest(db)


def _get_resume_or_404(resume_id: int, db: Session) -> Resume:
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")
    return resume


@router.get("/", response_model=list[ResumeOut])
def list_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("resumes", "read")),
):
    return db.query(Resume).order_by(Resume.received_at.desc()).all()


@router.get("/{resume_id}", response_model=ResumeOut)
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("resumes", "read")),
):
    return _get_resume_or_404(resume_id, db)


@router.post("/{resume_id}/score", response_model=ResumeOut)
def score_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("resumes", "update")),
):
    """Re-run ATS scoring for a resume (e.g. to retry after a prior failure)."""
    resume = _get_resume_or_404(resume_id, db)
    run_ats_scoring(db, resume)
    db.refresh(resume)
    return resume


@router.get("/{resume_id}/detail", response_model=ResumeDetailFields)
def get_resume_detail(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("resumes", "read")),
):
    """LLM-extracted resume summary (name, university, CGPA, etc.) for the Resume Detail page only."""
    _get_resume_or_404(resume_id, db)

    cached = _resume_detail_cache.get(resume_id)
    if cached is not None:
        return cached

    try:
        data = ats_client.fetch_resume_detail(resume_id)
    except ats_client.AtsResumeNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ats_client.AtsClientError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    _resume_detail_cache[resume_id] = data
    return data


@router.get("/{resume_id}/download")
def download_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("resumes", "read")),
):
    resume = _get_resume_or_404(resume_id, db)
    if not Path(resume.file_path).exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume file is missing from storage")

    return FileResponse(path=resume.file_path, filename=resume.file_name, media_type="application/pdf")
