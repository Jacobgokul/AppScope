"""
Notification service for sending alerts.

Supports email and webhook notifications (no Slack per requirements).
"""
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from datetime import datetime
import json

import httpx

from app.models import Alert, AlertRule
from app.config import settings


class NotificationService:
    """
    Service for sending alert notifications via email and webhooks.
    """

    def __init__(
        self,
        smtp_host: Optional[str] = None,
        smtp_port: Optional[int] = None,
        smtp_username: Optional[str] = None,
        smtp_password: Optional[str] = None,
        from_email: Optional[str] = None
    ):
        """
        Initialize notification service.

        Args:
            smtp_host: SMTP server hostname
            smtp_port: SMTP server port
            smtp_username: SMTP authentication username
            smtp_password: SMTP authentication password
            from_email: Sender email address
        """
        self.smtp_host = smtp_host or getattr(settings, 'smtp_host', None)
        self.smtp_port = smtp_port or getattr(settings, 'smtp_port', 587)
        self.smtp_username = smtp_username or getattr(settings, 'smtp_username', None)
        self.smtp_password = smtp_password or getattr(settings, 'smtp_password', None)
        self.from_email = from_email or getattr(settings, 'from_email', 'alerts@appscope.io')

        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def send_alert_notification(self, alert: Alert, rule: AlertRule) -> bool:
        """
        Send notifications for an alert based on rule configuration.

        Args:
            alert: Alert instance
            rule: Alert rule with notification configuration

        Returns:
            True if all notifications sent successfully, False otherwise
        """
        if not rule.notification_channels:
            return True

        results = []

        if 'email' in rule.notification_channels and rule.email_recipients:
            email_result = await self.send_email_notification(alert, rule, rule.email_recipients)
            results.append(email_result)

        if 'webhook' in rule.notification_channels and rule.webhook_url:
            webhook_result = await self.send_webhook_notification(alert, rule, rule.webhook_url)
            results.append(webhook_result)

        return all(results) if results else False

    async def send_email_notification(
        self,
        alert: Alert,
        rule: AlertRule,
        recipients: List[str]
    ) -> bool:
        """
        Send email notification for an alert.

        Args:
            alert: Alert instance
            rule: Alert rule
            recipients: List of recipient email addresses

        Returns:
            True if email sent successfully
        """
        if not self.smtp_host or not self.smtp_username or not self.smtp_password:
            print("Email notifications not configured. Skipping email notification.")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = self._format_email_subject(alert, rule)
            msg['From'] = self.from_email
            msg['To'] = ', '.join(recipients)

            # Create plain text and HTML versions
            text_body = self._format_email_text(alert, rule)
            html_body = self._format_email_html(alert, rule)

            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))

            # Send email (blocking operation, run in thread pool)
            await asyncio.to_thread(
                self._send_smtp_email,
                msg,
                recipients
            )

            return True

        except Exception as e:
            print(f"Failed to send email notification: {e}")
            return False

    def _send_smtp_email(self, msg: MIMEMultipart, recipients: List[str]) -> None:
        """Send email via SMTP (blocking operation)."""
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg, self.from_email, recipients)

    def _format_email_subject(self, alert: Alert, rule: AlertRule) -> str:
        """Format email subject line."""
        severity_emoji = {
            'critical': '🚨',
            'warning': '⚠️',
            'info': 'ℹ️'
        }
        emoji = severity_emoji.get(alert.severity, '⚠️')

        return f"{emoji} [{alert.severity.upper()}] {rule.name}"

    def _format_email_text(self, alert: Alert, rule: AlertRule) -> str:
        """Format plain text email body."""
        lines = [
            f"Alert: {rule.name}",
            f"Severity: {alert.severity.upper()}",
            f"Triggered: {alert.triggered_at.strftime('%Y-%m-%d %H:%M:%S UTC')}",
            "",
            f"Message: {alert.message}",
            ""
        ]

        if alert.trigger_value is not None:
            lines.append(f"Trigger Value: {alert.trigger_value:.2f}")

        if alert.trigger_metric:
            lines.append(f"Metric: {alert.trigger_metric}")

        if alert.evidence:
            lines.append("")
            lines.append("Evidence:")
            for i, evidence_item in enumerate(alert.evidence[:5], 1):
                lines.append(f"  {i}. {json.dumps(evidence_item, indent=2)}")

        lines.extend([
            "",
            f"View in AppScope: {self._get_alert_url(alert)}",
            "",
            "--",
            "AppScope Monitoring",
            "https://appscope.io"
        ])

        return '\n'.join(lines)

    def _format_email_html(self, alert: Alert, rule: AlertRule) -> str:
        """Format HTML email body."""
        severity_colors = {
            'critical': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        }
        color = severity_colors.get(alert.severity, '#ffc107')

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: {color}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }}
                .content {{ background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }}
                .footer {{ background-color: #f0f0f0; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 12px; }}
                .metric {{ background-color: white; padding: 10px; margin: 10px 0; border-left: 3px solid {color}; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: {color}; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin:0;">{rule.name}</h2>
                    <p style="margin:5px 0 0 0;">Severity: {alert.severity.upper()}</p>
                </div>
                <div class="content">
                    <p><strong>Triggered:</strong> {alert.triggered_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    <p><strong>Message:</strong> {alert.message}</p>
        """

        if alert.trigger_value is not None and alert.trigger_metric:
            html += f"""
                    <div class="metric">
                        <strong>{alert.trigger_metric}:</strong> {alert.trigger_value:.2f}
                    </div>
            """

        if alert.evidence:
            html += "<p><strong>Evidence:</strong></p><ul>"
            for evidence_item in alert.evidence[:5]:
                html += f"<li>{evidence_item.get('type', 'unknown')}: {json.dumps(evidence_item, indent=2)}</li>"
            html += "</ul>"

        html += f"""
                    <a href="{self._get_alert_url(alert)}" class="button">View in AppScope</a>
                </div>
                <div class="footer">
                    <p>AppScope Monitoring | <a href="https://appscope.io">appscope.io</a></p>
                </div>
            </div>
        </body>
        </html>
        """

        return html

    async def send_webhook_notification(
        self,
        alert: Alert,
        rule: AlertRule,
        webhook_url: str
    ) -> bool:
        """
        Send webhook notification for an alert.

        Args:
            alert: Alert instance
            rule: Alert rule
            webhook_url: Webhook endpoint URL

        Returns:
            True if webhook delivered successfully
        """
        try:
            payload = self._format_webhook_payload(alert, rule)

            response = await self.http_client.post(
                webhook_url,
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'AppScope-Monitor/1.0'
                }
            )

            response.raise_for_status()
            return True

        except Exception as e:
            print(f"Failed to send webhook notification: {e}")
            return False

    def _format_webhook_payload(self, alert: Alert, rule: AlertRule) -> dict:
        """
        Format webhook payload.

        Uses a generic format that can be adapted by the receiving system.
        """
        return {
            'alert_id': str(alert.id),
            'rule_id': str(rule.id),
            'rule_name': rule.name,
            'project_id': str(alert.project_id),
            'service_id': str(alert.service_id) if alert.service_id else None,
            'severity': alert.severity,
            'status': alert.status,
            'message': alert.message,
            'trigger_value': alert.trigger_value,
            'trigger_metric': alert.trigger_metric,
            'triggered_at': alert.triggered_at.isoformat(),
            'evidence': alert.evidence,
            'extra_data': alert.extra_data,
            'alert_url': self._get_alert_url(alert),
            'timestamp': datetime.utcnow().isoformat()
        }

    def _get_alert_url(self, alert: Alert) -> str:
        """Generate URL to view alert in dashboard."""
        # In production, this would be the actual frontend URL
        base_url = getattr(settings, 'frontend_url', 'https://appscope.io')
        return f"{base_url}/projects/{alert.project_id}/alerts/{alert.id}"

    async def close(self) -> None:
        """Close HTTP client."""
        await self.http_client.aclose()


# Singleton instance
_notification_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    """Get or create notification service singleton."""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
