#!/bin/bash
set -e

# AppScope Agent Installer
# Usage: curl -sSL <YOUR_SERVER_URL>/install.sh | bash -s -- --key YOUR_API_KEY
# In production: curl -sSL https://appscope.io/install.sh | bash -s -- --key YOUR_API_KEY

VERSION="1.0.0"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/appscope"
SERVICE_NAME="appscope"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate API key format
# API keys must start with "ask_" prefix and be at least 20 characters long
validate_api_key() {
    local key="$1"
    local min_length=20
    local prefix="ask_"

    # Check if key is empty
    if [ -z "$key" ]; then
        log_error "API key is required. Use: --key YOUR_API_KEY"
        return 1
    fi

    # Check minimum length
    if [ ${#key} -lt $min_length ]; then
        log_error "Invalid API key: must be at least $min_length characters long"
        log_error "Your key is ${#key} characters"
        return 1
    fi

    # Check prefix
    if [[ ! "$key" == ${prefix}* ]]; then
        log_error "Invalid API key format: must start with '${prefix}'"
        log_error "Get your API key from https://appscope.io/dashboard/projects"
        return 1
    fi

    return 0
}

# Print manual build instructions
print_build_instructions() {
    echo ""
    log_info "Manual build instructions:"
    echo "  1. Clone the repository:"
    echo "     git clone https://github.com/appscope/agent.git"
    echo ""
    echo "  2. Build the agent:"
    echo "     cd agent"
    echo "     make build"
    echo ""
    echo "  3. Install the binary:"
    echo "     sudo cp appscope $INSTALL_DIR/"
    echo "     sudo chmod +x $INSTALL_DIR/appscope"
    echo ""
    echo "  4. Re-run this script with --skip-download:"
    echo "     curl -sSL https://appscope.io/install.sh | sudo bash -s -- --key YOUR_API_KEY --skip-download"
    echo ""
    log_info "Or specify a custom download URL with --download-url:"
    echo "     curl -sSL https://appscope.io/install.sh | sudo bash -s -- --key YOUR_API_KEY --download-url https://your-server/appscope"
}

# Parse arguments
API_KEY=""
SERVER_URL="https://api.appscope.io"
DOWNLOAD_URL=""
SKIP_DOWNLOAD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --key)
            API_KEY="$2"
            shift 2
            ;;
        --server)
            SERVER_URL="$2"
            shift 2
            ;;
        --download-url)
            DOWNLOAD_URL="$2"
            shift 2
            ;;
        --skip-download)
            SKIP_DOWNLOAD=true
            shift
            ;;
        --version)
            echo "AppScope Installer v${VERSION}"
            exit 0
            ;;
        --help|-h)
            echo "AppScope Agent Installer v${VERSION}"
            echo ""
            echo "Usage: install.sh --key API_KEY [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --key API_KEY        Your AppScope API key (required, must start with 'ask_')"
            echo "  --server URL         AppScope server URL (default: https://api.appscope.io)"
            echo "  --download-url URL   Custom URL to download the agent binary"
            echo "  --skip-download      Skip binary download (use existing binary)"
            echo "  --version            Show installer version"
            echo "  --help, -h           Show this help message"
            echo ""
            echo "Examples:"
            echo "  # Standard installation"
            echo "  curl -sSL https://appscope.io/install.sh | sudo bash -s -- --key ask_live_xxxx"
            echo ""
            echo "  # Custom download URL (for self-hosted releases)"
            echo "  curl -sSL https://appscope.io/install.sh | sudo bash -s -- --key ask_live_xxxx --download-url https://my-server/appscope"
            echo ""
            echo "  # Skip download (binary already installed)"
            echo "  curl -sSL https://appscope.io/install.sh | sudo bash -s -- --key ask_live_xxxx --skip-download"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            log_error "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate API key format (Bug B34 fix)
if ! validate_api_key "$API_KEY"; then
    echo ""
    log_error "Usage: install.sh --key YOUR_API_KEY"
    log_error "Optional: --server YOUR_SERVER_URL (default: https://api.appscope.io)"
    log_error "Optional: --download-url CUSTOM_BINARY_URL"
    exit 1
fi

log_info "API key format validated successfully"

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case $ARCH in
    x86_64)
        ARCH="amd64"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        ;;
    *)
        log_error "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

log_info "Detected system: $OS $ARCH"

# Set default download URL if not provided (Bug B8 fix)
if [ -z "$DOWNLOAD_URL" ]; then
    DOWNLOAD_URL="https://github.com/Jacobgokul/AppScope/releases/download/v${VERSION}/appscope-${OS}-${ARCH}"
fi

# Check for root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Handle binary installation (Bug B8 fix - improved error handling)
if [ "$SKIP_DOWNLOAD" = true ]; then
    # Check if binary already exists
    if [ -f "$INSTALL_DIR/appscope" ]; then
        log_info "Using existing binary at $INSTALL_DIR/appscope"
        # Verify it's executable
        if [ ! -x "$INSTALL_DIR/appscope" ]; then
            chmod +x "$INSTALL_DIR/appscope"
        fi
    else
        log_error "Binary not found at $INSTALL_DIR/appscope"
        log_error "Either download manually or remove --skip-download flag"
        print_build_instructions
        exit 1
    fi
else
    # Check if binary already exists before attempting download
    if [ -f "$INSTALL_DIR/appscope" ]; then
        log_info "Existing binary found at $INSTALL_DIR/appscope"
        read -p "Do you want to overwrite it? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing binary"
        else
            log_info "Will download new binary..."
            NEEDS_DOWNLOAD=true
        fi
    else
        NEEDS_DOWNLOAD=true
    fi

    if [ "${NEEDS_DOWNLOAD:-true}" = true ]; then
        # Attempt download with better error handling
        log_info "Downloading AppScope agent v${VERSION}..."
        log_info "URL: $DOWNLOAD_URL"

        # Create temp file for download
        TEMP_BINARY=$(mktemp)
        trap "rm -f $TEMP_BINARY" EXIT

        # Try download with proper error capture
        HTTP_CODE=$(curl -sSL -w "%{http_code}" "$DOWNLOAD_URL" -o "$TEMP_BINARY" 2>/dev/null) || HTTP_CODE="000"

        if [ "$HTTP_CODE" = "200" ] && [ -s "$TEMP_BINARY" ]; then
            # Verify downloaded file is a binary (not HTML error page)
            FILE_TYPE=$(file -b "$TEMP_BINARY" 2>/dev/null || echo "unknown")
            if [[ "$FILE_TYPE" == *"executable"* ]] || [[ "$FILE_TYPE" == *"ELF"* ]] || [[ "$FILE_TYPE" == *"Mach-O"* ]]; then
                mv "$TEMP_BINARY" "$INSTALL_DIR/appscope"
                chmod +x "$INSTALL_DIR/appscope"
                log_info "Binary downloaded and installed successfully"
            else
                log_error "Downloaded file is not a valid executable (got: $FILE_TYPE)"
                log_error "This may indicate the release URL doesn't exist or returned an error page"
                print_build_instructions
                exit 1
            fi
        elif [ "$HTTP_CODE" = "404" ]; then
            log_error "Download failed: Release not found (HTTP 404)"
            log_error "The URL $DOWNLOAD_URL does not exist"
            print_build_instructions
            exit 1
        elif [ "$HTTP_CODE" = "000" ]; then
            log_error "Download failed: Network error or invalid URL"
            log_error "Could not connect to: $DOWNLOAD_URL"
            print_build_instructions
            exit 1
        else
            log_error "Download failed with HTTP status: $HTTP_CODE"
            log_error "URL: $DOWNLOAD_URL"
            print_build_instructions
            exit 1
        fi
    fi
fi

# Create config directory
log_info "Creating config directory..."
mkdir -p "$CONFIG_DIR"

# Create config file
log_info "Creating config file..."
cat > "$CONFIG_DIR/config.yaml" << EOF
# AppScope Agent Configuration
api_key: "${API_KEY}"
server_url: "${SERVER_URL}"

# Log files to monitor (add your log paths here)
logs:
  # - /var/log/myapp/app.log
  # - /var/log/nginx/access.log

# Database configuration (optional)
# database:
#   type: postgres
#   host: localhost
#   port: 5432
#   user: monitor_readonly
#   password: "\${DB_PASSWORD}"
#   dbname: myapp
#   metrics_only: true

# Enable system metrics
system_metrics: true

# Collection interval in seconds
collection_interval: 30
EOF

# Create service based on OS
if [ "$OS" = "linux" ]; then
    log_info "Setting up systemd service..."
    cat > /etc/systemd/system/${SERVICE_NAME}.service << 'EOF'
[Unit]
Description=AppScope Monitoring Agent
Documentation=https://docs.appscope.io
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=appscope
Group=appscope
ExecStart=/usr/local/bin/appscope --config /etc/appscope/config.yaml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=appscope-agent
WorkingDirectory=/var/lib/appscope

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/appscope /var/lib/appscope
ReadOnlyPaths=/var/log
ProtectKernelTunables=true
ProtectKernelModules=true
RestrictNamespaces=true
PrivateTmp=true
MemoryLimit=1G
CPUQuota=50%
LimitNOFILE=8192

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    systemctl daemon-reload
    log_info "Systemd service created"

elif [ "$OS" = "darwin" ]; then
    log_info "Setting up launchd service..."
    cat > /Library/LaunchDaemons/com.appscope.agent.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.appscope.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/appscope</string>
        <string>--config</string>
        <string>/etc/appscope/config.yaml</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/var/lib/appscope</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>StandardOutPath</key>
    <string>/var/log/appscope/agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/appscope/agent-error.log</string>
    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
EOF
    log_info "Launchd service created"
fi

# Create user for running the agent (Linux only)
if [ "$OS" = "linux" ]; then
    log_info "Creating appscope user..."
    if ! id appscope >/dev/null 2>&1; then
        useradd --system --no-create-home --shell /bin/false appscope || {
            log_warn "Could not create appscope user, will run as root"
        }
    else
        log_info "User appscope already exists"
    fi
fi

# Set proper permissions
log_info "Setting permissions..."
chown -R root:root "$CONFIG_DIR" 2>/dev/null || true
chmod 755 "$CONFIG_DIR"
chmod 644 "$CONFIG_DIR/config.yaml"
mkdir -p /var/log/appscope
mkdir -p /var/lib/appscope
if id appscope >/dev/null 2>&1; then
    chown -R appscope:appscope /var/log/appscope /var/lib/appscope 2>/dev/null || true
fi
chmod 755 /var/log/appscope /var/lib/appscope

# Install and enable service
if [ "$OS" = "linux" ]; then
    log_info "Enabling and starting systemd service..."
    systemctl enable appscope.service

    # Verify API key before starting
    log_info "Testing connection to AppScope server..."
    if $INSTALL_DIR/appscope --config $CONFIG_DIR/config.yaml --test-connection 2>/dev/null; then
        log_info "Connection test successful!"
        systemctl start appscope.service

        # Wait a moment and check if service started
        sleep 2
        if systemctl is-active --quiet appscope.service; then
            log_info "Service started successfully!"
        else
            log_warn "Service may have failed to start. Check logs with: journalctl -u appscope -n 50"
        fi
    else
        log_warn "Connection test failed. Service enabled but not started."
        log_warn "Please check your API key and server URL in $CONFIG_DIR/config.yaml"
        log_warn "Start manually with: sudo systemctl start appscope"
    fi
elif [ "$OS" = "darwin" ]; then
    log_info "Loading launchd service..."
    launchctl load /Library/LaunchDaemons/com.appscope.agent.plist 2>/dev/null || {
        log_warn "Could not load launchd service automatically"
    }
fi

echo ""
log_info ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  AppScope Agent installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${GREEN}Installation Details:${NC}"
echo -e "  Binary:  $INSTALL_DIR/appscope"
echo -e "  Config:  $CONFIG_DIR/config.yaml"
echo -e "  Logs:    /var/log/appscope/"
echo -e "  Version: $VERSION"
echo ""

if [ "$OS" = "linux" ]; then
    echo -e "${GREEN}Service Management:${NC}"
    echo -e "  Check status: ${YELLOW}sudo systemctl status appscope${NC}"
    echo -e "  View logs:    ${YELLOW}sudo journalctl -u appscope -f${NC}"
    echo -e "  Restart:      ${YELLOW}sudo systemctl restart appscope${NC}"
    echo -e "  Stop:         ${YELLOW}sudo systemctl stop appscope${NC}"
elif [ "$OS" = "darwin" ]; then
    echo -e "${GREEN}Service Management:${NC}"
    echo -e "  Check status: ${YELLOW}sudo launchctl list | grep appscope${NC}"
    echo -e "  View logs:    ${YELLOW}tail -f /var/log/appscope/agent.log${NC}"
    echo -e "  Restart:      ${YELLOW}sudo launchctl kickstart -k system/com.appscope.agent${NC}"
fi

echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "  1. Verify agent is running and connected to AppScope"
echo -e "  2. Add your application log paths to: ${YELLOW}$CONFIG_DIR/config.yaml${NC}"
echo -e "  3. Configure database monitoring if needed"
echo -e "  4. Restart agent: ${YELLOW}sudo systemctl restart appscope${NC} (Linux) or ${YELLOW}sudo launchctl kickstart -k system/com.appscope.agent${NC} (macOS)"
echo -e "  5. View your dashboard at: ${YELLOW}https://appscope.io/dashboard${NC}"
echo ""
echo -e "${GREEN}Documentation:${NC} https://docs.appscope.io"
echo -e "${GREEN}Support:${NC} support@appscope.io"
echo ""
