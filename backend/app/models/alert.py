from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Float, Integer, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
import uuid

from app.db.session import Base


class AlertRule(Base):
    """
    Alert rule configuration - defines conditions for triggering alerts.
    """
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Alert condition
    condition_type = Column(String(50), nullable=False)  # threshold, anomaly, absence
    metric_type = Column(String(50), nullable=True)  # cpu, memory, error_rate, latency, etc.
    operator = Column(String(10), nullable=True)  # >, <, >=, <=, ==
    threshold = Column(Float, nullable=True)
    duration_seconds = Column(Integer, default=60, nullable=False)  # Alert if condition met for N seconds

    # Anomaly detection (for condition_type='anomaly')
    anomaly_sensitivity = Column(Float, nullable=True)  # 0.0-1.0, higher = more sensitive

    # Alert severity
    severity = Column(String(20), default="warning")  # critical, warning, info

    # Configuration
    is_active = Column(Boolean, default=True)
    notification_channels = Column(JSONB, nullable=False, default=list)  # ['email', 'webhook']

    # Notification targets
    email_recipients = Column(JSONB, nullable=True)  # List of email addresses
    webhook_url = Column(String(500), nullable=True)  # Webhook endpoint

    # Cooldown to prevent alert spam
    cooldown_seconds = Column(Integer, default=300, nullable=False)  # Min time between alerts
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)  # Track last trigger for cooldown

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Foreign Keys
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="alert_rules")
    service = relationship("Service", back_populates="alert_rules")
    alerts = relationship("Alert", back_populates="rule", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_alert_rules_project_active", "project_id", "is_active"),
    )

    def __repr__(self):
        return f"<AlertRule {self.name}: {self.condition_type}>"


class Alert(Base):
    """
    Alert instance - fired when an alert rule is triggered.
    """
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Alert state
    status = Column(String(20), nullable=False, default="active")  # active, acknowledged, resolved
    severity = Column(String(20), nullable=False)

    # Alert content
    message = Column(Text, nullable=False)

    # Triggering data
    trigger_value = Column(Float, nullable=True)  # Value that triggered alert
    trigger_metric = Column(String(100), nullable=True)  # Metric that triggered

    # Timing
    triggered_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Context
    evidence = Column(JSONB, nullable=True)  # Supporting data
    extra_data = Column(JSONB, nullable=True)  # Additional context

    # Notification tracking
    notification_sent = Column(Boolean, default=False, nullable=False)
    notification_attempts = Column(Integer, default=0, nullable=False)
    last_notification_attempt = Column(DateTime(timezone=True), nullable=True)

    # User interaction
    acknowledged_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledgment_note = Column(Text, nullable=True)

    # Foreign Keys
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="alerts")
    rule = relationship("AlertRule", back_populates="alerts")
    acknowledged_by = relationship("User", foreign_keys=[acknowledged_by_user_id])

    __table_args__ = (
        Index("ix_alerts_project_status_triggered", "project_id", "status", "triggered_at"),
        Index("ix_alerts_rule_triggered", "rule_id", "triggered_at"),
    )

    def __repr__(self):
        return f"<Alert [{self.severity}] {self.message[:50]}... - {self.status}>"
