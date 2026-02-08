from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class AnalysisRequest(BaseModel):
    time_range_start: datetime | None = None  # Default: last 1 hour
    time_range_end: datetime | None = None  # Default: now
    focus_component: str | None = None  # frontend, backend, database, server


class EvidenceItem(BaseModel):
    type: str  # metric, log, event
    timestamp: datetime
    description: str
    value: str | None = None
    source: str | None = None


class SuggestionItem(BaseModel):
    action: str
    command: str | None = None
    priority: int = 1  # 1 = highest


class AnalysisResponse(BaseModel):
    id: UUID
    created_at: datetime
    time_range_start: datetime
    time_range_end: datetime

    # Root cause
    root_cause: str
    root_cause_component: str | None
    severity: str | None
    confidence_score: float | None

    # Details
    summary: str
    evidence: list[EvidenceItem] | None
    suggestions: list[SuggestionItem] | None

    class Config:
        from_attributes = True


class AnalysisListResponse(BaseModel):
    analyses: list[AnalysisResponse]
    total: int


class HealthStatus(BaseModel):
    component: str  # frontend, backend, database, server
    status: str  # healthy, degraded, unhealthy
    score: float  # 0.0 - 1.0
    last_updated: datetime
    issues: list[str] = []


class OverallHealth(BaseModel):
    overall_status: str  # healthy, degraded, unhealthy
    overall_score: float
    components: list[HealthStatus]
    last_updated: datetime
