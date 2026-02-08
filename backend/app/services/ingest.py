"""
Data ingestion service - process incoming metrics and logs from agents.

This module handles batch ingestion of metrics and log events from monitoring agents,
validates data, and stores it in TimescaleDB hypertables.
"""
from typing import List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.models.metrics import Metric
from app.models.logs import LogEvent
from app.models.project import Project
from app.schemas.metrics import MetricCreate
from app.schemas.logs import LogEventCreate


async def ingest_metrics(
    db: AsyncSession,
    project: Project,
    metrics: List[MetricCreate]
) -> int:
    """
    Ingest a batch of metrics from an agent.

    Args:
        db: Database session
        project: Project the metrics belong to
        metrics: List of metric data to ingest

    Returns:
        Number of metrics successfully ingested
    """
    if not metrics:
        return 0

    # Convert schema objects to model objects
    metric_objects = []
    for metric_data in metrics:
        metric = Metric(
            timestamp=metric_data.timestamp or datetime.now(timezone.utc),
            project_id=project.id,
            metric_type=metric_data.metric_type,
            metric_name=metric_data.metric_name,
            source=metric_data.source,
            value=metric_data.value,
            unit=metric_data.unit,
            tags=metric_data.tags,
        )
        metric_objects.append(metric)

    # Bulk insert for performance
    db.add_all(metric_objects)
    await db.flush()

    return len(metric_objects)


async def ingest_logs(
    db: AsyncSession,
    project: Project,
    logs: List[LogEventCreate]
) -> int:
    """
    Ingest a batch of log events from an agent.

    Args:
        db: Database session
        project: Project the logs belong to
        logs: List of log event data to ingest

    Returns:
        Number of log events successfully ingested
    """
    if not logs:
        return 0

    # Convert schema objects to model objects
    log_objects = []
    for log_data in logs:
        log_event = LogEvent(
            timestamp=log_data.timestamp or datetime.now(timezone.utc),
            project_id=project.id,
            level=log_data.level,
            source=log_data.source,
            service=log_data.service,
            message=log_data.message,
            stack_trace=log_data.stack_trace,
            http_method=log_data.http_method,
            http_path=log_data.http_path,
            http_status=log_data.http_status,
            response_time_ms=log_data.response_time_ms,
            extra_metadata=log_data.extra_metadata,
        )
        log_objects.append(log_event)

    # Bulk insert for performance
    db.add_all(log_objects)
    await db.flush()

    return len(log_objects)


async def get_recent_metrics(
    db: AsyncSession,
    project_id: UUID,
    metric_type: str = None,
    limit: int = 100,
) -> List[Metric]:
    """
    Get recent metrics for a project.

    Args:
        db: Database session
        project_id: Project UUID
        metric_type: Optional filter by metric type
        limit: Maximum number of metrics to return

    Returns:
        List of recent metrics
    """
    from sqlalchemy import select, desc

    query = select(Metric).where(Metric.project_id == project_id)

    if metric_type:
        query = query.where(Metric.metric_type == metric_type)

    query = query.order_by(desc(Metric.timestamp)).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def get_recent_logs(
    db: AsyncSession,
    project_id: UUID,
    level: str = None,
    limit: int = 100,
) -> List[LogEvent]:
    """
    Get recent log events for a project.

    Args:
        db: Database session
        project_id: Project UUID
        level: Optional filter by log level (error, warn, info, debug)
        limit: Maximum number of log events to return

    Returns:
        List of recent log events
    """
    from sqlalchemy import select, desc

    query = select(LogEvent).where(LogEvent.project_id == project_id)

    if level:
        query = query.where(LogEvent.level == level)

    query = query.order_by(desc(LogEvent.timestamp)).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def get_metrics_in_timerange(
    db: AsyncSession,
    project_id: UUID,
    start_time: datetime,
    end_time: datetime,
    metric_type: str = None,
) -> List[Metric]:
    """
    Get metrics within a specific time range.

    Args:
        db: Database session
        project_id: Project UUID
        start_time: Start of time range
        end_time: End of time range
        metric_type: Optional filter by metric type

    Returns:
        List of metrics in the time range
    """
    from sqlalchemy import select, and_

    query = select(Metric).where(
        and_(
            Metric.project_id == project_id,
            Metric.timestamp >= start_time,
            Metric.timestamp <= end_time,
        )
    )

    if metric_type:
        query = query.where(Metric.metric_type == metric_type)

    query = query.order_by(Metric.timestamp)

    result = await db.execute(query)
    return result.scalars().all()


async def get_logs_in_timerange(
    db: AsyncSession,
    project_id: UUID,
    start_time: datetime,
    end_time: datetime,
    level: str = None,
) -> List[LogEvent]:
    """
    Get log events within a specific time range.

    Args:
        db: Database session
        project_id: Project UUID
        start_time: Start of time range
        end_time: End of time range
        level: Optional filter by log level

    Returns:
        List of log events in the time range
    """
    from sqlalchemy import select, and_

    query = select(LogEvent).where(
        and_(
            LogEvent.project_id == project_id,
            LogEvent.timestamp >= start_time,
            LogEvent.timestamp <= end_time,
        )
    )

    if level:
        query = query.where(LogEvent.level == level)

    query = query.order_by(LogEvent.timestamp)

    result = await db.execute(query)
    return result.scalars().all()
