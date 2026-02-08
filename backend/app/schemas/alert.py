"""
Pydantic schemas for alerts system.
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any


# Alert Rule Schemas
class AlertRuleBase(BaseModel):
    """Base alert rule schema."""
    name: str = Field(..., min_length=1, max_length=100, description="Alert rule name")
    description: Optional[str] = Field(None, description="Detailed description of the alert")
    condition_type: str = Field(..., description="Type of condition: 'threshold', 'anomaly', 'absence'")
    severity: str = Field(default="warning", description="Alert severity: 'info', 'warning', 'critical'")
    is_active: bool = Field(default=True, description="Whether the alert rule is active")
    notification_channels: List[str] = Field(default_factory=list, description="Notification channels: ['email', 'webhook']")

    @field_validator('condition_type')
    @classmethod
    def validate_condition_type(cls, v: str) -> str:
        if v not in ['threshold', 'anomaly', 'absence']:
            raise ValueError("condition_type must be 'threshold', 'anomaly', or 'absence'")
        return v

    @field_validator('severity')
    @classmethod
    def validate_severity(cls, v: str) -> str:
        if v not in ['info', 'warning', 'critical']:
            raise ValueError("severity must be 'info', 'warning', or 'critical'")
        return v

    @field_validator('notification_channels')
    @classmethod
    def validate_notification_channels(cls, v: List[str]) -> List[str]:
        valid_channels = {'email', 'webhook'}
        for channel in v:
            if channel not in valid_channels:
                raise ValueError(f"Invalid notification channel: {channel}. Must be one of {valid_channels}")
        return v


class AlertRuleCreate(AlertRuleBase):
    """Schema for creating alert rules."""
    # Threshold-specific fields
    metric_type: Optional[str] = Field(None, description="Metric to monitor (required for threshold)")
    operator: Optional[str] = Field(None, description="Comparison operator: '>', '<', '>=', '<=', '=='")
    threshold: Optional[float] = Field(None, description="Threshold value (required for threshold)")
    duration_seconds: int = Field(default=60, ge=30, le=3600, description="How long condition must persist (30-3600s)")

    # Anomaly-specific fields
    anomaly_sensitivity: Optional[float] = Field(None, ge=0.0, le=1.0, description="Anomaly sensitivity (0.0-1.0)")

    # Notification targets
    email_recipients: Optional[List[str]] = Field(None, description="List of email addresses")
    webhook_url: Optional[str] = Field(None, max_length=500, description="Webhook URL for notifications")

    # Cooldown
    cooldown_seconds: int = Field(default=300, ge=60, le=3600, description="Min time between alerts (60-3600s)")

    # Optional service filter
    service_id: Optional[UUID] = Field(None, description="Filter by specific service")

    @field_validator('operator')
    @classmethod
    def validate_operator(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ['>', '<', '>=', '<=', '==']:
            raise ValueError("operator must be one of: '>', '<', '>=', '<=', '=='")
        return v

    def model_post_init(self, __context: Any) -> None:
        """Validate condition-specific fields after initialization."""
        if self.condition_type == 'threshold':
            if not self.metric_type:
                raise ValueError("metric_type is required for threshold conditions")
            if not self.operator:
                raise ValueError("operator is required for threshold conditions")
            if self.threshold is None:
                raise ValueError("threshold is required for threshold conditions")

        if self.condition_type == 'anomaly' and self.anomaly_sensitivity is None:
            # Default sensitivity
            self.anomaly_sensitivity = 0.7

        if 'email' in self.notification_channels and not self.email_recipients:
            raise ValueError("email_recipients is required when 'email' is in notification_channels")

        if 'webhook' in self.notification_channels and not self.webhook_url:
            raise ValueError("webhook_url is required when 'webhook' is in notification_channels")


class AlertRuleUpdate(BaseModel):
    """Schema for updating alert rules."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    severity: Optional[str] = None
    metric_type: Optional[str] = None
    operator: Optional[str] = None
    threshold: Optional[float] = None
    duration_seconds: Optional[int] = Field(None, ge=30, le=3600)
    anomaly_sensitivity: Optional[float] = Field(None, ge=0.0, le=1.0)
    notification_channels: Optional[List[str]] = None
    email_recipients: Optional[List[str]] = None
    webhook_url: Optional[str] = Field(None, max_length=500)
    cooldown_seconds: Optional[int] = Field(None, ge=60, le=3600)
    service_id: Optional[UUID] = None


class AlertRuleResponse(AlertRuleBase):
    """Schema for alert rule responses."""
    id: UUID
    project_id: UUID
    service_id: Optional[UUID]
    metric_type: Optional[str]
    operator: Optional[str]
    threshold: Optional[float]
    duration_seconds: int
    anomaly_sensitivity: Optional[float]
    email_recipients: Optional[List[str]]
    webhook_url: Optional[str]
    cooldown_seconds: int
    last_triggered_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AlertRuleListResponse(BaseModel):
    """Schema for listing alert rules."""
    rules: List[AlertRuleResponse]
    total: int


# Alert Instance Schemas
class AlertAcknowledge(BaseModel):
    """Schema for acknowledging an alert."""
    note: Optional[str] = Field(None, max_length=500, description="Optional acknowledgment note")


class AlertResponse(BaseModel):
    """Schema for alert responses."""
    id: UUID
    rule_id: UUID
    project_id: UUID
    service_id: Optional[UUID]
    status: str
    severity: str
    message: str
    trigger_value: Optional[float]
    trigger_metric: Optional[str]
    triggered_at: datetime
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    acknowledged_by_user_id: Optional[UUID]
    acknowledgment_note: Optional[str]
    evidence: Optional[List[Dict[str, Any]]]
    extra_data: Optional[Dict[str, Any]]
    notification_sent: bool
    notification_attempts: int

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    """Schema for listing alerts."""
    alerts: List[AlertResponse]
    total: int
    active_count: int
    acknowledged_count: int
    resolved_count: int


class AlertStatsResponse(BaseModel):
    """Schema for alert statistics."""
    total_alerts: int
    active_alerts: int
    critical_alerts: int
    warning_alerts: int
    info_alerts: int
    alerts_last_24h: int
    alerts_last_7d: int
    most_triggered_rule: Optional[Dict[str, Any]]
    alert_rate_trend: str  # 'increasing', 'stable', 'decreasing'
