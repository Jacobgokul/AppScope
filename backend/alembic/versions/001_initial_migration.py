"""Initial migration with all models

Revision ID: 001
Revises:
Create Date: 2026-01-22 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create projects table
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('environment', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create api_keys table
    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('key_hash', sa.String(length=255), nullable=False),
        sa.Column('key_prefix', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create metrics table
    op.create_table(
        'metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metric_type', sa.String(length=50), nullable=False),
        sa.Column('metric_name', sa.String(length=100), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=True),
        sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_metrics_timestamp'), 'metrics', ['timestamp'], unique=False)
    op.create_index(op.f('ix_metrics_metric_type'), 'metrics', ['metric_type'], unique=False)
    op.create_index(op.f('ix_metrics_project_id'), 'metrics', ['project_id'], unique=False)
    op.create_index('ix_metrics_project_timestamp', 'metrics', ['project_id', 'timestamp'], unique=False)
    op.create_index('ix_metrics_project_type_timestamp', 'metrics', ['project_id', 'metric_type', 'timestamp'], unique=False)

    # Create log_events table
    op.create_table(
        'log_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('service', sa.String(length=100), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('stack_trace', sa.Text(), nullable=True),
        sa.Column('http_method', sa.String(length=10), nullable=True),
        sa.Column('http_path', sa.String(length=500), nullable=True),
        sa.Column('http_status', sa.Integer(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_log_events_timestamp'), 'log_events', ['timestamp'], unique=False)
    op.create_index(op.f('ix_log_events_level'), 'log_events', ['level'], unique=False)
    op.create_index(op.f('ix_log_events_project_id'), 'log_events', ['project_id'], unique=False)
    op.create_index('ix_logs_project_timestamp', 'log_events', ['project_id', 'timestamp'], unique=False)
    op.create_index('ix_logs_project_level_timestamp', 'log_events', ['project_id', 'level', 'timestamp'], unique=False)

    # Create analyses table
    op.create_table(
        'analyses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('time_range_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('time_range_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('trigger', sa.String(length=50), nullable=False),
        sa.Column('root_cause', sa.Text(), nullable=False),
        sa.Column('root_cause_component', sa.String(length=50), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('evidence', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('suggestions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('correlated_metric_ids', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('correlated_log_ids', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('llm_model', sa.String(length=100), nullable=True),
        sa.Column('llm_tokens_used', sa.Integer(), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_analyses_created_at'), 'analyses', ['created_at'], unique=False)
    op.create_index(op.f('ix_analyses_project_id'), 'analyses', ['project_id'], unique=False)


def downgrade() -> None:
    # Drop all tables in reverse order
    op.drop_index(op.f('ix_analyses_project_id'), table_name='analyses')
    op.drop_index(op.f('ix_analyses_created_at'), table_name='analyses')
    op.drop_table('analyses')

    op.drop_index('ix_logs_project_level_timestamp', table_name='log_events')
    op.drop_index('ix_logs_project_timestamp', table_name='log_events')
    op.drop_index(op.f('ix_log_events_project_id'), table_name='log_events')
    op.drop_index(op.f('ix_log_events_level'), table_name='log_events')
    op.drop_index(op.f('ix_log_events_timestamp'), table_name='log_events')
    op.drop_table('log_events')

    op.drop_index('ix_metrics_project_type_timestamp', table_name='metrics')
    op.drop_index('ix_metrics_project_timestamp', table_name='metrics')
    op.drop_index(op.f('ix_metrics_project_id'), table_name='metrics')
    op.drop_index(op.f('ix_metrics_metric_type'), table_name='metrics')
    op.drop_index(op.f('ix_metrics_timestamp'), table_name='metrics')
    op.drop_table('metrics')

    op.drop_table('api_keys')
    op.drop_table('projects')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
