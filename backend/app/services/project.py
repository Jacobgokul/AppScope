"""Project management business logic.

This module handles project-related operations including CRUD,
API key management, and project statistics.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.models import Project, APIKey, Service, Metric, LogEvent, Analysis
from app.core.security import generate_api_key, hash_api_key


async def get_project_stats(project_id: UUID, db: AsyncSession) -> dict:
    """Get comprehensive statistics for a project.

    Returns metrics count, logs count, services count, recent activity, etc.
    """
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)

    # Count services
    services_result = await db.execute(
        select(func.count(Service.id)).where(Service.project_id == project_id)
    )
    services_count = services_result.scalar() or 0

    # Count metrics in last 24h
    metrics_24h_result = await db.execute(
        select(func.count(Metric.id)).where(
            Metric.project_id == project_id,
            Metric.timestamp >= last_24h
        )
    )
    metrics_24h = metrics_24h_result.scalar() or 0

    # Count logs in last 24h
    logs_24h_result = await db.execute(
        select(func.count(LogEvent.id)).where(
            LogEvent.project_id == project_id,
            LogEvent.timestamp >= last_24h
        )
    )
    logs_24h = logs_24h_result.scalar() or 0

    # Count errors in last 24h
    errors_24h_result = await db.execute(
        select(func.count(LogEvent.id)).where(
            LogEvent.project_id == project_id,
            LogEvent.timestamp >= last_24h,
            LogEvent.level.in_(["error", "ERROR", "critical", "CRITICAL", "fatal", "FATAL"])
        )
    )
    errors_24h = errors_24h_result.scalar() or 0

    # Count analyses in last 7 days
    analyses_7d_result = await db.execute(
        select(func.count(Analysis.id)).where(
            Analysis.project_id == project_id,
            Analysis.created_at >= last_7d
        )
    )
    analyses_7d = analyses_7d_result.scalar() or 0

    # Get last activity timestamp
    last_metric_result = await db.execute(
        select(Metric.timestamp).where(
            Metric.project_id == project_id
        ).order_by(Metric.timestamp.desc()).limit(1)
    )
    last_metric_time = last_metric_result.scalar_one_or_none()

    last_log_result = await db.execute(
        select(LogEvent.timestamp).where(
            LogEvent.project_id == project_id
        ).order_by(LogEvent.timestamp.desc()).limit(1)
    )
    last_log_time = last_log_result.scalar_one_or_none()

    # Determine most recent activity
    last_activity = None
    if last_metric_time and last_log_time:
        last_activity = max(last_metric_time, last_log_time)
    elif last_metric_time:
        last_activity = last_metric_time
    elif last_log_time:
        last_activity = last_log_time

    return {
        "services_count": services_count,
        "metrics_24h": metrics_24h,
        "logs_24h": logs_24h,
        "errors_24h": errors_24h,
        "analyses_7d": analyses_7d,
        "last_activity": last_activity.isoformat() if last_activity else None,
        "is_active": last_activity and (now - last_activity).total_seconds() < 300 if last_activity else False,
    }


async def delete_project_data(project_id: UUID, db: AsyncSession) -> dict:
    """Delete all data associated with a project.

    This is called before deleting the project itself.
    Returns counts of deleted records.
    """
    # Delete metrics
    metrics_result = await db.execute(
        delete(Metric).where(Metric.project_id == project_id)
    )
    metrics_deleted = metrics_result.rowcount

    # Delete logs
    logs_result = await db.execute(
        delete(LogEvent).where(LogEvent.project_id == project_id)
    )
    logs_deleted = logs_result.rowcount

    # Delete analyses
    analyses_result = await db.execute(
        delete(Analysis).where(Analysis.project_id == project_id)
    )
    analyses_deleted = analyses_result.rowcount

    # Services and API keys will be deleted by cascade

    return {
        "metrics_deleted": metrics_deleted,
        "logs_deleted": logs_deleted,
        "analyses_deleted": analyses_deleted,
    }


async def regenerate_project_api_key(
    project_id: UUID,
    key_name: str,
    db: AsyncSession
) -> tuple[str, APIKey]:
    """Regenerate an API key for a project.

    Args:
        project_id: Project UUID
        key_name: Name of the API key to regenerate (e.g., "Default")
        db: Database session

    Returns:
        Tuple of (plain_api_key, api_key_model)

    Raises:
        ValueError: If API key with given name not found
    """
    # Find the API key
    result = await db.execute(
        select(APIKey).where(
            APIKey.project_id == project_id,
            APIKey.name == key_name
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise ValueError(f"API key '{key_name}' not found for project")

    # Generate new key
    plain_api_key = generate_api_key()
    api_key.key_hash = hash_api_key(plain_api_key)
    api_key.key_prefix = plain_api_key[:16]

    await db.flush()
    await db.refresh(api_key)

    return plain_api_key, api_key


async def create_default_services(project_id: UUID, db: AsyncSession) -> list[Service]:
    """Create default services for a new project.

    This can be called when a project is created to set up common services.

    Args:
        project_id: Project UUID
        db: Database session

    Returns:
        List of created Service models
    """
    from app.models.service import ServiceType

    default_services = [
        {
            "name": "backend",
            "service_type": ServiceType.BACKEND_API,
            "description": "Main backend API service",
            "config": {},
        },
        {
            "name": "database",
            "service_type": ServiceType.POSTGRESQL,
            "description": "PostgreSQL database",
            "config": {},
        },
    ]

    services = []
    for svc_data in default_services:
        service = Service(
            project_id=project_id,
            **svc_data
        )
        db.add(service)
        services.append(service)

    await db.flush()
    for service in services:
        await db.refresh(service)

    return services
