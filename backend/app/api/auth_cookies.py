"""认证 Cookie 辅助。"""

from __future__ import annotations

from fastapi import Response

from app.core.config import get_settings
from app.core.security import (
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    create_access_token,
    create_refresh_token,
)

settings = get_settings()


def set_auth_cookies(response: Response, username: str) -> None:
    access_token = create_access_token(username)
    refresh_token = create_refresh_token(username)
    cookie_kwargs = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": "lax",
        "path": "/",
    }
    if settings.cookie_domain:
        cookie_kwargs["domain"] = settings.cookie_domain
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **cookie_kwargs,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        **cookie_kwargs,
    )


def clear_auth_cookies(response: Response) -> None:
    cookie_kwargs: dict[str, str | bool] = {"path": "/"}
    if settings.cookie_domain:
        cookie_kwargs["domain"] = settings.cookie_domain
    response.delete_cookie(ACCESS_COOKIE, **cookie_kwargs)
    response.delete_cookie(REFRESH_COOKIE, **cookie_kwargs)
