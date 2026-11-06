from fastapi.testclient import TestClient

from tests.conftest import unwrap_api_response
from tests.test_admin_users import _ensure_user, _login


def test_link_detail_auth_and_round_trip(client: TestClient) -> None:
    assert client.get("/api/v1/admin/links/1").status_code == 401
    _ensure_user("link-editor")
    _login(client, "link-editor")
    created = client.post(
        "/api/v1/admin/links",
        json={
            "name": "测试友链",
            "url": "https://example.com",
            "logo_url": "https://example.com/logo.png",
            "description": "完整简介",
            "sort_order": 3,
        },
    )
    assert created.status_code == 201
    link = unwrap_api_response(created)
    assert unwrap_api_response(client.get(f"/api/v1/admin/links/{link['id']}")) == link
    changed = client.patch(f"/api/v1/admin/links/{link['id']}", json={"name": "更新友链", "sort_order": 4})
    assert changed.status_code == 200
    assert unwrap_api_response(client.get(f"/api/v1/admin/links/{link['id']}"))["name"] == "更新友链"
    assert client.get("/api/v1/admin/links/999999").status_code == 404
