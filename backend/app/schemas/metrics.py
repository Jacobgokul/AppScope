from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class MetricCreate(BaseModel):
    timestamp: datetime | None = None
    metric_type: str  # cpu, memory, disk, db_connections, latency
    metric_name: str
    source: str | None = None
    value: float
    unit: str | None = None
    tags: dict | None = None
    service_name: str | None = None  # Optional service name from agent


class MetricResponse(BaseModel):
    id: UUID
    timestamp: datetime
    metric_type: str
    metric_name: str
    source: str | None
    value: float
    unit: str | None
    tags: dict | None

    class Config:
        from_attributes = True


class MetricBatch(BaseModel):
    metrics: list[MetricCreate]
    service_name: str | None = None  # Optional service name for entire batch


class MetricQuery(BaseModel):
    metric_type: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    limit: int = 1000


class MetricAggregation(BaseModel):
    metric_type: str
    metric_name: str
    avg_value: float
    min_value: float
    max_value: float
    count: int
    time_bucket: datetime
