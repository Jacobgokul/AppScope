"""Create TimescaleDB hypertables with compression and retention policies

Revision ID: 002
Revises: 001
Create Date: 2026-01-26 10:00:00.000000

This migration:
1. Converts metrics and log_events tables to TimescaleDB hypertables
2. Enables compression on metrics table (segment by project_id and metric_type)
3. Adds compression policy to compress chunks older than 7 days
4. Adds retention policies: 30 days for metrics, 14 days for logs

All operations are idempotent using if_not_exists where available.
"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Convert tables to hypertables and add TimescaleDB policies.

    Uses raw SQL via op.execute() because TimescaleDB functions are
    PostgreSQL-specific and not supported by SQLAlchemy's DDL abstractions.
    """
    conn = op.get_bind()

    # Check if TimescaleDB extension is available and create it if not
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))

    # ---------------------------------------------------------------------------
    # Convert metrics table to hypertable
    # ---------------------------------------------------------------------------
    # Check if metrics is already a hypertable
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'metrics'
        );
    """))
    metrics_is_hypertable = result.scalar()

    if not metrics_is_hypertable:
        # Drop the primary key constraint - TimescaleDB requires timestamp in unique constraints
        # First check if the constraint exists
        result = conn.execute(text("""
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'metrics' AND constraint_type = 'PRIMARY KEY';
        """))
        pk_name = result.scalar()
        if pk_name:
            conn.execute(text(f"ALTER TABLE metrics DROP CONSTRAINT {pk_name};"))

        # Create a composite primary key with timestamp
        conn.execute(text("""
            ALTER TABLE metrics ADD PRIMARY KEY (id, timestamp);
        """))

        # Convert to hypertable with migrate_data to preserve existing rows
        conn.execute(text("""
            SELECT create_hypertable(
                'metrics',
                'timestamp',
                if_not_exists => TRUE,
                migrate_data => TRUE
            );
        """))

    # ---------------------------------------------------------------------------
    # Convert log_events table to hypertable
    # ---------------------------------------------------------------------------
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'log_events'
        );
    """))
    logs_is_hypertable = result.scalar()

    if not logs_is_hypertable:
        # Drop the primary key constraint - TimescaleDB requires timestamp in unique constraints
        result = conn.execute(text("""
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'log_events' AND constraint_type = 'PRIMARY KEY';
        """))
        pk_name = result.scalar()
        if pk_name:
            conn.execute(text(f"ALTER TABLE log_events DROP CONSTRAINT {pk_name};"))

        # Create a composite primary key with timestamp
        conn.execute(text("""
            ALTER TABLE log_events ADD PRIMARY KEY (id, timestamp);
        """))

        # Convert to hypertable with migrate_data to preserve existing rows
        conn.execute(text("""
            SELECT create_hypertable(
                'log_events',
                'timestamp',
                if_not_exists => TRUE,
                migrate_data => TRUE
            );
        """))

    # ---------------------------------------------------------------------------
    # Enable compression on metrics table
    # Segment by project_id and metric_type for efficient queries
    # ---------------------------------------------------------------------------
    # Check if compression is already enabled
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'metrics'
            AND compression_enabled = true
        );
    """))
    metrics_compression_enabled = result.scalar()

    if not metrics_compression_enabled:
        conn.execute(text("""
            ALTER TABLE metrics SET (
                timescaledb.compress,
                timescaledb.compress_segmentby = 'project_id, metric_type'
            );
        """))

    # ---------------------------------------------------------------------------
    # Enable compression on log_events table
    # Segment by project_id and level for efficient queries
    # ---------------------------------------------------------------------------
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'log_events'
            AND compression_enabled = true
        );
    """))
    logs_compression_enabled = result.scalar()

    if not logs_compression_enabled:
        conn.execute(text("""
            ALTER TABLE log_events SET (
                timescaledb.compress,
                timescaledb.compress_segmentby = 'project_id, level'
            );
        """))

    # ---------------------------------------------------------------------------
    # Add compression policy for metrics (compress chunks older than 7 days)
    # ---------------------------------------------------------------------------
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.jobs
            WHERE hypertable_name = 'metrics'
            AND proc_name = 'policy_compression'
        );
    """))
    metrics_compression_policy_exists = result.scalar()

    if not metrics_compression_policy_exists:
        conn.execute(text("""
            SELECT add_compression_policy('metrics', INTERVAL '7 days');
        """))

    # ---------------------------------------------------------------------------
    # Add compression policy for log_events (compress chunks older than 7 days)
    # ---------------------------------------------------------------------------
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.jobs
            WHERE hypertable_name = 'log_events'
            AND proc_name = 'policy_compression'
        );
    """))
    logs_compression_policy_exists = result.scalar()

    if not logs_compression_policy_exists:
        conn.execute(text("""
            SELECT add_compression_policy('log_events', INTERVAL '7 days');
        """))

    # ---------------------------------------------------------------------------
    # Add retention policy for metrics (drop chunks older than 30 days)
    # This is configurable via settings.metrics_retention_days
    # ---------------------------------------------------------------------------
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.jobs
            WHERE hypertable_name = 'metrics'
            AND proc_name = 'policy_retention'
        );
    """))
    metrics_retention_policy_exists = result.scalar()

    if not metrics_retention_policy_exists:
        conn.execute(text("""
            SELECT add_retention_policy('metrics', INTERVAL '30 days');
        """))

    # ---------------------------------------------------------------------------
    # Add retention policy for log_events (drop chunks older than 14 days)
    # This is configurable via settings.logs_retention_days
    # ---------------------------------------------------------------------------
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.jobs
            WHERE hypertable_name = 'log_events'
            AND proc_name = 'policy_retention'
        );
    """))
    logs_retention_policy_exists = result.scalar()

    if not logs_retention_policy_exists:
        conn.execute(text("""
            SELECT add_retention_policy('log_events', INTERVAL '14 days');
        """))


def downgrade() -> None:
    """
    Remove TimescaleDB policies and convert hypertables back to regular tables.

    Note: This is a destructive operation. Converting back from hypertables
    requires dropping and recreating the tables, which will lose data unless
    properly backed up first.
    """
    conn = op.get_bind()

    # ---------------------------------------------------------------------------
    # Remove retention policies
    # ---------------------------------------------------------------------------
    # Check and remove metrics retention policy
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.jobs
            WHERE hypertable_name = 'metrics'
            AND proc_name = 'policy_retention'
        );
    """))
    if result.scalar():
        conn.execute(text("""
            SELECT remove_retention_policy('metrics', if_exists => true);
        """))

    # Check and remove log_events retention policy
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.jobs
            WHERE hypertable_name = 'log_events'
            AND proc_name = 'policy_retention'
        );
    """))
    if result.scalar():
        conn.execute(text("""
            SELECT remove_retention_policy('log_events', if_exists => true);
        """))

    # ---------------------------------------------------------------------------
    # Remove compression policies
    # ---------------------------------------------------------------------------
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.jobs
            WHERE hypertable_name = 'metrics'
            AND proc_name = 'policy_compression'
        );
    """))
    if result.scalar():
        conn.execute(text("""
            SELECT remove_compression_policy('metrics', if_exists => true);
        """))

    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.jobs
            WHERE hypertable_name = 'log_events'
            AND proc_name = 'policy_compression'
        );
    """))
    if result.scalar():
        conn.execute(text("""
            SELECT remove_compression_policy('log_events', if_exists => true);
        """))

    # ---------------------------------------------------------------------------
    # Decompress all chunks before disabling compression
    # ---------------------------------------------------------------------------
    # Decompress metrics chunks
    conn.execute(text("""
        SELECT decompress_chunk(c, if_compressed => true)
        FROM show_chunks('metrics') c;
    """))

    # Decompress log_events chunks
    conn.execute(text("""
        SELECT decompress_chunk(c, if_compressed => true)
        FROM show_chunks('log_events') c;
    """))

    # ---------------------------------------------------------------------------
    # Disable compression on tables
    # ---------------------------------------------------------------------------
    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'metrics'
            AND compression_enabled = true
        );
    """))
    if result.scalar():
        conn.execute(text("""
            ALTER TABLE metrics SET (timescaledb.compress = false);
        """))

    result = conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'log_events'
            AND compression_enabled = true
        );
    """))
    if result.scalar():
        conn.execute(text("""
            ALTER TABLE log_events SET (timescaledb.compress = false);
        """))

    # Note: We intentionally do NOT convert hypertables back to regular tables
    # as this would require dropping and recreating them, losing all data.
    # The hypertable format is backward compatible with regular PostgreSQL queries.
    # If you truly need to convert back, backup your data first and manually:
    # 1. Create new regular tables
    # 2. Copy data from hypertables to regular tables
    # 3. Drop hypertables
    # 4. Rename regular tables
