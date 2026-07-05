"""短信验证码发送与校验。"""

from __future__ import annotations

import hashlib
import logging
import random
import re
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import get_settings
from app.core.timezone import CHINA_TZ, now
from app.models.sms_verification_code import SmsVerificationCode
from app.models.user import User
from app.services import auth_settings
from app.services.users import ensure_user_can_authenticate

logger = logging.getLogger(__name__)
settings = get_settings()

PHONE_PATTERN = re.compile(r"^1\d{10}$")
SEND_CODE_MESSAGE = "若手机号已绑定管理员账号，验证码已发送。"


def normalize_phone(raw: str) -> str:
    phone = re.sub(r"\s+", "", raw.strip())
    if phone.startswith("+86"):
        phone = phone[3:]
    if phone.startswith("86") and len(phone) == 13:
        phone = phone[2:]
    if not PHONE_PATTERN.fullmatch(phone):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone number")
    return phone


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=CHINA_TZ)
    return value


async def _latest_send_at(session: AsyncSession, phone: str) -> SmsVerificationCode | None:
    result = await session.exec(
        select(SmsVerificationCode)
        .where(SmsVerificationCode.phone == phone)
        .where(SmsVerificationCode.purpose == "login")
        .order_by(SmsVerificationCode.created_at.desc())  # type: ignore[arg-type]
    )
    return result.first()


async def _send_sms(phone: str, code: str) -> None:
    if settings.sms_provider == "dev":
        logger.info("SMS dev code for %s: %s", phone, code)
        return
    if settings.sms_provider == "aliyun":
        if not auth_settings.sms_configured():
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SMS is not configured")
        # 生产环境接入阿里云短信；当前仅记录日志，避免未配置签名时误发。
        logger.warning("Aliyun SMS provider selected but direct API call is not enabled in this build.")
        logger.info("SMS aliyun code for %s: %s", phone, code)
        return
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SMS is not configured")


async def send_login_code(session: AsyncSession, phone: str) -> str:
    if not await auth_settings.is_sms_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SMS login is disabled")

    normalized = normalize_phone(phone)
    result = await session.exec(select(User).where(User.phone == normalized))
    if result.first() is None:
        return SEND_CODE_MESSAGE

    latest = await _latest_send_at(session, normalized)
    if latest is not None and latest.created_at is not None:
        elapsed = (now() - _ensure_aware(latest.created_at)).total_seconds()
        if elapsed < settings.sms_send_interval_seconds:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Please wait before requesting another code")

    code = _generate_code()
    record = SmsVerificationCode(
        phone=normalized,
        code_hash=_hash_code(code),
        purpose="login",
        expires_at=now() + timedelta(minutes=settings.sms_code_expire_minutes),
    )
    session.add(record)
    await session.commit()
    await _send_sms(normalized, code)
    return SEND_CODE_MESSAGE


async def verify_login_code(session: AsyncSession, phone: str, code: str) -> User:
    if not await auth_settings.is_sms_login_available(session):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SMS login is disabled")

    normalized = normalize_phone(phone)
    if not re.fullmatch(r"\d{6}", code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    result = await session.exec(
        select(SmsVerificationCode)
        .where(SmsVerificationCode.phone == normalized)
        .where(SmsVerificationCode.purpose == "login")
        .where(SmsVerificationCode.used_at == None)  # noqa: E711
        .order_by(SmsVerificationCode.created_at.desc())  # type: ignore[arg-type]
    )
    record = result.first()
    if record is None or _ensure_aware(record.expires_at) < now() or record.code_hash != _hash_code(code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

    user_result = await session.exec(select(User).where(User.phone == normalized))
    user = user_result.first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")
    ensure_user_can_authenticate(user)

    record.used_at = now()
    user.last_login_at = now()
    session.add(record)
    session.add(user)
    await session.commit()
    return user
