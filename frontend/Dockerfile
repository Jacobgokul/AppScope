# =============================================================================
# AppScope Frontend Dockerfile
# Multi-stage build: Node.js for building, nginx for serving
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build - Compile TypeScript and build React app
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
# This allows Docker to cache the npm install step if dependencies haven't changed
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source files
COPY . .

# Build arguments for environment variables at build time
# These are baked into the static files during build
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

# Build the production bundle
# This creates optimized static files in /app/dist
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production - Serve with nginx
# -----------------------------------------------------------------------------
FROM nginx:1.25-alpine AS production

# Security: Remove default nginx user and create a new one with limited permissions
# nginx:alpine already runs as non-root by default in newer versions

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx configuration and static files
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Security: Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose HTTP port
EXPOSE 80

# Health check - verify nginx is serving the app
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost/health || exit 1

# Run nginx in foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]

# -----------------------------------------------------------------------------
# Stage 3: Development - Hot reload with Vite (optional stage)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source (will be overwritten by volume mount in dev)
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server with hot module replacement
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
