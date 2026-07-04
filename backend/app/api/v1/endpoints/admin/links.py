"""管理端友链 API。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.friend_link import FriendLink
from app.schemas.common import MessageResponse
from app.schemas.link import FriendLinkCreate, FriendLinkPublic, FriendLinkUpdate

router = APIRouter()


@router.get("/links", response_model=list[FriendLinkPublic])
async def list_links(session: SessionDep, _: CurrentUserDep) -> list[FriendLink]:
    result = await session.exec(select(FriendLink).order_by(FriendLink.sort_order, FriendLink.id))
    return list(result.all())


@router.post("/links", response_model=FriendLinkPublic, status_code=status.HTTP_201_CREATED)
async def create_link(
    payload: FriendLinkCreate,
    session: SessionDep,
    _: CurrentUserDep,
) -> FriendLink:
    link = FriendLink(**payload.model_dump())
    session.add(link)
    await session.flush()
    await session.refresh(link)
    return link


@router.patch("/links/{link_id}", response_model=FriendLinkPublic)
async def update_link(
    link_id: int,
    payload: FriendLinkUpdate,
    session: SessionDep,
    _: CurrentUserDep,
) -> FriendLink:
    link = await session.get(FriendLink, link_id)
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(link, key, value)
    await session.flush()
    await session.refresh(link)
    return link


@router.delete("/links/{link_id}", response_model=MessageResponse)
async def delete_link(link_id: int, session: SessionDep, _: CurrentUserDep) -> MessageResponse:
    link = await session.get(FriendLink, link_id)
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    await session.delete(link)
    return MessageResponse(message="deleted")
