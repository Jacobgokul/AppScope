# AppScope Installation and Setup Scripts

This directory contains scripts for installing and configuring the AppScope monitoring agent.

## Scripts Overview

### 1. `install.sh` - Agent Installation Script

The main installation script that downloads, installs, and configures the AppScope agent on your system.

**Usage:**
```bash
# Standard installation
curl -sSL https://appscope.io/install.sh | sudo bash -s -- --key YOUR_API_KEY

# With custom server URL
curl -sSL https://appscope.io/install.sh | sudo bash -s -- \
  --key YOUR_API_KEY \
  --server https://your-appscope-instance.com

# With custom download URL (for self-hosted releases)
curl -sSL https://appscope.io/install.sh | sudo bash -s -- \
  --key YOUR_API_KEY \
  --download-url https://my-releases.com/appscope-linux-amd64

# Skip download (use existing binary)
curl -sSL https://appscope.io/install.sh | sudo bash -s -- \
  --key YOUR_API_KEY \
  --skip-download
```

**Options:**
- `--key API_KEY` - Your AppScope API key (required, must start with 'ask_')
- `--server URL` - AppScope server URL (default: https://api.appscope.io)
- `--download-url URL` - Custom URL to download the agent binary
- `--skip-download` - Skip binary download (use existing binary at /usr/local/bin/appscope)
- `--version` - Show installer version
- `--help` - Show help message

**What it does:**
1. Validates API key format
2. Detects OS and architecture (Linux/macOS, amd64/arm64)
3. Downloads the appropriate agent binary
4. Installs binary to `/usr/local/bin/appscope`
5. Creates config directory at `/etc/appscope/`
6. Generates initial configuration with your API key
7. Creates and enables systemd service (Linux) or launchd service (macOS)
8. Creates dedicated `appscope` user for running the agent (Linux)
9. Sets proper file permissions
10. Tests connection to AppScope server
11. Starts the agent service

**System Requirements:**
- Linux (systemd) or macOS (launchd)
- Root/sudo access
- curl or wget
- Active internet connection (for download)

**Installation Locations:**
- Binary: `/usr/local/bin/appscope`
- Config: `/etc/appscope/config.yaml`
- Logs: `/var/log/appscope/`
- Data: `/var/lib/appscope/`
- Service:
  - Linux: `/etc/systemd/system/appscope.service`
  - macOS: `/Library/LaunchDaemons/com.appscope.agent.plist`

---

### 2. `setup-db-monitoring.sh` - Database Monitoring Setup

Interactive script to help set up read-only database access for the AppScope agent.

**Usage:**
```bash
sudo bash setup-db-monitoring.sh
```

**Supported Databases:**
1. **PostgreSQL** - Creates read-only user with pg_monitor role
2. **MySQL/MariaDB** - Creates read-only user with PROCESS privilege
3. **MongoDB** - Creates user with read role and clusterMonitor
4. **Redis** - Provides connection configuration

**What it does:**
1. Prompts for database type
2. Collects connection details interactively
3. Generates SQL/commands to create a monitoring user
4. Optionally executes the commands
5. Provides AppScope configuration snippet
6. Shows how to set environment variables for passwords

**Security Note:**
The script creates read-only users that can only:
- Read database statistics and performance metrics
- View running queries
- Access system performance views

They **cannot**:
- Modify data
- Create/drop tables
- Execute commands
- Access sensitive data (unless explicitly granted)

**Example Output:**
```yaml
# PostgreSQL configuration
database:
  type: postgres
  host: localhost
  port: 5432
  user: appscope_readonly
  password: "${DB_PASSWORD}"
  database: myapp
  metrics_only: true
```

**Setting Password as Environment Variable:**
```bash
# Option 1: Export in shell (temporary)
export DB_PASSWORD='your_password'

# Option 2: Add to systemd service file
# Edit /etc/systemd/system/appscope.service:
[Service]
Environment="DB_PASSWORD=your_password"

# Option 3: Create environment file (recommended)
# Create /etc/appscope/environment:
DB_PASSWORD=your_password

# Then in systemd service file:
EnvironmentFile=/etc/appscope/environment
```

---

## Post-Installation Steps

After running `install.sh`, follow these steps:

### 1. Configure Log Monitoring

Edit `/etc/appscope/config.yaml`:

```yaml
logs:
  - /var/log/myapp/app.log
  - /var/log/myapp/error.log
  - /var/log/nginx/access.log
  - /var/log/nginx/error.log
```

### 2. Set Up Database Monitoring (Optional)

Run the database setup script:
```bash
sudo bash setup-db-monitoring.sh
```

Then add the generated configuration to `/etc/appscope/config.yaml`.

### 3. Configure System Metrics

The agent collects system metrics by default. Customize in config:

```yaml
system_metrics:
  enabled: true
  collect_cpu: true
  collect_memory: true
  collect_disk: true
  collect_network: true
```

### 4. Restart Agent

```bash
# Linux
sudo systemctl restart appscope
sudo systemctl status appscope

# macOS
sudo launchctl kickstart -k system/com.appscope.agent
sudo launchctl list | grep appscope
```

### 5. Verify Connection

Check that the agent is sending data:

```bash
# Linux
sudo journalctl -u appscope -f

# macOS
tail -f /var/log/appscope/agent.log
```

Look for messages like:
```
[INFO] API key validated successfully
[INFO] System metrics collector enabled
[INFO] Log collector enabled for 4 files
[INFO] Sent 15 metrics
```

### 6. View Dashboard

Visit your AppScope dashboard:
```
https://appscope.io/dashboard
```

---

## Service Management

### Linux (systemd)

```bash
# Start
sudo systemctl start appscope

# Stop
sudo systemctl stop appscope

# Restart
sudo systemctl restart appscope

# Status
sudo systemctl status appscope

# Enable auto-start on boot
sudo systemctl enable appscope

# Disable auto-start
sudo systemctl disable appscope

# View logs
sudo journalctl -u appscope -f

# View recent errors
sudo journalctl -u appscope -p err -n 50
```

### macOS (launchd)

```bash
# Start
sudo launchctl load /Library/LaunchDaemons/com.appscope.agent.plist

# Stop
sudo launchctl unload /Library/LaunchDaemons/com.appscope.agent.plist

# Restart
sudo launchctl kickstart -k system/com.appscope.agent

# Status
sudo launchctl list | grep appscope

# View logs
tail -f /var/log/appscope/agent.log

# View errors
tail -f /var/log/appscope/agent-error.log
```

---

## Troubleshooting

### Agent won't start

1. **Check configuration syntax:**
   ```bash
   /usr/local/bin/appscope --config /etc/appscope/config.yaml --validate
   ```

2. **Check API key:**
   ```bash
   # API key must start with 'ask_' and be at least 20 characters
   grep api_key /etc/appscope/config.yaml
   ```

3. **Check permissions:**
   ```bash
   ls -la /etc/appscope/config.yaml
   # Should be readable by appscope user
   ```

4. **Check logs for errors:**
   ```bash
   sudo journalctl -u appscope -n 100 --no-pager
   ```

### Cannot read log files

The agent needs read access to log files:

```bash
# Option 1: Add appscope user to the log file's group
sudo usermod -aG adm appscope  # Common group for /var/log

# Option 2: Adjust log file permissions
sudo chmod 644 /var/log/myapp/app.log

# Option 3: Run as root (not recommended)
# Edit /etc/systemd/system/appscope.service:
# Change User=appscope to User=root
```

### Connection issues

1. **Test network connectivity:**
   ```bash
   curl -v https://api.appscope.io/health
   ```

2. **Check firewall:**
   ```bash
   # Agent needs outbound HTTPS (port 443)
   sudo iptables -L OUTPUT -n | grep 443
   ```

3. **Verify server URL:**
   ```bash
   grep server_url /etc/appscope/config.yaml
   ```

### Database connection fails

1. **Test database connectivity:**
   ```bash
   # PostgreSQL
   psql -h localhost -U appscope_readonly -d myapp -c "SELECT 1"

   # MySQL
   mysql -h localhost -u appscope_readonly -p myapp -e "SELECT 1"
   ```

2. **Check password environment variable:**
   ```bash
   # Should be set in service environment
   sudo systemctl show appscope | grep Environment
   ```

3. **Verify user permissions:**
   ```bash
   # PostgreSQL - check pg_monitor role
   psql -U postgres -c "\du appscope_readonly"

   # MySQL - check grants
   mysql -u root -p -e "SHOW GRANTS FOR 'appscope_readonly'@'localhost'"
   ```

---

## Uninstallation

### Complete Removal

```bash
# Stop and disable service
sudo systemctl stop appscope
sudo systemctl disable appscope
sudo rm /etc/systemd/system/appscope.service
sudo systemctl daemon-reload

# Remove binary and config
sudo rm /usr/local/bin/appscope
sudo rm -rf /etc/appscope
sudo rm -rf /var/log/appscope
sudo rm -rf /var/lib/appscope

# Remove user (Linux)
sudo userdel appscope
```

### Keep Configuration and Logs

```bash
# Just stop and remove the binary
sudo systemctl stop appscope
sudo systemctl disable appscope
sudo rm /usr/local/bin/appscope

# Config and logs remain in:
# /etc/appscope/
# /var/log/appscope/
```

---

## Advanced Configuration

### Custom Installation Directory

```bash
# Download and install manually
curl -Lo appscope https://github.com/appscope/agent/releases/download/v1.0.0/appscope-linux-amd64
chmod +x appscope
sudo mv appscope /opt/appscope/bin/

# Update service file to use custom path
sudo sed -i 's|/usr/local/bin/appscope|/opt/appscope/bin/appscope|g' \
  /etc/systemd/system/appscope.service
```

### Multiple Agents (Multiple Projects)

Run separate agent instances for different projects:

```bash
# Create separate configs
sudo cp /etc/appscope/config.yaml /etc/appscope/config-project2.yaml

# Create separate service
sudo cp /etc/systemd/system/appscope.service \
  /etc/systemd/system/appscope-project2.service

# Edit the new service to use different config
sudo sed -i 's|config.yaml|config-project2.yaml|g' \
  /etc/systemd/system/appscope-project2.service

# Start both services
sudo systemctl daemon-reload
sudo systemctl start appscope appscope-project2
```

### Proxy Configuration

If your system requires a proxy:

```yaml
# Add to config.yaml
advanced:
  http_proxy: "http://proxy.example.com:8080"
  https_proxy: "http://proxy.example.com:8080"
  no_proxy: "localhost,127.0.0.1"
```

### Custom TLS Certificates

For self-hosted AppScope with self-signed certificates:

```yaml
# Add to config.yaml
advanced:
  tls_verify: true
  ca_cert_path: /etc/appscope/ca.crt
```

---

## Security Best Practices

1. **Use read-only database users** - Never give the agent write access
2. **Run as dedicated user** - Don't run as root (systemd handles this)
3. **Rotate API keys** - Generate new keys periodically in the dashboard
4. **Secure config file** - `chmod 600 /etc/appscope/config.yaml` if it contains passwords
5. **Use environment variables** - Don't hardcode passwords in config
6. **Monitor agent logs** - Watch for unauthorized access attempts
7. **Keep agent updated** - Update to latest version regularly

---

## Support

- **Documentation:** https://docs.appscope.io
- **Dashboard:** https://appscope.io/dashboard
- **Support:** support@appscope.io
- **Community:** https://community.appscope.io
- **GitHub:** https://github.com/appscope/agent

---

## License

Copyright (c) 2025 AppScope. All rights reserved.

This is proprietary software. See LICENSE file for details.
