"""posts 置顶字段

Revision ID: 014_post_pinned
Revises: 013_friend_link_description
Create Date: 2026-07-06
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "014_post_pinned"
down_revision = "013_friend_link_description"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("posts", sa.Column("pinned_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_posts_is_pinned", "posts", ["is_pinned"])


def downgrade() -> None:
    op.drop_index("ix_posts_is_pinned", table_name="posts")
    op.drop_column("posts", "pinned_at")
    op.drop_column("posts", "is_pinned")
