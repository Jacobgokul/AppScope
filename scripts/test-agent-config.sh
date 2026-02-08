#!/bin/bash
# AppScope Agent Configuration Test Script
# Tests agent configuration and connectivity before starting the service

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

test_pass() {
    echo -e "${GREEN}  ✓ PASS${NC} $1"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}  ✗ FAIL${NC} $1"
    ((TESTS_FAILED++))
}

run_test() {
    ((TESTS_RUN++))
}

echo ""
echo "============================================"
echo "  AppScope Agent Configuration Test"
echo "============================================"
echo ""

# Configuration
CONFIG_FILE="${1:-/etc/appscope/config.yaml}"
BINARY="${2:-/usr/local/bin/appscope}"

log_info "Testing configuration: $CONFIG_FILE"
log_info "Testing binary: $BINARY"
echo ""

# Test 1: Binary exists and is executable
log_test "Checking agent binary..."
run_test
if [ -x "$BINARY" ]; then
    VERSION=$($BINARY --version 2>/dev/null || echo "unknown")
    test_pass "Binary exists and is executable ($VERSION)"
else
    if [ -f "$BINARY" ]; then
        test_fail "Binary exists but is not executable"
        echo "       Run: sudo chmod +x $BINARY"
    else
        test_fail "Binary not found at $BINARY"
        echo "       Install with: curl -sSL https://appscope.io/install.sh | sudo bash -s -- --key YOUR_API_KEY"
    fi
fi
echo ""

# Test 2: Config file exists and is readable
log_test "Checking configuration file..."
run_test
if [ -f "$CONFIG_FILE" ]; then
    if [ -r "$CONFIG_FILE" ]; then
        test_pass "Config file exists and is readable"
    else
        test_fail "Config file exists but is not readable"
        echo "       Run: sudo chmod 644 $CONFIG_FILE"
    fi
else
    test_fail "Config file not found at $CONFIG_FILE"
    echo "       Create from example: sudo cp /path/to/config.example.yaml $CONFIG_FILE"
fi
echo ""

# Test 3: YAML syntax validation
if [ -f "$CONFIG_FILE" ] && [ -r "$CONFIG_FILE" ]; then
    log_test "Validating YAML syntax..."
    run_test
    if command -v python3 &> /dev/null; then
        if python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>/dev/null; then
            test_pass "YAML syntax is valid"
        else
            test_fail "YAML syntax error in config file"
            python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>&1 | head -5
        fi
    elif command -v ruby &> /dev/null; then
        if ruby -ryaml -e "YAML.load_file('$CONFIG_FILE')" 2>/dev/null; then
            test_pass "YAML syntax is valid"
        else
            test_fail "YAML syntax error in config file"
        fi
    else
        test_warn "Cannot validate YAML (install python3 or ruby)"
    fi
    echo ""
fi

# Test 4: API key format validation
if [ -f "$CONFIG_FILE" ] && [ -r "$CONFIG_FILE" ]; then
    log_test "Validating API key..."
    run_test
    API_KEY=$(grep "^api_key:" "$CONFIG_FILE" | awk '{print $2}' | tr -d '"' | tr -d "'")
    if [ -z "$API_KEY" ]; then
        test_fail "API key not found in config"
        echo "       Add: api_key: \"ask_proj_xxxxxxxx\""
    elif [ ${#API_KEY} -lt 20 ]; then
        test_fail "API key too short (${#API_KEY} chars, need 20+)"
    elif [[ ! "$API_KEY" == ask_* ]]; then
        test_fail "API key must start with 'ask_'"
        echo "       Get your API key from: https://appscope.io/dashboard/projects"
    else
        test_pass "API key format is valid"
    fi
    echo ""
fi

# Test 5: Server URL validation
if [ -f "$CONFIG_FILE" ] && [ -r "$CONFIG_FILE" ]; then
    log_test "Checking server URL..."
    run_test
    SERVER_URL=$(grep "^server_url:" "$CONFIG_FILE" | awk '{print $2}' | tr -d '"' | tr -d "'")
    if [ -z "$SERVER_URL" ]; then
        test_fail "Server URL not found in config"
        echo "       Add: server_url: \"https://api.appscope.io\""
    elif [[ ! "$SERVER_URL" =~ ^https?:// ]]; then
        test_fail "Server URL must start with http:// or https://"
    else
        test_pass "Server URL is present ($SERVER_URL)"
    fi
    echo ""
fi

# Test 6: Network connectivity to server
if [ -n "$SERVER_URL" ]; then
    log_test "Testing network connectivity..."
    run_test
    HEALTH_URL="${SERVER_URL}/health"
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -sSL -w "%{http_code}" -o /dev/null "$HEALTH_URL" --connect-timeout 5 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            test_pass "Successfully connected to AppScope server"
        elif [ "$HTTP_CODE" = "000" ]; then
            test_fail "Cannot connect to server (network error)"
            echo "       Check: firewall, proxy, DNS resolution"
            echo "       Test: curl -v $HEALTH_URL"
        else
            test_warn "Server returned HTTP $HTTP_CODE (may be normal)"
        fi
    else
        test_warn "curl not available, skipping connectivity test"
    fi
    echo ""
fi

# Test 7: Log file paths
if [ -f "$CONFIG_FILE" ] && [ -r "$CONFIG_FILE" ]; then
    log_test "Checking log file paths..."
    run_test
    LOG_PATHS=$(grep -A 100 "^logs:" "$CONFIG_FILE" | grep "^\s*-" | awk '{print $2}' | head -10)
    if [ -z "$LOG_PATHS" ]; then
        test_warn "No log files configured"
        echo "       Add log paths to config to enable log monitoring"
    else
        ALL_EXIST=true
        READABLE_COUNT=0
        TOTAL_COUNT=0
        while IFS= read -r log_path; do
            ((TOTAL_COUNT++))
            if [ -f "$log_path" ]; then
                if [ -r "$log_path" ]; then
                    ((READABLE_COUNT++))
                else
                    test_warn "Log file not readable: $log_path"
                    ALL_EXIST=false
                fi
            else
                test_warn "Log file not found: $log_path"
                ALL_EXIST=false
            fi
        done <<< "$LOG_PATHS"

        if [ $READABLE_COUNT -eq $TOTAL_COUNT ]; then
            test_pass "All $TOTAL_COUNT log files exist and are readable"
        elif [ $READABLE_COUNT -gt 0 ]; then
            test_warn "$READABLE_COUNT/$TOTAL_COUNT log files are readable"
            echo "       Some log files may not be accessible"
        else
            test_fail "No log files are readable"
            echo "       Check file permissions or add appscope user to log group"
            echo "       Run: sudo usermod -aG adm appscope"
        fi
    fi
    echo ""
fi

# Test 8: Database configuration (if present)
if [ -f "$CONFIG_FILE" ] && [ -r "$CONFIG_FILE" ]; then
    log_test "Checking database configuration..."
    run_test
    DB_HOST=$(grep -A 10 "^database:" "$CONFIG_FILE" | grep "host:" | awk '{print $2}' | head -1)
    if [ -n "$DB_HOST" ]; then
        DB_TYPE=$(grep -A 10 "^database:" "$CONFIG_FILE" | grep "type:" | awk '{print $2}' | head -1)
        DB_PORT=$(grep -A 10 "^database:" "$CONFIG_FILE" | grep "port:" | awk '{print $2}' | head -1)

        test_pass "Database monitoring configured ($DB_TYPE at $DB_HOST:$DB_PORT)"

        # Try to test connection
        if [ "$DB_TYPE" = "postgres" ] && command -v pg_isready &> /dev/null; then
            if pg_isready -h "$DB_HOST" -p "$DB_PORT" &>/dev/null; then
                test_pass "PostgreSQL is reachable"
            else
                test_warn "Cannot reach PostgreSQL at $DB_HOST:$DB_PORT"
            fi
        elif [ "$DB_TYPE" = "mysql" ] && command -v mysqladmin &> /dev/null; then
            if mysqladmin ping -h "$DB_HOST" -P "$DB_PORT" &>/dev/null; then
                test_pass "MySQL is reachable"
            else
                test_warn "Cannot reach MySQL at $DB_HOST:$DB_PORT"
            fi
        fi
    else
        test_warn "Database monitoring not configured (optional)"
    fi
    echo ""
fi

# Test 9: System metrics configuration
if [ -f "$CONFIG_FILE" ] && [ -r "$CONFIG_FILE" ]; then
    log_test "Checking system metrics configuration..."
    run_test
    SYSTEM_METRICS=$(grep "^system_metrics:" "$CONFIG_FILE" | awk '{print $2}')
    if [ "$SYSTEM_METRICS" = "true" ]; then
        test_pass "System metrics collection enabled"
    else
        test_warn "System metrics collection disabled"
        echo "       Enable with: system_metrics: true"
    fi
    echo ""
fi

# Test 10: Service status (if installed)
log_test "Checking service status..."
run_test
if command -v systemctl &> /dev/null; then
    if systemctl list-unit-files | grep -q appscope.service; then
        if systemctl is-active --quiet appscope.service; then
            test_pass "Service is installed and running"
            UPTIME=$(systemctl show appscope.service -p ActiveEnterTimestamp --value)
            echo "       Running since: $UPTIME"
        elif systemctl is-enabled --quiet appscope.service; then
            test_warn "Service is installed but not running"
            echo "       Start with: sudo systemctl start appscope"
        else
            test_warn "Service is installed but not enabled"
            echo "       Enable with: sudo systemctl enable appscope"
        fi
    else
        test_warn "Service not installed"
        echo "       Install with: make install-service"
    fi
elif command -v launchctl &> /dev/null; then
    if launchctl list | grep -q com.appscope.agent; then
        test_pass "Service is installed and running (launchd)"
    else
        test_warn "Service not running"
        echo "       Load with: sudo launchctl load /Library/LaunchDaemons/com.appscope.agent.plist"
    fi
else
    test_warn "Cannot check service status (systemd/launchd not found)"
fi
echo ""

# Test 11: Permissions
log_test "Checking file permissions..."
run_test
if id appscope &>/dev/null; then
    test_pass "User 'appscope' exists"

    # Check if appscope can read config
    if sudo -u appscope test -r "$CONFIG_FILE" 2>/dev/null; then
        test_pass "User 'appscope' can read config file"
    else
        test_fail "User 'appscope' cannot read config file"
        echo "       Run: sudo chown root:appscope $CONFIG_FILE"
        echo "       Run: sudo chmod 640 $CONFIG_FILE"
    fi
else
    test_warn "User 'appscope' does not exist (will run as root)"
fi
echo ""

# Test 12: Disk space
log_test "Checking disk space..."
run_test
LOG_DIR="/var/log/appscope"
if [ -d "$LOG_DIR" ]; then
    AVAILABLE=$(df -h "$LOG_DIR" | tail -1 | awk '{print $4}')
    PERCENT_USED=$(df "$LOG_DIR" | tail -1 | awk '{print $5}' | tr -d '%')
    if [ "$PERCENT_USED" -lt 90 ]; then
        test_pass "Sufficient disk space ($AVAILABLE available)"
    else
        test_warn "Disk space running low (${PERCENT_USED}% used)"
        echo "       Consider cleaning old logs or expanding disk"
    fi
else
    test_warn "Log directory not found: $LOG_DIR"
    echo "       Will be created on first run"
fi
echo ""

# Summary
echo "============================================"
echo "  Test Summary"
echo "============================================"
echo ""
echo "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Configuration looks good!${NC}"
    echo ""
    echo "Ready to start the agent:"
    echo "  sudo systemctl start appscope      # Linux"
    echo "  sudo launchctl start com.appscope.agent  # macOS"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Configuration has issues${NC}"
    echo ""
    echo "Please fix the errors above before starting the agent."
    echo ""
    echo "For help, see:"
    echo "  - Documentation: https://docs.appscope.io"
    echo "  - Support: support@appscope.io"
    echo ""
    exit 1
fi
