from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.db import get_db
from app.api.deps import get_project_from_api_key
from app.models import Project, Metric, LogEvent, Service, ServiceType
from app.schemas.metrics import MetricBatch, MetricCreate
from app.schemas.logs import LogEventBatch, LogEventCreate

router = APIRouter(prefix="/ingest", tags=["ingest"])


async def get_or_create_service(
    db: AsyncSession,
    project: Project,
    service_name: str | None
) -> Service:
    """Get existing service or create a new one if it doesn't exist.

    Args:
        db: Database session
        project: Project instance
        service_name: Name of the service (defaults to "default" if None)

    Returns:
        Service instance
    """
    # Use "default" if no service name provided
    service_name = service_name or "default"

    # Try to find existing service
    result = await db.execute(
        select(Service).where(
            Service.project_id == project.id,
            Service.name == service_name
        )
    )
    service = result.scalar_one_or_none()

    # Create service if it doesn't exist
    if not service:
        service = Service(
            name=service_name,
            service_type=ServiceType.CUSTOM,  # Default type for auto-created services
            description=f"Auto-created service from agent: {service_name}",
            project_id=project.id,
            is_active=True,
        )
        db.add(service)
        await db.flush()
        await db.refresh(service)

    return service


@router.post("/metrics", status_code=status.HTTP_201_CREATED)
async def ingest_metrics(
    batch: MetricBatch,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(get_project_from_api_key),
):
    """Ingest batch of metrics from agent."""
    # Get or create service for this batch
    service_name = batch.service_name
    service = await get_or_create_service(db, project, service_name)

    metrics = []
    for metric_data in batch.metrics:
        # Individual metric can override batch service_name
        metric_service_name = metric_data.service_name or service_name
        if metric_service_name != service_name:
            metric_service = await get_or_create_service(db, project, metric_service_name)
        else:
            metric_service = service

        metric = Metric(
            timestamp=metric_data.timestamp or datetime.now(timezone.utc),
            metric_type=metric_data.metric_type,
            metric_name=metric_data.metric_name,
            source=metric_data.source,
            value=metric_data.value,
            unit=metric_data.unit,
            tags=metric_data.tags,
            project_id=project.id,
            service_id=metric_service.id,
        )
        metrics.append(metric)

    db.add_all(metrics)

    # Update service heartbeat timestamp
    service.last_heartbeat = datetime.now(timezone.utc)

    # Keep project-level heartbeat for backwards compatibility
    project.last_agent_heartbeat = datetime.now(timezone.utc)

    return {
        "received": len(metrics),
        "project_id": str(project.id),
        "service_id": str(service.id),
        "service_name": service.name,
    }


@router.post("/logs", status_code=status.HTTP_201_CREATED)
async def ingest_logs(
    batch: LogEventBatch,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(get_project_from_api_key),
):
    """Ingest batch of log events from agent."""
    # Get or create service for this batch
    service_name = batch.service_name
    service = await get_or_create_service(db, project, service_name)

    log_events = []
    for log_data in batch.logs:
        # Individual log can override batch service_name
        log_service_name = log_data.service_name or service_name
        if log_service_name != service_name:
            log_service = await get_or_create_service(db, project, log_service_name)
        else:
            log_service = service

        log_event = LogEvent(
            timestamp=log_data.timestamp or datetime.now(timezone.utc),
            level=log_data.level,
            source=log_data.source,
            service_name=log_data.service,  # Keep this for backwards compatibility (string field)
            message=log_data.message,
            stack_trace=log_data.stack_trace,
            http_method=log_data.http_method,
            http_path=log_data.http_path,
            http_status=log_data.http_status,
            response_time_ms=log_data.response_time_ms,
            extra_metadata=log_data.metadata,  # Schema uses 'metadata', model uses 'extra_metadata'
            project_id=project.id,
            service_id=log_service.id,
        )
        log_events.append(log_event)

    db.add_all(log_events)

    # Update service heartbeat timestamp
    service.last_heartbeat = datetime.now(timezone.utc)

    # Keep project-level heartbeat for backwards compatibility
    project.last_agent_heartbeat = datetime.now(timezone.utc)

    return {
        "received": len(log_events),
        "project_id": str(project.id),
        "service_id": str(service.id),
        "service_name": service.name,
    }


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def ingest_batch(
    metrics: MetricBatch | None = None,
    logs: LogEventBatch | None = None,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(get_project_from_api_key),
):
    """Ingest both metrics and logs in a single request."""
    metrics_count = 0
    logs_count = 0
    service_ids = set()

    if metrics and metrics.metrics:
        # Get or create service for metrics batch
        service_name = metrics.service_name
        service = await get_or_create_service(db, project, service_name)
        service_ids.add(service.id)

        metric_objects = []
        for metric_data in metrics.metrics:
            # Individual metric can override batch service_name
            metric_service_name = metric_data.service_name or service_name
            if metric_service_name != service_name:
                metric_service = await get_or_create_service(db, project, metric_service_name)
                service_ids.add(metric_service.id)
            else:
                metric_service = service

            metric = Metric(
                timestamp=metric_data.timestamp or datetime.now(timezone.utc),
                metric_type=metric_data.metric_type,
                metric_name=metric_data.metric_name,
                source=metric_data.source,
                value=metric_data.value,
                unit=metric_data.unit,
                tags=metric_data.tags,
                project_id=project.id,
                service_id=metric_service.id,
            )
            metric_objects.append(metric)
        db.add_all(metric_objects)
        metrics_count = len(metric_objects)

        # Update service heartbeat
        service.last_heartbeat = datetime.now(timezone.utc)

    if logs and logs.logs:
        # Get or create service for logs batch
        service_name = logs.service_name
        service = await get_or_create_service(db, project, service_name)
        service_ids.add(service.id)

        log_objects = []
        for log_data in logs.logs:
            # Individual log can override batch service_name
            log_service_name = log_data.service_name or service_name
            if log_service_name != service_name:
                log_service = await get_or_create_service(db, project, log_service_name)
                service_ids.add(log_service.id)
            else:
                log_service = service

            log_event = LogEvent(
                timestamp=log_data.timestamp or datetime.now(timezone.utc),
                level=log_data.level,
                source=log_data.source,
                service_name=log_data.service,  # Keep for backwards compatibility
                message=log_data.message,
                stack_trace=log_data.stack_trace,
                http_method=log_data.http_method,
                http_path=log_data.http_path,
                http_status=log_data.http_status,
                response_time_ms=log_data.response_time_ms,
                extra_metadata=log_data.metadata,  # Schema uses 'metadata', model uses 'extra_metadata'
                project_id=project.id,
                service_id=log_service.id,
            )
            log_objects.append(log_event)
        db.add_all(log_objects)
        logs_count = len(log_objects)

        # Update service heartbeat
        service.last_heartbeat = datetime.now(timezone.utc)

    # Keep project-level heartbeat for backwards compatibility
    project.last_agent_heartbeat = datetime.now(timezone.utc)

    return {
        "metrics_received": metrics_count,
        "logs_received": logs_count,
        "project_id": str(project.id),
        "services_updated": list(str(sid) for sid in service_ids),
    }
