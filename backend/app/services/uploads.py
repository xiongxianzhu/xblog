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
MAX_AVATAR_BYTES = 2 * 1024 * 1024
AVATAR_URL_PREFIX = "/api/v1/uploads/avatars/"


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
