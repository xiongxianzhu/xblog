"""AI chat action 测试。"""

from __future__ import annotations

import asyncio
import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import select

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.ai_provider import AiProvider
from app.models.ai_usage_log import AiUsageLog
from app.models.user import User
from app.services.ai.builtin_skills import builtin_skill_id
from app.services.ai.crypto import encrypt_api_key
from tests.conftest import unwrap_api_response


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


@pytest.mark.parametrize("skill_order", ["builtin", "custom", "builtin-first", "custom-first"])
def test_ai_usage_skill_foreign_key(client: TestClient, skill_order: str) -> None:
    _login(client)
    created = client.post(
        "/api/v1/admin/ai/skills",
        json={"name": "usage-test", "description": "Usage persistence regression"},
    )
    assert created.status_code == 201
    custom_id = unwrap_api_response(created)["id"]
    content = client.patch(
        f"/api/v1/admin/ai/skills/{custom_id}/content",
        json={"content": "---\nname: usage-test\ndescription: Usage persistence regression\n---\nAnswer clearly."},
    )
    assert content.status_code == 200
    builtin_id = str(builtin_skill_id("blog-chat-zh"))
    skill_ids = {
        "builtin": [builtin_id],
        "custom": [custom_id],
        "builtin-first": [builtin_id, custom_id],
        "custom-first": [custom_id, builtin_id],
    }[skill_order]

    with patch("app.services.ai.gateway.stream_llm", new=_fake_stream):
        response = client.post(
            "/api/v1/admin/ai/complete",
            json={"action": "chat", "messages": [{"role": "user", "content": "hello"}], "skill_ids": skill_ids},
        )
    assert response.status_code == 200
    events = response.text.split("\n\n")
    done = next(event for event in events if event.startswith("event: done\n"))
    payload = json.loads(done.split("data: ", 1)[1])
    assert payload["skill_id"] == skill_ids[0]
    assert payload["skill_name"] == ", ".join(
        "blog-chat-zh" if skill_id == builtin_id else "usage-test" for skill_id in skill_ids
    )

    async def read_usage() -> AiUsageLog:
        async with async_session_factory() as session:
            return (await session.exec(select(AiUsageLog))).one()

    usage = asyncio.run(read_usage())
    assert usage.skill_id is None if skill_ids[0] == builtin_id else str(usage.skill_id) == custom_id
    assert usage.prompt_tokens == 1
    assert usage.completion_tokens == 1
