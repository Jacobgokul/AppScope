# =============================================================================
# AppScope Backend Dockerfile
# Multi-stage build for Python FastAPI application
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Install dependencies with build tools
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS builder

# Install build dependencies needed for some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment for cleaner dependency management
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------------
# Stage 2: Runtime - Minimal image for running the application
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

# Security: Create non-root user to run the application
# This follows the principle of least privilege
RUN groupadd --gid 1000 appscope && \
    useradd --uid 1000 --gid 1000 --shell /bin/bash --create-home appscope

# Install runtime dependencies only (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY --chown=appscope:appscope . .

# Remove unnecessary files from container
RUN rm -rf tests/ __pycache__ .pytest_cache .env .env.example env/

# Security: Switch to non-root user
USER appscope

# Expose the FastAPI port
EXPOSE 8000

# Health check - verify API is responding
# Check the health endpoint every 30 seconds
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:8000/api/v1/health || exit 1

# Environment variables for Python optimization
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Default command - run uvicorn with production settings
# In production, workers should be set based on CPU cores (typically 2-4 x cores)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
