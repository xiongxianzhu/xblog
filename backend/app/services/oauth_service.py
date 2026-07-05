"""GitHub / 微信 OAuth。"""

from __future__ import annotations

from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import get_settings
from app.core.security import create_token, decode_token
from app.core.timezone import now
from app.models.user import User
from app.services.users import ensure_user_can_authenticate

settings = get_settings()

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"

WECHAT_QRCONNECT_URL = "https://open.weixin.qq.com/connect/qrconnect"
WECHAT_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token"
WECHAT_USERINFO_URL = "https://api.weixin.qq.com/sns/userinfo"


def oauth_callback_url(provider: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/api/v1/auth/oauth/{provider}/callback"


def admin_redirect(path: str = "/admin") -> str:
    return f"{settings.frontend_url.rstrip('/')}{path}"


def create_oauth_state(*, provider: str, mode: str, username: str | None = None) -> str:
    payload: dict[str, str] = {"type": "oauth_state", "provider": provider, "mode": mode}
    if username:
        payload["sub"] = username
    return create_token(payload, timedelta(minutes=10))


def parse_oauth_state(state: str, *, provider: str) -> dict[str, Any]:
    try:
        payload = decode_token(state)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state") from exc
    if payload.get("type") != "oauth_state" or payload.get("provider") != provider:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    mode = payload.get("mode")
    if mode not in {"login", "bind"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    return payload


def github_authorize_url(*, mode: str, username: str | None = None) -> tuple[str, str]:
    if not settings.github_oauth_enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub OAuth is not configured")
    state = create_oauth_state(provider="github", mode=mode, username=username)
    query = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": oauth_callback_url("github"),
            "scope": "read:user",
            "state": state,
        }
    )
    return f"{GITHUB_AUTHORIZE_URL}?{query}", state


def wechat_authorize_url(*, mode: str, username: str | None = None) -> tuple[str, str]:
    if not settings.wechat_oauth_enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WeChat OAuth is not configured")
    state = create_oauth_state(provider="wechat", mode=mode, username=username)
    query = urlencode(
        {
            "appid": settings.wechat_app_id,
            "redirect_uri": oauth_callback_url("wechat"),
            "response_type": "code",
            "scope": "snsapi_login",
            "state": state,
        }
    )
    return f"{WECHAT_QRCONNECT_URL}?{query}#wechat_redirect", state


async def _github_profile(code: str) -> dict[str, str | int | None]:
    redirect_uri = oauth_callback_url("github")
    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub authorization failed")

        user_resp = await client.get(
            GITHUB_USER_URL,
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        )
        user_resp.raise_for_status()
        profile = user_resp.json()
    github_id = profile.get("id")
    if github_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub authorization failed")
    return {"github_id": str(github_id), "login": profile.get("login")}


async def _wechat_profile(code: str) -> dict[str, str]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.get(
            WECHAT_TOKEN_URL,
            params={
                "appid": settings.wechat_app_id,
                "secret": settings.wechat_app_secret,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        openid = token_data.get("openid")
        if not access_token or not openid:
            detail = token_data.get("errmsg") or "WeChat authorization failed"
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

        user_resp = await client.get(
            WECHAT_USERINFO_URL,
            params={
                "access_token": access_token,
                "openid": openid,
                "lang": "zh_CN",
            },
        )
        user_resp.raise_for_status()
        profile = user_resp.json()
    if profile.get("errcode"):
        detail = profile.get("errmsg") or "WeChat authorization failed"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    return {"wechat_openid": openid, "nickname": profile.get("nickname")}


async def login_with_github(session: AsyncSession, code: str) -> User:
    profile = await _github_profile(code)
    github_id = profile["github_id"]
    result = await session.exec(select(User).where(User.github_id == github_id))
    user = result.first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="GitHub account is not linked to an admin user",
        )
    ensure_user_can_authenticate(user)
    user.last_login_at = now()
    session.add(user)
    await session.commit()
    return user


async def bind_github(session: AsyncSession, username: str, code: str) -> User:
    result = await session.exec(select(User).where(User.username == username))
    current_user = result.first()
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile = await _github_profile(code)
    github_id = profile["github_id"]
    result = await session.exec(select(User).where(User.github_id == github_id))
    existing = result.first()
    if existing is not None and existing.id != current_user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="GitHub account is already linked")
    current_user.github_id = github_id
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return current_user


async def login_with_wechat(session: AsyncSession, code: str) -> User:
    profile = await _wechat_profile(code)
    openid = profile["wechat_openid"]
    result = await session.exec(select(User).where(User.wechat_openid == openid))
    user = result.first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="WeChat account is not linked to an admin user",
        )
    ensure_user_can_authenticate(user)
    user.last_login_at = now()
    session.add(user)
    await session.commit()
    return user


async def bind_wechat(session: AsyncSession, username: str, code: str) -> User:
    result = await session.exec(select(User).where(User.username == username))
    current_user = result.first()
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile = await _wechat_profile(code)
    openid = profile["wechat_openid"]
    result = await session.exec(select(User).where(User.wechat_openid == openid))
    existing = result.first()
    if existing is not None and existing.id != current_user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="WeChat account is already linked")
    current_user.wechat_openid = openid
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return current_user
