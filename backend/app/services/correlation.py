"""
Event correlation service - correlates metrics and logs across time to identify patterns.

This module analyzes metrics and log events to detect correlated issues
across different layers of the application stack.
"""
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.models.metrics import Metric
from app.models.logs import LogEvent


class CorrelationEngine:
    """
    Correlates events across time and different data sources.

    The engine looks for patterns such as:
    - CPU spikes correlated with high error rates
    - Database slowdowns correlated with API latency
    - Memory leaks correlated with application restarts
    """

    def __init__(self, db: AsyncSession, project_id: UUID):
        self.db = db
        self.project_id = project_id

    async def analyze_timerange(
        self,
        start_time: datetime,
        end_time: datetime,
        time_window_seconds: int = 300,  # 5 minutes
    ) -> Dict[str, Any]:
        """
        Analyze a time range for correlated events.

        Args:
            start_time: Start of analysis period
            end_time: End of analysis period
            time_window_seconds: Size of correlation window (events within this window are correlated)

        Returns:
            Dictionary containing correlated events and patterns
        """
        from sqlalchemy import select, and_

        # Fetch metrics in time range
        metrics_query = select(Metric).where(
            and_(
                Metric.project_id == self.project_id,
                Metric.timestamp >= start_time,
                Metric.timestamp <= end_time,
            )
        ).order_by(Metric.timestamp)

        metrics_result = await self.db.execute(metrics_query)
        metrics = metrics_result.scalars().all()

        # Fetch log events in time range (focus on errors and warnings)
        logs_query = select(LogEvent).where(
            and_(
                LogEvent.project_id == self.project_id,
                LogEvent.timestamp >= start_time,
                LogEvent.timestamp <= end_time,
                LogEvent.level.in_(["error", "warning"]),
            )
        ).order_by(LogEvent.timestamp)

        logs_result = await self.db.execute(logs_query)
        logs = logs_result.scalars().all()

        # Group events into time windows
        time_windows = self._create_time_windows(
            start_time, end_time, time_window_seconds
        )

        # Correlate events within each window
        correlated_events = []
        for window_start, window_end in time_windows:
            window_metrics = [
                m for m in metrics
                if window_start <= m.timestamp < window_end
            ]
            window_logs = [
                l for l in logs
                if window_start <= l.timestamp < window_end
            ]

            if window_metrics or window_logs:
                correlation = self._correlate_window(
                    window_start, window_end, window_metrics, window_logs
                )
                if correlation:
                    correlated_events.append(correlation)

        # Detect patterns
        patterns = self._detect_patterns(correlated_events)

        return {
            "time_range": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
            },
            "correlated_events": correlated_events,
            "patterns": patterns,
            "summary": self._generate_summary(patterns),
        }

    def _create_time_windows(
        self,
        start_time: datetime,
        end_time: datetime,
        window_seconds: int,
    ) -> List[Tuple[datetime, datetime]]:
        """
        Create time windows for correlation analysis.

        Args:
            start_time: Start time
            end_time: End time
            window_seconds: Window size in seconds

        Returns:
            List of (window_start, window_end) tuples
        """
        windows = []
        current = start_time

        while current < end_time:
            window_end = min(current + timedelta(seconds=window_seconds), end_time)
            windows.append((current, window_end))
            current = window_end

        return windows

    def _correlate_window(
        self,
        window_start: datetime,
        window_end: datetime,
        metrics: List[Metric],
        logs: List[LogEvent],
    ) -> Dict[str, Any] | None:
        """
        Correlate events within a single time window.

        Args:
            window_start: Window start time
            window_end: Window end time
            metrics: Metrics in this window
            logs: Log events in this window

        Returns:
            Correlation data if significant events found, None otherwise
        """
        # Skip empty windows
        if not metrics and not logs:
            return None

        # Aggregate metrics by type
        metric_summary = {}
        for metric in metrics:
            key = metric.metric_type
            if key not in metric_summary:
                metric_summary[key] = {
                    "count": 0,
                    "values": [],
                    "avg": 0,
                    "max": 0,
                    "min": float("inf"),
                }
            metric_summary[key]["count"] += 1
            metric_summary[key]["values"].append(metric.value)
            metric_summary[key]["max"] = max(metric_summary[key]["max"], metric.value)
            metric_summary[key]["min"] = min(metric_summary[key]["min"], metric.value)

        # Calculate averages
        for key, data in metric_summary.items():
            data["avg"] = sum(data["values"]) / len(data["values"])
            del data["values"]  # Remove raw values to reduce size

        # Aggregate logs by level
        log_summary = {
            "error": 0,
            "warning": 0,
            "info": 0,
            "debug": 0,
        }
        error_messages = []

        for log in logs:
            log_summary[log.level] = log_summary.get(log.level, 0) + 1
            if log.level == "error":
                error_messages.append({
                    "timestamp": log.timestamp.isoformat(),
                    "message": log.message[:200],  # Truncate long messages
                    "service": log.service,
                    "source": log.source,
                })

        return {
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
            "metrics": metric_summary,
            "logs": log_summary,
            "error_messages": error_messages[:10],  # Keep top 10 errors
        }

    def _detect_patterns(self, correlated_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect patterns in correlated events.

        Args:
            correlated_events: List of correlated event windows

        Returns:
            List of detected patterns
        """
        patterns = []

        for event in correlated_events:
            metrics = event.get("metrics", {})
            logs = event.get("logs", {})

            # Pattern 1: High CPU with errors
            cpu_data = metrics.get("cpu")
            if cpu_data and cpu_data["avg"] > 80 and logs.get("error", 0) > 0:
                patterns.append({
                    "type": "high_cpu_with_errors",
                    "severity": "high",
                    "description": f"High CPU usage ({cpu_data['avg']:.1f}%) with {logs['error']} errors",
                    "window": event["window_start"],
                    "evidence": {
                        "cpu_avg": cpu_data["avg"],
                        "cpu_max": cpu_data["max"],
                        "error_count": logs["error"],
                    },
                })

            # Pattern 2: Memory issues
            memory_data = metrics.get("memory")
            if memory_data and memory_data["avg"] > 90:
                patterns.append({
                    "type": "high_memory_usage",
                    "severity": "high" if memory_data["avg"] > 95 else "medium",
                    "description": f"High memory usage ({memory_data['avg']:.1f}%)",
                    "window": event["window_start"],
                    "evidence": {
                        "memory_avg": memory_data["avg"],
                        "memory_max": memory_data["max"],
                    },
                })

            # Pattern 3: Database slowness
            db_data = metrics.get("database")
            if db_data and db_data["avg"] > 1000:  # > 1 second query time
                patterns.append({
                    "type": "slow_database_queries",
                    "severity": "medium",
                    "description": f"Slow database queries (avg {db_data['avg']:.0f}ms)",
                    "window": event["window_start"],
                    "evidence": {
                        "query_time_avg": db_data["avg"],
                        "query_time_max": db_data["max"],
                    },
                })

            # Pattern 4: Error spike
            if logs.get("error", 0) > 10:
                patterns.append({
                    "type": "error_spike",
                    "severity": "high",
                    "description": f"Error spike detected ({logs['error']} errors)",
                    "window": event["window_start"],
                    "evidence": {
                        "error_count": logs["error"],
                        "sample_errors": event.get("error_messages", [])[:3],
                    },
                })

        return patterns

    def _generate_summary(self, patterns: List[Dict[str, Any]]) -> str:
        """
        Generate a human-readable summary of detected patterns.

        Args:
            patterns: List of detected patterns

        Returns:
            Summary string
        """
        if not patterns:
            return "No significant issues detected in the analyzed time range."

        high_severity = sum(1 for p in patterns if p["severity"] == "high")
        medium_severity = sum(1 for p in patterns if p["severity"] == "medium")

        summary_parts = []

        if high_severity > 0:
            summary_parts.append(f"{high_severity} high-severity issue(s)")
        if medium_severity > 0:
            summary_parts.append(f"{medium_severity} medium-severity issue(s)")

        summary = f"Detected {', '.join(summary_parts)}. "

        # List most common pattern types
        pattern_types = {}
        for pattern in patterns:
            pattern_types[pattern["type"]] = pattern_types.get(pattern["type"], 0) + 1

        top_patterns = sorted(pattern_types.items(), key=lambda x: x[1], reverse=True)[:3]
        if top_patterns:
            pattern_list = ", ".join(
                f"{ptype.replace('_', ' ')} ({count}x)"
                for ptype, count in top_patterns
            )
            summary += f"Most common: {pattern_list}."

        return summary


async def correlate_events(
    db: AsyncSession,
    project_id: UUID,
    start_time: datetime,
    end_time: datetime,
) -> Dict[str, Any]:
    """
    High-level function to correlate events for a project.

    Args:
        db: Database session
        project_id: Project UUID
        start_time: Start of analysis period
        end_time: End of analysis period

    Returns:
        Correlation analysis results
    """
    engine = CorrelationEngine(db, project_id)
    return await engine.analyze_timerange(start_time, end_time)
