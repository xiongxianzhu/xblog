"""上传孤儿文件清理测试。"""

from __future__ import annotations

import asyncio
import os
import time
from pathlib import Path

import pytest

from app.core.config import get_settings
from app.db.session import async_session_factory
from app.models.friend_link import FriendLink
from app.models.post import Post
from app.services.upload_cleanup import cleanup_orphan_uploads
from app.services.uploads import FRIEND_LINK_LOGO_URL_PREFIX, POST_COVER_URL_PREFIX


@pytest.fixture
def upload_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    get_settings.cache_clear()
    (tmp_path / "covers").mkdir()
    (tmp_path / "link-logos").mkdir()
    yield tmp_path
    get_settings.cache_clear()


def touch_file(directory: Path, name: str, *, age_seconds: int = 0) -> Path:
    path = directory / name
    path.write_bytes(b"x")
    if age_seconds:
        old_mtime = time.time() - age_seconds
        os.utime(path, (old_mtime, old_mtime))
    return path


def test_deletes_unreferenced_old_file(upload_root: Path) -> None:
    path = touch_file(upload_root / "covers", "cover-old.jpg", age_seconds=7200)

    report = asyncio.run(cleanup_orphan_uploads(max_age_seconds=3600))

    assert report.scanned == 1
    assert report.deleted == 1
    assert not path.is_file()


def test_keeps_unreferenced_recent_file(upload_root: Path) -> None:
    path = touch_file(upload_root / "covers", "cover-new.jpg", age_seconds=600)

    report = asyncio.run(cleanup_orphan_uploads(max_age_seconds=3600))

    assert report.scanned == 1
    assert report.deleted == 0
    assert report.kept_recent == 1
    assert path.is_file()


def test_keeps_referenced_cover(upload_root: Path) -> None:
    cover_url = f"{POST_COVER_URL_PREFIX}cover-kept.jpg"
    path = touch_file(upload_root / "covers", "cover-kept.jpg", age_seconds=7200)

    async def seed_post() -> None:
        async with async_session_factory() as session:
            session.add(
                Post(
                    title="Cover post",
                    slug="cover-post",
                    cover_url=cover_url,
                )
            )
            await session.commit()

    asyncio.run(seed_post())

    report = asyncio.run(cleanup_orphan_uploads(max_age_seconds=3600))

    assert report.kept_referenced >= 1
    assert path.is_file()
    assert report.deleted == 0


def test_keeps_referenced_link_logo(upload_root: Path) -> None:
    logo_url = f"{FRIEND_LINK_LOGO_URL_PREFIX}link-kept.png"
    path = touch_file(upload_root / "link-logos", "link-kept.png", age_seconds=7200)

    async def seed_link() -> None:
        async with async_session_factory() as session:
            session.add(
                FriendLink(
                    name="Example",
                    url="https://example.com",
                    logo_url=logo_url,
                )
            )
            await session.commit()

    asyncio.run(seed_link())

    report = asyncio.run(cleanup_orphan_uploads(max_age_seconds=3600))

    assert report.kept_referenced >= 1
    assert path.is_file()
    assert report.deleted == 0


def test_dry_run_does_not_delete(upload_root: Path) -> None:
    path = touch_file(upload_root / "covers", "cover-dry.jpg", age_seconds=7200)

    report = asyncio.run(cleanup_orphan_uploads(max_age_seconds=3600, dry_run=True))

    assert path.is_file()
    assert report.deleted == 1
    assert report.deleted_paths == [str(path)]


def test_skips_invalid_filename(upload_root: Path) -> None:
    path = touch_file(upload_root / "covers", "bad name.jpg", age_seconds=7200)

    report = asyncio.run(cleanup_orphan_uploads(max_age_seconds=3600))

    assert report.scanned == 0
    assert report.deleted == 0
    assert path.is_file()


def test_missing_directory_ok(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    get_settings.cache_clear()
    (tmp_path / "covers").mkdir()

    report = asyncio.run(cleanup_orphan_uploads(max_age_seconds=3600))

    assert report.scanned == 0
    assert report.deleted == 0
    get_settings.cache_clear()
