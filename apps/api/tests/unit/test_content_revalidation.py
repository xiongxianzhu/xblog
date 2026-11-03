"""Content invalidation ordering, without a database or HTTP connection."""
import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("SECRET_KEY", "isolated-test-key")

from app.api.v1.endpoints.admin import links, pages, posts
from app.models.friend_link import FriendLink
from app.models.page import Page
from app.models.post import Post
from app.schemas.link import FriendLinkCreate, FriendLinkUpdate
from app.schemas.page import PageUpdate
from app.schemas.post import PostCreate, PostUpdate


class ContentRevalidationTests(unittest.IsolatedAsyncioTestCase):
    async def test_content_changes_commit_before_notifying(self):
        cases = [
            (pages, "update_page", lambda s: ("about", PageUpdate(content_md="new"), s, None),
             Page(slug="about", title="About"), ["/about"], {}),
            (pages, "update_page", lambda s: ("projects", PageUpdate(content_md="new"), s, None),
             Page(slug="projects", title="Projects"), ["/projects"], {}),
            (links, "create_link", lambda s: (FriendLinkCreate(name="link", url="https://example.com",
             logo_url="https://example.com/logo.png"), s, None), None, ["/links"], {}),
            (links, "update_link", lambda s: (1, FriendLinkUpdate(name="new"), s, None),
             FriendLink(id=1, name="old", url="https://example.com"), ["/links"], {}),
            (links, "delete_link", lambda s: (1, s, None),
             FriendLink(id=1, name="old", url="https://example.com"), ["/links"], {}),
            (posts, "create_post", lambda s: (PostCreate(title="New", slug="new", status="published"), s, None),
             None, ["/"], {"layout": True}),
            (posts, "update_post", lambda s: (1, PostUpdate(status="draft"), s, None),
             Post(id=1, title="Old", slug="old", status="published"), ["/"], {"layout": True}),
            (posts, "update_post", lambda s: (1, PostUpdate(slug="new"), s, None),
             Post(id=1, title="Old", slug="old", status="published"), ["/"], {"layout": True}),
            (posts, "delete_post", lambda s: (1, s, None),
             Post(id=1, title="Old", slug="old", status="published"), ["/"], {"layout": True}),
        ]
        for module, name, args, row, paths, kwargs in cases:
            with self.subTest(module=module.__name__, operation=name, paths=paths):
                events = []
                session = MagicMock()
                for method in ("flush", "refresh", "delete"):
                    setattr(session, method, AsyncMock())
                session.get = AsyncMock(return_value=row)
                result = MagicMock()
                result.first.return_value = row if module is pages else None
                session.exec = AsyncMock(return_value=result)
                session.commit = AsyncMock(side_effect=lambda events=events: events.append("commit"))

                async def notify(*a, events=events, **kw):
                    self.assertEqual(events, ["commit"])
                    events.append("notify")

                with patch.object(module, "trigger_revalidate", side_effect=notify) as callback, \
                     patch.object(posts, "sync_tags", new=AsyncMock()), \
                     patch.object(posts, "to_post_admin", new=AsyncMock(return_value=None)):
                    await getattr(module, name)(*args(session))
                    callback.assert_awaited_once_with(paths, **kwargs)
                    self.assertEqual(events, ["commit", "notify"])

    async def test_failed_commit_does_not_notify(self):
        session = MagicMock()
        result = MagicMock()
        result.first.return_value = Page(slug="about", title="About")
        session.exec = AsyncMock(return_value=result)
        session.flush = AsyncMock()
        session.refresh = AsyncMock()
        session.commit = AsyncMock(side_effect=RuntimeError("commit failed"))
        with patch.object(pages, "trigger_revalidate", new=AsyncMock()) as callback:
            with self.assertRaisesRegex(RuntimeError, "commit failed"):
                await pages.update_page("about", PageUpdate(content_md="new"), session, None)
            callback.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
