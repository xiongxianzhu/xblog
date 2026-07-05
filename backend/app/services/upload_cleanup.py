"""Managed upload orphan cleanup (covers, friend link logos)."""

from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.session import async_session_factory
from app.models.friend_link import FriendLink
from app.models.post import Post
from app.services.uploads import (
    FRIEND_LINK_LOGO_URL_PREFIX,
    POST_COVER_URL_PREFIX,
    get_upload_root,
    is_managed_friend_link_logo_url,
    is_managed_post_cover_url,
)

_FILENAME_PATTERN = re.compile(r"[\w.-]+")


@dataclass(frozen=True)
class CleanupReport:
    scanned: int
    deleted: int
    kept_referenced: int
    kept_recent: int
    deleted_paths: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


async def load_referenced_upload_urls(session: AsyncSession) -> set[str]:
    referenced: set[str] = set()

    cover_result = await session.exec(select(Post.cover_url).where(Post.cover_url.is_not(None)))
    for cover_url in cover_result.all():
        if is_managed_post_cover_url(cover_url):
            referenced.add(cover_url)

    logo_result = await session.exec(select(FriendLink.logo_url).where(FriendLink.logo_url.is_not(None)))
    for logo_url in logo_result.all():
        if is_managed_friend_link_logo_url(logo_url):
            referenced.add(logo_url)

    return referenced


def _scan_directory(
    *,
    directory: Path,
    url_prefix: str,
    referenced: set[str],
    max_age_seconds: int,
    now: float,
    dry_run: bool,
) -> tuple[int, int, int, int, list[str], list[str]]:
    scanned = 0
    deleted = 0
    kept_referenced = 0
    kept_recent = 0
    deleted_paths: list[str] = []
    warnings: list[str] = []

    if not directory.is_dir():
        return scanned, deleted, kept_referenced, kept_recent, deleted_paths, warnings

    with os.scandir(directory) as entries:
        for entry in entries:
            if not entry.is_file(follow_symlinks=False):
                continue
            if not _FILENAME_PATTERN.fullmatch(entry.name):
                continue

            scanned += 1
            api_url = f"{url_prefix}{entry.name}"
            path = Path(entry.path)

            if api_url in referenced:
                kept_referenced += 1
                continue

            age_seconds = now - entry.stat(follow_symlinks=False).st_mtime
            if age_seconds < max_age_seconds:
                kept_recent += 1
                continue

            deleted_paths.append(str(path))
            if dry_run:
                deleted += 1
                continue

            try:
                path.unlink(missing_ok=True)
                deleted += 1
            except OSError as exc:
                warnings.append(f"failed to delete {path}: {exc}")

    return scanned, deleted, kept_referenced, kept_recent, deleted_paths, warnings


async def cleanup_orphan_uploads(
    *,
    max_age_seconds: int = 3600,
    dry_run: bool = False,
    session: AsyncSession | None = None,
) -> CleanupReport:
    now = time.time()
    upload_root = get_upload_root()

    async def run(cleanup_session: AsyncSession) -> CleanupReport:
        referenced = await load_referenced_upload_urls(cleanup_session)

        totals = [0, 0, 0, 0]
        all_deleted_paths: list[str] = []
        all_warnings: list[str] = []

        for directory, url_prefix in (
            (upload_root / "covers", POST_COVER_URL_PREFIX),
            (upload_root / "link-logos", FRIEND_LINK_LOGO_URL_PREFIX),
        ):
            scanned, deleted, kept_referenced, kept_recent, deleted_paths, warnings = _scan_directory(
                directory=directory,
                url_prefix=url_prefix,
                referenced=referenced,
                max_age_seconds=max_age_seconds,
                now=now,
                dry_run=dry_run,
            )
            totals[0] += scanned
            totals[1] += deleted
            totals[2] += kept_referenced
            totals[3] += kept_recent
            all_deleted_paths.extend(deleted_paths)
            all_warnings.extend(warnings)

        return CleanupReport(
            scanned=totals[0],
            deleted=totals[1],
            kept_referenced=totals[2],
            kept_recent=totals[3],
            deleted_paths=all_deleted_paths,
            warnings=all_warnings,
        )

    if session is not None:
        return await run(session)

    async with async_session_factory() as cleanup_session:
        return await run(cleanup_session)
