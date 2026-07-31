from pydantic import BaseModel


class CandidateBase(BaseModel):
    name: str


class CandidateCreate(CandidateBase):
    email: str


class CandidateOut(CandidateBase):
    id: int
