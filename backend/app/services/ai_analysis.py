"""
AI Analysis Service for AppScope.

This module provides intelligent correlation and analysis of application events
using time-based clustering, pattern detection, and LLM-powered root cause analysis.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
from dataclasses import dataclass
import time
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from pydantic import BaseModel, Field

from app.models import Metric, LogEvent, Analysis
from app.config import settings

logger = logging.getLogger(__name__)

# Optional LangChain imports - AI features will be disabled if not available
LANGCHAIN_AVAILABLE = False
try:
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import PydanticOutputParser
    LANGCHAIN_AVAILABLE = True
except ImportError:
    logger.warning("LangChain not available. AI analysis features will be disabled.")
    ChatOpenAI = None
    ChatPromptTemplate = None
    PydanticOutputParser = None


# Pydantic models for structured LLM output
class LLMEvidence(BaseModel):
    """Structured evidence from LLM analysis."""
    type: str = Field(description="Type of evidence: 'log', 'metric', 'pattern'")
    service: str = Field(description="Service or component name: 'backend', 'database', 'server', 'frontend'")
    description: str = Field(description="Clear description of the evidence")
    timestamp: Optional[str] = Field(None, description="ISO timestamp if applicable")
    value: Optional[str] = Field(None, description="Relevant value or measurement")


class LLMSuggestion(BaseModel):
    """Structured suggestion from LLM analysis."""
    action: str = Field(description="Recommended diagnostic or remediation action")
    command: Optional[str] = Field(None, description="Suggested diagnostic command (read-only)")
    priority: int = Field(description="Priority level: 1=highest, 2=medium, 3=lowest", ge=1, le=3)


class LLMAnalysisOutput(BaseModel):
    """Structured output from LLM root cause analysis."""
    root_cause: str = Field(description="Concise root cause summary (1-2 sentences)")
    root_cause_component: str = Field(
        description="Primary affected component: 'backend', 'database', 'server', 'frontend', or 'unknown'"
    )
    severity: str = Field(
        description="Issue severity: 'critical', 'major', 'minor', or 'info'"
    )
    confidence_score: float = Field(
        description="Confidence in analysis accuracy (0.0 to 1.0)",
        ge=0.0,
        le=1.0
    )
    summary: str = Field(description="Detailed analysis summary (2-4 sentences)")
    evidence: List[LLMEvidence] = Field(description="List of supporting evidence items")
    suggestions: List[LLMSuggestion] = Field(description="List of suggested actions")


@dataclass
class EventCluster:
    """A cluster of correlated events within a time window."""
    start_time: datetime
    end_time: datetime
    metrics: List[Metric]
    logs: List[LogEvent]
    pattern_score: float = 0.0
    detected_patterns: List[str] = None

    def __post_init__(self):
        if self.detected_patterns is None:
            self.detected_patterns = []


class CorrelationEngine:
    """
    Correlation engine that groups events by time proximity.

    Uses sliding time windows to cluster related events across different
    services and data sources.
    """

    def __init__(self, time_window_seconds: int = 300):
        """
        Initialize correlation engine.

        Args:
            time_window_seconds: Size of sliding window for event correlation (default 5 minutes)
        """
        self.time_window_seconds = time_window_seconds

    async def correlate_events(
        self,
        db: AsyncSession,
        project_id: str,
        start_time: datetime,
        end_time: datetime,
        focus_component: Optional[str] = None
    ) -> List[EventCluster]:
        """
        Group events by time proximity across services.

        Args:
            db: Database session
            project_id: Project UUID
            start_time: Analysis window start
            end_time: Analysis window end
            focus_component: Optional component to focus on

        Returns:
            List of event clusters with correlated data
        """
        # Fetch metrics and logs in parallel
        metrics_task = self._fetch_metrics(db, project_id, start_time, end_time, focus_component)
        logs_task = self._fetch_logs(db, project_id, start_time, end_time, focus_component)

        metrics, logs = await asyncio.gather(metrics_task, logs_task)

        # Build time-based clusters
        clusters = self._build_clusters(metrics, logs, start_time, end_time)

        return clusters

    async def _fetch_metrics(
        self,
        db: AsyncSession,
        project_id: str,
        start_time: datetime,
        end_time: datetime,
        focus_component: Optional[str]
    ) -> List[Metric]:
        """Fetch relevant metrics for analysis."""
        query = select(Metric).where(
            and_(
                Metric.project_id == project_id,
                Metric.timestamp >= start_time,
                Metric.timestamp <= end_time
            )
        )

        # Filter by component if specified
        if focus_component:
            component_metrics = {
                'backend': ['latency', 'request_rate', 'error_rate'],
                'database': ['db_connections', 'db_queries', 'db_latency'],
                'server': ['cpu', 'memory', 'disk'],
                'frontend': ['page_load', 'js_errors', 'api_errors']
            }
            if focus_component in component_metrics:
                query = query.where(Metric.metric_type.in_(component_metrics[focus_component]))

        query = query.order_by(Metric.timestamp.desc()).limit(500)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def _fetch_logs(
        self,
        db: AsyncSession,
        project_id: str,
        start_time: datetime,
        end_time: datetime,
        focus_component: Optional[str]
    ) -> List[LogEvent]:
        """Fetch relevant log events for analysis."""
        # Prioritize errors and warnings
        query = select(LogEvent).where(
            and_(
                LogEvent.project_id == project_id,
                LogEvent.timestamp >= start_time,
                LogEvent.timestamp <= end_time,
                LogEvent.level.in_(['error', 'ERROR', 'critical', 'CRITICAL', 'warn', 'WARNING'])
            )
        )

        if focus_component:
            query = query.where(LogEvent.service_name == focus_component)

        query = query.order_by(LogEvent.timestamp.desc()).limit(200)

        result = await db.execute(query)
        return list(result.scalars().all())

    def _build_clusters(
        self,
        metrics: List[Metric],
        logs: List[LogEvent],
        start_time: datetime,
        end_time: datetime
    ) -> List[EventCluster]:
        """Build time-based event clusters."""
        # Sort all events by timestamp
        all_events = sorted(
            [(m.timestamp, 'metric', m) for m in metrics] +
            [(l.timestamp, 'log', l) for l in logs],
            key=lambda x: x[0]
        )

        if not all_events:
            return []

        clusters = []
        current_cluster_start = all_events[0][0]
        current_cluster_metrics = []
        current_cluster_logs = []

        window_delta = timedelta(seconds=self.time_window_seconds)

        for timestamp, event_type, event in all_events:
            # Check if event is within current window
            if timestamp <= current_cluster_start + window_delta:
                # Add to current cluster
                if event_type == 'metric':
                    current_cluster_metrics.append(event)
                else:
                    current_cluster_logs.append(event)
            else:
                # Save current cluster if it has events
                if current_cluster_metrics or current_cluster_logs:
                    clusters.append(EventCluster(
                        start_time=current_cluster_start,
                        end_time=current_cluster_start + window_delta,
                        metrics=current_cluster_metrics,
                        logs=current_cluster_logs
                    ))

                # Start new cluster
                current_cluster_start = timestamp
                current_cluster_metrics = [event] if event_type == 'metric' else []
                current_cluster_logs = [event] if event_type == 'log' else []

        # Add final cluster
        if current_cluster_metrics or current_cluster_logs:
            clusters.append(EventCluster(
                start_time=current_cluster_start,
                end_time=current_cluster_start + window_delta,
                metrics=current_cluster_metrics,
                logs=current_cluster_logs
            ))

        return clusters


class PatternDetector:
    """
    Pattern detection for known issue signatures.

    Identifies common problem patterns like memory leaks, connection exhaustion,
    cascade failures, and high error rates.
    """

    def detect_patterns(self, clusters: List[EventCluster]) -> List[EventCluster]:
        """
        Detect known issue patterns in event clusters.

        Args:
            clusters: List of event clusters to analyze

        Returns:
            Clusters with detected patterns and scores
        """
        for cluster in clusters:
            patterns = []
            score = 0.0

            # Check for memory leak pattern
            if self._detect_memory_leak(cluster):
                patterns.append("memory_leak")
                score += 0.8

            # Check for connection exhaustion
            if self._detect_connection_exhaustion(cluster):
                patterns.append("connection_exhaustion")
                score += 0.9

            # Check for cascade failure
            if self._detect_cascade_failure(cluster):
                patterns.append("cascade_failure")
                score += 0.85

            # Check for high error rate
            if self._detect_high_error_rate(cluster):
                patterns.append("high_error_rate")
                score += 0.7

            # Check for disk space issues
            if self._detect_disk_space_issue(cluster):
                patterns.append("disk_space_issue")
                score += 0.9

            # Check for CPU spike
            if self._detect_cpu_spike(cluster):
                patterns.append("cpu_spike")
                score += 0.75

            cluster.detected_patterns = patterns
            cluster.pattern_score = min(score, 1.0)

        return clusters

    def _detect_memory_leak(self, cluster: EventCluster) -> bool:
        """Detect gradually increasing memory usage."""
        memory_metrics = [m for m in cluster.metrics if m.metric_type == 'memory']
        if len(memory_metrics) < 3:
            return False

        # Check for monotonic increase
        values = [m.value for m in sorted(memory_metrics, key=lambda x: x.timestamp)]
        increasing = all(values[i] <= values[i+1] for i in range(len(values)-1))
        high_usage = values[-1] > 85

        return increasing and high_usage

    def _detect_connection_exhaustion(self, cluster: EventCluster) -> bool:
        """Detect database connection pool exhaustion."""
        db_metrics = [m for m in cluster.metrics if m.metric_type == 'db_connections']
        connection_errors = [
            log for log in cluster.logs
            if any(term in log.message.lower() for term in ['connection', 'pool', 'timeout', 'exhausted'])
        ]

        if db_metrics:
            max_connections = max(m.value for m in db_metrics)
            if max_connections > 90:
                return True

        return len(connection_errors) > 2

    def _detect_cascade_failure(self, cluster: EventCluster) -> bool:
        """Detect cascade failure pattern (errors across multiple services)."""
        services_with_errors = set()
        for log in cluster.logs:
            if log.level.upper() in ['ERROR', 'CRITICAL'] and log.service:
                services_with_errors.add(log.service)

        # Cascade failure if 3+ services have errors
        return len(services_with_errors) >= 3

    def _detect_high_error_rate(self, cluster: EventCluster) -> bool:
        """Detect abnormally high error rate."""
        error_logs = [
            log for log in cluster.logs
            if log.level.upper() in ['ERROR', 'CRITICAL']
        ]
        return len(error_logs) > 10

    def _detect_disk_space_issue(self, cluster: EventCluster) -> bool:
        """Detect low disk space."""
        disk_metrics = [m for m in cluster.metrics if m.metric_type == 'disk']
        if not disk_metrics:
            return False

        max_disk = max(m.value for m in disk_metrics)
        return max_disk > 90

    def _detect_cpu_spike(self, cluster: EventCluster) -> bool:
        """Detect CPU spike."""
        cpu_metrics = [m for m in cluster.metrics if m.metric_type == 'cpu']
        if not cpu_metrics:
            return False

        max_cpu = max(m.value for m in cpu_metrics)
        return max_cpu > 85


class LLMAnalyzer:
    """
    LLM-powered root cause analyzer.

    Uses LangChain and OpenAI to analyze correlated events and provide
    structured root cause analysis with evidence and suggestions.
    """

    def __init__(self, model_name: str = "gpt-4o-mini", temperature: float = 0.1):
        """
        Initialize LLM analyzer.

        Args:
            model_name: OpenAI model to use
            temperature: Sampling temperature (lower = more deterministic)
        """
        if not settings.llm_api_key:
            raise ValueError("LLM API key not configured. Set llm_api_key in settings.")

        self.llm = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=settings.llm_api_key
        )

        # Use structured output for reliable parsing
        self.parser = PydanticOutputParser(pydantic_object=LLMAnalysisOutput)

        # Create analysis prompt template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", self._get_system_prompt()),
            ("human", "{user_input}")
        ])

        # Chain with structured output
        self.chain = self.prompt | self.llm.with_structured_output(
            LLMAnalysisOutput,
            method="json_schema",
            strict=True
        )

    def _get_system_prompt(self) -> str:
        """Get system prompt for LLM analysis."""
        return """You are an expert DevOps engineer analyzing application monitoring data to identify root causes of issues.

You will be given:
1. A time range for analysis
2. Recent error logs from the application
3. System and application metrics
4. Detected patterns (if any)

Your task is to:
1. Identify the root cause of any issues (or confirm no issues)
2. Determine which component is primarily affected
3. Assess severity and your confidence level
4. Provide clear evidence supporting your conclusion
5. Suggest specific diagnostic commands (READ-ONLY) to further investigate

Important guidelines:
- Be concise but specific
- Focus on causation, not just correlation
- Consider temporal relationships between events
- Suggest only READ-ONLY diagnostic commands (no modifications)
- If no issues found, say so clearly
- Use severity levels: critical (system down/data loss), major (significant degradation), minor (minor issues), info (no issues)
- Confidence score: 0.9+ for clear evidence, 0.7-0.9 for probable, 0.5-0.7 for possible, <0.5 for uncertain

Component options: backend, database, server, frontend, unknown"""

    async def analyze_with_llm(
        self,
        clusters: List[EventCluster],
        start_time: datetime,
        end_time: datetime,
        detected_patterns: List[str]
    ) -> LLMAnalysisOutput:
        """
        Analyze correlated events with LLM.

        Args:
            clusters: Event clusters with correlated data
            start_time: Analysis time range start
            end_time: Analysis time range end
            detected_patterns: List of detected pattern names

        Returns:
            Structured analysis output
        """
        # Build context for LLM
        context = self._build_context(clusters, start_time, end_time, detected_patterns)

        # Invoke LLM with structured output
        try:
            result = await asyncio.to_thread(
                self.chain.invoke,
                {"user_input": context}
            )
            return result
        except Exception as e:
            # Fallback to basic analysis on error
            return self._fallback_analysis(clusters, detected_patterns, str(e))

    def _build_context(
        self,
        clusters: List[EventCluster],
        start_time: datetime,
        end_time: datetime,
        detected_patterns: List[str]
    ) -> str:
        """Build context string for LLM from event data."""
        context_parts = [
            f"Analysis Time Range: {start_time.isoformat()} to {end_time.isoformat()}\n"
        ]

        # Add detected patterns
        if detected_patterns:
            context_parts.append(f"Detected Patterns: {', '.join(detected_patterns)}\n")

        # Aggregate metrics by type
        metric_summary = defaultdict(list)
        for cluster in clusters:
            for metric in cluster.metrics:
                metric_summary[metric.metric_type].append(metric.value)

        if metric_summary:
            context_parts.append("\nMetrics Summary:")
            for metric_type, values in metric_summary.items():
                avg_val = sum(values) / len(values)
                max_val = max(values)
                min_val = min(values)
                context_parts.append(
                    f"- {metric_type}: avg={avg_val:.2f}, min={min_val:.2f}, max={max_val:.2f} ({len(values)} samples)"
                )

        # Add recent error logs (limit to 20 most recent)
        error_logs = []
        for cluster in clusters:
            error_logs.extend([
                log for log in cluster.logs
                if log.level.upper() in ['ERROR', 'CRITICAL']
            ])

        error_logs = sorted(error_logs, key=lambda x: x.timestamp, reverse=True)[:20]

        if error_logs:
            context_parts.append("\n\nRecent Error Logs:")
            for i, log in enumerate(error_logs, 1):
                msg = log.message[:200] if log.message else "No message"
                context_parts.append(
                    f"{i}. [{log.timestamp.isoformat()}] {log.level} ({log.service or 'unknown'}): {msg}"
                )
                if log.stack_trace:
                    context_parts.append(f"   Stack: {log.stack_trace[:150]}...")
        else:
            context_parts.append("\n\nNo error logs found in this time range.")

        return "\n".join(context_parts)

    def _fallback_analysis(
        self,
        clusters: List[EventCluster],
        detected_patterns: List[str],
        error_msg: str
    ) -> LLMAnalysisOutput:
        """Provide fallback analysis if LLM fails."""
        # Count errors
        error_count = sum(
            len([log for log in cluster.logs if log.level.upper() in ['ERROR', 'CRITICAL']])
            for cluster in clusters
        )

        if error_count > 0:
            root_cause = f"Analysis failed (LLM error: {error_msg}), but detected {error_count} errors"
            severity = "major" if error_count > 20 else "minor"
        else:
            root_cause = "No significant issues detected (LLM analysis unavailable)"
            severity = "info"

        return LLMAnalysisOutput(
            root_cause=root_cause,
            root_cause_component="unknown",
            severity=severity,
            confidence_score=0.3,
            summary=f"Automatic analysis unavailable. Detected patterns: {', '.join(detected_patterns) or 'none'}. Manual review recommended.",
            evidence=[],
            suggestions=[
                LLMSuggestion(
                    action="Manually review application logs",
                    command="tail -100 /var/log/app.log",
                    priority=1
                )
            ]
        )


# Main analysis orchestrator
async def perform_ai_analysis(
    db: AsyncSession,
    project_id: str,
    start_time: datetime,
    end_time: datetime,
    focus_component: Optional[str] = None,
    trigger: str = "manual"
) -> Analysis:
    """
    Perform complete AI analysis workflow.

    This is the main entry point for AI-powered root cause analysis.

    Args:
        db: Database session
        project_id: Project UUID
        start_time: Analysis window start
        end_time: Analysis window end
        focus_component: Optional component to focus analysis on
        trigger: How analysis was triggered (manual, alert, scheduled)

    Returns:
        Created Analysis record
    """
    # Check if LangChain is available
    if not LANGCHAIN_AVAILABLE:
        # Create a placeholder analysis without LLM
        analysis = Analysis(
            project_id=project_id,
            trigger=trigger,
            time_range_start=start_time,
            time_range_end=end_time,
            focus_component=focus_component,
            root_cause="AI analysis unavailable - LangChain dependencies not installed",
            root_cause_component="unknown",
            confidence_score=0.0,
            severity="info",
            affected_services=[],
            evidence=[],
            suggestions=[{"action": "Install langchain-openai package to enable AI analysis", "priority": 1}],
            patterns_detected=[],
            event_count=0,
            cluster_count=0,
            processing_time_ms=0,
            llm_model="none",
            status="completed"
        )
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)
        return analysis

    start_processing = time.time()

    # Step 1: Correlate events
    correlation_engine = CorrelationEngine(time_window_seconds=300)
    clusters = await correlation_engine.correlate_events(
        db, project_id, start_time, end_time, focus_component
    )

    # Step 2: Detect patterns
    pattern_detector = PatternDetector()
    clusters = pattern_detector.detect_patterns(clusters)

    # Collect all detected patterns
    all_patterns = list(set(
        pattern
        for cluster in clusters
        for pattern in cluster.detected_patterns
    ))

    # Step 3: LLM analysis
    llm_analyzer = LLMAnalyzer()
    llm_result = await llm_analyzer.analyze_with_llm(
        clusters, start_time, end_time, all_patterns
    )

    # Calculate processing time
    processing_time_ms = int((time.time() - start_processing) * 1000)

    # Collect correlated IDs
    correlated_metric_ids = []
    correlated_log_ids = []
    for cluster in clusters:
        correlated_metric_ids.extend([str(m.id) for m in cluster.metrics[:10]])
        correlated_log_ids.extend([str(l.id) for l in cluster.logs[:10]])

    # Convert Pydantic models to JSON for storage
    evidence_json = [e.model_dump() for e in llm_result.evidence]
    suggestions_json = [s.model_dump() for s in llm_result.suggestions]

    # Create analysis record
    analysis = Analysis(
        project_id=project_id,
        time_range_start=start_time,
        time_range_end=end_time,
        trigger=trigger,
        root_cause=llm_result.root_cause,
        root_cause_component=llm_result.root_cause_component,
        severity=llm_result.severity,
        confidence_score=llm_result.confidence_score,
        summary=llm_result.summary,
        evidence=evidence_json,
        suggestions=suggestions_json,
        correlated_metric_ids=correlated_metric_ids[:50],  # Limit storage
        correlated_log_ids=correlated_log_ids[:50],
        llm_model="gpt-4o-mini",
        processing_time_ms=processing_time_ms
    )

    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    return analysis
