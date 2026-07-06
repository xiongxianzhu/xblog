from datetime import date, datetime
from typing import Literal

from pydantic import EmailStr, field_validator
from sqlmodel import Field, SQLModel


class LoginRequest(SQLModel):
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)
    turnstile_token: str | None = Field(default=None, max_length=4096)


class ChangePasswordRequest(SQLModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(SQLModel):
    username: str


class UserPublic(SQLModel):
    username: str
    nickname: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    email: str | None = None
    birth_date: date | None = None
    gender: str | None = None


class UserAdmin(SQLModel):
    id: int
    username: str
    nickname: str | None
    email: str | None
    phone: str | None
    birth_date: date | None
    gender: str | None
    avatar_url: str | None
    is_active: bool
    created_at: datetime | None
    last_login_at: datetime | None


class UserActiveUpdate(SQLModel):
    is_active: bool


class PaginatedUsers(SQLModel):
    items: list[UserAdmin]
    total: int
    page: int
    page_size: int
    active_count: int


class AvatarUploadResponse(SQLModel):
    avatar_url: str


class ForgotPasswordRequest(SQLModel):
    username: str = Field(min_length=1, max_length=50)
    turnstile_token: str | None = Field(default=None, max_length=4096)


class LoginGuardResponse(SQLModel):
    captcha_required: bool
    captcha_enabled: bool
    site_key: str | None = None
    locked: bool
    retry_after_seconds: int | None = None
    failure_count: int


class ResetPasswordRequest(SQLModel):
    token: str = Field(min_length=16, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(SQLModel):
    message: str


class OAuthProvidersResponse(SQLModel):
    github: bool
    wechat: bool


class OAuthLinksResponse(SQLModel):
    github: bool
    wechat: bool


class BindPhoneRequest(SQLModel):
    phone: str = Field(min_length=6, max_length=20)


class BindEmailRequest(SQLModel):
    email: EmailStr = Field(max_length=255)


ProfileGender = Literal["male", "female", "other"]


class ProfileUpdateRequest(SQLModel):
    nickname: str | None = Field(default=None, max_length=50)
    birth_date: date | None = None
    gender: ProfileGender | None = None

    @field_validator("nickname", mode="before")
    @classmethod
    def normalize_nickname(cls, value: object) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value  # type: ignore[return-value]
        trimmed = value.strip()
        return trimmed or None
