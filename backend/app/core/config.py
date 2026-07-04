"""基于 pydantic-settings 的类型化配置。"""

from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = "development"
    app_name: str = "xblog-api"
    secret_key: str
    database_url: str = "postgresql+asyncpg://xblog:xblog@localhost:5432/xblog"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False
    cookie_domain: str | None = None
    revalidate_secret: str = ""
    revalidate_url: str = "http://localhost:3000/api/revalidate"
    upload_dir: str = "uploads"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> str:
        if isinstance(value, list):
            return ",".join(value)
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
