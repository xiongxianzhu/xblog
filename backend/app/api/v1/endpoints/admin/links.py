"""管理端友链 API。"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.friend_link import FriendLink
from app.schemas.common import MessageResponse
from app.schemas.link import FriendLinkCreate, FriendLinkLogoUpload, FriendLinkPublic, FriendLinkUpdate
from app.services.uploads import (
    delete_friend_link_logo_file,
    is_managed_friend_link_logo_url,
    save_friend_link_logo,
)

router = APIRouter()


@router.get("/links", response_model=list[FriendLinkPublic])
async def list_links(session: SessionDep, _: CurrentUserDep) -> list[FriendLink]:
    result = await session.exec(select(FriendLink).order_by(FriendLink.sort_order, FriendLink.id))
    return list(result.all())


@router.post("/links/logo", response_model=FriendLinkLogoUpload)
async def upload_link_logo(
    _: CurrentUserDep,
    file: UploadFile = File(...),  # noqa: B008
) -> FriendLinkLogoUpload:
    logo_url = await save_friend_link_logo(file)
    return FriendLinkLogoUpload(logo_url=logo_url)


@router.delete("/links/logo", response_model=MessageResponse)
async def delete_uploaded_link_logo(
    _: CurrentUserDep,
    logo_url: str = Query(..., min_length=1),
) -> MessageResponse:
    if not is_managed_friend_link_logo_url(logo_url):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a managed logo URL")
    delete_friend_link_logo_file(logo_url)
    return MessageResponse(message="deleted")


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

    data = payload.model_dump(exclude_unset=True)
    if "logo_url" in data and data["logo_url"] is not None:
        new_logo = data["logo_url"].strip()
        if link.logo_url and link.logo_url != new_logo and is_managed_friend_link_logo_url(link.logo_url):
            delete_friend_link_logo_file(link.logo_url)
        data["logo_url"] = new_logo

    for key, value in data.items():
        setattr(link, key, value)
    await session.flush()
    await session.refresh(link)
    return link


@router.delete("/links/{link_id}", response_model=MessageResponse)
async def delete_link(link_id: int, session: SessionDep, _: CurrentUserDep) -> MessageResponse:
    link = await session.get(FriendLink, link_id)
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    if link.logo_url and is_managed_friend_link_logo_url(link.logo_url):
        delete_friend_link_logo_file(link.logo_url)
    await session.delete(link)
    return MessageResponse(message="deleted")
