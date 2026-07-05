"""测试夹具：提供启动所需的最小环境变量。"""

from __future__ import annotations

import asyncio
import os
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import Response

os.environ.setdefault("SECRET_KEY", "testing-secret")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("APP_ENV", "testing")


def unwrap_api_response(response: Response) -> Any:
    """解包 { code, msg, data } 响应体，返回 data。"""
    body = response.json()
    if isinstance(body, dict) and {"code", "msg", "data"}.issubset(body.keys()):
        return body["data"]
    return body


@pytest.fixture(autouse=True)
def reset_login_guard_state() -> None:
    from sqlalchemy import delete

    from app.db.session import async_session_factory
    from app.models.login_log import LoginLog
    from app.services import login_guard

    login_guard._forgot_password_buckets.clear()

    async def clear_logs() -> None:
        async with async_session_factory() as session:
            await session.exec(delete(LoginLog))
            await session.commit()

    asyncio.run(clear_logs())


@pytest.fixture
def client() -> TestClient:
    from app.main import app

    return TestClient(app)


def pytest_configure(config: object) -> None:
    from sqlmodel.ext.asyncio.session import AsyncSession

    from app.db.session import engine
    from app.models import SQLModel
    from app.models.ai_skill import AiSkillDefault

    async def init_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        async with AsyncSession(engine) as session:
            for scene in ("polish", "chat", "generate"):
                session.add(AiSkillDefault(scene=scene, skill_id=None))
            await session.commit()

    asyncio.run(init_db())
