# AppScope Agent

The AppScope Agent is a lightweight, high-performance monitoring agent written in Go. It collects system metrics, application logs, and database statistics from your servers and sends them to the AppScope monitoring platform for analysis.

## Features

- **System Metrics Collection**: CPU, memory, disk usage, and network I/O
- **Log File Monitoring**: Tail multiple log files with automatic format detection
- **Database Metrics**: PostgreSQL connection pools, query performance, cache hit ratios
- **Service Health Checks**: HTTP and TCP health monitoring
- **Intelligent Log Parsing**: Automatic detection and parsing of JSON, Apache, Nginx, and syslog formats
- **Efficient Transport**: Gzip compression, retry logic with exponential backoff
- **Low Resource Footprint**: Minimal CPU and memory usage
- **Health Endpoint**: Built-in HTTP endpoint for monitoring agent status

## Installation

### From Binary

Download the latest release for your platform:

```bash
# Linux AMD64
curl -LO https://github.com/appscope/agent/releases/latest/download/appscope-linux-amd64
chmod +x appscope-linux-amd64
sudo mv appscope-linux-amd64 /usr/local/bin/appscope

# macOS ARM64 (Apple Silicon)
curl -LO https://github.com/appscope/agent/releases/latest/download/appscope-darwin-arm64
chmod +x appscope-darwin-arm64
sudo mv appscope-darwin-arm64 /usr/local/bin/appscope
```

### From Source

Requires Go 1.21 or later:

```bash
git clone https://github.com/appscope/agent.git
cd agent
make build
sudo make install
```

### Quick Install Script

```bash
curl -sSL https://appscope.io/install.sh | bash -s -- --key YOUR_API_KEY
```

## Configuration

Create a configuration file at `/etc/appscope/config.yaml`:

```yaml
# Your AppScope API key (required)
api_key: "ask_live_your_api_key_here"

# Project name (required)
project: "my-application"

# AppScope server URL (optional, defaults to https://api.appscope.io)
server_url: "https://api.appscope.io"

# Log files to monitor (optional)
logs:
  - /var/log/myapp/application.log
  - /var/log/nginx/access.log
  - /var/log/nginx/error.log

# Database configuration (optional)
database:
  type: postgres              # postgres, mysql, mongodb, redis
  host: localhost
  port: 5432
  user: monitor_readonly
  password: "${DB_PASSWORD}"  # Can use environment variables
  dbname: myapp
  metrics_only: true          # Only collect metrics, don't read data

# System metrics collection (optional, default: true)
system_metrics: true

# Collection interval in seconds (optional, default: 30)
collection_interval: 30

# Start reading logs from beginning on first run (optional, default: false)
start_from_beginning: false

# Health endpoint port (optional, default: 9090)
health_port: 9090
```

### Environment Variables

Configuration values can reference environment variables using `${VAR_NAME}` syntax:

```yaml
database:
  password: "${DB_PASSWORD}"
```

Set the environment variable:

```bash
export DB_PASSWORD="my_secret_password"
```

## Usage

### Run Manually

```bash
appscope --config /etc/appscope/config.yaml
```

### Run as a Service

#### Linux (systemd)

```bash
sudo make install-service
sudo systemctl start appscope
sudo systemctl status appscope
sudo journalctl -u appscope -f
```

#### macOS (launchd)

```bash
sudo make install-service
sudo launchctl list | grep appscope
```

### Check Agent Health

The agent exposes a health endpoint on port 9090 (configurable):

```bash
curl http://localhost:9090/health
```

Response:

```json
{
  "status": "healthy",
  "uptime": "2h30m15s",
  "uptime_ms": 9015000,
  "collectors": {
    "system": {
      "name": "system",
      "status": "running",
      "last_success": "2024-01-27T10:30:00Z",
      "metrics_count": 1234
    },
    "logs": {
      "name": "logs",
      "status": "running",
      "last_success": "2024-01-27T10:30:00Z",
      "metrics_count": 567
    },
    "database": {
      "name": "database",
      "status": "running",
      "last_success": "2024-01-27T10:30:00Z",
      "metrics_count": 89
    }
  },
  "timestamp": "2024-01-27T10:30:05Z"
}
```

## Architecture

### Collectors

The agent uses a modular collector architecture:

#### System Collector (`internal/collector/system.go`)
- CPU usage percentage
- Memory usage and available memory
- Disk usage per mount point
- Network I/O rates (bytes/packets per second)
- Network errors and drops

#### Log Collector (`internal/collector/logs.go`)
- Tails multiple log files simultaneously
- Tracks file offsets to avoid re-reading
- Detects log rotation automatically
- Uses intelligent parser for format detection

#### Database Collector (`internal/collector/database.go`)
- PostgreSQL: connections, transactions, cache hit ratio, slow queries, deadlocks
- MySQL: (stub for future implementation)
- MongoDB: (stub for future implementation)
- Redis: (stub for future implementation)

#### Health Collector (`internal/collector/health.go`)
- HTTP health checks with status code validation
- TCP port connectivity checks
- Response time measurement

### Log Parser (`internal/collector/parser.go`)

Automatically detects and parses multiple log formats:

- **JSON**: Extracts structured fields (timestamp, level, message, metadata)
- **Apache Common Log**: Parses IP, timestamp, request, status, size
- **Nginx Combined Log**: Includes referrer and user-agent
- **Syslog**: Standard syslog format with hostname and process info
- **Generic**: Fallback parser with timestamp and level detection

### Transport (`internal/transport/client.go`)

- HTTP/HTTPS communication with AppScope server
- Automatic gzip compression for payloads > 1KB
- Exponential backoff retry logic (3 retries)
- Connection pooling for efficiency
- Proper resource cleanup to prevent leaks

## Development

### Prerequisites

- Go 1.21 or later
- Make

### Build

```bash
# Build for current platform
make build

# Build for all platforms
make build-all

# Build optimized release binaries
make build-release
```

### Test

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run benchmarks
make bench
```

### Code Quality

```bash
# Format code
make format

# Run linter
make lint

# Run all checks
make check
```

### Development Workflow

```bash
# Run in development mode (hot reload with air)
make dev

# Run with custom config
appscope --config ./my-config.yaml
```

## Monitoring Best Practices

### Database Monitoring

Create a read-only database user for monitoring:

```sql
-- PostgreSQL
CREATE USER monitor_readonly WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE myapp TO monitor_readonly;
GRANT USAGE ON SCHEMA public TO monitor_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor_readonly;
GRANT pg_monitor TO monitor_readonly; -- For pg_stat_statements

-- Enable pg_stat_statements for slow query detection
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Log File Permissions

Ensure the agent has read access to log files:

```bash
# Option 1: Add agent user to log file group
sudo usermod -a -G adm appscope

# Option 2: Grant read permissions
sudo chmod o+r /var/log/myapp/*.log
```

### Resource Limits

The agent is designed to be lightweight:

- Memory: ~20-50 MB typical usage
- CPU: <1% on most systems
- Network: Minimal, compressed payloads sent every 30s

Monitor the agent itself:

```bash
# Check resource usage
ps aux | grep appscope

# Monitor in real-time
top -p $(pgrep appscope)
```

## Troubleshooting

### Agent Won't Start

Check the configuration:

```bash
appscope --config /etc/appscope/config.yaml
```

Common issues:
- Invalid API key format (must start with `ask_`)
- Missing required fields (api_key, project)
- Invalid YAML syntax

### No Data Appearing in Dashboard

1. Verify API key is correct
2. Check network connectivity to AppScope server
3. Review agent logs for errors
4. Verify health endpoint shows collectors running

### High Memory Usage

If memory usage is higher than expected:

1. Check log file sizes - very large log files can increase memory usage
2. Reduce `collection_interval` if too frequent
3. Consider limiting the number of log files monitored

### Database Connection Errors

- Verify database credentials
- Ensure network connectivity to database
- Check database user has required permissions
- For PostgreSQL, enable `pg_stat_statements` extension

## Security

### API Key Storage

- Store API keys in environment variables or secure configuration management
- Never commit API keys to version control
- Use file permissions to restrict config access: `chmod 600 /etc/appscope/config.yaml`

### Database Access

- Use read-only database users
- Set `metrics_only: true` to prevent data access
- Limit network access to database using firewalls

### Network Communication

- All data sent to AppScope is encrypted via HTTPS/TLS
- API key authentication on every request
- Payloads are compressed to minimize bandwidth

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Copyright (c) 2024 AppScope. All rights reserved.

## Support

- Documentation: https://docs.appscope.io
- Issues: https://github.com/appscope/agent/issues
- Email: support@appscope.io
