#!/bin/bash
# AppScope Agent Uninstall Script
# Removes the AppScope agent from your system

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

echo ""
echo "============================================"
echo "  AppScope Agent Uninstaller"
echo "============================================"
echo ""

# Check for root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

# Ask for confirmation
echo "This will remove the AppScope agent from your system."
echo ""
log_warn "The following will be removed:"
echo "  - Binary: /usr/local/bin/appscope"
echo "  - Service: systemd/launchd service"
echo ""
echo "The following will be PRESERVED (use --purge to remove):"
echo "  - Configuration: /etc/appscope/"
echo "  - Logs: /var/log/appscope/"
echo "  - Data: /var/lib/appscope/"
echo ""

PURGE=false
if [ "$1" = "--purge" ]; then
    PURGE=true
    log_warn "PURGE MODE: All data will be deleted!"
fi

if [ "$PURGE" = false ]; then
    read -p "Continue with uninstall? [y/N]: " -n 1 -r
else
    read -p "PURGE all data including config and logs? [y/N]: " -n 1 -r
fi
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Uninstall cancelled"
    exit 0
fi

echo ""

# Stop and remove service
if [ "$OS" = "linux" ]; then
    if systemctl list-unit-files | grep -q appscope.service; then
        log_info "Stopping and disabling service..."
        systemctl stop appscope.service 2>/dev/null || true
        systemctl disable appscope.service 2>/dev/null || true
        rm -f /etc/systemd/system/appscope.service
        systemctl daemon-reload
        log_info "Service removed"
    else
        log_info "Service not found (already removed or never installed)"
    fi
elif [ "$OS" = "darwin" ]; then
    if [ -f /Library/LaunchDaemons/com.appscope.agent.plist ]; then
        log_info "Stopping and removing service..."
        launchctl unload /Library/LaunchDaemons/com.appscope.agent.plist 2>/dev/null || true
        rm -f /Library/LaunchDaemons/com.appscope.agent.plist
        log_info "Service removed"
    else
        log_info "Service not found (already removed or never installed)"
    fi
fi

# Remove binary
if [ -f /usr/local/bin/appscope ]; then
    log_info "Removing binary..."
    rm -f /usr/local/bin/appscope
    log_info "Binary removed"
else
    log_info "Binary not found (already removed)"
fi

# Handle purge mode
if [ "$PURGE" = true ]; then
    log_info "Purging all data..."

    # Remove config
    if [ -d /etc/appscope ]; then
        log_info "Removing configuration..."
        rm -rf /etc/appscope
    fi

    # Remove logs
    if [ -d /var/log/appscope ]; then
        log_info "Removing logs..."
        rm -rf /var/log/appscope
    fi

    # Remove data directory
    if [ -d /var/lib/appscope ]; then
        log_info "Removing data directory..."
        rm -rf /var/lib/appscope
    fi

    # Remove user (Linux only)
    if [ "$OS" = "linux" ]; then
        if id appscope &>/dev/null; then
            log_info "Removing user 'appscope'..."
            userdel appscope 2>/dev/null || true
        fi
    fi

    log_info "All data purged"
else
    log_info "Configuration and logs preserved"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Uninstall Complete${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

if [ "$PURGE" = false ]; then
    echo "The agent has been removed, but your configuration and logs remain:"
    echo "  - Config: /etc/appscope/"
    echo "  - Logs: /var/log/appscope/"
    echo "  - Data: /var/lib/appscope/"
    echo ""
    echo "To remove everything, run:"
    echo "  sudo bash uninstall.sh --purge"
    echo ""
    echo "Or manually remove:"
    echo "  sudo rm -rf /etc/appscope /var/log/appscope /var/lib/appscope"
else
    echo "All AppScope agent files have been removed from your system."
fi

echo ""
echo "Thank you for using AppScope!"
echo ""
