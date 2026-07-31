from fastapi import APIRouter

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("/")
async def list_candidates():
    return []
