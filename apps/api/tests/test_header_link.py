"""Header shortcut settings are authenticated, persistent and URL-safe."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import unwrap_api_response
from tests.test_posts_per_page import _login


def test_header_link_requires_login(client: TestClient) -> None:
    assert client.get("/api/v1/admin/header-link").status_code == 401
    assert client.put("/api/v1/admin/header-link", json={"enabled": False}).status_code == 401


def test_header_link_settings(client: TestClient) -> None:
    _login(client)
    assert unwrap_api_response(client.get("/api/v1/admin/header-link")) == {
        "enabled": True,
        "name": "公开站",
        "url": "/",
    }
    payload = {"enabled": True, "name": "  我的站点  ", "url": "https://example.com/blog?from=admin"}
    saved = unwrap_api_response(client.put("/api/v1/admin/header-link", json=payload))
    assert saved == {**payload, "name": "我的站点"}
    assert unwrap_api_response(client.get("/api/v1/admin/header-link")) == saved
    disabled = {**saved, "enabled": False}
    assert unwrap_api_response(client.put("/api/v1/admin/header-link", json=disabled)) == disabled
    assert unwrap_api_response(client.get("/api/v1/admin/header-link")) == disabled
    public = unwrap_api_response(client.get("/api/v1/public/site-theme"))
    assert "header_link" not in public
    assert public["site_name"] == "xblog"


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "data:text/html,x",
        "//evil.example",
        "https://u:p@example.com",
        "https://example.com\\evil",
        "http:example.com",
        "https://exam\nple.com",
    ],
)
def test_header_link_rejects_unsafe_url(client: TestClient, url: str) -> None:
    _login(client)
    response = client.put("/api/v1/admin/header-link", json={"enabled": True, "name": "站点", "url": url})
    assert response.status_code == 422


def test_header_link_rejects_empty_name(client: TestClient) -> None:
    _login(client)
    assert client.put("/api/v1/admin/header-link", json={"name": "  ", "url": "/"}).status_code == 422
