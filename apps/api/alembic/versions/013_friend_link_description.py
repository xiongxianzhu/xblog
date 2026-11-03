"""add friend_link description

Revision ID: 013_friend_link_description
Revises: 012_audit_logs
Create Date: 2026-07-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "013_friend_link_description"
down_revision = "012_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("friend_links", sa.Column("description", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("friend_links", "description")
