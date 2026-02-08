"""Add services, alert_rules, and alerts tables

Revision ID: 005
Revises: 004
Create Date: 2026-01-27 21:00:00.000000

This migration adds:
1. Services table for tracking monitored services within a project
2. AlertRule table for configuring alert conditions
3. Alert table for storing fired alerts
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create services table
    op.create_table(
        'services',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('service_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('config', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_services_project_id'), 'services', ['project_id'], unique=False)

    # Create alert_rules table
    op.create_table(
        'alert_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('condition_type', sa.String(length=50), nullable=False),
        sa.Column('metric_type', sa.String(length=50), nullable=True),
        sa.Column('operator', sa.String(length=10), nullable=True),
        sa.Column('threshold', sa.Float(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, default=60),
        sa.Column('anomaly_sensitivity', sa.Float(), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=True, default='warning'),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('notification_channels', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('email_recipients', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('webhook_url', sa.String(length=500), nullable=True),
        sa.Column('cooldown_seconds', sa.Integer(), nullable=False, default=300),
        sa.Column('last_triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alert_rules_project_id'), 'alert_rules', ['project_id'], unique=False)
    op.create_index('ix_alert_rules_project_active', 'alert_rules', ['project_id', 'is_active'], unique=False)

    # Create alerts table
    op.create_table(
        'alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('state', sa.String(length=20), nullable=False, default='firing'),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('triggered_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metric_value', sa.Float(), nullable=True),
        sa.Column('threshold', sa.Float(), nullable=True),
        sa.Column('related_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['rule_id'], ['alert_rules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alerts_project_id'), 'alerts', ['project_id'], unique=False)
    op.create_index(op.f('ix_alerts_triggered_at'), 'alerts', ['triggered_at'], unique=False)
    op.create_index('ix_alerts_project_triggered', 'alerts', ['project_id', 'triggered_at'], unique=False)
    op.create_index('ix_alerts_state_triggered', 'alerts', ['state', 'triggered_at'], unique=False)


def downgrade() -> None:
    # Drop alerts table
    op.drop_index('ix_alerts_state_triggered', table_name='alerts')
    op.drop_index('ix_alerts_project_triggered', table_name='alerts')
    op.drop_index(op.f('ix_alerts_triggered_at'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_project_id'), table_name='alerts')
    op.drop_table('alerts')

    # Drop alert_rules table
    op.drop_index('ix_alert_rules_project_active', table_name='alert_rules')
    op.drop_index(op.f('ix_alert_rules_project_id'), table_name='alert_rules')
    op.drop_table('alert_rules')

    # Drop services table
    op.drop_index(op.f('ix_services_project_id'), table_name='services')
    op.drop_table('services')
