"""Public GitHub link configuration and cache invalidation."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import unwrap_api_response
from tests.test_posts_per_page import _login


def test_github_defaults_and_auth(client: TestClient) -> None:
    public = unwrap_api_response(client.get("/api/v1/public/site-theme"))
    assert public["github_link_enabled"] is False
    assert public["github_link_url"] == ""
    assert client.patch("/api/v1/admin/site-theme", json={"github_link_enabled": True}).status_code == 401


def test_github_save_disable_and_validation(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints.admin import site_theme
    from app.db.session import async_session_factory
    from app.services.site_settings import get_site_theme

    _login(client)
    notifications = []

    async def notify(paths: list[str], *, layout: bool) -> None:
        async with async_session_factory() as session:
            saved = await get_site_theme(session)
            notifications.append((saved.github_link_enabled, saved.github_link_url, layout))

    monkeypatch.setattr(site_theme, "trigger_revalidate", notify)
    endpoint = "/api/v1/admin/site-theme"
    assert client.patch(endpoint, json={"github_link_enabled": True}).status_code == 422
    assert notifications == []
    url = "https://github.com/example/repo"
    assert client.patch(endpoint, json={"github_link_enabled": True, "github_link_url": f" {url} "}).status_code == 200
    assert notifications == [(True, url, True)]
    for invalid in ["", "javascript:alert(1)", "//github.com", "https://user:pass@github.com", "https://", "a" * 501]:
        assert client.patch(endpoint, json={"github_link_url": invalid}).status_code == 422
    assert len(notifications) == 1
    public = unwrap_api_response(client.get("/api/v1/public/site-theme"))
    assert public["github_link_enabled"] is True
    assert public["github_link_url"] == url
    assert client.patch(endpoint, json={"palette": "forest"}).status_code == 200
    assert client.patch(endpoint, json={"github_link_enabled": False}).status_code == 200
    public = unwrap_api_response(client.get("/api/v1/public/site-theme"))
    assert public["github_link_enabled"] is False
    assert public["github_link_url"] == url
