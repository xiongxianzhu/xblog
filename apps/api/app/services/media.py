"""Validated, bounded media uploads and media-library persistence."""

from __future__ import annotations

import logging
import re
import tempfile
import zipfile
from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import or_
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.models.friend_link import FriendLink
from app.models.media import MediaAsset, MediaGroup
from app.models.page import Page
from app.models.post import Post
from app.models.site_setting import SiteSetting
from app.models.user import User
from app.schemas.media import MediaKind, MediaPublic
from app.services.uploads import get_upload_root

logger = logging.getLogger(__name__)
MEDIA_URL_PREFIX = "/api/v1/uploads/media/"
MAX_BYTES = {"image": 20 * 1024 * 1024, "audio": 100 * 1024 * 1024, "video": 500 * 1024 * 1024}
FORMATS = {
    ".jpg": ("image", "image/jpeg", ".jpg"),
    ".jpeg": ("image", "image/jpeg", ".jpg"),
    ".png": ("image", "image/png", ".png"),
    ".gif": ("image", "image/gif", ".gif"),
    ".webp": ("image", "image/webp", ".webp"),
    ".mp3": ("audio", "audio/mpeg", ".mp3"),
    ".wav": ("audio", "audio/wav", ".wav"),
    ".ogg": ("audio", "audio/ogg", ".ogg"),
    ".flac": ("audio", "audio/flac", ".flac"),
    ".m4a": ("audio", "audio/mp4", ".m4a"),
    ".mp4": ("video", "video/mp4", ".mp4"),
    ".webm": ("video", "video/webm", ".webm"),
}


def asset_path(filename: str) -> Path:
    if not re.fullmatch(r"[a-f0-9]{32}\.(jpg|png|gif|webp|mp3|wav|ogg|flac|m4a|mp4|webm)", filename):
        raise HTTPException(status_code=404, detail="素材文件不存在")
    root = (get_upload_root() / "media").resolve()
    path = (root / filename).resolve()
    if path.parent != root:
        raise HTTPException(status_code=404, detail="素材文件不存在")
    return path


def to_public(asset: MediaAsset) -> MediaPublic:
    return MediaPublic.model_validate({**asset.model_dump(), "url": MEDIA_URL_PREFIX + asset.filename})


async def get_asset(session: AsyncSession, asset_id: int) -> MediaAsset:
    asset = await session.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="素材不存在")
    return asset


async def validate_group(session: AsyncSession, group_id: int | None, kind: str) -> None:
    if group_id is None:
        return
    group = await session.get(MediaGroup, group_id)
    if group is None or group.kind != kind:
        raise HTTPException(status_code=422, detail="请选择当前素材类型下的有效分组")


def _matches_format(header: bytes, extension: str) -> bool:
    if extension == ".jpg":
        return header.startswith(b"\xff\xd8\xff")
    if extension == ".png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if extension == ".gif":
        return header.startswith((b"GIF87a", b"GIF89a"))
    if extension in (".webp", ".wav"):
        return header.startswith(b"RIFF") and header[8:12] == (b"WEBP" if extension == ".webp" else b"WAVE")
    if extension == ".mp3":
        return header.startswith(b"ID3") or (len(header) >= 2 and header[0] == 255 and header[1] & 224 == 224)
    if extension == ".ogg":
        return header.startswith(b"OggS") and (b"OpusHead" in header or b"\x01vorbis" in header)
    if extension == ".flac":
        return header.startswith(b"fLaC")
    if extension in (".mp4", ".m4a"):
        return len(header) >= 12 and header[4:8] == b"ftyp"
    if extension == ".webm":
        return header.startswith(b"\x1aE\xdf\xa3") and b"webm" in header[:4096]
    return False


def _store_file(stream: BinaryIO, extension: str, kind: str) -> tuple[str, int]:
    stream.seek(0)
    header = stream.read(65536)
    if not header:
        raise HTTPException(status_code=422, detail="不能上传空文件")
    if not _matches_format(header, extension):
        raise HTTPException(status_code=422, detail="文件内容与格式不匹配，请上传有效的图片、音频或视频")
    stream.seek(0)
    filename = f"{uuid4().hex}{extension}"
    target = asset_path(filename)
    target.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    try:
        with target.open("xb") as output:
            while chunk := stream.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_BYTES[kind]:
                    raise HTTPException(status_code=413, detail=f"文件不能超过 {MAX_BYTES[kind] // 1024 // 1024} MB")
                output.write(chunk)
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    return filename, size


async def upload_asset(session: AsyncSession, file: UploadFile, kind: MediaKind, group_id: int | None) -> MediaAsset:
    await validate_group(session, group_id, kind)
    original = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1].strip()
    if not original or len(original) > 255:
        raise HTTPException(status_code=422, detail="文件名不能为空且不能超过 255 字符")
    format_info = FORMATS.get(Path(original).suffix.lower())
    if format_info is None or format_info[0] != kind:
        raise HTTPException(status_code=422, detail="文件格式不受支持，或不属于当前素材类型")
    _, mime, extension = format_info
    filename, size = await run_in_threadpool(_store_file, file.file, extension, kind)
    asset = MediaAsset(
        kind=kind,
        name=original,
        original_name=original,
        filename=filename,
        mime_type=mime,
        size_bytes=size,
        group_id=group_id,
    )
    try:
        session.add(asset)
        await session.commit()
        await session.refresh(asset)
    except BaseException:
        await session.rollback()
        asset_path(filename).unlink(missing_ok=True)
        raise
    return asset


async def ensure_not_referenced(session: AsyncSession, asset: MediaAsset) -> None:
    url = MEDIA_URL_PREFIX + asset.filename
    queries = [
        select(Post.id).where(or_(col(Post.content_md).contains(url), col(Post.cover_url) == url)).limit(1),
        select(Page.id).where(col(Page.content_md).contains(url)).limit(1),
        select(FriendLink.id).where(FriendLink.logo_url == url).limit(1),
        select(User.id).where(User.avatar_url == url).limit(1),
        select(SiteSetting.key).where(col(SiteSetting.value).contains(url)).limit(1),
    ]
    for query in queries:
        if (await session.exec(query)).first() is not None:
            raise HTTPException(status_code=409, detail="素材仍被文章、页面或站点配置引用，请先移除引用后再删除")


async def delete_asset(session: AsyncSession, asset: MediaAsset) -> None:
    await ensure_not_referenced(session, asset)
    path = asset_path(asset.filename)
    await session.delete(asset)
    await session.flush()
    try:
        await run_in_threadpool(path.unlink, missing_ok=True)
    except OSError as exc:
        logger.exception("Media file deletion failed: %s", path)
        await session.rollback()
        raise HTTPException(status_code=503, detail="MEDIA_FILE_DELETE_FAILED") from exc
    # Only report success once both the source file and database row are gone.
    # If commit fails after unlink, the retained row can be deleted again safely.
    await session.commit()


def build_archive(assets: list[MediaAsset]):
    archive = tempfile.TemporaryFile()
    try:
        entries = [(asset, asset_path(asset.filename)) for asset in assets]
        if sum(path.stat().st_size for _, path in entries) > 512 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="MEDIA_ARCHIVE_TOO_LARGE")
        used: set[str] = set()
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED) as output:
            for asset, path in entries:
                name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", asset.original_name).strip(" .") or path.name
                stem, suffix = Path(name).stem, Path(name).suffix
                unique = name
                number = 2
                while unique.casefold() in used:
                    unique = f"{stem[:180]} ({number}){suffix}"
                    number += 1
                used.add(unique.casefold())
                output.write(path, unique)
        archive.seek(0)
        return archive
    except FileNotFoundError as exc:
        archive.close()
        raise HTTPException(status_code=404, detail="MEDIA_ARCHIVE_SOURCE_MISSING") from exc
    except BaseException:
        archive.close()
        raise
