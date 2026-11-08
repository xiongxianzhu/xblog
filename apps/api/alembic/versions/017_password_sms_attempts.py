"""Track password-login SMS verification attempts.

Revision ID: 017_password_sms_attempts
Revises: 016_media_library
"""

from alembic import op
import sqlalchemy as sa

revision = "017_password_sms_attempts"
down_revision = "016_media_library"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sms_verification_codes", sa.Column("attempts", sa.Integer(), server_default="0", nullable=False))


def downgrade() -> None:
    op.drop_column("sms_verification_codes", "attempts")
