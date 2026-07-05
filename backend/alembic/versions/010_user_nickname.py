"""user nickname

Revision ID: 010_user_nickname
Revises: 009_user_is_active
Create Date: 2026-07-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "010_user_nickname"
down_revision = "009_user_is_active"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("nickname", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "nickname")
