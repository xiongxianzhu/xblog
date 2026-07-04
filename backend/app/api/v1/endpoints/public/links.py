"""公开友链 API。"""

from __future__ import annotations

from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import SessionDep
from app.models.friend_link import FriendLink
from app.schemas.link import FriendLinkPublic

router = APIRouter()


@router.get("/links", response_model=list[FriendLinkPublic])
async def list_links(session: SessionDep) -> list[FriendLink]:
    result = await session.exec(select(FriendLink).order_by(FriendLink.sort_order, FriendLink.id))
    return list(result.all())
