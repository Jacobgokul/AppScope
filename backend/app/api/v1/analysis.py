from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.db import get_db
from app.api.deps import get_current_user, get_project_by_id
from app.models import User, Analysis
from app.schemas.analysis import AnalysisRequest, AnalysisResponse, AnalysisListResponse
from app.services.ai_analysis import perform_ai_analysis

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/{project_id}", response_model=AnalysisResponse)
async def request_analysis(
    project_id: str,
    request: AnalysisRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Request AI-powered root cause analysis for a project.

    This endpoint triggers comprehensive analysis that:
    1. Correlates events across all services by time proximity
    2. Detects known issue patterns (memory leaks, connection exhaustion, etc.)
    3. Uses LLM to analyze correlated events and identify root causes
    4. Provides structured evidence and diagnostic suggestions

    Time range is limited to 7 days maximum to prevent performance issues
    and excessive LLM token usage.
    """
    project = await get_project_by_id(project_id, current_user, db)

    # Default time range
    end_time = request.time_range_end or datetime.now(timezone.utc)
    start_time = request.time_range_start or (end_time - timedelta(hours=1))

    # Validate time range (max 7 days)
    max_time_range = timedelta(days=7)
    time_range_duration = end_time - start_time

    if time_range_duration > max_time_range:
        raise HTTPException(
            status_code=400,
            detail=f"Time range cannot exceed 7 days. Requested: {time_range_duration.days} days"
        )

    if time_range_duration.total_seconds() < 0:
        raise HTTPException(
            status_code=400,
            detail="time_range_end must be after time_range_start"
        )

    # Perform AI analysis using the service layer
    try:
        analysis = await perform_ai_analysis(
            db=db,
            project_id=str(project.id),
            start_time=start_time,
            end_time=end_time,
            focus_component=request.focus_component,
            trigger="manual"
        )

        return analysis
    except ValueError as e:
        # LLM configuration errors
        raise HTTPException(
            status_code=503,
            detail=f"AI analysis unavailable: {str(e)}"
        )
    except Exception as e:
        # Log error and return meaningful response
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get("/{project_id}/history", response_model=AnalysisListResponse)
async def get_analysis_history(
    project_id: str,
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get analysis history for a project."""
    project = await get_project_by_id(project_id, current_user, db)

    result = await db.execute(
        select(Analysis)
        .where(Analysis.project_id == project.id)
        .order_by(Analysis.created_at.desc())
        .limit(limit)
    )
    analyses = result.scalars().all()

    return AnalysisListResponse(
        analyses=[AnalysisResponse.model_validate(a) for a in analyses],
        total=len(analyses),
    )


@router.get("/{project_id}/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    project_id: str,
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific analysis."""
    project = await get_project_by_id(project_id, current_user, db)

    try:
        analysis_uuid = UUID(analysis_id)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid analysis ID")

    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_uuid,
            Analysis.project_id == project.id,
        )
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Analysis not found")

    return analysis
