"""OAuth 与找回密码 API 测试。"""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_oauth_providers_defaults(client: TestClient) -> None:
    response = client.get("/api/v1/auth/oauth/providers")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["data"] == {"github": False, "wechat": False}


def test_forgot_password_always_returns_message(client: TestClient) -> None:
    response = client.post("/api/v1/auth/forgot-password", json={"username": "nobody"})
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert "message" in body["data"]
