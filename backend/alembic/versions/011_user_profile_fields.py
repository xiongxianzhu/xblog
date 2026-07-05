"""user profile birth_date and gender

Revision ID: 011_user_profile_fields
Revises: 010_user_nickname
Create Date: 2026-07-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "011_user_profile_fields"
down_revision = "010_user_nickname"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("gender", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "gender")
    op.drop_column("users", "birth_date")
