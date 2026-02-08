"""Add index on api_keys.key_prefix for optimized lookup

Revision ID: 004
Revises: 003
Create Date: 2026-01-26 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add index on key_prefix for optimized API key lookups
    op.create_index(
        'ix_api_keys_key_prefix',
        'api_keys',
        ['key_prefix']
    )


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_api_keys_key_prefix', table_name='api_keys')
