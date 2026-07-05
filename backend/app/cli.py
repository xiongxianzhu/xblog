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
from app.services.upload_cleanup import cleanup_orphan_uploads


async def create_admin(username: str, password: str | None, phone: str | None = None) -> None:
    if not password:
        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            raise SystemExit("Passwords do not match")
    normalized_phone = None
    if phone:
        from app.services import sms_service

        normalized_phone = sms_service.normalize_phone(phone)
    async with async_session_factory() as session:
        result = await session.exec(select(User).where(User.username == username))
        if result.first():
            raise SystemExit(f"User '{username}' already exists")
        if normalized_phone:
            phone_result = await session.exec(select(User).where(User.phone == normalized_phone))
            if phone_result.first():
                raise SystemExit(f"Phone '{normalized_phone}' is already linked")
        session.add(
            User(
                username=username,
                password_hash=hash_password(password),
                phone=normalized_phone,
            )
        )
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
    create_parser.add_argument("--phone", default=None, help="Optional phone for SMS login")

    reset_parser = subparsers.add_parser("reset-password", help="Reset an admin user's password")
    reset_parser.add_argument("--username", required=True)
    reset_parser.add_argument("--password", default=None)

    subparsers.add_parser("seed-pages", help="Create default about/projects pages")

    cleanup_parser = subparsers.add_parser(
        "cleanup-uploads",
        help="Delete unreferenced managed uploads older than max-age",
    )
    cleanup_parser.add_argument(
        "--max-age",
        type=int,
        default=3600,
        help="Keep unreferenced files younger than this many seconds (default: 3600)",
    )
    cleanup_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report files that would be deleted without removing them",
    )

    args = parser.parse_args()
    if args.command == "create-admin":
        asyncio.run(create_admin(args.username, args.password, args.phone))
    elif args.command == "reset-password":
        asyncio.run(reset_password(args.username, args.password))
    elif args.command == "seed-pages":
        asyncio.run(seed_pages())
    elif args.command == "cleanup-uploads":
        try:
            report = asyncio.run(
                cleanup_orphan_uploads(max_age_seconds=args.max_age, dry_run=args.dry_run)
            )
        except Exception as exc:
            raise SystemExit(str(exc)) from exc

        print(
            "Scanned {scanned} files, deleted {deleted} orphans, "
            "kept {kept_referenced} referenced, kept {kept_recent} recent (< {max_age}s).".format(
                scanned=report.scanned,
                deleted=report.deleted,
                kept_referenced=report.kept_referenced,
                kept_recent=report.kept_recent,
                max_age=args.max_age,
            )
        )
        if args.dry_run:
            for path in report.deleted_paths:
                print(f"would delete: {path}")
        for warning in report.warnings:
            print(f"warning: {warning}")


if __name__ == "__main__":
    main()
