"""文章封面上传测试。"""

from __future__ import annotations

import io

from fastapi.testclient import TestClient

from app.services.uploads import post_cover_url_to_path
from tests.conftest import unwrap_api_response


def _login(client: TestClient) -> None:
    from app.core.security import hash_password
    from app.db.session import async_session_factory
    from app.models.user import User

    async def create_user() -> None:
        async with async_session_factory() as session:
            session.add(User(username="covertest", password_hash=hash_password("secret123")))
            await session.commit()

    import asyncio

    asyncio.run(create_user())

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "covertest", "password": "secret123"},
    )
    assert login.status_code == 200


def test_upload_post_cover(client: TestClient) -> None:
    _login(client)

    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    resp = client.post(
        "/api/v1/admin/posts/cover",
        files={"file": ("cover.png", io.BytesIO(png_bytes), "image/png")},
    )
    assert resp.status_code == 200
    body = unwrap_api_response(resp)
    assert body["cover_url"].startswith("/api/v1/uploads/covers/cover-")


def test_upload_post_cover_requires_auth(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/admin/posts/cover",
        files={"file": ("cover.png", io.BytesIO(b"bad"), "image/png")},
    )
    assert resp.status_code == 401


def test_delete_uploaded_post_cover(client: TestClient) -> None:
    _login(client)

    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload = client.post(
        "/api/v1/admin/posts/cover",
        files={"file": ("cover.png", io.BytesIO(png_bytes), "image/png")},
    )
    cover_url = unwrap_api_response(upload)["cover_url"]

    delete = client.delete("/api/v1/admin/posts/cover", params={"cover_url": cover_url})
    assert delete.status_code == 200

    delete_again = client.delete("/api/v1/admin/posts/cover", params={"cover_url": cover_url})
    assert delete_again.status_code == 200


def test_clear_cover_on_save_deletes_managed_file(client: TestClient) -> None:
    _login(client)

    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload = client.post(
        "/api/v1/admin/posts/cover",
        files={"file": ("cover.png", io.BytesIO(png_bytes), "image/png")},
    )
    cover_url = unwrap_api_response(upload)["cover_url"]
    cover_path = post_cover_url_to_path(cover_url)
    assert cover_path is not None
    assert cover_path.is_file()

    create = client.post(
        "/api/v1/admin/posts",
        json={
            "title": "封面测试",
            "slug": "cover-clear-test",
            "content_md": "hello",
            "cover_url": cover_url,
            "status": "draft",
        },
    )
    post = unwrap_api_response(create)
    post_id = post["id"]

    patch = client.patch(
        f"/api/v1/admin/posts/{post_id}",
        json={"cover_url": None},
    )
    assert patch.status_code == 200
    assert unwrap_api_response(patch)["cover_url"] is None
    assert not cover_path.is_file()
