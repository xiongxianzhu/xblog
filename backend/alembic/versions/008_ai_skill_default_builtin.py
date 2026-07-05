"""store builtin skill defaults by name

Revision ID: 008_ai_skill_default_builtin
Revises: 007_phone_sms_auth
Create Date: 2026-07-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "008_ai_skill_default_builtin"
down_revision = "007_phone_sms_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ai_skill_default", sa.Column("builtin_skill_name", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("ai_skill_default", "builtin_skill_name")
