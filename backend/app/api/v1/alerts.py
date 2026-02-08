"""
Alert management API endpoints.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from datetime import datetime, timedelta, timezone
from uuid import UUID
from typing import Optional

from app.db import get_db
from app.api.deps import get_current_user, get_project_by_id
from app.models import User, AlertRule, Alert
from app.schemas.alert import (
    AlertRuleCreate,
    AlertRuleUpdate,
    AlertRuleResponse,
    AlertRuleListResponse,
    AlertResponse,
    AlertListResponse,
    AlertAcknowledge,
    AlertStatsResponse
)
from app.services.alerts import AlertManager

router = APIRouter(prefix="/alerts", tags=["alerts"])


# Alert Rules Endpoints
@router.post("/{project_id}/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    project_id: str,
    rule_data: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new alert rule for a project.

    Supported condition types:
    - **threshold**: Alert when metric crosses a threshold for specified duration
    - **anomaly**: Alert on statistical anomalies (mean ± std deviation)
    - **absence**: Alert when expected metric is missing

    Notification channels:
    - **email**: Send email to specified recipients
    - **webhook**: POST to webhook URL with alert data
    """
    project = await get_project_by_id(project_id, current_user, db)

    # Validate service_id if provided
    if rule_data.service_id:
        from app.models import Service
        service_result = await db.execute(
            select(Service).where(
                and_(
                    Service.id == rule_data.service_id,
                    Service.project_id == project.id
                )
            )
        )
        service = service_result.scalar_one_or_none()
        if not service:
            raise HTTPException(
                status_code=404,
                detail="Service not found"
            )

    # Create alert rule
    alert_rule = AlertRule(
        project_id=project.id,
        name=rule_data.name,
        description=rule_data.description,
        condition_type=rule_data.condition_type,
        metric_type=rule_data.metric_type,
        operator=rule_data.operator,
        threshold=rule_data.threshold,
        duration_seconds=rule_data.duration_seconds,
        anomaly_sensitivity=rule_data.anomaly_sensitivity,
        severity=rule_data.severity,
        is_active=rule_data.is_active,
        notification_channels=rule_data.notification_channels,
        email_recipients=rule_data.email_recipients,
        webhook_url=rule_data.webhook_url,
        cooldown_seconds=rule_data.cooldown_seconds,
        service_id=rule_data.service_id
    )

    db.add(alert_rule)
    await db.flush()
    await db.refresh(alert_rule)

    return alert_rule


@router.get("/{project_id}/rules", response_model=AlertRuleListResponse)
async def list_alert_rules(
    project_id: str,
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all alert rules for a project."""
    project = await get_project_by_id(project_id, current_user, db)

    query = select(AlertRule).where(AlertRule.project_id == project.id)

    if is_active is not None:
        query = query.where(AlertRule.is_active == is_active)

    query = query.order_by(desc(AlertRule.created_at))

    result = await db.execute(query)
    rules = list(result.scalars().all())

    return AlertRuleListResponse(
        rules=[AlertRuleResponse.model_validate(r) for r in rules],
        total=len(rules)
    )


@router.get("/{project_id}/rules/{rule_id}", response_model=AlertRuleResponse)
async def get_alert_rule(
    project_id: str,
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific alert rule."""
    project = await get_project_by_id(project_id, current_user, db)

    try:
        rule_uuid = UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid rule ID")

    result = await db.execute(
        select(AlertRule).where(
            and_(
                AlertRule.id == rule_uuid,
                AlertRule.project_id == project.id
            )
        )
    )
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    return rule


@router.put("/{project_id}/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_alert_rule(
    project_id: str,
    rule_id: str,
    rule_update: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an alert rule."""
    project = await get_project_by_id(project_id, current_user, db)

    try:
        rule_uuid = UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid rule ID")

    result = await db.execute(
        select(AlertRule).where(
            and_(
                AlertRule.id == rule_uuid,
                AlertRule.project_id == project.id
            )
        )
    )
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    # Update fields
    update_data = rule_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    rule.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(rule)

    return rule


@router.delete("/{project_id}/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(
    project_id: str,
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an alert rule."""
    project = await get_project_by_id(project_id, current_user, db)

    try:
        rule_uuid = UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid rule ID")

    result = await db.execute(
        select(AlertRule).where(
            and_(
                AlertRule.id == rule_uuid,
                AlertRule.project_id == project.id
            )
        )
    )
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    await db.delete(rule)
    return None


# Alert Instance Endpoints
@router.get("/{project_id}", response_model=AlertListResponse)
async def list_alerts(
    project_id: str,
    status: Optional[str] = Query(None, description="Filter by status: active, acknowledged, resolved"),
    severity: Optional[str] = Query(None, description="Filter by severity: info, warning, critical"),
    limit: int = Query(50, le=200, description="Maximum number of alerts to return"),
    offset: int = Query(0, ge=0, description="Number of alerts to skip"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List alerts for a project.

    Returns active, acknowledged, and resolved alerts with filtering options.
    """
    project = await get_project_by_id(project_id, current_user, db)

    query = select(Alert).where(Alert.project_id == project.id)

    if status:
        query = query.where(Alert.status == status)

    if severity:
        query = query.where(Alert.severity == severity)

    # Get counts
    count_query = select(func.count()).select_from(Alert).where(Alert.project_id == project.id)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    active_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.project_id == project.id, Alert.status == 'active')
        )
    )
    active_count = active_result.scalar_one()

    acknowledged_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.project_id == project.id, Alert.status == 'acknowledged')
        )
    )
    acknowledged_count = acknowledged_result.scalar_one()

    resolved_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.project_id == project.id, Alert.status == 'resolved')
        )
    )
    resolved_count = resolved_result.scalar_one()

    # Get paginated alerts
    query = query.order_by(desc(Alert.triggered_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    alerts = list(result.scalars().all())

    return AlertListResponse(
        alerts=[AlertResponse.model_validate(a) for a in alerts],
        total=total,
        active_count=active_count,
        acknowledged_count=acknowledged_count,
        resolved_count=resolved_count
    )


@router.get("/{project_id}/{alert_id}", response_model=AlertResponse)
async def get_alert(
    project_id: str,
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific alert."""
    project = await get_project_by_id(project_id, current_user, db)

    try:
        alert_uuid = UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid alert ID")

    result = await db.execute(
        select(Alert).where(
            and_(
                Alert.id == alert_uuid,
                Alert.project_id == project.id
            )
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return alert


@router.post("/{project_id}/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    project_id: str,
    alert_id: str,
    ack_data: AlertAcknowledge,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Acknowledge an alert.

    Acknowledging an alert indicates that someone is aware of the issue
    and is taking action. The alert remains in the system for tracking.
    """
    project = await get_project_by_id(project_id, current_user, db)

    try:
        alert_uuid = UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid alert ID")

    result = await db.execute(
        select(Alert).where(
            and_(
                Alert.id == alert_uuid,
                Alert.project_id == project.id
            )
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.status == 'resolved':
        raise HTTPException(status_code=400, detail="Cannot acknowledge resolved alert")

    # Acknowledge the alert
    alert = await AlertManager.acknowledge_alert(
        db=db,
        alert=alert,
        user_id=str(current_user.id),
        note=ack_data.note
    )

    return alert


@router.post("/{project_id}/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    project_id: str,
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually resolve an alert.

    Mark an alert as resolved when the underlying issue has been fixed.
    """
    project = await get_project_by_id(project_id, current_user, db)

    try:
        alert_uuid = UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid alert ID")

    result = await db.execute(
        select(Alert).where(
            and_(
                Alert.id == alert_uuid,
                Alert.project_id == project.id
            )
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.status == 'resolved':
        raise HTTPException(status_code=400, detail="Alert already resolved")

    # Resolve the alert
    alert = await AlertManager.resolve_alert(db=db, alert=alert)

    return alert


@router.get("/{project_id}/stats", response_model=AlertStatsResponse)
async def get_alert_stats(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get alert statistics for a project.

    Provides overview metrics for dashboards and monitoring.
    """
    project = await get_project_by_id(project_id, current_user, db)

    # Total alerts
    total_result = await db.execute(
        select(func.count()).select_from(Alert).where(Alert.project_id == project.id)
    )
    total_alerts = total_result.scalar_one()

    # Active alerts
    active_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.project_id == project.id, Alert.status == 'active')
        )
    )
    active_alerts = active_result.scalar_one()

    # Critical alerts
    critical_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.project_id == project.id, Alert.severity == 'critical', Alert.status == 'active')
        )
    )
    critical_alerts = critical_result.scalar_one()

    # Warning alerts
    warning_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.project_id == project.id, Alert.severity == 'warning', Alert.status == 'active')
        )
    )
    warning_alerts = warning_result.scalar_one()

    # Info alerts
    info_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.project_id == project.id, Alert.severity == 'info', Alert.status == 'active')
        )
    )
    info_alerts = info_result.scalar_one()

    # Alerts last 24h
    last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    alerts_24h_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.project_id == project.id, Alert.triggered_at >= last_24h)
        )
    )
    alerts_last_24h = alerts_24h_result.scalar_one()

    # Alerts last 7d
    last_7d = datetime.now(timezone.utc) - timedelta(days=7)
    alerts_7d_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.project_id == project.id, Alert.triggered_at >= last_7d)
        )
    )
    alerts_last_7d = alerts_7d_result.scalar_one()

    # Most triggered rule
    most_triggered_result = await db.execute(
        select(
            AlertRule.id,
            AlertRule.name,
            func.count(Alert.id).label('count')
        )
        .join(Alert, Alert.rule_id == AlertRule.id)
        .where(Alert.project_id == project.id)
        .group_by(AlertRule.id, AlertRule.name)
        .order_by(desc('count'))
        .limit(1)
    )
    most_triggered = most_triggered_result.first()

    most_triggered_rule = None
    if most_triggered:
        most_triggered_rule = {
            'rule_id': str(most_triggered[0]),
            'rule_name': most_triggered[1],
            'trigger_count': most_triggered[2]
        }

    # Calculate trend
    last_7d_to_14d = datetime.now(timezone.utc) - timedelta(days=14)
    alerts_7d_to_14d_result = await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(
                Alert.project_id == project.id,
                Alert.triggered_at >= last_7d_to_14d,
                Alert.triggered_at < last_7d
            )
        )
    )
    alerts_7d_to_14d = alerts_7d_to_14d_result.scalar_one()

    if alerts_7d_to_14d == 0:
        trend = 'stable'
    elif alerts_last_7d > alerts_7d_to_14d * 1.2:
        trend = 'increasing'
    elif alerts_last_7d < alerts_7d_to_14d * 0.8:
        trend = 'decreasing'
    else:
        trend = 'stable'

    return AlertStatsResponse(
        total_alerts=total_alerts,
        active_alerts=active_alerts,
        critical_alerts=critical_alerts,
        warning_alerts=warning_alerts,
        info_alerts=info_alerts,
        alerts_last_24h=alerts_last_24h,
        alerts_last_7d=alerts_last_7d,
        most_triggered_rule=most_triggered_rule,
        alert_rate_trend=trend
    )
