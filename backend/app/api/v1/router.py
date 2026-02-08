from fastapi import APIRouter

from app.api.v1 import auth, users, projects, services, ingest, metrics, logs, health, analysis, alerts

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(services.router)
api_router.include_router(ingest.router)
api_router.include_router(metrics.router)
api_router.include_router(logs.router)
api_router.include_router(health.router)
api_router.include_router(analysis.router)
api_router.include_router(alerts.router)
