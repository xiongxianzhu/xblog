"""Portable Markdown backups; archives are read in memory, never extracted to disk."""

from __future__ import annotations

import io
import re
import zipfile
import zlib
from datetime import UTC
from pathlib import PurePosixPath

import yaml
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession
from yaml.tokens import AliasToken

from app.models.post import Post
from app.schemas.post_transfer import MarkdownPostMetadata, PostImportReport, PostImportResult
from app.services.posts import apply_markdown, apply_pin_state, apply_publish_state, load_tags, sync_tags

MAX_FILES = 1000
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_TOTAL_BYTES = 50 * 1024 * 1024
MAX_METADATA_BYTES = 64 * 1024


def parse_markdown(filename: str, data: bytes) -> MarkdownPostMetadata:
    text = data.decode("utf-8-sig")
    if not text.strip():
        raise ValueError("文件内容为空。")
    metadata: dict = {}
    body = text
    lines = text.splitlines(keepends=True)
    if lines and lines[0].strip() == "---":
        end = next((i for i in range(1, len(lines)) if lines[i].strip() in {"---", "..."}), None)
        if end is not None:
            header = "".join(lines[1:end])
            if len(header.encode("utf-8")) > MAX_METADATA_BYTES:
                raise ValueError("文章元信息不能超过 64KB。")
            if any(isinstance(token, AliasToken) for token in yaml.scan(header)):
                raise ValueError("文章元信息不支持 YAML 别名。")
            parsed = yaml.safe_load(header)
            if not isinstance(parsed, dict):
                raise ValueError("文件头部元信息必须是键值格式。")
            metadata = parsed
            body = "".join(lines[end + 1 :])
    stem = PurePosixPath(filename.replace("\\", "/")).stem
    heading = re.search(r"^# +(.+?) *#* *$", body, re.MULTILINE)
    metadata.setdefault("title", heading.group(1).strip() if heading else stem)
    metadata.setdefault("slug", re.sub(r"[^\w-]+", "-", stem.lower()).strip("-") or "imported-post")
    if "tags" in metadata:
        metadata["tag_slugs"] = metadata["tags"]
    metadata["content_md"] = body
    payload = MarkdownPostMetadata.model_validate(metadata)
    if not payload.title.strip() or not payload.slug.strip():
        raise ValueError("标题和文章路径不能为空。")
    for field in ("created_at", "updated_at", "published_at", "pinned_at"):
        value = getattr(payload, field)
        if value is not None and value.tzinfo is None:
            setattr(payload, field, value.replace(tzinfo=UTC))
    return payload


async def read_import_files(files: list[UploadFile]) -> list[tuple[str, bytes]]:
    if not files or len(files) > MAX_FILES:
        raise HTTPException(422, f"请选择 1 至 {MAX_FILES} 个文件。")
    documents: list[tuple[str, bytes]] = []
    uploaded = expanded = 0

    def add(name: str, data: bytes) -> None:
        nonlocal expanded
        expanded += len(data)
        if len(data) > MAX_FILE_BYTES or expanded > MAX_TOTAL_BYTES or len(documents) >= MAX_FILES:
            raise HTTPException(413, "单篇最多 2MB；每次最多 1000 篇，解压后总大小最多 50MB。")
        documents.append((name, data))

    try:
        for upload in files:
            name = upload.filename or "article.md"
            data = await upload.read(MAX_TOTAL_BYTES + 1)
            uploaded += len(data)
            if uploaded > MAX_TOTAL_BYTES:
                raise HTTPException(413, "每次上传总大小不能超过 50MB。")
            if name.lower().endswith((".md", ".markdown")):
                add(name, data)
            elif name.lower().endswith(".zip"):
                try:
                    with zipfile.ZipFile(io.BytesIO(data)) as archive:
                        entries = archive.infolist()
                        if len(entries) > MAX_FILES + 100:
                            raise HTTPException(413, "ZIP 中的文件数量过多。")
                        for item in entries:
                            path = PurePosixPath(item.filename.replace("\\", "/"))
                            if path.is_absolute() or ".." in path.parts or ":" in item.filename:
                                raise HTTPException(422, "ZIP 含有不安全的文件路径。")
                            if item.is_dir() or not item.filename.lower().endswith((".md", ".markdown")):
                                continue
                            if item.file_size > MAX_FILE_BYTES or expanded + item.file_size > MAX_TOTAL_BYTES:
                                raise HTTPException(413, "ZIP 解压后的文章大小超过限制。")
                            with archive.open(item) as entry:
                                add(f"{name}/{item.filename}", entry.read(MAX_FILE_BYTES + 1))
                except (zipfile.BadZipFile, RuntimeError, NotImplementedError, zlib.error) as exc:
                    raise HTTPException(422, "ZIP 已损坏、已加密或使用不支持的压缩格式。") from exc
            else:
                raise HTTPException(422, "仅支持 .md、.markdown 和 .zip 文件。")
        if not documents:
            raise HTTPException(422, "没有找到可导入的 Markdown 文件。")
        return documents
    finally:
        for upload in files:
            await upload.close()


async def import_posts(session: AsyncSession, documents: list[tuple[str, bytes]]) -> tuple[PostImportReport, bool]:
    results: list[PostImportResult] = []
    published = False
    for filename, data in documents:
        try:
            payload = parse_markdown(filename, data)
            existing = (await session.exec(select(Post).where(Post.slug == payload.slug))).first()
            if existing:
                results.append(
                    PostImportResult(filename=filename, status="skipped", message="文章路径已存在，未覆盖。")
                )
                continue
            post = Post(title=payload.title, slug=payload.slug, excerpt=payload.excerpt, cover_url=payload.cover_url)
            apply_markdown(post, payload.content_md)
            apply_publish_state(post, payload.status)
            if payload.is_pinned:
                apply_pin_state(post, True)
            for field in ("created_at", "updated_at", "published_at", "pinned_at"):
                value = getattr(payload, field)
                if value is not None and (field != "pinned_at" or post.is_pinned):
                    setattr(post, field, value)
            session.add(post)
            await session.flush()
            await sync_tags(session, post.id or 0, payload.tag_slugs)
            await session.commit()
            published = published or post.status == "published"
            results.append(PostImportResult(filename=filename, status="imported", message="导入成功", post_id=post.id))
        except IntegrityError:
            await session.rollback()
            existing = (await session.exec(select(Post).where(Post.slug == payload.slug))).first()
            results.append(
                PostImportResult(
                    filename=filename,
                    status="skipped" if existing else "failed",
                    message="文章路径已存在，未覆盖。" if existing else "数据冲突，导入失败，请重试。",
                )
            )
        except (ValueError, yaml.YAMLError, HTTPException) as exc:
            await session.rollback()
            if isinstance(exc, ValidationError):
                message = "文章元信息无效：" + ", ".join(str(error["loc"][0]) for error in exc.errors())
            elif isinstance(exc, UnicodeDecodeError):
                message = "文件不是 UTF-8 编码，请转换后重试。"
            elif isinstance(exc, yaml.YAMLError):
                message = "文章头部 YAML 格式无效。"
            else:
                message = str(exc.detail) if isinstance(exc, HTTPException) else str(exc)
            results.append(PostImportResult(filename=filename, status="failed", message=message))
    return PostImportReport(
        imported=sum(item.status == "imported" for item in results),
        skipped=sum(item.status == "skipped" for item in results),
        failed=sum(item.status == "failed" for item in results),
        results=results,
    ), published


async def export_markdown(session: AsyncSession, post: Post) -> bytes:
    tags = await load_tags(session, post.id or 0)
    metadata = {
        "xblog_version": 1,
        "title": post.title,
        "slug": post.slug,
        "excerpt": post.excerpt,
        "cover_url": post.cover_url,
        "status": post.status,
        "is_pinned": post.is_pinned,
        "tags": [tag.name for tag in tags],
        **{
            field: getattr(post, field).isoformat() if getattr(post, field) else None
            for field in ("created_at", "updated_at", "published_at", "pinned_at")
        },
    }
    header = yaml.safe_dump(metadata, allow_unicode=True, sort_keys=False)
    return ("---\n" + header + "---\n" + post.content_md).encode("utf-8")


async def write_archive(session: AsyncSession, target) -> None:
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        last_id = 0
        while True:
            posts = (
                await session.exec(select(Post).where(col(Post.id) > last_id).order_by(col(Post.id)).limit(100))
            ).all()
            if not posts:
                break
            for post in posts:
                # Numeric IDs prevent collisions and unsafe paths; the original slug stays in front matter.
                archive.writestr(f"posts/{post.id}.md", await export_markdown(session, post))
                last_id = post.id or last_id
