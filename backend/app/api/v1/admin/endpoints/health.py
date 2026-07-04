"""管理端健康检查。"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def admin_health() -> dict[str, str]:
    return {"status": "ok"}
