# app/routers/job_postings.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.job_posting import JobPosting
from app.schemas.job_posting import JobPostingCreate, JobPostingOut
from app.auth.dependencies import require_permission

router = APIRouter(prefix="/job-postings", tags=["Job Postings"])


@router.post("/", response_model=JobPostingOut)
def create_job_posting(
    payload: JobPostingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("job_postings", "create")),
):
    job = JobPosting(
        title=payload.title,
        requirements=payload.requirements,
        created_by=current_user.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/", response_model=list[JobPostingOut])
def list_job_postings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("job_postings", "read")),
):
    return db.query(JobPosting).order_by(JobPosting.created_at.desc()).all()