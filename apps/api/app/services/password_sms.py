"""Password-authenticated, single-use SMS challenges (never session tokens)."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import timedelta
from typing import Any

from fastapi import HTTPException, Request
from jwt import InvalidTokenError
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import get_settings
from app.core.security import create_token, decode_token
from app.core.timezone import now
from app.models.sms_verification_code import SmsVerificationCode
from app.models.user import User
from app.schemas.auth import PasswordSmsChallenge
from app.services import audit_logs, auth_settings, login_guard, sms_service
from app.services.users import ensure_user_can_authenticate

PURPOSE = "password_login"
TOKEN_TYPE = "password_sms"
MAX_ATTEMPTS = 5


def _fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _code_hash(record_id: int | None, code: str) -> str:
    return hmac.new(get_settings().secret_key.encode(), f"{record_id}:{code}".encode(), hashlib.sha256).hexdigest()


def _invalid() -> HTTPException:
    return HTTPException(status_code=400, detail="PASSWORD_SMS_INVALID")


async def _locked_user(session: AsyncSession, user_id: int) -> User:
    result = await session.exec(select(User).where(User.id == user_id).with_for_update())
    user = result.first()
    if user is None:
        raise _invalid()
    # A user may have changed since it was read for the first password check.
    await session.refresh(user)
    ensure_user_can_authenticate(user)
    return user


async def begin_challenge(session: AsyncSession, authenticated_user: User) -> PasswordSmsChallenge:
    if not auth_settings.password_sms_configured():
        raise HTTPException(status_code=503, detail="PASSWORD_SMS_NOT_CONFIGURED")
    password_hash = authenticated_user.password_hash
    assert authenticated_user.id is not None
    user = await _locked_user(session, authenticated_user.id)
    if user.password_hash != password_hash:
        raise _invalid()
    if not user.phone:
        raise HTTPException(status_code=403, detail="PASSWORD_SMS_PHONE_REQUIRED")
    phone = sms_service.normalize_phone(user.phone)
    settings = get_settings()
    result = await session.exec(
        select(SmsVerificationCode)
        .where(SmsVerificationCode.phone == phone, SmsVerificationCode.purpose == PURPOSE)
        .order_by(col(SmsVerificationCode.id).desc())
        .limit(1)
    )
    previous = result.first()
    if previous and previous.created_at:
        elapsed = (now() - sms_service._ensure_aware(previous.created_at)).total_seconds()
        if elapsed < settings.sms_send_interval_seconds:
            raise HTTPException(status_code=429, detail="PASSWORD_SMS_SEND_LIMIT")
    # Invalidate older challenges on a resend, including codes with attempts left.
    older = await session.exec(
        select(SmsVerificationCode).where(
            SmsVerificationCode.phone == phone,
            SmsVerificationCode.purpose == PURPOSE,
            col(SmsVerificationCode.used_at).is_(None),
        )
    )
    for old in older.all():
        old.used_at = now()
        session.add(old)
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_in = settings.sms_code_expire_minutes * 60
    record = SmsVerificationCode(
        phone=phone, purpose=PURPOSE, code_hash="", expires_at=now() + timedelta(seconds=expires_in)
    )
    session.add(record)
    await session.flush()
    record.code_hash = _code_hash(record.id, code)
    session.add(record)
    # Persist only if delivery succeeds. The user lock serializes send/verify requests.
    await sms_service._send_sms(phone, code)
    token = create_token(
        {
            "sub": str(user.id),
            "type": TOKEN_TYPE,
            "code_id": record.id,
            "password_fingerprint": _fingerprint(user.password_hash),
            "phone_fingerprint": _fingerprint(phone),
        },
        timedelta(seconds=expires_in),
    )
    await session.commit()
    return PasswordSmsChallenge(
        challenge_token=token, masked_phone=f"{phone[:3]}****{phone[-4:]}", expires_in=expires_in
    )


def _decode_challenge(token: str) -> dict[str, Any]:
    try:
        payload = decode_token(token)
        if payload.get("type") != TOKEN_TYPE or not isinstance(payload.get("code_id"), int):
            raise _invalid()
        int(payload["sub"])
        return payload
    except (InvalidTokenError, ValueError, TypeError, KeyError) as exc:
        raise _invalid() from exc


async def verify_challenge(session: AsyncSession, request: Request, token: str, code: str) -> User:
    payload = _decode_challenge(token)
    if not await auth_settings.is_password_sms_enabled(session):
        raise _invalid()
    user = await _locked_user(session, int(payload["sub"]))
    phone = sms_service.normalize_phone(user.phone) if user.phone else ""
    if (
        not phone
        or payload.get("password_fingerprint") != _fingerprint(user.password_hash)
        or payload.get("phone_fingerprint") != _fingerprint(phone)
    ):
        raise _invalid()
    failures = await login_guard.count_recent_login_failures(
        session, ip=audit_logs.client_ip(request), username=user.username
    )
    if failures >= get_settings().login_max_failures_per_window:
        raise HTTPException(status_code=429, detail="PASSWORD_SMS_ATTEMPTS_EXCEEDED")
    result = await session.exec(
        select(SmsVerificationCode).where(SmsVerificationCode.id == payload["code_id"]).with_for_update()
    )
    record = result.first()
    if (
        record is None
        or record.purpose != PURPOSE
        or record.phone != phone
        or record.used_at is not None
        or sms_service._ensure_aware(record.expires_at) <= now()
        or record.attempts >= MAX_ATTEMPTS
    ):
        raise _invalid()
    if not hmac.compare_digest(record.code_hash, _code_hash(record.id, code)):
        record.attempts += 1
        if record.attempts >= MAX_ATTEMPTS:
            record.used_at = now()
        session.add(record)
        await audit_logs.record_login(
            session,
            request=request,
            username=user.username,
            method="password",
            success=False,
            user=user,
            failure_reason="invalid_second_factor",
        )
        await session.commit()
        if record.attempts >= MAX_ATTEMPTS:
            raise HTTPException(status_code=429, detail="PASSWORD_SMS_ATTEMPTS_EXCEEDED")
        raise _invalid()
    record.used_at = now()
    session.add(record)
    # Caller commits consumption and successful login together, then issues cookies.
    return user
