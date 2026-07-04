from datetime import datetime

from sqlmodel import Field, SQLModel


class LoginRequest(SQLModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class ChangePasswordRequest(SQLModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(SQLModel):
    username: str


class UserPublic(SQLModel):
    username: str
    avatar_url: str | None = None


class UserAdmin(SQLModel):
    id: int
    username: str
    avatar_url: str | None
    created_at: datetime | None
    last_login_at: datetime | None


class AvatarUploadResponse(SQLModel):
    avatar_url: str
