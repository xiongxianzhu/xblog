"""发布后触发 Next.js ISR revalidate。"""

from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def trigger_revalidate(paths: list[str], *, layout: bool = False) -> None:
    settings = get_settings()
    if not settings.revalidate_secret or not settings.revalidate_url:
        logger.warning(
            "Skip ISR revalidate (REVALIDATE_SECRET not set). Public theme/pages may stay stale until cache expires."
        )
        return
    payload = {"secret": settings.revalidate_secret, "paths": paths, "layout": layout}
    if layout:
        payload["tags"] = ["site-theme"]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(settings.revalidate_url, json=payload)
            response.raise_for_status()
    except httpx.HTTPError:
        logger.exception("Failed to trigger ISR revalidate for paths: %s", paths)
