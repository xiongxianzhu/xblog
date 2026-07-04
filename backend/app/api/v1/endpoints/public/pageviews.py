"""访问统计 API。"""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import SessionDep
from app.models.page_view import PageView
from app.schemas.common import MessageResponse
from app.schemas.page_view import PageViewCreate

router = APIRouter()


@router.post("/pageviews", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_page_view(session: SessionDep, payload: PageViewCreate) -> MessageResponse:
    session.add(PageView(path=payload.path, referrer=payload.referrer))
    return MessageResponse(message="ok")
