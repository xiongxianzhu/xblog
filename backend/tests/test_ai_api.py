"""AI admin API 测试。"""

from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.user import User
from tests.conftest import unwrap_api_response


def _login(client: TestClient) -> None:
    async def seed_user() -> None:
        from sqlmodel import select

        async with async_session_factory() as session:
            existing = await session.exec(select(User).where(User.username == "aiadmin"))
            if existing.first() is None:
                session.add(User(username="aiadmin", password_hash=hash_password("secret123")))
                await session.commit()

    asyncio.run(seed_user())
    resp = client.post("/api/v1/auth/login", json={"username": "aiadmin", "password": "secret123"})
    assert resp.status_code == 200


def test_ai_providers_requires_auth(client: TestClient) -> None:
    resp = client.get("/api/v1/admin/ai/providers")
    assert resp.status_code == 401
    assert resp.json()["code"] == -1


def test_ai_complete_without_provider(client: TestClient) -> None:
    _login(client)
    resp = client.post(
        "/api/v1/admin/ai/complete",
        json={"action": "polish", "selection": {"text": "hello"}},
    )
    assert resp.status_code == 200
    assert "event: error" in resp.text


def test_ai_skill_create_invalid_name(client: TestClient) -> None:
    _login(client)
    resp = client.post(
        "/api/v1/admin/ai/skills",
        json={"name": "Bad Name", "description": "test"},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == -1


def test_ai_skills_include_builtin(client: TestClient) -> None:
    _login(client)
    resp = client.get("/api/v1/admin/ai/skills")
    assert resp.status_code == 200
    skills = unwrap_api_response(resp)
    builtin = [item for item in skills if item.get("is_builtin")]
    assert len(builtin) >= 3
    names = {item["name"] for item in builtin}
    assert "blog-polish-zh" in names
    assert all(item["enabled"] for item in builtin)


def test_ai_builtin_skill_content_readonly(client: TestClient) -> None:
    _login(client)
    skills = unwrap_api_response(client.get("/api/v1/admin/ai/skills"))
    builtin = next(item for item in skills if item["name"] == "blog-polish-zh")
    content_resp = client.get(f"/api/v1/admin/ai/skills/{builtin['id']}/content")
    assert content_resp.status_code == 200
    assert "blog-polish-zh" in unwrap_api_response(content_resp)["content"]
    patch_resp = client.patch(
        f"/api/v1/admin/ai/skills/{builtin['id']}/content",
        json={"content": "---\nname: blog-polish-zh\ndescription: x\n---\n\nhack\n"},
    )
    assert patch_resp.status_code == 403


def test_ai_skill_create_conflicts_with_builtin_name(client: TestClient) -> None:
    _login(client)
    resp = client.post(
        "/api/v1/admin/ai/skills",
        json={"name": "blog-polish-zh", "description": "duplicate"},
    )
    assert resp.status_code == 409


def test_ai_skill_defaults_builtin(client: TestClient) -> None:
    _login(client)
    skills = unwrap_api_response(client.get("/api/v1/admin/ai/skills"))
    builtin = next(item for item in skills if item["name"] == "blog-polish-zh")
    patch_resp = client.patch(
        "/api/v1/admin/ai/skill-defaults",
        json={"polish": builtin["id"]},
    )
    assert patch_resp.status_code == 200
    data = unwrap_api_response(patch_resp)
    assert data["polish"] == builtin["id"]


def test_ai_skill_upload_zip(client: TestClient) -> None:
    import io
    import zipfile

    _login(client)
    content = """---
name: zip-upload-skill
description: uploaded from zip
---

# Skill
"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("any-folder-name/SKILL.md", content)
    buf.seek(0)

    resp = client.post(
        "/api/v1/admin/ai/skills/upload",
        files={"file": ("skill.zip", buf, "application/zip")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["data"]["name"] == "zip-upload-skill"


def test_ai_skill_upload_zip_validation_error_message(client: TestClient) -> None:
    import io
    import zipfile

    _login(client)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("bad/SKILL.md", "# missing frontmatter\n")
    buf.seek(0)

    resp = client.post(
        "/api/v1/admin/ai/skills/upload",
        files={"file": ("skill.zip", buf, "application/zip")},
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == -1
    assert "frontmatter" in body["msg"]
