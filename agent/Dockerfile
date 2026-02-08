# =============================================================================
# AppScope Agent Dockerfile
# Multi-stage build for Go application
# Produces a minimal, secure container image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Compile Go binary with all dependencies
# -----------------------------------------------------------------------------
FROM golang:1.21-alpine AS builder

# Install build dependencies
# - git: for fetching Go modules
# - ca-certificates: for HTTPS connections
# - make: for Makefile support
RUN apk add --no-cache \
    git \
    ca-certificates \
    make \
    tzdata

# Set working directory
WORKDIR /build

# Copy go.mod and go.sum first for better layer caching
COPY go.mod go.sum ./

# Download dependencies
# This layer is cached unless go.mod/go.sum change
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the binary with optimizations
# CGO_ENABLED=0: Static binary (no C dependencies)
# -ldflags: Strip debug info for smaller binary
# -trimpath: Remove file paths for reproducible builds
# -tags netgo: Use pure Go networking
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.version=1.0.0 -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -trimpath \
    -tags netgo \
    -o appscope \
    ./cmd/appscope

# -----------------------------------------------------------------------------
# Stage 2: Runtime - Minimal image with just the binary
# -----------------------------------------------------------------------------
FROM alpine:3.19 AS runtime

# Security: Install only necessary runtime dependencies
# - ca-certificates: for HTTPS connections to AppScope server
# - tzdata: for timezone support in logs
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Security: Create non-root user
# The agent runs as this user instead of root
RUN addgroup -g 1000 -S appscope && \
    adduser -u 1000 -S appscope -G appscope

# Create directories for config and data
RUN mkdir -p /etc/appscope /var/lib/appscope && \
    chown -R appscope:appscope /etc/appscope /var/lib/appscope

# Copy the binary from builder stage
COPY --from=builder /build/appscope /usr/local/bin/appscope

# Make binary executable
RUN chmod +x /usr/local/bin/appscope

# Security: Switch to non-root user
USER appscope

# Set working directory
WORKDIR /var/lib/appscope

# Health check - verify agent is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD pgrep -x appscope > /dev/null || exit 1

# Default config location
ENV APPSCOPE_CONFIG=/etc/appscope/config.yaml

# Entrypoint - run the agent with config
ENTRYPOINT ["/usr/local/bin/appscope"]
CMD ["--config", "/etc/appscope/config.yaml"]

# Labels for container metadata
LABEL maintainer="AppScope Team <support@appscope.io>" \
      org.opencontainers.image.title="AppScope Agent" \
      org.opencontainers.image.description="Lightweight monitoring agent for application observability" \
      org.opencontainers.image.vendor="AppScope" \
      org.opencontainers.image.version="1.0.0"
