"""短信验证码。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.models.base import TimestampMixin


class SmsVerificationCode(TimestampMixin, SQLModel, table=True):
    __tablename__ = "sms_verification_codes"

    id: int | None = Field(default=None, primary_key=True)
    phone: str = Field(max_length=20, index=True)
    code_hash: str = Field(max_length=255)
    purpose: str = Field(default="login", max_length=32)
    expires_at: datetime = Field(sa_type=DateTime(timezone=True))
    used_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
