"""管理端 API 路由聚合。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.v1.admin.endpoints import health
from app.core.security import admin_required

admin_router = APIRouter(dependencies=[Depends(admin_required)])
admin_router.include_router(health.router, tags=["admin-health"])
