"""Article sharing is persisted and invalidated only after commit."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import unwrap_api_response
from tests.test_posts_per_page import _login


def test_share_default_and_auth(client: TestClient) -> None:
    assert unwrap_api_response(client.get("/api/v1/public/site-theme"))["article_share_enabled"] is False
    assert client.patch("/api/v1/admin/site-theme", json={"article_share_enabled": True}).status_code == 401


def test_share_toggle_and_post_commit_invalidation(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints.admin import site_theme
    from app.db.session import async_session_factory
    from app.services.site_settings import get_site_theme

    _login(client)
    notifications = []

    async def notify(paths: list[str], *, layout: bool) -> None:
        async with async_session_factory() as session:
            saved = await get_site_theme(session)
            notifications.append((saved.article_share_enabled, layout))

    monkeypatch.setattr(site_theme, "trigger_revalidate", notify)
    for enabled in (True, False):
        response = client.patch("/api/v1/admin/site-theme", json={"article_share_enabled": enabled})
        assert response.status_code == 200
        assert unwrap_api_response(response)["article_share_enabled"] is enabled
        assert unwrap_api_response(client.get("/api/v1/public/site-theme"))["article_share_enabled"] is enabled
    assert notifications == [(True, True), (False, True)]
    assert client.patch("/api/v1/admin/site-theme", json={"article_share_enabled": {}}).status_code == 422
    assert len(notifications) == 2
