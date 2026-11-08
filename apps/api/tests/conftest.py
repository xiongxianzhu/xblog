"""测试夹具：提供启动所需的最小环境变量。"""

from __future__ import annotations

import asyncio
import os
from tempfile import TemporaryDirectory
from typing import Any
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient
from httpx import Response

# Never allow developer/production settings or uploaded files into this test suite.
_test_uploads = TemporaryDirectory(prefix="xblog-api-tests-")
os.environ["SECRET_KEY"] = "testing-secret-key-isolated-suite-32"
test_database_url = os.environ.get("XBLOG_TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
if test_database_url != "sqlite+aiosqlite:///:memory:":
    test_database = urlparse(test_database_url)
    if (
        test_database.scheme != "postgresql+asyncpg"
        or test_database.hostname not in {"localhost", "127.0.0.1"}
        or not test_database.path.startswith("/xblog_test_")
    ):
        raise RuntimeError("Tests require an isolated local xblog_test_ PostgreSQL database")
os.environ["DATABASE_URL"] = test_database_url
os.environ["APP_ENV"] = "testing"
os.environ["UPLOAD_DIR"] = _test_uploads.name
os.environ["REVALIDATE_SECRET"] = ""

from app.core.config import Settings  # noqa: E402

Settings.model_config["env_file"] = None

if test_database_url.startswith("postgresql+"):
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool
    from sqlmodel.ext.asyncio.session import AsyncSession

    from app.db import session as db_session

    # Tests deliberately use multiple asyncio.run loops; pooled asyncpg connections
    # must not leak across those loops.
    db_session.engine = create_async_engine(test_database_url, poolclass=NullPool)
    db_session.async_session_factory = async_sessionmaker(
        db_session.engine, class_=AsyncSession, expire_on_commit=False
    )


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
                if await session.get(AiSkillDefault, scene) is None:
                    session.add(AiSkillDefault(scene=scene, skill_id=None))
            await session.commit()

    asyncio.run(init_db())


def pytest_unconfigure(config: object) -> None:
    _test_uploads.cleanup()
