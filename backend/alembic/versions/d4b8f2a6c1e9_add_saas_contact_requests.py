"""add saas_contact_requests table

Revision ID: d4b8f2a6c1e9
Revises: c7a2e9f1b4d6
Create Date: 2026-10-08

Neutral EduPilot SaaS contact/demo requests, deliberately WITHOUT any
institute association: the public landing page must never route SaaS
enquiries into the oldest tenant's admission pipeline. Tenant admission
enquiries continue to use the per-institute `enquiries` table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd4b8f2a6c1e9'
down_revision: Union[str, Sequence[str], None] = 'c7a2e9f1b4d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # if_not_exists: app startup runs Base.metadata.create_all(), which may
    # already have created this table on environments booted from new code.
    op.create_table(
        'saas_contact_requests',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_table('saas_contact_requests')
