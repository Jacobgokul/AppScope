# AppScope - AI-Powered Application Monitoring

AppScope is a comprehensive monitoring solution that combines metrics collection, log aggregation, and AI-powered root cause analysis to help you understand and troubleshoot your applications.

## Architecture

- **Backend** (FastAPI): RESTful API with JWT authentication, metrics/logs ingestion, and AI analysis
- **Frontend** (React + Vite): Modern dashboard for visualizing metrics, logs, and insights
- **Agent** (Go): Lightweight agent that collects system metrics, database stats, and logs from your servers

## Features

- Real-time metrics collection (CPU, memory, disk, database connections)
- Log aggregation and parsing
- AI-powered root cause analysis
- Multi-project support with API key authentication
- Health monitoring dashboard
- Secure authentication with JWT tokens

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Go 1.21+
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb appscope

# Or use Docker
docker run -d \
  --name appscope-postgres \
  -e POSTGRES_DB=appscope \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:14-alpine
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your SECRET_KEY and DATABASE_URL

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if needed (default points to localhost:8000)

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 4. Agent Setup

```bash
cd agent

# Build agent
go build -o appscope-agent ./cmd/appscope

# Configure agent
cp config.example.yaml config.yaml
# Edit config.yaml and add your API key (get from frontend after creating a project)

# Run agent
./appscope-agent -config config.yaml
```

## Production Deployment

### Backend

```bash
# Install production dependencies
pip install -r requirements.txt

# Set production environment variables
export DEBUG=false
export SECRET_KEY=$(openssl rand -hex 32)
export DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/appscope

# Run with Gunicorn
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Frontend

```bash
npm run build
# Serve the dist/ folder with Nginx, Caddy, or any static file server
```

### Agent

```bash
# Build for production
CGO_ENABLED=0 go build -ldflags="-s -w" -o appscope-agent ./cmd/appscope

# Install as systemd service (Linux)
sudo cp appscope-agent /usr/local/bin/
sudo cp config.yaml /etc/appscope/config.yaml
# Create systemd service file and enable
```

## Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## API Usage

### Create Account
```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass123","company_name":"MyCompany"}'
```

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass123"}'
```

### Create Project
```bash
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Application","environment":"production"}'
```

### Send Metrics (Agent)
```bash
curl -X POST http://localhost:8000/api/v1/ingest/metrics \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": [{
      "metric_type":"cpu",
      "metric_name":"usage_percent",
      "value":45.2,
      "unit":"percent"
    }]
  }'
```

## Security

- **Secret Key**: Generate a strong secret key for JWT token signing
- **API Keys**: Use separate API keys for each agent/project
- **HTTPS**: Always use HTTPS in production
- **Database**: Use read-only credentials for agent database monitoring
- **CORS**: Configure allowed origins in production

## Development

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Database Migrations
```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Troubleshooting

### Agent can't connect to backend
- Check `server_url` in agent config.yaml
- Verify API key is correct
- Check network connectivity and firewall rules

### Backend database errors
- Verify DATABASE_URL is correct
- Run `alembic upgrade head` to apply migrations
- Check PostgreSQL is running and accessible

### Frontend can't reach API
- Check VITE_API_URL in .env matches backend URL
- Verify CORS settings in backend allow frontend origin

## License

Copyright 2024 AppScope. All rights reserved.

## Support

For issues, questions, or feature requests, please contact support@appscope.io
