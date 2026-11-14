"""Media-library auth, file handling, groups and pagination."""

import asyncio
import base64
import io
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db.session import async_session_factory
from app.models.post import Post
from app.services import media
from app.services.uploads import get_upload_root
from tests.conftest import unwrap_api_response
from tests.test_admin_users import _ensure_user, _login

PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWWQAAAAASUVORK5CYII=")


@pytest.fixture
def client() -> TestClient:
    from app.main import create_app

    # Other auth tests rebuild settings; mount uploads from this test's current isolated directory.
    return TestClient(create_app())


def sign_in(client: TestClient) -> None:
    _ensure_user("media-admin")
    _login(client, "media-admin")


def upload(
    client: TestClient, name: str = "test.png", kind: str = "image", content: bytes = PNG, group_id: int | None = None
):
    data = {"kind": kind}
    if group_id is not None:
        data["group_id"] = str(group_id)
    return client.post("/api/v1/admin/media", data=data, files={"file": (name, content, "application/octet-stream")})


def test_media_requires_auth(client: TestClient) -> None:
    for path in ("/media?kind=image", "/media/groups?kind=image", "/media/1/download"):
        assert client.get("/api/v1/admin" + path).status_code == 401
    assert upload(client).status_code == 401
    assert client.post("/api/v1/admin/media/groups", json={"name": "group", "kind": "image"}).status_code == 401
    assert client.delete("/api/v1/admin/media/1").status_code == 401


def test_media_upload_download_and_delete(client: TestClient) -> None:
    sign_in(client)
    response = upload(client, "../原始图片.png")
    assert response.status_code == 201
    asset = unwrap_api_response(response)
    assert asset["original_name"] == "原始图片.png"
    assert asset["mime_type"] == "image/png"
    assert asset["size_bytes"] == len(PNG)
    assert asset["url"].startswith("/api/v1/uploads/media/")
    stored = get_upload_root() / "media" / Path(asset["url"]).name
    assert stored.read_bytes() == PNG
    downloaded = client.get(f"/api/v1/admin/media/{asset['id']}/download")
    assert downloaded.content == PNG
    assert "attachment" in downloaded.headers["content-disposition"]
    assert downloaded.headers["x-content-type-options"] == "nosniff"
    assert client.get(asset["url"]).content == PNG
    partial = client.get(asset["url"], headers={"Range": "bytes=0-7"})
    assert partial.status_code == 206
    assert partial.content == PNG[:8]
    assert client.delete(f"/api/v1/admin/media/{asset['id']}").status_code == 200
    assert not stored.exists()
    assert client.get(asset["url"]).status_code == 404
    assert client.get(f"/api/v1/admin/media/{asset['id']}/download").status_code == 404


def test_media_groups_search_and_pagination(client: TestClient) -> None:
    sign_in(client)
    group = unwrap_api_response(client.post("/api/v1/admin/media/groups", json={"kind": "image", "name": " 配图 "}))
    assert group["name"] == "配图"
    assert client.post("/api/v1/admin/media/groups", json={"kind": "image", "name": "配图"}).status_code == 409
    assert client.post("/api/v1/admin/media/groups", json={"kind": "image", "name": " "}).status_code == 422
    audio_group = unwrap_api_response(client.post("/api/v1/admin/media/groups", json={"kind": "audio", "name": "配图"}))
    assert upload(client, group_id=audio_group["id"]).status_code == 422
    assert upload(client, group_id=99999).status_code == 422
    first = unwrap_api_response(upload(client, "needle-A.png", group_id=group["id"]))
    upload(client, "needle-B.png", group_id=group["id"])
    upload(client, "other.png")
    filtered = unwrap_api_response(
        client.get(
            "/api/v1/admin/media",
            params={"kind": "image", "q": "NEEDLE", "group_id": group["id"], "page_size": 1, "page": 2},
        )
    )
    assert filtered["total"] == 2 and len(filtered["items"]) == 1
    assert unwrap_api_response(client.get("/api/v1/admin/media?kind=image&group_id=0"))["total"] == 1
    counts = unwrap_api_response(client.get("/api/v1/admin/media/groups?kind=image"))
    assert counts["total_count"] == 3 and counts["ungrouped_count"] == 1 and counts["items"][0]["count"] == 2
    renamed = client.patch(f"/api/v1/admin/media/{first['id']}", json={"name": "新的名字", "group_id": None})
    assert renamed.status_code == 200
    assert unwrap_api_response(renamed)["group_id"] is None
    assert unwrap_api_response(client.get("/api/v1/admin/media?kind=image&q=新的名字"))["total"] == 1
    assert client.patch(f"/api/v1/admin/media/{first['id']}", json={"group_id": audio_group["id"]}).status_code == 422
    assert client.patch(f"/api/v1/admin/media/groups/{group['id']}", json={"name": "文章配图"}).status_code == 200
    assert client.delete(f"/api/v1/admin/media/groups/{group['id']}").status_code == 200
    assert unwrap_api_response(client.get("/api/v1/admin/media?kind=image&group_id=0"))["total"] == 3


@pytest.mark.parametrize(
    ("name", "kind", "content"),
    [
        ("test.mp3", "audio", b"ID3" + b"\0" * 20),
        ("test.wav", "audio", b"RIFF" + b"\0" * 4 + b"WAVE" + b"\0" * 20),
        ("test.mp4", "video", b"\0\0\0\x18ftypisom" + b"\0" * 20),
        ("test.webm", "video", b"\x1aE\xdf\xa3webm" + b"\0" * 20),
    ],
)
def test_audio_video_formats(client: TestClient, name: str, kind: str, content: bytes) -> None:
    sign_in(client)
    response = upload(client, name, kind, content)
    assert response.status_code == 201
    asset = unwrap_api_response(response)
    assert asset["kind"] == kind
    assert client.get(f"/api/v1/admin/media/{asset['id']}/download").content == content


def test_media_rejects_invalid_and_oversized_files(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    sign_in(client)
    before = set((get_upload_root() / "media").glob("*"))
    assert upload(client, "x.svg", content=b"<svg/>").status_code == 422
    assert upload(client, content=b"<html>fake</html>").status_code == 422
    assert upload(client, content=b"").status_code == 422
    assert upload(client, kind="video").status_code == 422
    monkeypatch.setitem(media.MAX_BYTES, "image", 10)
    assert upload(client).status_code == 413
    assert set((get_upload_root() / "media").glob("*")) == before
    assert unwrap_api_response(client.get("/api/v1/admin/media?kind=image"))["total"] == 0


def test_referenced_media_cannot_be_deleted(client: TestClient) -> None:
    sign_in(client)
    asset = unwrap_api_response(upload(client))

    async def reference() -> None:
        async with async_session_factory() as session:
            session.add(Post(title="Uses media", slug="uses-media", content_md=f"![image]({asset['url']})"))
            await session.commit()

    asyncio.run(reference())
    assert client.delete(f"/api/v1/admin/media/{asset['id']}").status_code == 409
    assert client.get(asset["url"]).content == PNG


def test_failed_database_save_removes_uploaded_file(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from sqlmodel.ext.asyncio.session import AsyncSession

    sign_in(client)
    before = set((get_upload_root() / "media").glob("*"))

    async def fail_commit(self: AsyncSession) -> None:
        raise RuntimeError("test database failure")

    monkeypatch.setattr(AsyncSession, "commit", fail_commit)
    with pytest.raises(RuntimeError, match="test database failure"):
        upload(client)
    assert set((get_upload_root() / "media").glob("*")) == before


def test_file_delete_failure_preserves_record_for_retry(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    sign_in(client)
    asset = unwrap_api_response(upload(client))
    stored = get_upload_root() / "media" / Path(asset["url"]).name
    original_unlink = Path.unlink

    def fail_unlink(path: Path, *args, **kwargs) -> None:
        if path == stored:
            raise PermissionError("test file is locked")
        original_unlink(path, *args, **kwargs)

    with monkeypatch.context() as scoped:
        scoped.setattr(Path, "unlink", fail_unlink)
        response = client.delete(f"/api/v1/admin/media/{asset['id']}")
        assert response.status_code == 503
        assert response.json()["msg"] == "MEDIA_FILE_DELETE_FAILED"
    assert stored.exists()
    assert client.get(f"/api/v1/admin/media/{asset['id']}/download").status_code == 200
    assert client.delete(f"/api/v1/admin/media/{asset['id']}").status_code == 200
    assert not stored.exists()


def test_missing_source_file_can_remove_stale_record(client: TestClient) -> None:
    sign_in(client)
    asset = unwrap_api_response(upload(client))
    stored = get_upload_root() / "media" / Path(asset["url"]).name
    stored.unlink()
    assert client.delete(f"/api/v1/admin/media/{asset['id']}").status_code == 200
    assert client.get(f"/api/v1/admin/media/{asset['id']}/download").status_code == 404


def test_archive_requires_auth(client: TestClient) -> None:
    assert client.post("/api/v1/admin/media/archive", json={"ids": [1]}).status_code == 401


def test_archive_preserves_sources_and_handles_duplicate_names(client: TestClient) -> None:
    sign_in(client)
    first = unwrap_api_response(upload(client, "图片.png"))
    second = unwrap_api_response(upload(client, "图片.png"))
    response = client.post("/api/v1/admin/media/archive", json={"ids": [first["id"], second["id"], first["id"]]})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        assert archive.namelist() == ["图片.png", "图片 (2).png"]
        assert all(archive.read(name) == PNG for name in archive.namelist())
    assert client.get(first["url"]).content == PNG
    assert client.get(second["url"]).content == PNG
    assert client.post("/api/v1/admin/media/archive", json={"ids": []}).status_code == 422
    assert client.post("/api/v1/admin/media/archive", json={"ids": [first["id"]] * 101}).status_code == 422
    assert client.post("/api/v1/admin/media/archive", json={"ids": [999999]}).status_code == 404
    (get_upload_root() / "media" / Path(first["url"]).name).unlink()
    assert client.post("/api/v1/admin/media/archive", json={"ids": [first["id"], second["id"]]}).status_code == 404
