from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone

from app.db import get_db
from app.api.deps import get_current_user, get_project_by_id
from app.models import User, Metric, LogEvent, Service
from app.schemas.analysis import HealthStatus, OverallHealth

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check():
    """API health check."""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/{project_id}")
async def get_project_health(
    project_id: str,
    service: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get overall health status for a project or a specific service.

    If service parameter is provided, returns health for that service only.
    Otherwise returns health for all services in the project.
    """
    project = await get_project_by_id(project_id, current_user, db)

    now = datetime.now(timezone.utc)
    last_hour = now - timedelta(hours=1)

    # Get all services for this project
    services_result = await db.execute(
        select(Service).where(
            Service.project_id == project.id,
            Service.is_active == True
        )
    )
    services = services_result.scalars().all()

    # If specific service requested, filter to that service
    if service:
        services = [s for s in services if s.name == service]
        if not services:
            raise HTTPException(status_code=404, detail=f"Service '{service}' not found")

    # Calculate health for each service
    components = []

    for svc in services:
        # Get error count for this service
        error_result = await db.execute(
            select(func.count(LogEvent.id)).where(
                LogEvent.project_id == project.id,
                LogEvent.service_id == svc.id,
                LogEvent.timestamp >= last_hour,
                LogEvent.level.in_(["error", "ERROR", "critical", "CRITICAL", "fatal", "FATAL"]),
            )
        )
        error_count = error_result.scalar() or 0

        # Get latest metrics for this service
        cpu_result = await db.execute(
            select(Metric).where(
                Metric.project_id == project.id,
                Metric.source == svc.name,
                Metric.metric_type == "cpu",
            ).order_by(Metric.timestamp.desc()).limit(1)
        )
        cpu_metric = cpu_result.scalar_one_or_none()

        memory_result = await db.execute(
            select(Metric).where(
                Metric.project_id == project.id,
                Metric.source == svc.name,
                Metric.metric_type == "memory",
            ).order_by(Metric.timestamp.desc()).limit(1)
        )
        memory_metric = memory_result.scalar_one_or_none()

        # Calculate service health score
        issues = []
        score = 1.0

        # Error rate impact
        if error_count > 0:
            error_impact = min(0.5, error_count / 100)
            score -= error_impact
            issues.append(f"{error_count} errors in last hour")

        # CPU impact
        if cpu_metric:
            if cpu_metric.value > 90:
                issues.append(f"High CPU: {cpu_metric.value:.1f}%")
                score -= 0.3
            elif cpu_metric.value > 70:
                issues.append(f"Elevated CPU: {cpu_metric.value:.1f}%")
                score -= 0.15

        # Memory impact
        if memory_metric:
            if memory_metric.value > 90:
                issues.append(f"High memory: {memory_metric.value:.1f}%")
                score -= 0.3
            elif memory_metric.value > 70:
                issues.append(f"Elevated memory: {memory_metric.value:.1f}%")
                score -= 0.15

        # Check for stale data (no metrics in last 5 minutes)
        if cpu_metric and (now - cpu_metric.timestamp).total_seconds() > 300:
            issues.append("No recent metrics (possible agent issue)")
            score -= 0.4

        score = max(0, score)
        status = "healthy" if score > 0.7 else "degraded" if score > 0.3 else "unhealthy"

        components.append(HealthStatus(
            component=svc.name,
            status=status,
            score=score,
            last_updated=now,
            issues=issues,
        ))

    # If no services configured, return default health
    if not components:
        components.append(HealthStatus(
            component="system",
            status="unknown",
            score=0.5,
            last_updated=now,
            issues=["No services configured for monitoring"],
        ))

    # Calculate overall score
    overall_score = sum(c.score for c in components) / len(components)
    overall_status = "healthy" if overall_score > 0.7 else "degraded" if overall_score > 0.3 else "unhealthy"

    return OverallHealth(
        overall_status=overall_status,
        overall_score=overall_score,
        components=components,
        last_updated=now,
    )
