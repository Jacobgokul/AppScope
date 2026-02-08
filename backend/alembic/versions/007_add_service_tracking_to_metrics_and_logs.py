"""Add service tracking to metrics and logs

Revision ID: 007
Revises: 006
Create Date: 2026-01-27 23:00:00.000000

This migration adds support for multiple agents per project with service tracking:
1. Add last_heartbeat field to services table
2. Add service_id foreign key to metrics table
3. Add service_id foreign key to log_events table
4. Add indexes for service_id on metrics and logs
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add last_heartbeat to services table
    op.add_column('services', sa.Column('last_heartbeat', sa.DateTime(timezone=True), nullable=True))

    # Add service_id to metrics table
    op.add_column('metrics', sa.Column('service_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_metrics_service_id',
        'metrics',
        'services',
        ['service_id'],
        ['id'],
        ondelete='CASCADE'
    )
    op.create_index('ix_metrics_service_id', 'metrics', ['service_id'], unique=False)

    # Add service_id to log_events table
    op.add_column('log_events', sa.Column('service_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_log_events_service_id',
        'log_events',
        'services',
        ['service_id'],
        ['id'],
        ondelete='CASCADE'
    )
    op.create_index('ix_log_events_service_id', 'log_events', ['service_id'], unique=False)

    # Add composite indexes for common queries
    op.create_index(
        'ix_metrics_service_timestamp',
        'metrics',
        ['service_id', 'timestamp'],
        unique=False
    )
    op.create_index(
        'ix_log_events_service_timestamp',
        'log_events',
        ['service_id', 'timestamp'],
        unique=False
    )


def downgrade() -> None:
    # Remove composite indexes
    op.drop_index('ix_log_events_service_timestamp', table_name='log_events')
    op.drop_index('ix_metrics_service_timestamp', table_name='metrics')

    # Remove service_id from log_events
    op.drop_index('ix_log_events_service_id', table_name='log_events')
    op.drop_constraint('fk_log_events_service_id', 'log_events', type_='foreignkey')
    op.drop_column('log_events', 'service_id')

    # Remove service_id from metrics
    op.drop_index('ix_metrics_service_id', table_name='metrics')
    op.drop_constraint('fk_metrics_service_id', 'metrics', type_='foreignkey')
    op.drop_column('metrics', 'service_id')

    # Remove last_heartbeat from services
    op.drop_column('services', 'last_heartbeat')
