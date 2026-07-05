"""C 端 API 路由聚合。"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import auth
from app.api.v1.endpoints import auth_oauth
from app.api.v1.endpoints import auth_sms
from app.api.v1.endpoints.admin import ai_complete as admin_ai_complete
from app.api.v1.endpoints.admin import ai_providers as admin_ai_providers
from app.api.v1.endpoints.admin import ai_skills as admin_ai_skills
from app.api.v1.endpoints.admin import auth_settings as admin_auth_settings
from app.api.v1.endpoints.admin import links as admin_links
from app.api.v1.endpoints.admin import pages as admin_pages
from app.api.v1.endpoints.admin import pageviews as admin_pageviews
from app.api.v1.endpoints.admin import posts as admin_posts
from app.api.v1.endpoints.admin import site_theme as admin_site_theme
from app.api.v1.endpoints.admin import users as admin_users
from app.api.v1.endpoints.public import health
from app.api.v1.endpoints.public import links as public_links
from app.api.v1.endpoints.public import pages as public_pages
from app.api.v1.endpoints.public import pageviews as public_pageviews
from app.api.v1.endpoints.public import posts as public_posts
from app.api.v1.endpoints.public import search as public_search
from app.api.v1.endpoints.public import site_theme as public_site_theme

api_router = APIRouter()
api_router.include_router(health.router, prefix="/public", tags=["public"])
api_router.include_router(public_posts.router, prefix="/public", tags=["public"])
api_router.include_router(public_pages.router, prefix="/public", tags=["public"])
api_router.include_router(public_links.router, prefix="/public", tags=["public"])
api_router.include_router(public_search.router, prefix="/public", tags=["public"])
api_router.include_router(public_pageviews.router, prefix="/public", tags=["public"])
api_router.include_router(public_site_theme.router, prefix="/public", tags=["public"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(auth_oauth.router, prefix="/auth", tags=["auth"])
api_router.include_router(auth_sms.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin_posts.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_pages.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_links.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_pageviews.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_users.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_site_theme.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_auth_settings.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_ai_providers.router, prefix="/admin/ai", tags=["admin-ai"])
api_router.include_router(admin_ai_skills.router, prefix="/admin/ai", tags=["admin-ai"])
api_router.include_router(admin_ai_complete.router, prefix="/admin/ai", tags=["admin-ai"])
