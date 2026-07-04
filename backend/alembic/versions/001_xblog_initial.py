"""initial xblog tables

Revision ID: 001_xblog
Revises:
Create Date: 2026-07-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "001_xblog"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_tags_slug"), "tags", ["slug"], unique=False)

    op.create_table(
        "posts",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False),
        sa.Column("content_md", sa.Text(), nullable=False),
        sa.Column("content_html", sa.Text(), nullable=False),
        sa.Column("excerpt", sa.String(length=500), nullable=True),
        sa.Column("cover_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_posts_slug"), "posts", ["slug"], unique=False)
    op.create_index(op.f("ix_posts_status"), "posts", ["status"], unique=False)

    op.create_table(
        "post_tags",
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("post_id", "tag_id"),
    )

    op.create_table(
        "pages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content_md", sa.Text(), nullable=False),
        sa.Column("content_html", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_pages_slug"), "pages", ["slug"], unique=False)

    op.create_table(
        "friend_links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "page_views",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("referrer", sa.String(length=500), nullable=True),
        sa.Column("visited_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_page_views_path"), "page_views", ["path"], unique=False)
    op.create_index(op.f("ix_page_views_visited_at"), "page_views", ["visited_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_page_views_visited_at"), table_name="page_views")
    op.drop_index(op.f("ix_page_views_path"), table_name="page_views")
    op.drop_table("page_views")
    op.drop_table("friend_links")
    op.drop_index(op.f("ix_pages_slug"), table_name="pages")
    op.drop_table("pages")
    op.drop_table("post_tags")
    op.drop_index(op.f("ix_posts_status"), table_name="posts")
    op.drop_index(op.f("ix_posts_slug"), table_name="posts")
    op.drop_table("posts")
    op.drop_index(op.f("ix_tags_slug"), table_name="tags")
    op.drop_table("tags")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_table("users")
