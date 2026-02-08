"""Enhance alerts schema with notification tracking and acknowledgment

Revision ID: 006
Revises: 005
Create Date: 2026-01-27 22:00:00.000000

This migration enhances the alerts system with:
1. Updated alert table to track notification status
2. User acknowledgment tracking
3. Improved evidence and extra_data fields
4. Status field rename for consistency
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update alerts table
    # Rename 'state' to 'status' for consistency
    op.alter_column('alerts', 'state', new_column_name='status')

    # Remove old columns
    op.drop_column('alerts', 'title')
    op.drop_column('alerts', 'metric_value')
    op.drop_column('alerts', 'threshold')
    op.drop_column('alerts', 'related_data')

    # Add new columns
    op.add_column('alerts', sa.Column('trigger_value', sa.Float(), nullable=True))
    op.add_column('alerts', sa.Column('trigger_metric', sa.String(length=100), nullable=True))
    op.add_column('alerts', sa.Column('evidence', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('alerts', sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('alerts', sa.Column('notification_sent', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('alerts', sa.Column('notification_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('alerts', sa.Column('last_notification_attempt', sa.DateTime(timezone=True), nullable=True))
    op.add_column('alerts', sa.Column('acknowledged_by_user_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('alerts', sa.Column('acknowledgment_note', sa.Text(), nullable=True))
    op.add_column('alerts', sa.Column('service_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Add foreign key for acknowledged_by_user_id
    op.create_foreign_key(
        'fk_alerts_acknowledged_by_user_id',
        'alerts',
        'users',
        ['acknowledged_by_user_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Add foreign key for service_id
    op.create_foreign_key(
        'fk_alerts_service_id',
        'alerts',
        'services',
        ['service_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Update rule_id to be NOT NULL (alerts must be associated with rules)
    # First, delete any orphaned alerts without rules
    op.execute("DELETE FROM alerts WHERE rule_id IS NULL")
    op.alter_column('alerts', 'rule_id', nullable=False)

    # Update indexes
    op.drop_index('ix_alerts_state_triggered', table_name='alerts')
    op.create_index('ix_alerts_project_status_triggered', 'alerts', ['project_id', 'status', 'triggered_at'], unique=False)
    op.create_index('ix_alerts_rule_triggered', 'alerts', ['rule_id', 'triggered_at'], unique=False)


def downgrade() -> None:
    # Remove new indexes
    op.drop_index('ix_alerts_rule_triggered', table_name='alerts')
    op.drop_index('ix_alerts_project_status_triggered', table_name='alerts')
    op.create_index('ix_alerts_state_triggered', 'alerts', ['status', 'triggered_at'], unique=False)

    # Remove foreign keys
    op.drop_constraint('fk_alerts_service_id', 'alerts', type_='foreignkey')
    op.drop_constraint('fk_alerts_acknowledged_by_user_id', 'alerts', type_='foreignkey')

    # Remove new columns
    op.drop_column('alerts', 'service_id')
    op.drop_column('alerts', 'acknowledgment_note')
    op.drop_column('alerts', 'acknowledged_by_user_id')
    op.drop_column('alerts', 'last_notification_attempt')
    op.drop_column('alerts', 'notification_attempts')
    op.drop_column('alerts', 'notification_sent')
    op.drop_column('alerts', 'extra_data')
    op.drop_column('alerts', 'evidence')
    op.drop_column('alerts', 'trigger_metric')
    op.drop_column('alerts', 'trigger_value')

    # Restore old columns
    op.add_column('alerts', sa.Column('related_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('alerts', sa.Column('threshold', sa.Float(), nullable=True))
    op.add_column('alerts', sa.Column('metric_value', sa.Float(), nullable=True))
    op.add_column('alerts', sa.Column('title', sa.String(length=255), nullable=False, server_default='Alert'))

    # Restore rule_id to nullable
    op.alter_column('alerts', 'rule_id', nullable=True)

    # Rename status back to state
    op.alter_column('alerts', 'status', new_column_name='state')
