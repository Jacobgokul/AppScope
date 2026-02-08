from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.db import get_db
from app.api.deps import get_current_user, get_project_by_id
from app.models import User, Project, LogEvent
from app.schemas.logs import LogEventResponse

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/{project_id}")
async def get_logs(
    project_id: str,
    level: str | None = None,
    source: str | None = None,
    service: str | None = None,
    search: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    limit: int = Query(default=1000, le=5000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get log events for a project."""
    project = await get_project_by_id(project_id, current_user, db)

    # Default time range: last 1 hour
    if not end_time:
        end_time = datetime.now(timezone.utc)
    if not start_time:
        start_time = end_time - timedelta(hours=1)

    query = select(LogEvent).where(
        LogEvent.project_id == project.id,
        LogEvent.timestamp >= start_time,
        LogEvent.timestamp <= end_time,
    )

    if level:
        # Support case-insensitive level filtering
        query = query.where(func.lower(LogEvent.level) == level.lower())

    if source:
        query = query.where(LogEvent.source == source)

    if service:
        query = query.where(LogEvent.service_name == service)

    if search:
        # Search in message field (case-insensitive)
        query = query.where(func.lower(LogEvent.message).contains(search.lower()))

    query = query.order_by(LogEvent.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {"logs": [LogEventResponse.model_validate(log) for log in logs], "total": len(logs)}


@router.get("/{project_id}/latest")
async def get_latest_logs(
    project_id: str,
    limit: int = Query(default=100, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get latest log events."""
    project = await get_project_by_id(project_id, current_user, db)

    query = (
        select(LogEvent)
        .where(LogEvent.project_id == project.id)
        .order_by(LogEvent.timestamp.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    logs = result.scalars().all()

    return {"logs": [LogEventResponse.model_validate(log) for log in logs], "total": len(logs)}


@router.get("/{project_id}/errors")
async def get_error_logs(
    project_id: str,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    limit: int = Query(default=500, le=5000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get error and critical level logs."""
    project = await get_project_by_id(project_id, current_user, db)

    # Default time range: last 24 hours for errors
    if not end_time:
        end_time = datetime.now(timezone.utc)
    if not start_time:
        start_time = end_time - timedelta(hours=24)

    query = (
        select(LogEvent)
        .where(
            LogEvent.project_id == project.id,
            LogEvent.timestamp >= start_time,
            LogEvent.timestamp <= end_time,
            or_(
                func.lower(LogEvent.level) == "error",
                func.lower(LogEvent.level) == "critical",
                func.lower(LogEvent.level) == "fatal",
            ),
        )
        .order_by(LogEvent.timestamp.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    logs = result.scalars().all()

    return {"logs": [LogEventResponse.model_validate(log) for log in logs], "total": len(logs)}


@router.get("/{project_id}/sources")
async def get_log_sources(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get list of distinct log sources for a project."""
    project = await get_project_by_id(project_id, current_user, db)

    query = (
        select(LogEvent.source)
        .where(LogEvent.project_id == project.id, LogEvent.source.isnot(None))
        .distinct()
    )

    result = await db.execute(query)
    sources = [row[0] for row in result.all()]

    return {"sources": sources, "total": len(sources)}
