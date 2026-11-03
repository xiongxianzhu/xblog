"""管理端 API 路由聚合。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.v1.admin.endpoints import health

admin_router = APIRouter(dependencies=[Depends(get_current_user)])
admin_router.include_router(health.router, tags=["admin-health"])
