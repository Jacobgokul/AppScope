"""
Alert evaluation and triggering service.

This module evaluates alert rules against incoming metrics and logs,
triggers alerts when conditions are met, and manages alert lifecycle.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from collections import defaultdict
import statistics

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc

from app.models import AlertRule, Alert, Metric, LogEvent
from app.services.notifications import NotificationService


class AlertEvaluator:
    """
    Alert rule evaluation engine.

    Evaluates alert rules against real-time metrics and logs, triggers alerts
    when conditions are met, and handles cooldown periods.
    """

    def __init__(self, notification_service: NotificationService):
        """
        Initialize alert evaluator.

        Args:
            notification_service: Service for sending notifications
        """
        self.notification_service = notification_service

    async def evaluate_rules_for_project(
        self,
        db: AsyncSession,
        project_id: str,
        recent_metrics: Optional[List[Metric]] = None,
        recent_logs: Optional[List[LogEvent]] = None
    ) -> List[Alert]:
        """
        Evaluate all active alert rules for a project.

        Args:
            db: Database session
            project_id: Project UUID
            recent_metrics: Optional pre-fetched recent metrics
            recent_logs: Optional pre-fetched recent logs

        Returns:
            List of newly triggered alerts
        """
        # Fetch active alert rules
        result = await db.execute(
            select(AlertRule).where(
                and_(
                    AlertRule.project_id == project_id,
                    AlertRule.is_active == True
                )
            )
        )
        rules = list(result.scalars().all())

        if not rules:
            return []

        # Fetch recent data if not provided
        if recent_metrics is None:
            recent_metrics = await self._fetch_recent_metrics(db, project_id, minutes=10)

        if recent_logs is None:
            recent_logs = await self._fetch_recent_logs(db, project_id, minutes=10)

        # Evaluate each rule
        triggered_alerts = []
        for rule in rules:
            alert = await self._evaluate_rule(db, rule, recent_metrics, recent_logs)
            if alert:
                triggered_alerts.append(alert)

        return triggered_alerts

    async def _evaluate_rule(
        self,
        db: AsyncSession,
        rule: AlertRule,
        metrics: List[Metric],
        logs: List[LogEvent]
    ) -> Optional[Alert]:
        """
        Evaluate a single alert rule.

        Args:
            db: Database session
            rule: Alert rule to evaluate
            metrics: Recent metrics
            logs: Recent logs

        Returns:
            Alert if triggered, None otherwise
        """
        # Check cooldown period
        if rule.last_triggered_at:
            cooldown_expires = rule.last_triggered_at + timedelta(seconds=rule.cooldown_seconds)
            if datetime.now(timezone.utc) < cooldown_expires:
                return None

        # Evaluate based on condition type
        if rule.condition_type == 'threshold':
            return await self._evaluate_threshold_rule(db, rule, metrics)
        elif rule.condition_type == 'anomaly':
            return await self._evaluate_anomaly_rule(db, rule, metrics)
        elif rule.condition_type == 'absence':
            return await self._evaluate_absence_rule(db, rule, metrics)

        return None

    async def _evaluate_threshold_rule(
        self,
        db: AsyncSession,
        rule: AlertRule,
        metrics: List[Metric]
    ) -> Optional[Alert]:
        """Evaluate threshold-based alert rule."""
        if not rule.metric_type or rule.threshold is None or not rule.operator:
            return None

        # Filter metrics by type and service
        relevant_metrics = [
            m for m in metrics
            if m.metric_type == rule.metric_type and
            (not rule.service_id or m.tags and m.tags.get('service_id') == str(rule.service_id))
        ]

        if not relevant_metrics:
            return None

        # Check if condition has been met for the required duration
        duration_start = datetime.now(timezone.utc) - timedelta(seconds=rule.duration_seconds)
        sustained_metrics = [
            m for m in relevant_metrics
            if m.timestamp >= duration_start
        ]

        if len(sustained_metrics) < 2:  # Need at least 2 data points
            return None

        # Check if all values meet the threshold
        violation_detected = all(
            self._check_threshold(m.value, rule.operator, rule.threshold)
            for m in sustained_metrics
        )

        if not violation_detected:
            return None

        # Calculate trigger value (average during violation period)
        trigger_value = statistics.mean(m.value for m in sustained_metrics)

        # Create alert
        alert = await self._create_alert(
            db=db,
            rule=rule,
            message=f"{rule.name}: {rule.metric_type} {rule.operator} {rule.threshold} (current: {trigger_value:.2f})",
            trigger_value=trigger_value,
            trigger_metric=rule.metric_type,
            evidence=[
                {
                    "type": "metric",
                    "metric_type": rule.metric_type,
                    "timestamp": m.timestamp.isoformat(),
                    "value": m.value
                }
                for m in sustained_metrics[-5:]  # Last 5 data points
            ]
        )

        # Update rule's last triggered timestamp
        rule.last_triggered_at = datetime.now(timezone.utc)
        await db.flush()

        # Send notifications (non-blocking)
        asyncio.create_task(self._send_alert_notification(alert, rule))

        return alert

    async def _evaluate_anomaly_rule(
        self,
        db: AsyncSession,
        rule: AlertRule,
        metrics: List[Metric]
    ) -> Optional[Alert]:
        """
        Evaluate anomaly-based alert rule.

        Uses simple statistical anomaly detection (mean + std deviation).
        In production, this could use more sophisticated ML models.
        """
        if not rule.metric_type or rule.anomaly_sensitivity is None:
            return None

        # Get historical data for baseline (last 7 days)
        historical_start = datetime.now(timezone.utc) - timedelta(days=7)
        historical_result = await db.execute(
            select(Metric).where(
                and_(
                    Metric.project_id == rule.project_id,
                    Metric.metric_type == rule.metric_type,
                    Metric.timestamp >= historical_start,
                    Metric.timestamp <= datetime.now(timezone.utc) - timedelta(hours=1)  # Exclude recent data
                )
            ).limit(1000)
        )
        historical_metrics = list(historical_result.scalars().all())

        if len(historical_metrics) < 20:  # Need sufficient historical data
            return None

        # Calculate baseline statistics
        historical_values = [m.value for m in historical_metrics]
        mean = statistics.mean(historical_values)
        stdev = statistics.stdev(historical_values)

        # Adjust threshold based on sensitivity
        # Higher sensitivity = lower threshold multiplier
        threshold_multiplier = 3.0 - (rule.anomaly_sensitivity * 2.0)
        upper_bound = mean + (threshold_multiplier * stdev)
        lower_bound = mean - (threshold_multiplier * stdev)

        # Check recent metrics for anomalies
        recent_metrics = [
            m for m in metrics
            if m.metric_type == rule.metric_type and
            m.timestamp >= datetime.now(timezone.utc) - timedelta(seconds=rule.duration_seconds)
        ]

        if not recent_metrics:
            return None

        # Check if recent values are anomalous
        anomalous_metrics = [
            m for m in recent_metrics
            if m.value > upper_bound or m.value < lower_bound
        ]

        if len(anomalous_metrics) < len(recent_metrics) * 0.7:  # 70% of points must be anomalous
            return None

        trigger_value = statistics.mean(m.value for m in anomalous_metrics)

        alert = await self._create_alert(
            db=db,
            rule=rule,
            message=f"{rule.name}: Anomaly detected in {rule.metric_type} (current: {trigger_value:.2f}, baseline: {mean:.2f} ± {stdev:.2f})",
            trigger_value=trigger_value,
            trigger_metric=rule.metric_type,
            evidence=[
                {
                    "type": "anomaly",
                    "metric_type": rule.metric_type,
                    "baseline_mean": mean,
                    "baseline_stdev": stdev,
                    "upper_bound": upper_bound,
                    "lower_bound": lower_bound,
                    "anomalous_values": [m.value for m in anomalous_metrics[-5:]]
                }
            ]
        )

        rule.last_triggered_at = datetime.now(timezone.utc)
        await db.flush()

        asyncio.create_task(self._send_alert_notification(alert, rule))

        return alert

    async def _evaluate_absence_rule(
        self,
        db: AsyncSession,
        rule: AlertRule,
        metrics: List[Metric]
    ) -> Optional[Alert]:
        """
        Evaluate absence-based alert rule.

        Triggers when expected metrics are missing for a period of time.
        """
        if not rule.metric_type:
            return None

        # Check if metric has been absent for the duration
        absence_start = datetime.now(timezone.utc) - timedelta(seconds=rule.duration_seconds)

        recent_metrics = [
            m for m in metrics
            if m.metric_type == rule.metric_type and m.timestamp >= absence_start
        ]

        if recent_metrics:
            # Metric is present, no alert
            return None

        # Verify the metric existed before (to avoid false positives on new systems)
        historical_check = await db.execute(
            select(Metric).where(
                and_(
                    Metric.project_id == rule.project_id,
                    Metric.metric_type == rule.metric_type,
                    Metric.timestamp >= datetime.now(timezone.utc) - timedelta(days=1),
                    Metric.timestamp < absence_start
                )
            ).limit(1)
        )
        has_historical = historical_check.scalar_one_or_none() is not None

        if not has_historical:
            return None

        alert = await self._create_alert(
            db=db,
            rule=rule,
            message=f"{rule.name}: {rule.metric_type} has been absent for {rule.duration_seconds}s",
            trigger_metric=rule.metric_type,
            evidence=[
                {
                    "type": "absence",
                    "metric_type": rule.metric_type,
                    "absence_duration_seconds": rule.duration_seconds,
                    "last_seen": absence_start.isoformat()
                }
            ]
        )

        rule.last_triggered_at = datetime.now(timezone.utc)
        await db.flush()

        asyncio.create_task(self._send_alert_notification(alert, rule))

        return alert

    def _check_threshold(self, value: float, operator: str, threshold: float) -> bool:
        """Check if a value meets the threshold condition."""
        if operator == '>':
            return value > threshold
        elif operator == '<':
            return value < threshold
        elif operator == '>=':
            return value >= threshold
        elif operator == '<=':
            return value <= threshold
        elif operator == '==':
            return abs(value - threshold) < 0.001  # Floating point comparison
        return False

    async def _create_alert(
        self,
        db: AsyncSession,
        rule: AlertRule,
        message: str,
        trigger_value: Optional[float] = None,
        trigger_metric: Optional[str] = None,
        evidence: Optional[List[Dict[str, Any]]] = None
    ) -> Alert:
        """Create and persist an alert."""
        alert = Alert(
            rule_id=rule.id,
            project_id=rule.project_id,
            service_id=rule.service_id,
            status='active',
            severity=rule.severity,
            message=message,
            trigger_value=trigger_value,
            trigger_metric=trigger_metric,
            evidence=evidence or [],
            metadata={
                'rule_name': rule.name,
                'condition_type': rule.condition_type
            }
        )

        db.add(alert)
        await db.flush()
        await db.refresh(alert)

        return alert

    async def _send_alert_notification(self, alert: Alert, rule: AlertRule) -> None:
        """Send alert notification (non-blocking)."""
        try:
            success = await self.notification_service.send_alert_notification(alert, rule)

            # Update notification status
            # Note: This happens in a separate task, so we need a new DB session
            # In production, you'd get a new session here or use a job queue
            alert.notification_sent = success
            alert.notification_attempts += 1
            alert.last_notification_attempt = datetime.now(timezone.utc)
        except Exception as e:
            # Log error but don't fail the alert creation
            print(f"Failed to send notification for alert {alert.id}: {e}")

    async def _fetch_recent_metrics(
        self,
        db: AsyncSession,
        project_id: str,
        minutes: int = 10
    ) -> List[Metric]:
        """Fetch recent metrics for evaluation."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        result = await db.execute(
            select(Metric).where(
                and_(
                    Metric.project_id == project_id,
                    Metric.timestamp >= cutoff
                )
            ).order_by(desc(Metric.timestamp)).limit(500)
        )
        return list(result.scalars().all())

    async def _fetch_recent_logs(
        self,
        db: AsyncSession,
        project_id: str,
        minutes: int = 10
    ) -> List[LogEvent]:
        """Fetch recent logs for evaluation."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        result = await db.execute(
            select(LogEvent).where(
                and_(
                    LogEvent.project_id == project_id,
                    LogEvent.timestamp >= cutoff
                )
            ).order_by(desc(LogEvent.timestamp)).limit(200)
        )
        return list(result.scalars().all())


class AlertManager:
    """High-level alert management operations."""

    @staticmethod
    async def acknowledge_alert(
        db: AsyncSession,
        alert: Alert,
        user_id: str,
        note: Optional[str] = None
    ) -> Alert:
        """Acknowledge an alert."""
        alert.status = 'acknowledged'
        alert.acknowledged_at = datetime.now(timezone.utc)
        alert.acknowledged_by_user_id = user_id
        alert.acknowledgment_note = note

        await db.flush()
        await db.refresh(alert)

        return alert

    @staticmethod
    async def resolve_alert(
        db: AsyncSession,
        alert: Alert
    ) -> Alert:
        """Mark an alert as resolved."""
        alert.status = 'resolved'
        alert.resolved_at = datetime.now(timezone.utc)

        await db.flush()
        await db.refresh(alert)

        return alert

    @staticmethod
    async def auto_resolve_alerts(
        db: AsyncSession,
        project_id: str,
        max_age_hours: int = 24
    ) -> int:
        """
        Auto-resolve old alerts that haven't been manually resolved.

        Args:
            db: Database session
            project_id: Project UUID
            max_age_hours: Maximum age in hours before auto-resolution

        Returns:
            Number of alerts resolved
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)

        result = await db.execute(
            select(Alert).where(
                and_(
                    Alert.project_id == project_id,
                    Alert.status == 'active',
                    Alert.triggered_at < cutoff
                )
            )
        )
        old_alerts = list(result.scalars().all())

        for alert in old_alerts:
            alert.status = 'resolved'
            alert.resolved_at = datetime.now(timezone.utc)

        await db.flush()

        return len(old_alerts)
