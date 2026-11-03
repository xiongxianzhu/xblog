"""login_log and operation_log tables

Revision ID: 012_audit_logs
Revises: 011_user_profile_fields
Create Date: 2026-07-05
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "012_audit_logs"
down_revision = "011_user_profile_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "login_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("failure_reason", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_login_log_username", "login_log", ["username"])
    op.create_index("ix_login_log_method", "login_log", ["method"])
    op.create_index("ix_login_log_success", "login_log", ["success"])
    op.create_index("ix_login_log_created_at", "login_log", ["created_at"])

    op.create_table(
        "operation_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("resource_type", sa.String(length=32), nullable=True),
        sa.Column("resource_id", sa.String(length=64), nullable=True),
        sa.Column("detail", sa.String(length=500), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_operation_log_username", "operation_log", ["username"])
    op.create_index("ix_operation_log_action", "operation_log", ["action"])
    op.create_index("ix_operation_log_created_at", "operation_log", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_operation_log_created_at", table_name="operation_log")
    op.drop_index("ix_operation_log_action", table_name="operation_log")
    op.drop_index("ix_operation_log_username", table_name="operation_log")
    op.drop_table("operation_log")
    op.drop_index("ix_login_log_created_at", table_name="login_log")
    op.drop_index("ix_login_log_success", table_name="login_log")
    op.drop_index("ix_login_log_method", table_name="login_log")
    op.drop_index("ix_login_log_username", table_name="login_log")
    op.drop_table("login_log")
