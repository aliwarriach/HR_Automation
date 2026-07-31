from pydantic import BaseModel


class ApplicationBase(BaseModel):
    candidate_id: int
    job_id: int


class ApplicationCreate(ApplicationBase):
    cover_letter: str | None = None


class ApplicationOut(ApplicationBase):
    id: int
