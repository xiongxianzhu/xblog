"""Require password change for newly provisioned or reset accounts."""

import sqlalchemy as sa

from alembic import op

revision = "015_user_password_change"
down_revision = "014_post_pinned"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE users SET must_change_password = true WHERE last_login_at IS NULL")


def downgrade() -> None:
    op.drop_column("users", "must_change_password")
