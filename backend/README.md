# AppScope Backend

AI-powered application monitoring platform backend built with FastAPI, TimescaleDB, and async Python.

## Features

- FastAPI async web framework
- TimescaleDB for time-series metrics and logs
- JWT authentication with refresh tokens
- API key authentication for agents
- Comprehensive data ingestion pipeline
- Event correlation engine
- Production-ready error handling
- Rate limiting
- CORS configuration
- Alembic migrations

## Tech Stack

- **Framework**: FastAPI 0.128+
- **Database**: PostgreSQL + TimescaleDB
- **ORM**: SQLAlchemy 2.0 (async)
- **Auth**: JWT (python-jose), bcrypt
- **Validation**: Pydantic v2
- **Migrations**: Alembic
- **AI**: LangChain (for future AI analysis)

## Prerequisites

- Python 3.11+
- PostgreSQL 15+ with TimescaleDB extension
- pip or uv for package management

## Installation

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Up Database

Install TimescaleDB:

```bash
# Docker (recommended for development)
docker run -d --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=appscope \
  timescale/timescaledb:latest-pg15

# Or install locally: https://docs.timescale.com/install/latest/
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set required values:

```bash
# REQUIRED: Generate secure secret key
SECRET_KEY=$(openssl rand -hex 32)

# Database connection
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/appscope

# Optional: AI/LLM configuration
LLM_API_URL=https://api.openai.com/v1
LLM_API_KEY=your-api-key
```

### 4. Run Migrations

```bash
# Initialize database with Alembic
alembic upgrade head
```

Or use the init_db script:

```bash
# Initialize database (creates tables + hypertables + policies)
python -m app.db.init_db

# Reset database (WARNING: deletes all data)
python -m app.db.init_db reset
```

### 5. Run Development Server

```bash
# With uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or with python module
python -m uvicorn app.main:app --reload
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── api/              # API routes
│   │   ├── deps.py       # Dependencies (auth, db)
│   │   └── v1/           # API v1 endpoints
│   │       ├── auth.py   # Authentication
│   │       ├── projects.py  # Project management
│   │       ├── ingest.py    # Data ingestion
│   │       ├── metrics.py   # Metrics queries
│   │       ├── logs.py      # Log queries
│   │       ├── analysis.py  # AI analysis
│   │       └── health.py    # Health checks
│   │
│   ├── core/             # Core utilities
│   │   ├── security.py   # Auth, hashing, JWT
│   │   └── exceptions.py # Custom exceptions
│   │
│   ├── db/               # Database
│   │   ├── session.py    # Async session
│   │   └── init_db.py    # DB initialization
│   │
│   ├── models/           # SQLAlchemy models
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── service.py
│   │   ├── metrics.py
│   │   ├── logs.py
│   │   ├── analysis.py
│   │   └── alert.py
│   │
│   ├── schemas/          # Pydantic schemas
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── metrics.py
│   │   ├── logs.py
│   │   └── analysis.py
│   │
│   ├── services/         # Business logic
│   │   ├── auth.py
│   │   ├── ingest.py
│   │   ├── correlation.py
│   │   ├── ai_analysis.py
│   │   └── alerts.py
│   │
│   ├── config.py         # Settings
│   └── main.py           # FastAPI app
│
├── alembic/              # Database migrations
│   └── versions/
│
├── tests/                # Tests
│
├── requirements.txt
├── Dockerfile
└── .env.example
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login (returns JWT)
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info

### Projects

- `GET /api/v1/projects` - List user's projects
- `POST /api/v1/projects` - Create project (returns API key)
- `GET /api/v1/projects/{id}` - Get project details
- `DELETE /api/v1/projects/{id}` - Delete project

### Data Ingestion (Agent → Server)

- `POST /api/v1/ingest/metrics` - Ingest metrics batch
- `POST /api/v1/ingest/logs` - Ingest log events batch
- `WS /api/v1/ingest/stream` - WebSocket streaming (future)

### Monitoring

- `GET /api/v1/metrics/{project_id}` - Query metrics
- `GET /api/v1/logs/{project_id}` - Query logs
- `GET /api/v1/health/{project_id}` - Get health status

### AI Analysis

- `POST /api/v1/analysis/{project_id}` - Request AI analysis
- `GET /api/v1/analysis/{project_id}/history` - Past analyses

## Authentication

### User Authentication (Dashboard)

Use JWT Bearer tokens:

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use access token
curl http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer <access_token>"
```

### API Key Authentication (Agent)

Agents use API keys:

```bash
curl -X POST http://localhost:8000/api/v1/ingest/metrics \
  -H "Authorization: Bearer ask_live_xxxxx..." \
  -H "Content-Type: application/json" \
  -d '{"metrics": [...]}'
```

## Database Migrations

```bash
# Create new migration (auto-generate from models)
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View current version
alembic current

# View migration history
alembic history
```

## Development

### Running Tests

```bash
pytest
pytest --cov=app tests/  # With coverage
```

### Code Quality

```bash
# Format
black app/
isort app/

# Lint
ruff check app/
mypy app/
```

## TimescaleDB Features

The backend leverages TimescaleDB for efficient time-series data:

- **Hypertables**: `metrics` and `log_events` tables are hypertables
- **Compression**: Automatic compression after 7 days (configurable)
- **Retention**: Automatic data deletion after N days (configurable)
- **Fast queries**: Optimized time-based queries with chunk pruning

### Retention Policies

Configure in `.env`:

```bash
METRICS_RETENTION_DAYS=30      # Keep metrics for 30 days
LOGS_RETENTION_DAYS=14         # Keep logs for 14 days
COMPRESSION_AFTER_DAYS=7       # Compress after 7 days
```

## Production Deployment

### Docker

```bash
# Build
docker build -t appscope-backend .

# Run
docker run -p 8000:8000 \
  -e SECRET_KEY="..." \
  -e DATABASE_URL="..." \
  appscope-backend
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### Environment Variables

Production-critical variables:

- `SECRET_KEY` - **REQUIRED** JWT secret (min 32 chars)
- `DATABASE_URL` - PostgreSQL connection string
- `CORS_ORIGINS` - Allowed frontend domains
- `DEBUG` - Set to `false` in production

## Monitoring

Health check endpoint:

```bash
curl http://localhost:8000/api/v1/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-27T12:00:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql -h localhost -U postgres -d appscope

# Check TimescaleDB extension
psql -h localhost -U postgres -d appscope -c "SELECT * FROM timescaledb_information.hypertables;"
```

### Migration Issues

```bash
# Reset to specific version
alembic downgrade <revision>

# Force reset (DANGER: loses data)
python -m app.db.init_db reset
```

### Import Errors

```bash
# Ensure you're in the backend directory
cd backend

# Set PYTHONPATH if needed
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

## License

Proprietary - AppScope SaaS Platform

## Support

For issues and questions, contact: support@appscope.io
