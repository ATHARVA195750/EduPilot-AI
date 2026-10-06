"""add is_published to study_materials

Revision ID: 9b4c1d2f7a8e
Revises: 3e0fd5f4fed3
Create Date: 2026-10-05

Adds the Draft/Published flag the admin UI already exposes. Existing rows
backfill to published (server_default 'true') so current student visibility
is preserved; admins can then unpublish individual materials.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '9b4c1d2f7a8e'
down_revision: Union[str, Sequence[str], None] = '3e0fd5f4fed3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'study_materials',
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='true'),
    )


def downgrade() -> None:
    op.drop_column('study_materials', 'is_published')
