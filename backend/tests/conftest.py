"""测试夹具：提供启动所需的最小环境变量。"""

from __future__ import annotations

import asyncio
import os

os.environ.setdefault("SECRET_KEY", "testing-secret")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("APP_ENV", "testing")


def pytest_configure(config: object) -> None:
    from app.db.session import engine
    from app.models import SQLModel

    async def init_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    asyncio.run(init_db())
