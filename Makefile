# =============================================================================
# AppScope Makefile
# =============================================================================
# Common commands for development, testing, and deployment.
#
# Usage:
#   make help       # Show available commands
#   make dev        # Start development environment
#   make test       # Run all tests
#   make build      # Build all Docker images
#   make prod       # Start production environment
# =============================================================================

.PHONY: help dev prod build test clean migrate logs shell db-shell \
        backend-shell frontend-shell agent-build agent-test lint \
        docker-prune reset setup

# Default target
.DEFAULT_GOAL := help

# Colors for terminal output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Project configuration
PROJECT_NAME := appscope
DOCKER_COMPOSE := docker-compose
DOCKER_COMPOSE_PROD := $(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo ""
	@echo "$(BLUE)AppScope$(NC) - Development Commands"
	@echo ""
	@echo "$(GREEN)Usage:$(NC)"
	@echo "  make $(YELLOW)<target>$(NC)"
	@echo ""
	@echo "$(GREEN)Targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Development
# =============================================================================

dev: ## Start development environment with hot reload
	$(DOCKER_COMPOSE) up --build

dev-d: ## Start development environment in background
	$(DOCKER_COMPOSE) up --build -d

dev-down: ## Stop development environment
	$(DOCKER_COMPOSE) down

stop: dev-down ## Alias for dev-down

# =============================================================================
# Production
# =============================================================================

prod: ## Start production environment
	$(DOCKER_COMPOSE_PROD) up -d --build

prod-down: ## Stop production environment
	$(DOCKER_COMPOSE_PROD) down

prod-logs: ## View production logs
	$(DOCKER_COMPOSE_PROD) logs -f

prod-restart: ## Restart production services
	$(DOCKER_COMPOSE_PROD) restart

# =============================================================================
# Building
# =============================================================================

build: ## Build all Docker images
	$(DOCKER_COMPOSE) build

build-no-cache: ## Build all Docker images without cache
	$(DOCKER_COMPOSE) build --no-cache

build-backend: ## Build backend image only
	$(DOCKER_COMPOSE) build backend

build-frontend: ## Build frontend image only
	$(DOCKER_COMPOSE) build frontend

build-agent: ## Build agent binary
	cd agent && make build

build-agent-docker: ## Build agent Docker image
	docker build -t $(PROJECT_NAME)-agent:latest ./agent

# =============================================================================
# Testing
# =============================================================================

test: test-backend test-frontend test-agent ## Run all tests

test-backend: ## Run backend tests
	$(DOCKER_COMPOSE) run --rm backend pytest -v

test-backend-cov: ## Run backend tests with coverage
	$(DOCKER_COMPOSE) run --rm backend pytest -v --cov=app --cov-report=term-missing

test-frontend: ## Run frontend tests
	$(DOCKER_COMPOSE) run --rm frontend npm test

test-agent: ## Run agent tests
	cd agent && make test

# =============================================================================
# Linting & Code Quality
# =============================================================================

lint: lint-backend lint-frontend lint-agent ## Run all linters

lint-backend: ## Lint backend code
	$(DOCKER_COMPOSE) run --rm backend python -m ruff check .
	$(DOCKER_COMPOSE) run --rm backend python -m mypy app/

lint-frontend: ## Lint frontend code
	$(DOCKER_COMPOSE) run --rm frontend npm run lint

lint-agent: ## Lint agent code
	cd agent && make lint

format: ## Format all code
	$(DOCKER_COMPOSE) run --rm backend python -m ruff format .
	$(DOCKER_COMPOSE) run --rm frontend npm run format 2>/dev/null || true
	cd agent && go fmt ./...

# =============================================================================
# Database
# =============================================================================

migrate: ## Run database migrations
	$(DOCKER_COMPOSE) run --rm backend alembic upgrade head

migrate-new: ## Create new migration (usage: make migrate-new MSG="migration message")
	$(DOCKER_COMPOSE) run --rm backend alembic revision --autogenerate -m "$(MSG)"

migrate-down: ## Rollback last migration
	$(DOCKER_COMPOSE) run --rm backend alembic downgrade -1

migrate-history: ## Show migration history
	$(DOCKER_COMPOSE) run --rm backend alembic history

db-setup: ## Initialize database with TimescaleDB
	./scripts/setup-db.sh --host localhost

db-reset: ## Reset database (WARNING: destroys all data)
	./scripts/setup-db.sh --host localhost --reset

db-shell: ## Open PostgreSQL shell
	$(DOCKER_COMPOSE) exec db psql -U postgres -d appscope

db-backup: ## Backup database
	@mkdir -p backups
	$(DOCKER_COMPOSE) exec -T db pg_dump -U postgres appscope > backups/appscope_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created: backups/appscope_$(shell date +%Y%m%d_%H%M%S).sql"

# =============================================================================
# Logging & Monitoring
# =============================================================================

logs: ## Follow logs from all services
	$(DOCKER_COMPOSE) logs -f

logs-backend: ## Follow backend logs
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## Follow frontend logs
	$(DOCKER_COMPOSE) logs -f frontend

logs-db: ## Follow database logs
	$(DOCKER_COMPOSE) logs -f db

# =============================================================================
# Shell Access
# =============================================================================

shell: backend-shell ## Alias for backend-shell

backend-shell: ## Open shell in backend container
	$(DOCKER_COMPOSE) exec backend /bin/bash

frontend-shell: ## Open shell in frontend container
	$(DOCKER_COMPOSE) exec frontend /bin/sh

redis-shell: ## Open Redis CLI
	$(DOCKER_COMPOSE) exec redis redis-cli

# =============================================================================
# Cleanup
# =============================================================================

clean: ## Stop containers and remove volumes
	$(DOCKER_COMPOSE) down -v --remove-orphans

clean-images: ## Remove project Docker images
	docker images | grep $(PROJECT_NAME) | awk '{print $$3}' | xargs -r docker rmi -f

docker-prune: ## Remove unused Docker resources
	docker system prune -af --volumes

reset: clean ## Full reset: remove containers, volumes, and rebuild
	$(DOCKER_COMPOSE) build --no-cache
	@echo "Reset complete. Run 'make dev' to start fresh."

# =============================================================================
# Setup & Installation
# =============================================================================

setup: ## Initial project setup
	@echo "$(BLUE)Setting up AppScope development environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env file from template$(NC)"; \
		echo "$(YELLOW)Please edit .env and set SECRET_KEY$(NC)"; \
	fi
	@echo "$(BLUE)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env and set a secure SECRET_KEY"
	@echo "  2. Run: make dev"
	@echo "  3. Open: http://localhost:5173"

install-deps-backend: ## Install backend dependencies locally
	cd backend && pip install -r requirements.txt

install-deps-frontend: ## Install frontend dependencies locally
	cd frontend && npm install

install-deps-agent: ## Install agent dependencies locally
	cd agent && go mod download

# =============================================================================
# Deployment Helpers
# =============================================================================

docker-login: ## Login to Docker registry (set DOCKER_REGISTRY env var)
	@if [ -z "$(DOCKER_REGISTRY)" ]; then \
		echo "$(RED)Error: DOCKER_REGISTRY not set$(NC)"; \
		exit 1; \
	fi
	docker login $(DOCKER_REGISTRY)

push: ## Push images to registry
	@if [ -z "$(DOCKER_REGISTRY)" ]; then \
		echo "$(RED)Error: DOCKER_REGISTRY not set$(NC)"; \
		exit 1; \
	fi
	docker push $(DOCKER_REGISTRY)/$(PROJECT_NAME)-backend:latest
	docker push $(DOCKER_REGISTRY)/$(PROJECT_NAME)-frontend:latest

release: ## Build and push release images (usage: make release VERSION=1.0.0)
	@if [ -z "$(VERSION)" ]; then \
		echo "$(RED)Error: VERSION not set. Usage: make release VERSION=1.0.0$(NC)"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) build
	docker tag $(PROJECT_NAME)-backend:latest $(PROJECT_NAME)-backend:$(VERSION)
	docker tag $(PROJECT_NAME)-frontend:latest $(PROJECT_NAME)-frontend:$(VERSION)
	@echo "$(GREEN)Tagged images with version $(VERSION)$(NC)"

# =============================================================================
# Health Checks
# =============================================================================

health: ## Check service health status
	@echo "Checking service health..."
	@curl -s http://localhost:8000/api/v1/health | jq . 2>/dev/null || echo "Backend: DOWN"
	@curl -s http://localhost:5173/health 2>/dev/null && echo "Frontend: UP" || echo "Frontend: DOWN"
	@$(DOCKER_COMPOSE) exec -T db pg_isready -U postgres && echo "Database: UP" || echo "Database: DOWN"
	@$(DOCKER_COMPOSE) exec -T redis redis-cli ping && echo "Redis: UP" || echo "Redis: DOWN"

status: ## Show status of all containers
	$(DOCKER_COMPOSE) ps
