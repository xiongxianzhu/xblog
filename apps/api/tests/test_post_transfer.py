"""Import/export round trips, partial failures, limits and authentication."""

import io
import zipfile

import pytest
from fastapi.testclient import TestClient

from tests.conftest import unwrap_api_response
from tests.test_posts_per_page import _login

IMPORT = "/api/v1/admin/posts/import-markdown"
EXPORT = "/api/v1/admin/posts/export-markdown"


def upload(client: TestClient, files: list[tuple[str, bytes]]):
    return client.post(IMPORT, files=[("files", (name, data, "application/octet-stream")) for name, data in files])


def test_transfer_requires_login(client: TestClient) -> None:
    assert client.get(EXPORT).status_code == 401
    assert client.get("/api/v1/admin/posts/1/export-markdown").status_code == 401
    assert upload(client, [("hello.md", b"# Hello")]).status_code == 401


def test_batch_import_partial_failure_and_duplicates(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints.admin import posts

    _login(client)
    notifications = []

    async def notify(paths, *, layout):
        notifications.append((paths, layout))

    monkeypatch.setattr(posts, "trigger_revalidate", notify)
    response = upload(
        client,
        [
            ("hello.md", b"# Hello\n\nBody"),
            ("hello.md", b"# Must not overwrite"),
            ("invalid.md", b"\xff"),
            ("broken.md", b"---\nstatus: impossible\n---\nBody"),
            ("next.md", b"Plain text"),
        ],
    )
    assert response.status_code == 200
    report = unwrap_api_response(response)
    assert (report["imported"], report["skipped"], report["failed"]) == (2, 1, 2)
    assert notifications == []
    listing = unwrap_api_response(client.get("/api/v1/admin/posts"))
    assert listing["total"] == 2
    first = unwrap_api_response(client.get(f"/api/v1/admin/posts/{report['results'][0]['post_id']}"))
    assert first["title"] == "Hello"
    assert first["content_md"] == "# Hello\n\nBody"
    assert first["status"] == "draft"


def test_export_all_and_round_trip(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from sqlmodel import select

    from app.api.v1.endpoints.admin import posts
    from app.db.session import async_session_factory
    from app.models.post import Post

    _login(client)
    notifications = []

    async def notify(paths, *, layout):
        async with async_session_factory() as session:
            saved = (await session.exec(select(Post).where(Post.slug == "published"))).first()
            notifications.append((saved is not None, layout))

    monkeypatch.setattr(posts, "trigger_revalidate", notify)
    body = "# 标题\n\n![图片](/api/v1/uploads/covers/example.png)\n\n```python\nprint(1)\n```\n"
    payload = {
        "title": "引号：‘你好’",
        "slug": "published",
        "content_md": body,
        "excerpt": "摘要\n第二行",
        "status": "published",
        "is_pinned": True,
        "tag_slugs": ["Python", "测试"],
        "cover_url": "https://example.com/image.png",
    }
    original = unwrap_api_response(client.post("/api/v1/admin/posts", json=payload))
    draft = unwrap_api_response(
        client.post("/api/v1/admin/posts", json={"title": "Draft", "slug": "draft", "is_pinned": True})
    )
    single = client.get(f"/api/v1/admin/posts/{original['id']}/export-markdown")
    assert single.status_code == 200
    assert single.headers["content-type"].startswith("text/markdown")
    exported = client.get(EXPORT, params={"page_size": 1, "status": "published"})
    assert exported.status_code == 200
    assert exported.headers["content-type"] == "application/zip"
    assert exported.headers["cache-control"] == "no-store"
    with zipfile.ZipFile(io.BytesIO(exported.content)) as archive:
        assert len(archive.namelist()) == 2
        assert archive.read(f"posts/{original['id']}.md") == single.content
    repeated = unwrap_api_response(upload(client, [("backup.zip", exported.content)]))
    assert repeated["skipped"] == 2
    for post in (original, draft):
        assert client.delete(f"/api/v1/admin/posts/{post['id']}").status_code == 200
    notifications.clear()
    restored = unwrap_api_response(upload(client, [("backup.zip", exported.content)]))
    assert restored["imported"] == 2
    assert notifications == [(True, True)]
    new_id = next(item["post_id"] for item in restored["results"] if item["filename"].endswith(f"/{original['id']}.md"))
    new = unwrap_api_response(client.get(f"/api/v1/admin/posts/{new_id}"))
    for key in (
        "title",
        "slug",
        "content_md",
        "excerpt",
        "cover_url",
        "status",
        "is_pinned",
        "created_at",
        "updated_at",
        "published_at",
    ):
        assert new[key] == original[key], key
    assert {tag["name"] for tag in new["tags"]} == {"Python", "测试"}
    draft_id = next(item["post_id"] for item in restored["results"] if item["filename"].endswith(f"/{draft['id']}.md"))
    restored_draft = unwrap_api_response(client.get(f"/api/v1/admin/posts/{draft_id}"))
    assert restored_draft["status"] == "draft"
    assert restored_draft["is_pinned"] is True


def test_rejects_invalid_archives_and_sizes(client: TestClient) -> None:
    _login(client)
    assert upload(client, [("wrong.txt", b"# Title")]).status_code == 422
    assert upload(client, [("broken.zip", b"not a zip")]).status_code == 422
    for name, data, expected in [("../escape.md", b"# Title", 422), ("big.md", b"a" * (2 * 1024 * 1024 + 1), 413)]:
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(name, data)
        assert upload(client, [("test.zip", output.getvalue())]).status_code == expected
    assert unwrap_api_response(client.get("/api/v1/admin/posts"))["total"] == 0


def test_frontmatter_alias_rejected(client: TestClient) -> None:
    _login(client)
    result = unwrap_api_response(upload(client, [("bad.md", b"---\ntitle: &x [*x]\n---\nText")]))
    assert result["failed"] == 1
    assert "YAML" in result["results"][0]["message"]
