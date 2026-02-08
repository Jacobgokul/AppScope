# AppScope Services Layer

This directory contains the business logic layer for AppScope's core features.

## Services Overview

### AI Analysis (`ai_analysis.py`)

Production-ready AI-powered root cause analysis system.

**Key Features:**
- **Event Correlation**: Groups events by time proximity across all services using sliding time windows
- **Pattern Detection**: Identifies known issue patterns (memory leaks, connection exhaustion, cascade failures)
- **LLM Analysis**: Uses LangChain + OpenAI for structured root cause analysis with evidence and suggestions
- **Async Performance**: Fully async implementation with parallel data fetching

**Usage:**
```python
from app.services.ai_analysis import perform_ai_analysis

analysis = await perform_ai_analysis(
    db=db,
    project_id=project_id,
    start_time=start_time,
    end_time=end_time,
    focus_component="backend",  # Optional
    trigger="manual"
)
```

**Components:**
- `CorrelationEngine`: Clusters related events within configurable time windows (default: 5 minutes)
- `PatternDetector`: Rule-based pattern matching for common issues
- `LLMAnalyzer`: Structured output from LLM using Pydantic models

**LLM Integration:**
Uses OpenAI's structured output API with `with_structured_output()` and `method="json_schema"` for reliable, type-safe responses. Includes fallback logic if LLM fails.

**Configuration:**
- Set `llm_api_key` in environment variables
- Model: `gpt-4o-mini` (configurable)
- Temperature: 0.1 for consistency

### Alerts (`alerts.py`)

Comprehensive alert evaluation and management system.

**Key Features:**
- **Multiple Condition Types**:
  - Threshold: Alert when metric crosses threshold for specified duration
  - Anomaly: Statistical anomaly detection (mean ± std deviation)
  - Absence: Alert when expected metrics are missing
- **Smart Cooldown**: Prevents alert spam with configurable cooldown periods
- **Notification Integration**: Triggers email and webhook notifications
- **Auto-Resolution**: Automatically resolves old alerts

**Usage:**
```python
from app.services.alerts import AlertEvaluator, AlertManager
from app.services.notifications import get_notification_service

evaluator = AlertEvaluator(get_notification_service())

# Evaluate all rules for a project
alerts = await evaluator.evaluate_rules_for_project(
    db=db,
    project_id=project_id
)

# Acknowledge an alert
alert = await AlertManager.acknowledge_alert(
    db=db,
    alert=alert,
    user_id=user_id,
    note="Investigating the issue"
)
```

**Alert Rule Types:**

1. **Threshold Alerts**
```python
{
    "condition_type": "threshold",
    "metric_type": "cpu",
    "operator": ">",
    "threshold": 80.0,
    "duration_seconds": 300  # Must persist for 5 minutes
}
```

2. **Anomaly Alerts**
```python
{
    "condition_type": "anomaly",
    "metric_type": "request_latency",
    "anomaly_sensitivity": 0.8  # Higher = more sensitive
}
```

3. **Absence Alerts**
```python
{
    "condition_type": "absence",
    "metric_type": "heartbeat",
    "duration_seconds": 600  # Alert if missing for 10 minutes
}
```

### Notifications (`notifications.py`)

Multi-channel notification delivery system.

**Supported Channels:**
- **Email**: HTML and plain text via SMTP
- **Webhook**: JSON payload to custom endpoints
- **No Slack**: Per project requirements

**Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=alerts@appscope.io
FRONTEND_URL=https://appscope.io
```

**Usage:**
```python
from app.services.notifications import NotificationService

notification_service = NotificationService()

# Automatically called by AlertEvaluator
success = await notification_service.send_alert_notification(
    alert=alert,
    rule=alert_rule
)
```

**Email Format:**
- Severity-based color coding (red for critical, yellow for warning)
- Rich HTML formatting with evidence and context
- Direct links to alert dashboard
- Plain text fallback

**Webhook Payload:**
```json
{
    "alert_id": "uuid",
    "rule_name": "High CPU Usage",
    "severity": "critical",
    "message": "CPU usage exceeded 90%",
    "trigger_value": 92.5,
    "evidence": [...],
    "alert_url": "https://appscope.io/projects/xxx/alerts/yyy"
}
```

## Implementation Details

### Async Best Practices

All services use proper async/await patterns:
- `asyncio.gather()` for parallel operations
- `asyncio.to_thread()` for blocking I/O (SMTP)
- `asyncio.create_task()` for fire-and-forget notifications

### Error Handling

- Comprehensive try-catch blocks with logging
- Graceful degradation (LLM fallback, notification retries)
- Proper HTTP status codes in API layer

### Database Queries

- Indexed queries for performance
- Proper use of joins and eager loading
- Query result limits to prevent memory issues
- TimescaleDB-optimized time-range queries

### Testing Considerations

When writing tests:
- Mock external services (OpenAI API, SMTP)
- Use in-memory SQLite for fast tests
- Test error paths and edge cases
- Verify notification delivery without actually sending

### Performance Optimization

- Event correlation uses efficient time-based clustering
- Pattern detection is rule-based (fast)
- LLM analysis is async and non-blocking
- Notifications use fire-and-forget pattern

## API Integration

These services are exposed via REST APIs in `app/api/v1/`:

- **Analysis**: `POST /api/v1/analysis/{project_id}`
- **Alert Rules**: `POST /api/v1/alerts/{project_id}/rules`
- **Alerts**: `GET /api/v1/alerts/{project_id}`

See API documentation for request/response schemas.

## Future Enhancements

Potential improvements:
- Machine learning models for anomaly detection
- Grafana-style alert chaining and dependencies
- Alert grouping to reduce notification fatigue
- Integration with incident management systems (PagerDuty, Opsgenie)
- Slack integration (currently excluded per requirements)
- SMS notifications via Twilio
- Custom alert templates

## Troubleshooting

### LLM Analysis Fails
- Verify `llm_api_key` is set and valid
- Check OpenAI API rate limits and quotas
- Review fallback analysis in logs
- Ensure sufficient historical data exists

### Notifications Not Sending
- Verify SMTP credentials are correct
- Check firewall rules for SMTP port (587)
- Test webhook URLs are accessible
- Review notification_attempts and last_notification_attempt in Alert model

### Alerts Not Triggering
- Verify alert rule is `is_active=True`
- Check cooldown period hasn't been reached
- Ensure metrics are being ingested
- Review duration_seconds threshold

### Performance Issues
- Monitor database query performance
- Check TimescaleDB compression settings
- Review alert rule count (too many rules = slow evaluation)
- Consider batching alert evaluations
