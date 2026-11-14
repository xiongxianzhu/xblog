"""Authenticated media-library operations."""

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, update
from sqlalchemy.exc import IntegrityError
from sqlmodel import col, select
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool

from app.api.deps import CurrentUserDep, SessionDep
from app.core.timezone import now
from app.models.media import MediaAsset, MediaGroup
from app.schemas.common import MessageResponse
from app.schemas.media import (
    MediaGroupCreate,
    MediaGroupName,
    MediaGroupPublic,
    MediaGroups,
    MediaKind,
    MediaList,
    MediaPublic,
    MediaUpdate,
)
from app.services import media

router = APIRouter()


class MediaArchiveRequest(BaseModel):
    ids: list[Annotated[int, Field(gt=0)]] = Field(min_length=1, max_length=100)


@router.post("/media/archive")
async def download_archive(payload: MediaArchiveRequest, session: SessionDep, _: CurrentUserDep):
    ids = list(dict.fromkeys(payload.ids))
    assets = (await session.exec(select(MediaAsset).where(col(MediaAsset.id).in_(ids)))).all()
    by_id = {asset.id: asset for asset in assets}
    if len(by_id) != len(ids):
        raise HTTPException(status_code=404, detail="MEDIA_ARCHIVE_SOURCE_MISSING")
    archive = await run_in_threadpool(media.build_archive, [by_id[item] for item in ids])

    def chunks():
        try:
            while chunk := archive.read(1024 * 1024):
                yield chunk
        finally:
            archive.close()

    return StreamingResponse(
        chunks(),
        media_type="application/zip",
        background=BackgroundTask(archive.close),
        headers={"Content-Disposition": 'attachment; filename="xblog-media.zip"', "Cache-Control": "no-store"},
    )


@router.get("/media/groups", response_model=MediaGroups)
async def list_groups(session: SessionDep, _: CurrentUserDep, kind: MediaKind) -> MediaGroups:
    groups = (await session.exec(select(MediaGroup).where(MediaGroup.kind == kind).order_by(col(MediaGroup.id)))).all()
    counts = dict(
        (
            await session.exec(
                select(MediaAsset.group_id, func.count())
                .where(MediaAsset.kind == kind)
                .group_by(col(MediaAsset.group_id))
            )
        ).all()
    )
    return MediaGroups(
        items=[
            MediaGroupPublic.model_validate({**group.model_dump(), "count": counts.get(group.id, 0)})
            for group in groups
        ],
        total_count=sum(counts.values()),
        ungrouped_count=counts.get(None, 0),
    )


async def _save_group(session: SessionDep, group: MediaGroup) -> MediaGroupPublic:
    session.add(group)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="当前素材类型中已存在同名分组") from exc
    await session.refresh(group)
    count = (
        await session.exec(select(func.count()).select_from(MediaAsset).where(MediaAsset.group_id == group.id))
    ).one()
    return MediaGroupPublic.model_validate({**group.model_dump(), "count": count})


@router.post("/media/groups", response_model=MediaGroupPublic, status_code=201)
async def create_group(payload: MediaGroupCreate, session: SessionDep, _: CurrentUserDep) -> MediaGroupPublic:
    return await _save_group(session, MediaGroup(kind=payload.kind, name=payload.name))


@router.patch("/media/groups/{group_id}", response_model=MediaGroupPublic)
async def rename_group(
    group_id: int, payload: MediaGroupName, session: SessionDep, _: CurrentUserDep
) -> MediaGroupPublic:
    group = await session.get(MediaGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="分组不存在")
    group.name = payload.name
    return await _save_group(session, group)


@router.delete("/media/groups/{group_id}", response_model=MessageResponse)
async def remove_group(group_id: int, session: SessionDep, _: CurrentUserDep) -> MessageResponse:
    group = await session.get(MediaGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="分组不存在")
    await session.exec(update(MediaAsset).where(col(MediaAsset.group_id) == group_id).values(group_id=None))
    await session.delete(group)
    await session.commit()
    return MessageResponse(message="分组已删除，素材已移入未分组")


@router.get("/media", response_model=MediaList)
async def list_media(
    session: SessionDep,
    _: CurrentUserDep,
    kind: MediaKind,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, max_length=200),
    group_id: int | None = Query(default=None, ge=0),
) -> MediaList:
    conditions = [col(MediaAsset.kind) == kind]
    if group_id is not None:
        conditions.append(col(MediaAsset.group_id).is_(None) if group_id == 0 else col(MediaAsset.group_id) == group_id)
    if q and q.strip():
        term = "%" + q.strip().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%"
        conditions.append(
            or_(col(MediaAsset.name).ilike(term, escape="!"), col(MediaAsset.original_name).ilike(term, escape="!"))
        )
    total = (await session.exec(select(func.count()).select_from(MediaAsset).where(*conditions))).one()
    rows = (
        await session.exec(
            select(MediaAsset)
            .where(*conditions)
            .order_by(col(MediaAsset.created_at).desc(), col(MediaAsset.id).desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return MediaList(items=[media.to_public(row) for row in rows], total=total, page=page, page_size=page_size)


@router.post("/media", response_model=MediaPublic, status_code=201)
async def upload_media(
    session: SessionDep,
    _: CurrentUserDep,
    kind: Annotated[MediaKind, Form()],
    file: Annotated[UploadFile, File()],
    group_id: Annotated[int | None, Form()] = None,
) -> MediaPublic:
    try:
        return media.to_public(await media.upload_asset(session, file, kind, group_id))
    finally:
        await file.close()


@router.get("/media/{asset_id}/download")
async def download_media(asset_id: int, session: SessionDep, _: CurrentUserDep) -> FileResponse:
    asset = await media.get_asset(session, asset_id)
    path = media.asset_path(asset.filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="素材文件不存在")
    return FileResponse(
        path, media_type=asset.mime_type, filename=asset.original_name, headers={"X-Content-Type-Options": "nosniff"}
    )


@router.patch("/media/{asset_id}", response_model=MediaPublic)
async def update_media(asset_id: int, payload: MediaUpdate, session: SessionDep, _: CurrentUserDep) -> MediaPublic:
    asset = await media.get_asset(session, asset_id)
    if "group_id" in payload.model_fields_set:
        await media.validate_group(session, payload.group_id, asset.kind)
        asset.group_id = payload.group_id
    if payload.name is not None:
        asset.name = payload.name
    asset.updated_at = now()
    session.add(asset)
    await session.commit()
    await session.refresh(asset)
    return media.to_public(asset)


@router.delete("/media/{asset_id}", response_model=MessageResponse)
async def delete_media(asset_id: int, session: SessionDep, _: CurrentUserDep) -> MessageResponse:
    await media.delete_asset(session, await media.get_asset(session, asset_id))
    return MessageResponse(message="素材已删除")
