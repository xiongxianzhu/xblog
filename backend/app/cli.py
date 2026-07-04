"""CLI utilities."""

from __future__ import annotations

import argparse
import asyncio
import getpass

from sqlmodel import select

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.page import Page
from app.models.user import User


async def create_admin(username: str, password: str | None) -> None:
    if not password:
        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            raise SystemExit("Passwords do not match")
    async with async_session_factory() as session:
        result = await session.exec(select(User).where(User.username == username))
        if result.first():
            raise SystemExit(f"User '{username}' already exists")
        session.add(User(username=username, password_hash=hash_password(password)))
        await session.commit()
        print(f"Admin user '{username}' created")


async def reset_password(username: str, password: str | None) -> None:
    if not password:
        password = getpass.getpass("New password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            raise SystemExit("Passwords do not match")
    async with async_session_factory() as session:
        result = await session.exec(select(User).where(User.username == username))
        user = result.first()
        if user is None:
            raise SystemExit(f"User '{username}' not found")
        user.password_hash = hash_password(password)
        await session.commit()
        print(f"Password updated for '{username}'")


async def seed_pages() -> None:
    defaults = [
        ("about", "关于"),
        ("projects", "作品集"),
    ]
    async with async_session_factory() as session:
        for slug, title in defaults:
            result = await session.exec(select(Page).where(Page.slug == slug))
            if result.first():
                continue
            session.add(Page(slug=slug, title=title, content_md="", content_html=""))
        await session.commit()
        print("Default pages seeded: about, projects")


def main() -> None:
    parser = argparse.ArgumentParser(description="xblog admin utilities")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser("create-admin", help="Create an admin user")
    create_parser.add_argument("--username", required=True)
    create_parser.add_argument("--password", default=None)

    reset_parser = subparsers.add_parser("reset-password", help="Reset an admin user's password")
    reset_parser.add_argument("--username", required=True)
    reset_parser.add_argument("--password", default=None)

    subparsers.add_parser("seed-pages", help="Create default about/projects pages")

    args = parser.parse_args()
    if args.command == "create-admin":
        asyncio.run(create_admin(args.username, args.password))
    elif args.command == "reset-password":
        asyncio.run(reset_password(args.username, args.password))
    elif args.command == "seed-pages":
        asyncio.run(seed_pages())


if __name__ == "__main__":
    main()
