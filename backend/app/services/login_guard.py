"""密码登录与找回密码的人机验证、限流。"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import timedelta

import httpx
from fastapi import HTTPException, Request, status
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import get_settings
from app.core.timezone import now
from app.models.login_log import LoginLog
from app.schemas.auth import LoginGuardResponse
from app.services import audit_logs, auth_settings
from app.services.audit_logs import client_ip

settings = get_settings()

_forgot_password_buckets: dict[str, deque[float]] = defaultdict(deque)


def turnstile_configured() -> bool:
    return auth_settings.turnstile_configured()


async def count_recent_login_failures(
    session: AsyncSession,
    *,
    ip: str | None,
    username: str | None,
    window_minutes: int | None = None,
) -> int:
    window = window_minutes or settings.login_failure_window_minutes
    since = now() - timedelta(minutes=window)
    counts: list[int] = []

    if ip:
        ip_count = await session.exec(
            select(func.count())
            .select_from(LoginLog)
            .where(
                LoginLog.method == "password",
                LoginLog.success.is_(False),
                LoginLog.ip_address == ip,
                LoginLog.created_at >= since,
            )
        )
        counts.append(int(ip_count.one()))

    trimmed = username.strip() if username else ""
    if trimmed:
        user_count = await session.exec(
            select(func.count())
            .select_from(LoginLog)
            .where(
                LoginLog.method == "password",
                LoginLog.success.is_(False),
                LoginLog.username == trimmed,
                LoginLog.created_at >= since,
            )
        )
        counts.append(int(user_count.one()))

    return max(counts) if counts else 0


def _login_locked(failures: int) -> bool:
    return failures >= settings.login_max_failures_per_window


def _login_captcha_required(failures: int) -> bool:
    return failures >= settings.login_captcha_after_failures


async def login_guard_status(
    session: AsyncSession,
    request: Request,
    *,
    username: str | None = None,
) -> LoginGuardResponse:
    ip = client_ip(request)
    failures = await count_recent_login_failures(session, ip=ip, username=username)
    locked = _login_locked(failures)
    turnstile_active = await auth_settings.is_turnstile_active(session)
    return LoginGuardResponse(
        captcha_required=_login_captcha_required(failures),
        captcha_enabled=turnstile_active,
        site_key=settings.turnstile_site_key if turnstile_active else None,
        locked=locked,
        retry_after_seconds=settings.login_failure_window_minutes * 60 if locked else None,
        failure_count=failures,
    )


async def enforce_login_guard(
    session: AsyncSession,
    request: Request,
    *,
    username: str,
    turnstile_token: str | None,
) -> None:
    ip = client_ip(request)
    failures = await count_recent_login_failures(session, ip=ip, username=username)
    if _login_locked(failures):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "登录尝试过于频繁，请稍后再试",
                "captcha_required": True,
                "failure_count": failures,
            },
        )
    if _login_captcha_required(failures) and await auth_settings.is_turnstile_active(session):
        await require_turnstile(turnstile_token, request)


def login_invalid_credentials_detail(failures: int) -> dict[str, object]:
    return {
        "message": "Invalid credentials",
        "captcha_required": _login_captcha_required(failures),
        "failure_count": failures,
    }


async def verify_turnstile_token(token: str, remote_ip: str | None) -> bool:
    if not turnstile_configured():
        return True

    payload: dict[str, str] = {
        "secret": settings.turnstile_secret_key,
        "response": token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=payload,
            )
            response.raise_for_status()
            body = response.json()
    except httpx.HTTPError:
        return False

    return bool(body.get("success"))


async def require_turnstile(token: str | None, request: Request) -> None:
    if not turnstile_configured():
        return
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Captcha required", "captcha_required": True},
        )
    if not await verify_turnstile_token(token, client_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Captcha verification failed", "captcha_required": True},
        )


def record_forgot_password_attempt(request: Request) -> None:
    ip = client_ip(request) or "unknown"
    window_seconds = settings.forgot_password_window_minutes * 60
    current = time.monotonic()
    bucket = _forgot_password_buckets[ip]
    while bucket and current - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= settings.forgot_password_max_per_window:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"message": "请求过于频繁，请稍后再试"},
        )
    bucket.append(current)


async def enforce_forgot_password_guard(
    session: AsyncSession,
    request: Request,
    turnstile_token: str | None,
) -> None:
    record_forgot_password_attempt(request)
    if await auth_settings.is_turnstile_active(session):
        await require_turnstile(turnstile_token, request)
