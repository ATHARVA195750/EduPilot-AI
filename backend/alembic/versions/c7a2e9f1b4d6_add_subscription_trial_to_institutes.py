"""add subscription/trial columns to institutes

Revision ID: c7a2e9f1b4d6
Revises: 9b4c1d2f7a8e
Create Date: 2026-10-08

SaaS product architecture: institutes carry a subscription plan key
(starter|growth|professional|enterprise, mirroring frontend
src/data/plans.js), a subscription status, and a 7-day trial window.
Additive + nullable-safe: existing rows backfill to
plan='starter', status='trialing', NULL trial dates (unknown history).
No payment enforcement is added by this migration.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c7a2e9f1b4d6'
down_revision: Union[str, Sequence[str], None] = '9b4c1d2f7a8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'institutes',
        sa.Column('subscription_plan', sa.String(50), nullable=False, server_default='starter'),
    )
    op.add_column(
        'institutes',
        sa.Column('subscription_status', sa.String(50), nullable=False, server_default='trialing'),
    )
    op.add_column(
        'institutes',
        sa.Column('trial_started_at', sa.DateTime(), nullable=True),
    )
    op.add_column(
        'institutes',
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('institutes', 'trial_ends_at')
    op.drop_column('institutes', 'trial_started_at')
    op.drop_column('institutes', 'subscription_status')
    op.drop_column('institutes', 'subscription_plan')
