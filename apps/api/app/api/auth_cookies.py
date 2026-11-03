"""认证 Cookie 辅助。"""

from __future__ import annotations

from typing import Literal, TypedDict

from fastapi import Response

from app.core.config import get_settings
from app.core.security import (
    ACCESS_COOKIE,
    OAUTH_STATE_COOKIE,
    REFRESH_COOKIE,
    create_access_token,
    create_refresh_token,
)

settings = get_settings()

class CookieOptions(TypedDict, total=False):
    httponly: bool
    secure: bool
    samesite: Literal["lax", "strict", "none"]
    path: str
    domain: str


COOKIE_KWARGS: CookieOptions = {
    "httponly": True,
    "secure": settings.cookie_secure,
    "samesite": "lax",
    "path": "/",
}


def _with_domain(kwargs: CookieOptions) -> CookieOptions:
    if settings.cookie_domain:
        return {**kwargs, "domain": settings.cookie_domain}
    return kwargs


def set_auth_cookies(response: Response, username: str) -> None:
    access_token = create_access_token(username)
    refresh_token = create_refresh_token(username)
    cookie_kwargs = _with_domain(COOKIE_KWARGS)
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
    cookie_kwargs = _with_domain({"path": "/"})
    response.delete_cookie(ACCESS_COOKIE, **cookie_kwargs)
    response.delete_cookie(REFRESH_COOKIE, **cookie_kwargs)


def set_oauth_state_cookie(response: Response, state: str) -> None:
    cookie_kwargs = _with_domain(COOKIE_KWARGS)
    response.set_cookie(OAUTH_STATE_COOKIE, state, max_age=600, **cookie_kwargs)


def clear_oauth_state_cookie(response: Response) -> None:
    cookie_kwargs = _with_domain({"path": "/"})
    response.delete_cookie(OAUTH_STATE_COOKIE, **cookie_kwargs)
