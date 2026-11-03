"""测试夹具：提供启动所需的最小环境变量。"""

from __future__ import annotations

import asyncio
import os
from tempfile import TemporaryDirectory
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import Response

# Never allow developer/production settings or uploaded files into this test suite.
_test_uploads = TemporaryDirectory(prefix="xblog-api-tests-")
os.environ["SECRET_KEY"] = "testing-secret-key-isolated-suite-32"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["APP_ENV"] = "testing"
os.environ["UPLOAD_DIR"] = _test_uploads.name
os.environ["REVALIDATE_SECRET"] = ""

from app.core.config import Settings  # noqa: E402

Settings.model_config["env_file"] = None


def unwrap_api_response(response: Response) -> Any:
    """解包 { code, msg, data } 响应体，返回 data。"""
    body = response.json()
    if isinstance(body, dict) and {"code", "msg", "data"}.issubset(body.keys()):
        return body["data"]
    return body


@pytest.fixture(autouse=True)
def reset_test_database() -> None:
    from sqlalchemy import delete

    from app.db.session import async_session_factory
    from app.models import SQLModel
    from app.models.ai_skill import AiSkillDefault
    from app.services import login_guard

    login_guard._forgot_password_buckets.clear()

    async def reset() -> None:
        async with async_session_factory() as session:
            for table in reversed(SQLModel.metadata.sorted_tables):
                await session.exec(delete(table))
            for scene in ("polish", "chat", "generate"):
                session.add(AiSkillDefault(scene=scene, skill_id=None))
            await session.commit()

    asyncio.run(reset())


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


def pytest_unconfigure(config: object) -> None:
    _test_uploads.cleanup()
