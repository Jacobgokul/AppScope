"""Add unique constraint for project name per owner

Revision ID: 003
Revises: 002
Create Date: 2026-01-26 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add unique constraint on (owner_id, name) for projects table
    op.create_unique_constraint(
        'uq_project_owner_name',
        'projects',
        ['owner_id', 'name']
    )


def downgrade() -> None:
    # Remove unique constraint
    op.drop_constraint('uq_project_owner_name', 'projects', type_='unique')
