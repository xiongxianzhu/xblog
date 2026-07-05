"""AI chat action 测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.ai_provider import AiProvider
from app.models.user import User
from app.services.ai.crypto import encrypt_api_key


def _login(client: TestClient) -> None:
    async def seed() -> None:
        from sqlmodel import select

        async with async_session_factory() as session:
            if (await session.exec(select(User).where(User.username == "chatadmin"))).first() is None:
                session.add(User(username="chatadmin", password_hash=hash_password("secret123")))
            if (await session.exec(select(AiProvider))).first() is None:
                session.add(
                    AiProvider(
                        name="Test",
                        provider_type="openai_compatible",
                        base_url="https://example.com/v1",
                        model="test-model",
                        api_key_encrypted=encrypt_api_key("sk-test"),
                        enabled=True,
                        is_default=True,
                    )
                )
            await session.commit()

    asyncio.run(seed())
    assert client.post("/api/v1/auth/login", json={"username": "chatadmin", "password": "secret123"}).status_code == 200


async def _fake_stream(*_args, **_kwargs):
    yield {"type": "thinking", "content": "先理解用户意图…"}
    yield {"type": "delta", "content": "你好"}
    yield {"type": "usage", "prompt_tokens": 1, "completion_tokens": 1}


def test_ai_chat_streams(client: TestClient) -> None:
    _login(client)
    with patch("app.services.ai.gateway.stream_llm", new=_fake_stream):
        resp = client.post(
            "/api/v1/admin/ai/complete",
            json={
                "action": "chat",
                "messages": [{"role": "user", "content": "hello"}],
                "document": {"title": "T", "content_md": "body"},
            },
        )
    assert resp.status_code == 200
    assert "event: thinking" in resp.text
    assert "先理解用户意图" in resp.text
    assert "event: delta" in resp.text
    assert "你好" in resp.text
    assert "event: done" in resp.text


async def _fake_generate(*_args, **_kwargs):
    yield {"type": "delta", "content": "# 标题\n\n正文"}
    yield {"type": "usage", "prompt_tokens": 2, "completion_tokens": 3}


def test_ai_generate_streams(client: TestClient) -> None:
    _login(client)
    with patch("app.services.ai.gateway.stream_llm", new=_fake_generate):
        resp = client.post(
            "/api/v1/admin/ai/complete",
            json={"action": "generate", "generate": {"topic": "测试主题", "outline": "一、二"}},
        )
    assert resp.status_code == 200
    assert "event: delta" in resp.text
    assert "# 标题" in resp.text
    assert "event: done" in resp.text
