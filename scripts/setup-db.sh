#!/bin/bash
# =============================================================================
# AppScope Database Setup Script
# =============================================================================
# This script initializes the TimescaleDB database for AppScope.
# It should be run once when setting up a new environment.
#
# Usage:
#   ./scripts/setup-db.sh                    # Use default settings
#   ./scripts/setup-db.sh --host db          # Custom host (for Docker)
#   ./scripts/setup-db.sh --reset            # Drop and recreate database
#
# Requirements:
#   - PostgreSQL client (psql)
#   - TimescaleDB-enabled PostgreSQL server running
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration (can be overridden with environment variables)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-appscope}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
RESET_DB=false
MAX_RETRIES=30
RETRY_INTERVAL=2

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --host HOST        Database host (default: localhost)"
    echo "  --port PORT        Database port (default: 5432)"
    echo "  --name NAME        Database name (default: appscope)"
    echo "  --user USER        Database user (default: postgres)"
    echo "  --password PASS    Database password (default: password)"
    echo "  --reset            Drop and recreate database"
    echo "  --help             Show this help message"
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --name)
            DB_NAME="$2"
            shift 2
            ;;
        --user)
            DB_USER="$2"
            shift 2
            ;;
        --password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --reset)
            RESET_DB=true
            shift
            ;;
        --help|-h)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Connection string for psql
PSQL_OPTS="-h $DB_HOST -p $DB_PORT -U $DB_USER"

echo ""
echo "=============================================="
echo "  AppScope Database Setup"
echo "=============================================="
echo ""
log_info "Configuration:"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Wait for PostgreSQL to be ready
# -----------------------------------------------------------------------------
log_step "Waiting for PostgreSQL to be ready..."

retry_count=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
    retry_count=$((retry_count + 1))
    if [ $retry_count -ge $MAX_RETRIES ]; then
        log_error "PostgreSQL is not available after ${MAX_RETRIES} attempts"
        exit 1
    fi
    echo -n "."
    sleep $RETRY_INTERVAL
done
echo ""
log_info "PostgreSQL is ready"

# -----------------------------------------------------------------------------
# Step 2: Handle database reset if requested
# -----------------------------------------------------------------------------
if [ "$RESET_DB" = true ]; then
    log_warn "Reset flag detected - dropping database if exists..."
    psql $PSQL_OPTS -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
    log_info "Database dropped"
fi

# -----------------------------------------------------------------------------
# Step 3: Create database if not exists
# -----------------------------------------------------------------------------
log_step "Creating database if not exists..."

# Check if database exists
DB_EXISTS=$(psql $PSQL_OPTS -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    log_info "Database '$DB_NAME' already exists"
else
    psql $PSQL_OPTS -d postgres -c "CREATE DATABASE $DB_NAME;"
    log_info "Database '$DB_NAME' created"
fi

# -----------------------------------------------------------------------------
# Step 4: Enable TimescaleDB extension
# -----------------------------------------------------------------------------
log_step "Enabling TimescaleDB extension..."

psql $PSQL_OPTS -d "$DB_NAME" <<EOF
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Check TimescaleDB version
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';
EOF

log_info "TimescaleDB extension enabled"

# -----------------------------------------------------------------------------
# Step 5: Run Alembic migrations (if available)
# -----------------------------------------------------------------------------
log_step "Checking for Alembic migrations..."

# Check if we're in a Docker container or have access to alembic
if command -v alembic &> /dev/null; then
    log_info "Running Alembic migrations..."
    cd "$(dirname "$0")/../backend" || exit 1
    alembic upgrade head
    log_info "Migrations completed"
elif [ -f "$(dirname "$0")/../backend/alembic.ini" ]; then
    log_warn "Alembic is not installed, but migrations exist"
    log_warn "Run migrations manually with: cd backend && alembic upgrade head"
else
    log_info "No Alembic migrations found - skipping"
fi

# -----------------------------------------------------------------------------
# Step 6: Create hypertables for time-series data
# -----------------------------------------------------------------------------
log_step "Creating hypertables for time-series data..."

psql $PSQL_OPTS -d "$DB_NAME" <<EOF
-- =============================================================================
-- Metrics table - stores all numeric metrics from agents
-- =============================================================================
CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL,
    project_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_type VARCHAR(50) NOT NULL,    -- cpu, memory, disk, etc.
    metric_name VARCHAR(100) NOT NULL,   -- usage_percent, bytes_free, etc.
    value DOUBLE PRECISION NOT NULL,
    labels JSONB DEFAULT '{}',           -- Additional dimensions
    PRIMARY KEY (timestamp, id)
);

-- Create hypertable with 1-day chunks (optimal for most use cases)
SELECT create_hypertable('metrics', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_metrics_project_type
    ON metrics (project_id, metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_name
    ON metrics (metric_name, timestamp DESC);

-- =============================================================================
-- Log events table - stores log entries from agents
-- =============================================================================
CREATE TABLE IF NOT EXISTS log_events (
    id BIGSERIAL,
    project_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(20) NOT NULL,          -- DEBUG, INFO, WARN, ERROR, FATAL
    source VARCHAR(255),                 -- Log file path or source
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',         -- Parsed fields, stack trace, etc.
    PRIMARY KEY (timestamp, id)
);

-- Create hypertable
SELECT create_hypertable('log_events', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_logs_project_level
    ON log_events (project_id, level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_source
    ON log_events (source, timestamp DESC);
-- Full-text search index for log messages
CREATE INDEX IF NOT EXISTS idx_logs_message_search
    ON log_events USING gin(to_tsvector('english', message));

-- =============================================================================
-- Compression policies (for data older than 7 days)
-- Compression significantly reduces storage for historical data
-- =============================================================================
-- Note: Uncomment these after initial testing
-- ALTER TABLE metrics SET (
--     timescaledb.compress,
--     timescaledb.compress_segmentby = 'project_id, metric_type'
-- );
-- SELECT add_compression_policy('metrics', INTERVAL '7 days', if_not_exists => TRUE);

-- ALTER TABLE log_events SET (
--     timescaledb.compress,
--     timescaledb.compress_segmentby = 'project_id, level'
-- );
-- SELECT add_compression_policy('log_events', INTERVAL '7 days', if_not_exists => TRUE);

-- =============================================================================
-- Retention policies (delete data older than 90 days)
-- Adjust based on your data retention requirements
-- =============================================================================
-- Note: Uncomment and adjust retention period as needed
-- SELECT add_retention_policy('metrics', INTERVAL '90 days', if_not_exists => TRUE);
-- SELECT add_retention_policy('log_events', INTERVAL '90 days', if_not_exists => TRUE);

EOF

log_info "Hypertables created successfully"

# -----------------------------------------------------------------------------
# Step 7: Display summary
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  Database Setup Complete!"
echo "=============================================="
echo ""
log_info "Summary:"
echo "  - Database: $DB_NAME"
echo "  - TimescaleDB extension: Enabled"
echo "  - Hypertables created:"
echo "    - metrics (time-series metrics)"
echo "    - log_events (log entries)"
echo ""
log_info "Next steps:"
echo "  1. Run Alembic migrations (if not done):"
echo "     cd backend && alembic upgrade head"
echo ""
echo "  2. Start the application:"
echo "     docker-compose up"
echo ""
echo "  3. Access the dashboard:"
echo "     http://localhost:5173"
echo ""

# Cleanup
unset PGPASSWORD
