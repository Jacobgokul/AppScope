from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.db import get_db
from app.api.deps import get_current_user, get_project_by_id
from app.models import User, Project, Metric, LogEvent
from app.schemas.metrics import MetricResponse

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/{project_id}")
async def get_metrics(
    project_id: str,
    metric_type: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    limit: int = Query(default=1000, le=5000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get metrics for a project."""
    project = await get_project_by_id(project_id, current_user, db)

    # Default time range: last 1 hour
    if not end_time:
        end_time = datetime.now(timezone.utc)
    if not start_time:
        start_time = end_time - timedelta(hours=1)

    query = select(Metric).where(
        Metric.project_id == project.id,
        Metric.timestamp >= start_time,
        Metric.timestamp <= end_time,
    )

    if metric_type:
        query = query.where(Metric.metric_type == metric_type)

    query = query.order_by(Metric.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    metrics = result.scalars().all()

    return {"metrics": [MetricResponse.model_validate(m) for m in metrics], "total": len(metrics)}


@router.get("/{project_id}/latest")
async def get_latest_metrics(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get latest value for each metric type."""
    project = await get_project_by_id(project_id, current_user, db)

    # Subquery to get max timestamp per metric type
    subquery = (
        select(
            Metric.metric_type,
            Metric.metric_name,
            func.max(Metric.timestamp).label("max_ts"),
        )
        .where(Metric.project_id == project.id)
        .group_by(Metric.metric_type, Metric.metric_name)
        .subquery()
    )

    query = select(Metric).join(
        subquery,
        (Metric.metric_type == subquery.c.metric_type)
        & (Metric.metric_name == subquery.c.metric_name)
        & (Metric.timestamp == subquery.c.max_ts),
    ).where(Metric.project_id == project.id)

    result = await db.execute(query)
    metrics = result.scalars().all()

    return {"metrics": [MetricResponse.model_validate(m) for m in metrics]}


@router.get("/{project_id}/aggregated")
async def get_aggregated_metrics(
    project_id: str,
    metric_type: str,
    interval: str = Query(default="5m", pattern="^[0-9]+[mhd]$"),  # 5m, 1h, 1d
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated metrics (for charts)."""
    project = await get_project_by_id(project_id, current_user, db)

    # Default time range
    if not end_time:
        end_time = datetime.now(timezone.utc)
    if not start_time:
        start_time = end_time - timedelta(hours=1)

    # Parse interval
    interval_value = int(interval[:-1])
    interval_unit = interval[-1]

    if interval_unit == "m":
        bucket_seconds = interval_value * 60
    elif interval_unit == "h":
        bucket_seconds = interval_value * 3600
    else:  # d
        bucket_seconds = interval_value * 86400

    # For TimescaleDB, we'd use time_bucket. For regular Postgres, we approximate
    query = select(
        Metric.metric_type,
        Metric.metric_name,
        func.avg(Metric.value).label("avg_value"),
        func.min(Metric.value).label("min_value"),
        func.max(Metric.value).label("max_value"),
        func.count(Metric.value).label("count"),
    ).where(
        Metric.project_id == project.id,
        Metric.metric_type == metric_type,
        Metric.timestamp >= start_time,
        Metric.timestamp <= end_time,
    ).group_by(
        Metric.metric_type,
        Metric.metric_name,
    )

    result = await db.execute(query)
    rows = result.all()

    return {
        "aggregations": [
            {
                "metric_type": row.metric_type,
                "metric_name": row.metric_name,
                "avg_value": float(row.avg_value) if row.avg_value else 0,
                "min_value": float(row.min_value) if row.min_value else 0,
                "max_value": float(row.max_value) if row.max_value else 0,
                "count": row.count,
            }
            for row in rows
        ]
    }


@router.get("/{project_id}/stats")
async def get_project_stats(
    project_id: str,
    service: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated statistics for a project.

    Returns uptime, error rate, average latency, and other key metrics.
    """
    project = await get_project_by_id(project_id, current_user, db)

    # Default time range: last 24 hours
    if not end_time:
        end_time = datetime.now(timezone.utc)
    if not start_time:
        start_time = end_time - timedelta(hours=24)

    # Build base queries with optional service filter
    metrics_query = select(Metric).where(
        Metric.project_id == project.id,
        Metric.timestamp >= start_time,
        Metric.timestamp <= end_time,
    )
    logs_query = select(LogEvent).where(
        LogEvent.project_id == project.id,
        LogEvent.timestamp >= start_time,
        LogEvent.timestamp <= end_time,
    )

    if service:
        metrics_query = metrics_query.where(Metric.source == service)
        logs_query = logs_query.where(LogEvent.service_name == service)

    # Calculate error rate
    total_logs_result = await db.execute(
        select(func.count(LogEvent.id)).select_from(logs_query.subquery())
    )
    total_logs = total_logs_result.scalar() or 0

    error_logs_result = await db.execute(
        select(func.count(LogEvent.id)).where(
            LogEvent.project_id == project.id,
            LogEvent.timestamp >= start_time,
            LogEvent.timestamp <= end_time,
            LogEvent.level.in_(["error", "ERROR", "critical", "CRITICAL", "fatal", "FATAL"]),
            LogEvent.service_name == service if service else True,
        )
    )
    error_count = error_logs_result.scalar() or 0
    error_rate = (error_count / total_logs * 100) if total_logs > 0 else 0.0

    # Calculate average response time from HTTP logs
    avg_response_result = await db.execute(
        select(func.avg(LogEvent.response_time_ms)).where(
            LogEvent.project_id == project.id,
            LogEvent.timestamp >= start_time,
            LogEvent.timestamp <= end_time,
            LogEvent.response_time_ms.isnot(None),
            LogEvent.service_name == service if service else True,
        )
    )
    avg_response_time = avg_response_result.scalar()

    # Calculate average CPU and memory
    cpu_avg_result = await db.execute(
        select(func.avg(Metric.value)).where(
            Metric.project_id == project.id,
            Metric.timestamp >= start_time,
            Metric.timestamp <= end_time,
            Metric.metric_type == "cpu",
            Metric.source == service if service else True,
        )
    )
    cpu_avg = cpu_avg_result.scalar()

    memory_avg_result = await db.execute(
        select(func.avg(Metric.value)).where(
            Metric.project_id == project.id,
            Metric.timestamp >= start_time,
            Metric.timestamp <= end_time,
            Metric.metric_type == "memory",
            Metric.source == service if service else True,
        )
    )
    memory_avg = memory_avg_result.scalar()

    # Get data points count for uptime calculation
    metric_count_result = await db.execute(
        select(func.count(Metric.id)).select_from(metrics_query.subquery())
    )
    metric_count = metric_count_result.scalar() or 0

    # Estimate uptime based on data points received
    # If we expect data every 30 seconds, calculate expected vs actual
    time_range_seconds = (end_time - start_time).total_seconds()
    expected_data_points = time_range_seconds / 30  # Assuming 30s collection interval
    uptime_percentage = min(100.0, (metric_count / expected_data_points * 100)) if expected_data_points > 0 else 0.0

    return {
        "time_range": {
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
        },
        "service": service,
        "stats": {
            "uptime_percentage": round(uptime_percentage, 2),
            "error_rate": round(error_rate, 2),
            "total_errors": error_count,
            "total_logs": total_logs,
            "avg_response_time_ms": round(avg_response_time, 2) if avg_response_time else None,
            "avg_cpu_usage": round(cpu_avg, 2) if cpu_avg else None,
            "avg_memory_usage": round(memory_avg, 2) if memory_avg else None,
            "data_points_received": metric_count,
        }
    }
