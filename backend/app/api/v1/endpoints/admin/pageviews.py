"""管理端访问统计 API。"""

from __future__ import annotations

from fastapi import APIRouter
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.page_view import PageView
from app.schemas.page_view import PageViewStats

router = APIRouter()


@router.get("/pageviews", response_model=list[PageViewStats])
async def page_view_stats(session: SessionDep, _: CurrentUserDep) -> list[PageViewStats]:
    stmt = (
        select(PageView.path, func.count(PageView.id).label("count"))
        .group_by(PageView.path)
        .order_by(func.count(PageView.id).desc())
    )
    result = await session.exec(stmt)
    return [PageViewStats(path=row[0], count=row[1]) for row in result.all()]
