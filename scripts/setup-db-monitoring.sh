#!/bin/bash
# AppScope Database Monitoring Setup Script
# This script helps set up read-only database access for the AppScope agent

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo ""
echo "============================================"
echo "  AppScope Database Monitoring Setup"
echo "============================================"
echo ""

# Check if running as database admin
echo "This script will help you create a read-only database user for AppScope monitoring."
echo "You need database administrator privileges to run this script."
echo ""

# Ask for database type
echo "Which database system are you setting up?"
echo "  1) PostgreSQL"
echo "  2) MySQL/MariaDB"
echo "  3) MongoDB"
echo "  4) Redis"
echo ""
read -p "Enter choice [1-4]: " db_choice

case $db_choice in
    1)
        DB_TYPE="PostgreSQL"
        ;;
    2)
        DB_TYPE="MySQL"
        ;;
    3)
        DB_TYPE="MongoDB"
        ;;
    4)
        DB_TYPE="Redis"
        ;;
    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

log_info "Setting up $DB_TYPE monitoring..."
echo ""

# PostgreSQL Setup
if [ "$db_choice" = "1" ]; then
    log_step "PostgreSQL Read-Only User Setup"
    echo ""

    read -p "Database host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}

    read -p "Database port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}

    read -p "Database name: " DB_NAME

    read -p "Admin username [postgres]: " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-postgres}

    read -p "New monitoring username [appscope_readonly]: " MONITOR_USER
    MONITOR_USER=${MONITOR_USER:-appscope_readonly}

    read -sp "Password for new monitoring user: " MONITOR_PASS
    echo ""

    log_info "Generating SQL commands..."

    SQL_FILE=$(mktemp)
    cat > "$SQL_FILE" << EOF
-- Create read-only user for AppScope monitoring
CREATE USER ${MONITOR_USER} WITH PASSWORD '${MONITOR_PASS}';

-- Grant connection to database
GRANT CONNECT ON DATABASE ${DB_NAME} TO ${MONITOR_USER};

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO ${MONITOR_USER};

-- Grant select on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${MONITOR_USER};

-- Grant select on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${MONITOR_USER};

-- Grant access to system statistics views (required for metrics)
GRANT pg_monitor TO ${MONITOR_USER};

-- Or if pg_monitor role doesn't exist (PostgreSQL < 10):
-- GRANT SELECT ON pg_stat_database TO ${MONITOR_USER};
-- GRANT SELECT ON pg_stat_user_tables TO ${MONITOR_USER};
-- GRANT SELECT ON pg_stat_user_indexes TO ${MONITOR_USER};
-- GRANT SELECT ON pg_statio_user_tables TO ${MONITOR_USER};

-- For query statistics (optional, requires pg_stat_statements extension)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- GRANT SELECT ON pg_stat_statements TO ${MONITOR_USER};

COMMIT;
EOF

    echo ""
    log_info "SQL commands generated in: $SQL_FILE"
    echo ""
    echo "Execute these commands as the database admin:"
    echo "${YELLOW}psql -h $DB_HOST -p $DB_PORT -U $ADMIN_USER -d $DB_NAME -f $SQL_FILE${NC}"
    echo ""
    read -p "Execute now? [y/N]: " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -d "$DB_NAME" -f "$SQL_FILE"
        log_info "User created successfully!"
    else
        log_info "Skipped execution. You can run it manually later."
    fi

    echo ""
    log_info "Add this to your AppScope agent config (/etc/appscope/config.yaml):"
    echo ""
    echo "${YELLOW}database:"
    echo "  type: postgres"
    echo "  host: $DB_HOST"
    echo "  port: $DB_PORT"
    echo "  user: $MONITOR_USER"
    echo "  password: \"\${DB_PASSWORD}\"  # Set DB_PASSWORD env var"
    echo "  database: $DB_NAME"
    echo "  metrics_only: true${NC}"
    echo ""
    echo "Set the password as environment variable:"
    echo "${YELLOW}export DB_PASSWORD='$MONITOR_PASS'${NC}"
    echo ""
    echo "Or add to /etc/appscope/environment:"
    echo "${YELLOW}DB_PASSWORD=$MONITOR_PASS${NC}"

    rm -f "$SQL_FILE"
fi

# MySQL/MariaDB Setup
if [ "$db_choice" = "2" ]; then
    log_step "MySQL/MariaDB Read-Only User Setup"
    echo ""

    read -p "Database host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}

    read -p "Database port [3306]: " DB_PORT
    DB_PORT=${DB_PORT:-3306}

    read -p "Database name: " DB_NAME

    read -p "Admin username [root]: " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-root}

    read -p "New monitoring username [appscope_readonly]: " MONITOR_USER
    MONITOR_USER=${MONITOR_USER:-appscope_readonly}

    read -sp "Password for new monitoring user: " MONITOR_PASS
    echo ""

    log_info "Generating SQL commands..."

    SQL_FILE=$(mktemp)
    cat > "$SQL_FILE" << EOF
-- Create read-only user for AppScope monitoring
CREATE USER IF NOT EXISTS '${MONITOR_USER}'@'localhost' IDENTIFIED BY '${MONITOR_PASS}';
CREATE USER IF NOT EXISTS '${MONITOR_USER}'@'%' IDENTIFIED BY '${MONITOR_PASS}';

-- Grant read-only access to the database
GRANT SELECT ON ${DB_NAME}.* TO '${MONITOR_USER}'@'localhost';
GRANT SELECT ON ${DB_NAME}.* TO '${MONITOR_USER}'@'%';

-- Grant access to performance schema (for metrics)
GRANT SELECT ON performance_schema.* TO '${MONITOR_USER}'@'localhost';
GRANT SELECT ON performance_schema.* TO '${MONITOR_USER}'@'%';

-- Grant PROCESS privilege (to see running queries)
GRANT PROCESS ON *.* TO '${MONITOR_USER}'@'localhost';
GRANT PROCESS ON *.* TO '${MONITOR_USER}'@'%';

FLUSH PRIVILEGES;
EOF

    echo ""
    log_info "SQL commands generated in: $SQL_FILE"
    echo ""
    echo "Execute these commands as the database admin:"
    echo "${YELLOW}mysql -h $DB_HOST -P $DB_PORT -u $ADMIN_USER -p < $SQL_FILE${NC}"
    echo ""
    read -p "Execute now? [y/N]: " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$ADMIN_USER" -p < "$SQL_FILE"
        log_info "User created successfully!"
    else
        log_info "Skipped execution. You can run it manually later."
    fi

    echo ""
    log_info "Add this to your AppScope agent config (/etc/appscope/config.yaml):"
    echo ""
    echo "${YELLOW}database:"
    echo "  type: mysql"
    echo "  host: $DB_HOST"
    echo "  port: $DB_PORT"
    echo "  user: $MONITOR_USER"
    echo "  password: \"\${DB_PASSWORD}\""
    echo "  database: $DB_NAME"
    echo "  metrics_only: true${NC}"

    rm -f "$SQL_FILE"
fi

# MongoDB Setup
if [ "$db_choice" = "3" ]; then
    log_step "MongoDB Read-Only User Setup"
    echo ""

    read -p "MongoDB host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}

    read -p "MongoDB port [27017]: " DB_PORT
    DB_PORT=${DB_PORT:-27017}

    read -p "Database name: " DB_NAME

    read -p "New monitoring username [appscope_readonly]: " MONITOR_USER
    MONITOR_USER=${MONITOR_USER:-appscope_readonly}

    read -sp "Password for new monitoring user: " MONITOR_PASS
    echo ""

    log_info "MongoDB command to create user:"
    echo ""
    echo "${YELLOW}db.getSiblingDB('$DB_NAME').createUser({"
    echo "  user: '$MONITOR_USER',"
    echo "  pwd: '$MONITOR_PASS',"
    echo "  roles: ["
    echo "    { role: 'read', db: '$DB_NAME' },"
    echo "    { role: 'clusterMonitor', db: 'admin' }"
    echo "  ]"
    echo "})${NC}"
    echo ""
    log_info "Run this in mongo shell: mongo $DB_HOST:$DB_PORT/admin"

    echo ""
    log_info "Add this to your AppScope agent config (/etc/appscope/config.yaml):"
    echo ""
    echo "${YELLOW}database:"
    echo "  type: mongodb"
    echo "  host: $DB_HOST"
    echo "  port: $DB_PORT"
    echo "  user: $MONITOR_USER"
    echo "  password: \"\${DB_PASSWORD}\""
    echo "  database: $DB_NAME"
    echo "  auth_database: admin${NC}"
fi

# Redis Setup
if [ "$db_choice" = "4" ]; then
    log_step "Redis Monitoring Setup"
    echo ""

    log_info "Redis monitoring typically uses the INFO command."
    log_info "No special user creation is needed, just provide the connection details."
    echo ""

    read -p "Redis host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}

    read -p "Redis port [6379]: " DB_PORT
    DB_PORT=${DB_PORT:-6379}

    read -sp "Redis password (leave empty if none): " REDIS_PASS
    echo ""

    echo ""
    log_info "Add this to your AppScope agent config (/etc/appscope/config.yaml):"
    echo ""
    if [ -z "$REDIS_PASS" ]; then
        echo "${YELLOW}database:"
        echo "  type: redis"
        echo "  host: $DB_HOST"
        echo "  port: $DB_PORT"
        echo "  database: 0${NC}"
    else
        echo "${YELLOW}database:"
        echo "  type: redis"
        echo "  host: $DB_HOST"
        echo "  port: $DB_PORT"
        echo "  password: \"\${REDIS_PASSWORD}\""
        echo "  database: 0${NC}"
    fi
fi

echo ""
echo "${GREEN}============================================${NC}"
echo "${GREEN}  Setup Complete!${NC}"
echo "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Update /etc/appscope/config.yaml with the above configuration"
echo "  2. Set environment variables for passwords"
echo "  3. Restart the AppScope agent: sudo systemctl restart appscope"
echo "  4. Check logs: sudo journalctl -u appscope -f"
echo ""
