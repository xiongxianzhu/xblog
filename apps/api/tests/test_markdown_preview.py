import asyncio

from fastapi.testclient import TestClient

from app.core.security import ACCESS_COOKIE, create_access_token, hash_password
from app.db.session import async_session_factory
from app.models.user import User
from tests.conftest import unwrap_api_response


def test_highlight_requires_login(client: TestClient) -> None:
    response = client.post("/api/v1/admin/markdown/highlight", json={"language": "python", "code": "pass"})
    assert response.status_code == 401


def test_highlight_languages_escaping_and_limits(client: TestClient) -> None:
    async def seed() -> None:
        async with async_session_factory() as session:
            session.add(User(username="previewer", password_hash=hash_password("test-password")))
            await session.commit()

    asyncio.run(seed())
    client.cookies.set(ACCESS_COOKIE, create_access_token("previewer"))
    for language, code, token in [
        ("python", 'def hello():\n    return "<script>"', 'class="k"'),
        ("javascript", "const value = 42;", 'class="kd"'),
        ("sql", "SELECT * FROM users;", 'class="k"'),
        ("json", '{"name":"value"}', 'class="nt"'),
    ]:
        response = client.post("/api/v1/admin/markdown/highlight", json={"language": language, "code": code})
        assert response.status_code == 200
        html = unwrap_api_response(response)["html"]
        assert token in html
        assert "<script>" not in html
    response = client.post(
        "/api/v1/admin/markdown/highlight", json={"language": "unknown-language", "code": "<script>alert(1)</script>"}
    )
    assert unwrap_api_response(response)["html"] == "&lt;script&gt;alert(1)&lt;/script&gt;"
    response = client.post(
        "/api/v1/admin/markdown/highlight", json={"language": "python", "code": "x" * 100_001}
    )
    assert response.status_code == 422
