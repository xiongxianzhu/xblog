"""phone and sms verification

Revision ID: 007_phone_sms_auth
Revises: 006_auth_oauth_reset
Create Date: 2026-07-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "007_phone_sms_auth"
down_revision = "006_auth_oauth_reset"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=20), nullable=True))
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)

    op.create_table(
        "sms_verification_codes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False, server_default="login"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sms_verification_codes_phone", "sms_verification_codes", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_sms_verification_codes_phone", table_name="sms_verification_codes")
    op.drop_table("sms_verification_codes")
    op.drop_index("ix_users_phone", table_name="users")
    op.drop_column("users", "phone")
