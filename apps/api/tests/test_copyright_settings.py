"""Article copyright configuration, persistence and post-commit invalidation."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import unwrap_api_response
from tests.test_posts_per_page import _login


def test_copyright_defaults_and_auth(client: TestClient) -> None:
    public = unwrap_api_response(client.get("/api/v1/public/site-theme"))
    assert public["copyright_enabled"] is False
    assert "[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hans)" in public["copyright_content"]
    assert client.patch("/api/v1/admin/site-theme", json={"copyright_enabled": True}).status_code == 401


def test_copyright_save_disable_and_commit(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints.admin import site_theme
    from app.db.session import async_session_factory
    from app.services.site_settings import get_site_theme

    _login(client)
    notifications = []

    async def notify(paths: list[str], *, layout: bool) -> None:
        async with async_session_factory() as session:
            saved = await get_site_theme(session)
            notifications.append((saved.copyright_enabled, saved.copyright_content, layout))

    monkeypatch.setattr(site_theme, "trigger_revalidate", notify)
    content = "转载需署名，遵循 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hans)。"
    saved = client.patch("/api/v1/admin/site-theme", json={"copyright_enabled": True, "copyright_content": content})
    assert saved.status_code == 200
    assert notifications == [(True, content, True)]
    public = unwrap_api_response(client.get("/api/v1/public/site-theme"))
    assert public["copyright_enabled"] is True
    assert public["copyright_content"] == content
    assert client.patch("/api/v1/admin/site-theme", json={"palette": "forest"}).status_code == 200
    assert unwrap_api_response(client.get("/api/v1/public/site-theme"))["copyright_content"] == content
    assert client.patch("/api/v1/admin/site-theme", json={"copyright_enabled": False}).status_code == 200
    disabled = unwrap_api_response(client.get("/api/v1/public/site-theme"))
    assert disabled["copyright_enabled"] is False
    assert disabled["copyright_content"] == content


def test_copyright_rejects_empty_enabled_and_overlong_content(client: TestClient) -> None:
    _login(client)
    assert (
        client.patch(
            "/api/v1/admin/site-theme", json={"copyright_enabled": True, "copyright_content": "  "}
        ).status_code
        == 422
    )
    assert client.patch("/api/v1/admin/site-theme", json={"copyright_content": "a" * 501}).status_code == 422
    assert (
        client.patch("/api/v1/admin/site-theme", json={"copyright_enabled": False, "copyright_content": ""}).status_code
        == 200
    )
    assert client.patch("/api/v1/admin/site-theme", json={"copyright_enabled": True}).status_code == 422
