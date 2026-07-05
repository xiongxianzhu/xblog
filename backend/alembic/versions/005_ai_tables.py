"""add ai_provider, ai_skill, ai_skill_default, ai_usage_log tables

Revision ID: 005_ai_tables
Revises: 004_site_settings
Create Date: 2026-07-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "005_ai_tables"
down_revision = "004_site_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_provider",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("provider_type", sa.String(length=32), nullable=False),
        sa.Column("base_url", sa.String(length=512), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("api_key_encrypted", sa.Text(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("extra_headers", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "ai_skill",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=1024), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_ai_skill_name", "ai_skill", ["name"], unique=True)
    op.create_table(
        "ai_skill_default",
        sa.Column("scene", sa.String(length=32), nullable=False),
        sa.Column("skill_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["skill_id"], ["ai_skill.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("scene"),
    )
    for scene in ("polish", "chat", "generate"):
        op.execute(sa.text(f"INSERT INTO ai_skill_default (scene, skill_id) VALUES ('{scene}', NULL)"))
    op.create_table(
        "ai_usage_log",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("provider_id", sa.Uuid(), nullable=True),
        sa.Column("skill_id", sa.Uuid(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["provider_id"], ["ai_provider.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["skill_id"], ["ai_skill.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("ai_usage_log")
    op.drop_table("ai_skill_default")
    op.drop_index("ix_ai_skill_name", table_name="ai_skill")
    op.drop_table("ai_skill")
    op.drop_table("ai_provider")
