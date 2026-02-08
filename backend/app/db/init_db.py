"""
Database initialization utilities.

This module provides functions to initialize the database schema,
create hypertables, and set up TimescaleDB policies.
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.db.session import Base, engine
from app.models import User, Project, APIKey, Service, Metric, LogEvent, Analysis, Alert, AlertRule
from app.config import settings


async def create_tables(engine_instance: AsyncEngine = None):
    """
    Create all database tables using SQLAlchemy models.

    Args:
        engine_instance: Optional engine instance. If not provided, uses the default engine.
    """
    if engine_instance is None:
        engine_instance = engine

    async with engine_instance.begin() as conn:
        # Create all tables defined in Base.metadata
        await conn.run_sync(Base.metadata.create_all)
        print("✓ Database tables created successfully")


async def enable_timescaledb(engine_instance: AsyncEngine = None):
    """
    Enable TimescaleDB extension in the database.

    Args:
        engine_instance: Optional engine instance. If not provided, uses the default engine.
    """
    if engine_instance is None:
        engine_instance = engine

    async with engine_instance.begin() as conn:
        # Enable TimescaleDB extension (idempotent)
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
        print("✓ TimescaleDB extension enabled")


async def create_hypertables(engine_instance: AsyncEngine = None):
    """
    Convert metrics and log_events tables to TimescaleDB hypertables.

    This function:
    1. Converts tables to hypertables partitioned by timestamp
    2. Enables compression
    3. Adds compression policies
    4. Adds retention policies

    All operations are idempotent.

    Args:
        engine_instance: Optional engine instance. If not provided, uses the default engine.
    """
    if engine_instance is None:
        engine_instance = engine

    async with engine_instance.begin() as conn:
        # Check if metrics is already a hypertable
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM timescaledb_information.hypertables
                WHERE hypertable_name = 'metrics'
            );
        """))
        metrics_is_hypertable = result.scalar()

        if not metrics_is_hypertable:
            print("Creating metrics hypertable...")

            # Drop existing primary key if it exists
            result = await conn.execute(text("""
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = 'metrics' AND constraint_type = 'PRIMARY KEY';
            """))
            pk_name = result.scalar()
            if pk_name:
                await conn.execute(text(f"ALTER TABLE metrics DROP CONSTRAINT {pk_name};"))

            # Create composite primary key with timestamp
            await conn.execute(text("ALTER TABLE metrics ADD PRIMARY KEY (id, timestamp);"))

            # Convert to hypertable
            await conn.execute(text("""
                SELECT create_hypertable(
                    'metrics',
                    'timestamp',
                    if_not_exists => TRUE,
                    migrate_data => TRUE
                );
            """))
            print("✓ Metrics table converted to hypertable")
        else:
            print("✓ Metrics table is already a hypertable")

        # Check if log_events is already a hypertable
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM timescaledb_information.hypertables
                WHERE hypertable_name = 'log_events'
            );
        """))
        logs_is_hypertable = result.scalar()

        if not logs_is_hypertable:
            print("Creating log_events hypertable...")

            # Drop existing primary key if it exists
            result = await conn.execute(text("""
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = 'log_events' AND constraint_type = 'PRIMARY KEY';
            """))
            pk_name = result.scalar()
            if pk_name:
                await conn.execute(text(f"ALTER TABLE log_events DROP CONSTRAINT {pk_name};"))

            # Create composite primary key with timestamp
            await conn.execute(text("ALTER TABLE log_events ADD PRIMARY KEY (id, timestamp);"))

            # Convert to hypertable
            await conn.execute(text("""
                SELECT create_hypertable(
                    'log_events',
                    'timestamp',
                    if_not_exists => TRUE,
                    migrate_data => TRUE
                );
            """))
            print("✓ Log events table converted to hypertable")
        else:
            print("✓ Log events table is already a hypertable")


async def add_compression_policies(engine_instance: AsyncEngine = None):
    """
    Add compression policies to hypertables.

    Compresses data older than 7 days to save storage space.

    Args:
        engine_instance: Optional engine instance. If not provided, uses the default engine.
    """
    if engine_instance is None:
        engine_instance = engine

    async with engine_instance.begin() as conn:
        # Enable compression on metrics
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM timescaledb_information.hypertables
                WHERE hypertable_name = 'metrics'
                AND compression_enabled = true
            );
        """))

        if not result.scalar():
            await conn.execute(text("""
                ALTER TABLE metrics SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = 'project_id, metric_type'
                );
            """))
            print("✓ Compression enabled on metrics table")
        else:
            print("✓ Compression already enabled on metrics table")

        # Enable compression on log_events
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM timescaledb_information.hypertables
                WHERE hypertable_name = 'log_events'
                AND compression_enabled = true
            );
        """))

        if not result.scalar():
            await conn.execute(text("""
                ALTER TABLE log_events SET (
                    timescaledb.compress,
                    timescaledb.compress_segmentby = 'project_id, level'
                );
            """))
            print("✓ Compression enabled on log_events table")
        else:
            print("✓ Compression already enabled on log_events table")

        # Add compression policy for metrics
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM timescaledb_information.jobs
                WHERE hypertable_name = 'metrics'
                AND proc_name = 'policy_compression'
            );
        """))

        if not result.scalar():
            await conn.execute(text(f"""
                SELECT add_compression_policy('metrics', INTERVAL '{settings.compression_after_days} days');
            """))
            print(f"✓ Compression policy added for metrics (after {settings.compression_after_days} days)")
        else:
            print("✓ Compression policy already exists for metrics")

        # Add compression policy for log_events
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM timescaledb_information.jobs
                WHERE hypertable_name = 'log_events'
                AND proc_name = 'policy_compression'
            );
        """))

        if not result.scalar():
            await conn.execute(text(f"""
                SELECT add_compression_policy('log_events', INTERVAL '{settings.compression_after_days} days');
            """))
            print(f"✓ Compression policy added for log_events (after {settings.compression_after_days} days)")
        else:
            print("✓ Compression policy already exists for log_events")


async def add_retention_policies(engine_instance: AsyncEngine = None):
    """
    Add retention policies to automatically delete old data.

    This helps manage storage by automatically dropping old chunks:
    - Metrics: Retained for N days (configurable via settings)
    - Logs: Retained for N days (configurable via settings)

    Args:
        engine_instance: Optional engine instance. If not provided, uses the default engine.
    """
    if engine_instance is None:
        engine_instance = engine

    async with engine_instance.begin() as conn:
        # Add retention policy for metrics
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM timescaledb_information.jobs
                WHERE hypertable_name = 'metrics'
                AND proc_name = 'policy_retention'
            );
        """))

        if not result.scalar():
            await conn.execute(text(f"""
                SELECT add_retention_policy('metrics', INTERVAL '{settings.metrics_retention_days} days');
            """))
            print(f"✓ Retention policy added for metrics ({settings.metrics_retention_days} days)")
        else:
            print(f"✓ Retention policy already exists for metrics")

        # Add retention policy for log_events
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM timescaledb_information.jobs
                WHERE hypertable_name = 'log_events'
                AND proc_name = 'policy_retention'
            );
        """))

        if not result.scalar():
            await conn.execute(text(f"""
                SELECT add_retention_policy('log_events', INTERVAL '{settings.logs_retention_days} days');
            """))
            print(f"✓ Retention policy added for log_events ({settings.logs_retention_days} days)")
        else:
            print(f"✓ Retention policy already exists for log_events")


async def init_db():
    """
    Initialize the complete database schema.

    This is the main entry point for database initialization. It:
    1. Creates all tables
    2. Enables TimescaleDB
    3. Creates hypertables
    4. Adds compression policies
    5. Adds retention policies

    All operations are idempotent and safe to run multiple times.
    """
    print("Initializing database...")
    print("=" * 60)

    try:
        await create_tables()
        await enable_timescaledb()
        await create_hypertables()
        await add_compression_policies()
        await add_retention_policies()

        print("=" * 60)
        print("✓ Database initialization complete!")
        return True

    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        raise


async def reset_db():
    """
    Drop all tables and recreate them.

    WARNING: This will delete ALL data in the database!
    Only use this in development/testing environments.
    """
    print("WARNING: Resetting database - all data will be lost!")
    print("=" * 60)

    async with engine.begin() as conn:
        # Drop all tables
        await conn.run_sync(Base.metadata.drop_all)
        print("✓ All tables dropped")

    # Reinitialize
    await init_db()


# CLI interface for running directly
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        # python -m app.db.init_db reset
        asyncio.run(reset_db())
    else:
        # python -m app.db.init_db
        asyncio.run(init_db())
