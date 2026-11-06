"""List filters apply before pagination and use the same conditions for totals."""

import asyncio
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.login_log import LoginLog
from app.models.operation_log import OperationLog
from app.models.post import Post
from app.models.user import User
from tests.conftest import unwrap_api_response
from tests.test_admin_users import _ensure_user, _login


def test_post_filters_and_pagination(client: TestClient) -> None:
    _ensure_user("filter-owner")
    _login(client, "filter-owner")

    async def seed() -> None:
        async with async_session_factory() as session:
            for index, (post_status, pinned) in enumerate(
                [
                    ("draft", False),
                    ("published", True),
                    ("published", False),
                    ("published", True),
                ]
            ):
                session.add(Post(title=f"Filter {index}", slug=f"filter-{index}", status=post_status, is_pinned=pinned))
            await session.commit()

    asyncio.run(seed())
    first = unwrap_api_response(
        client.get(
            "/api/v1/admin/posts",
            params={
                "status": "published",
                "is_pinned": "true",
                "q": "Filter",
                "page_size": 1,
            },
        )
    )
    second = unwrap_api_response(
        client.get(
            "/api/v1/admin/posts",
            params={
                "status": "published",
                "is_pinned": "true",
                "q": "Filter",
                "page_size": 1,
                "page": 2,
            },
        )
    )
    assert first["total"] == second["total"] == 2
    assert first["items"][0]["id"] != second["items"][0]["id"]
    unpinned = unwrap_api_response(client.get("/api/v1/admin/posts?is_pinned=false&status=published"))
    assert unpinned["total"] == 1
    assert unpinned["items"][0]["is_pinned"] is False
    assert unwrap_api_response(client.get("/api/v1/admin/posts?status=draft&is_pinned=true"))["total"] == 0
    assert unwrap_api_response(client.get("/api/v1/admin/posts"))["total"] == 4
    assert client.get("/api/v1/admin/posts?status=unknown").status_code == 422


def test_user_filters_preserve_global_active_count(client: TestClient) -> None:
    _ensure_user("filter-owner")
    _login(client, "filter-owner")

    async def seed() -> None:
        async with async_session_factory() as session:
            password_hash = hash_password("secret123")
            session.add(
                User(
                    username="filtered-disabled",
                    password_hash=password_hash,
                    is_active=False,
                    gender="female",
                    must_change_password=True,
                )
            )
            session.add(User(username="filtered-active", password_hash=password_hash, gender="male"))
            await session.commit()

    asyncio.run(seed())
    filtered = unwrap_api_response(
        client.get(
            "/api/v1/admin/users",
            params={
                "is_active": "false",
                "gender": "female",
                "must_change_password": "true",
                "q": "filtered",
            },
        )
    )
    assert filtered["total"] == 1
    assert filtered["items"][0]["username"] == "filtered-disabled"
    assert filtered["active_count"] == 2
    assert unwrap_api_response(client.get("/api/v1/admin/users?gender=unset"))["total"] == 1
    assert unwrap_api_response(client.get("/api/v1/admin/users?must_change_password=false"))["total"] == 2
    assert unwrap_api_response(client.get("/api/v1/admin/users?is_active=true&gender=female"))["total"] == 0
    assert client.get("/api/v1/admin/users?gender=invalid").status_code == 422


def test_log_filters_and_totals(client: TestClient) -> None:
    _ensure_user("filter-owner")
    _login(client, "filter-owner")

    async def seed() -> None:
        async with async_session_factory() as session:
            for success in (True, False, False):
                session.add(
                    LoginLog(
                        username="log-target",
                        method="sms",
                        success=success,
                        failure_reason=None if success else "invalid_code",
                    )
                )
            for action in ("user.create", "user.update", "user.update"):
                session.add(OperationLog(username="filter-owner", action=action, resource_type="user"))
            await session.commit()

    asyncio.run(seed())
    failed = unwrap_api_response(
        client.get(
            "/api/v1/admin/logs/login",
            params={
                "success": "false",
                "method": "sms",
                "failure_reason": "invalid_code",
                "page_size": 1,
                "page": 2,
            },
        )
    )
    assert failed["total"] == 2
    assert len(failed["items"]) == 1
    assert failed["items"][0]["success"] is False
    login_id = failed["items"][0]["id"]
    assert unwrap_api_response(client.get(f"/api/v1/admin/logs/login/{login_id}")) == failed["items"][0]
    assert unwrap_api_response(client.get("/api/v1/admin/logs/login?success=true&method=sms"))["total"] == 1
    assert (
        unwrap_api_response(client.get("/api/v1/admin/logs/login?success=true&failure_reason=invalid_code"))["total"]
        == 0
    )
    operations = unwrap_api_response(
        client.get(
            "/api/v1/admin/logs/operations",
            params={
                "action": "user.update",
                "resource_type": "user",
                "page_size": 1,
                "page": 2,
            },
        )
    )
    assert operations["total"] == 2
    assert len(operations["items"]) == 1
    assert operations["items"][0]["action"] == "user.update"
    operation_id = operations["items"][0]["id"]
    assert unwrap_api_response(client.get(f"/api/v1/admin/logs/operations/{operation_id}")) == operations["items"][0]
    assert unwrap_api_response(client.get("/api/v1/admin/logs/operations?action=user.delete"))["total"] == 0
    for path in ("login", "operations"):
        assert client.get(f"/api/v1/admin/logs/{path}/999999").status_code == 404
    client.post("/api/v1/auth/logout")
    for path in ("login", "operations"):
        assert client.get(f"/api/v1/admin/logs/{path}/1").status_code == 401


def test_log_keyword_and_time_filters(client: TestClient) -> None:
    _ensure_user("time-filter-owner")
    _login(client, "time-filter-owner")

    async def seed() -> None:
        async with async_session_factory() as session:
            for index in range(3):
                timestamp = datetime(2026, 1, 2, tzinfo=UTC) + timedelta(hours=index)
                session.add(
                    LoginLog(
                        username="time-user",
                        method="sms",
                        success=False,
                        ip_address=f"192.0.2.{index}",
                        user_agent="NeedleAgent 100%_literal",
                        failure_reason="invalid_code",
                        created_at=timestamp,
                    )
                )
                session.add(
                    OperationLog(
                        username="time-user",
                        action="user.update",
                        resource_type="user",
                        resource_id=str(index),
                        ip_address=f"192.0.2.{index}",
                        detail="关键词测试 100%_literal",
                        created_at=timestamp,
                    )
                )
            await session.commit()

    asyncio.run(seed())
    for path, keyword in (("login", " needleagent "), ("operations", "关键词测试")):
        url = f"/api/v1/admin/logs/{path}"
        params = {
            "q": keyword,
            "start_at": "2026-01-02T09:00:00+08:00",
            "end_at": "2026-01-02T10:00:00+08:00",
            "page_size": 1,
        }
        first = unwrap_api_response(client.get(url, params=params))
        second = unwrap_api_response(client.get(url, params={**params, "page": 2}))
        assert first["total"] == second["total"] == 2
        assert len(first["items"]) == len(second["items"]) == 1
        assert first["items"][0]["id"] != second["items"][0]["id"]
        # Time zone offsets identify the same interval; omitted offset uses Beijing time.
        for start in ("2026-01-02T01:00:00Z", "2026-01-02T09:00:00"):
            assert unwrap_api_response(client.get(url, params={**params, "start_at": start}))["total"] == 2
        assert (
            unwrap_api_response(client.get(url, params={"q": keyword, "end_at": "2026-01-02T08:00:00+08:00"}))["total"]
            == 1
        )
        assert (
            unwrap_api_response(client.get(url, params={"q": keyword, "start_at": "2026-01-02T10:00:00+08:00"}))[
                "total"
            ]
            == 1
        )
        assert unwrap_api_response(client.get(url, params={"q": "192.0.2.1"}))["total"] == 1
        assert unwrap_api_response(client.get(url, params={"q": "%_literal"}))["total"] == 3
        assert unwrap_api_response(client.get(url, params={**params, "q": "missing-keyword"}))["total"] == 0
        assert client.get(url, params={**params, "start_at": "2026-01-03T00:00:00Z"}).status_code == 422
        assert client.get(url, params={"start_at": "invalid"}).status_code == 422
    combined = unwrap_api_response(
        client.get(
            "/api/v1/admin/logs/login",
            params={
                "q": "time-user",
                "success": "false",
                "method": "sms",
                "start_at": "2026-01-02T09:00:00+08:00",
            },
        )
    )
    assert combined["total"] == 2
