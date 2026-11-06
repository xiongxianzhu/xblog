"""Media library and per-type groups."""

import sqlalchemy as sa

from alembic import op

revision = "016_media_library"
down_revision = "015_user_password_change"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "media_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.UniqueConstraint("kind", "name", name="uq_media_group_kind_name"),
    )
    op.create_index("ix_media_groups_kind", "media_groups", ["kind"])
    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("filename", sa.String(80), nullable=False, unique=True),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("media_groups.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_media_assets_kind", "media_assets", ["kind"])
    op.create_index("ix_media_assets_group_id", "media_assets", ["group_id"])


def downgrade() -> None:
    op.drop_table("media_assets")
    op.drop_table("media_groups")
