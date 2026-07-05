"""用户头像等上传文件处理。"""

from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

ALLOWED_AVATAR_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_AVATAR_BYTES = 5 * 1024 * 1024
MAX_SITE_LOGO_BYTES = 2 * 1024 * 1024
MAX_POST_COVER_BYTES = 5 * 1024 * 1024
MAX_FRIEND_LINK_LOGO_BYTES = 5 * 1024 * 1024
AVATAR_URL_PREFIX = "/api/v1/uploads/avatars/"
SITE_LOGO_URL_PREFIX = "/api/v1/uploads/site/"
POST_COVER_URL_PREFIX = "/api/v1/uploads/covers/"
FRIEND_LINK_LOGO_URL_PREFIX = "/api/v1/uploads/link-logos/"


def get_upload_root() -> Path:
    root = Path(get_settings().upload_dir)
    if not root.is_absolute():
        root = Path.cwd() / root
    return root


def avatar_url_to_path(avatar_url: str | None) -> Path | None:
    if not avatar_url or not avatar_url.startswith(AVATAR_URL_PREFIX):
        return None
    filename = avatar_url.removeprefix(AVATAR_URL_PREFIX)
    if not filename or ".." in filename or "/" in filename or "\\" in filename:
        return None
    if not re.fullmatch(r"[\w.-]+", filename):
        return None
    return get_upload_root() / "avatars" / filename


def delete_avatar_file(avatar_url: str | None) -> None:
    path = avatar_url_to_path(avatar_url)
    if path is None or not path.is_file():
        return
    path.unlink(missing_ok=True)


def is_managed_site_logo_url(logo_url: str | None) -> bool:
    return bool(logo_url and logo_url.startswith(SITE_LOGO_URL_PREFIX))


def site_logo_url_to_path(logo_url: str | None) -> Path | None:
    if not logo_url or not logo_url.startswith(SITE_LOGO_URL_PREFIX):
        return None
    filename = logo_url.removeprefix(SITE_LOGO_URL_PREFIX)
    if not filename or ".." in filename or "/" in filename or "\\" in filename:
        return None
    if not re.fullmatch(r"[\w.-]+", filename):
        return None
    return get_upload_root() / "site" / filename


def delete_site_logo_file(logo_url: str | None) -> None:
    path = site_logo_url_to_path(logo_url)
    if path is None or not path.is_file():
        return
    path.unlink(missing_ok=True)


async def save_site_logo(file: UploadFile) -> str:
    content_type = file.content_type or ""
    extension = ALLOWED_AVATAR_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(content) > MAX_SITE_LOGO_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    site_dir = get_upload_root() / "site"
    site_dir.mkdir(parents=True, exist_ok=True)
    filename = f"logo-{uuid4().hex}{extension}"
    (site_dir / filename).write_bytes(content)
    return f"{SITE_LOGO_URL_PREFIX}{filename}"


def is_managed_post_cover_url(cover_url: str | None) -> bool:
    return bool(cover_url and cover_url.startswith(POST_COVER_URL_PREFIX))


def post_cover_url_to_path(cover_url: str | None) -> Path | None:
    if not cover_url or not cover_url.startswith(POST_COVER_URL_PREFIX):
        return None
    filename = cover_url.removeprefix(POST_COVER_URL_PREFIX)
    if not filename or ".." in filename or "/" in filename or "\\" in filename:
        return None
    if not re.fullmatch(r"[\w.-]+", filename):
        return None
    return get_upload_root() / "covers" / filename


def delete_post_cover_file(cover_url: str | None) -> None:
    path = post_cover_url_to_path(cover_url)
    if path is None or not path.is_file():
        return
    path.unlink(missing_ok=True)


async def save_post_cover(file: UploadFile) -> str:
    content_type = file.content_type or ""
    extension = ALLOWED_AVATAR_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(content) > MAX_POST_COVER_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    covers_dir = get_upload_root() / "covers"
    covers_dir.mkdir(parents=True, exist_ok=True)
    filename = f"cover-{uuid4().hex}{extension}"
    (covers_dir / filename).write_bytes(content)
    return f"{POST_COVER_URL_PREFIX}{filename}"


def is_managed_friend_link_logo_url(logo_url: str | None) -> bool:
    return bool(logo_url and logo_url.startswith(FRIEND_LINK_LOGO_URL_PREFIX))


def friend_link_logo_url_to_path(logo_url: str | None) -> Path | None:
    if not logo_url or not logo_url.startswith(FRIEND_LINK_LOGO_URL_PREFIX):
        return None
    filename = logo_url.removeprefix(FRIEND_LINK_LOGO_URL_PREFIX)
    if not filename or ".." in filename or "/" in filename or "\\" in filename:
        return None
    if not re.fullmatch(r"[\w.-]+", filename):
        return None
    return get_upload_root() / "link-logos" / filename


def delete_friend_link_logo_file(logo_url: str | None) -> None:
    path = friend_link_logo_url_to_path(logo_url)
    if path is None or not path.is_file():
        return
    path.unlink(missing_ok=True)


async def save_friend_link_logo(file: UploadFile) -> str:
    content_type = file.content_type or ""
    extension = ALLOWED_AVATAR_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(content) > MAX_FRIEND_LINK_LOGO_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    logos_dir = get_upload_root() / "link-logos"
    logos_dir.mkdir(parents=True, exist_ok=True)
    filename = f"link-{uuid4().hex}{extension}"
    (logos_dir / filename).write_bytes(content)
    return f"{FRIEND_LINK_LOGO_URL_PREFIX}{filename}"


async def save_user_avatar(username: str, file: UploadFile) -> str:
    content_type = file.content_type or ""
    extension = ALLOWED_AVATAR_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    avatars_dir = get_upload_root() / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{username}-{uuid4().hex}{extension}"
    (avatars_dir / filename).write_bytes(content)
    return f"{AVATAR_URL_PREFIX}{filename}"
