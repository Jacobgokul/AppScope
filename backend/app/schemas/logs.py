from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class LogEventCreate(BaseModel):
    timestamp: datetime | None = None
    level: str  # error, warn, info, debug
    source: str | None = None
    service: str | None = None
    message: str
    stack_trace: str | None = None
    http_method: str | None = None
    http_path: str | None = None
    http_status: int | None = None
    response_time_ms: int | None = None
    metadata: dict | None = None
    service_name: str | None = None  # Optional service name from agent


class LogEventResponse(BaseModel):
    id: UUID
    timestamp: datetime
    level: str
    source: str | None
    service: str | None
    message: str
    stack_trace: str | None
    http_method: str | None
    http_path: str | None
    http_status: int | None
    response_time_ms: int | None
    metadata: dict | None

    class Config:
        from_attributes = True


class LogEventBatch(BaseModel):
    logs: list[LogEventCreate]
    service_name: str | None = None  # Optional service name for entire batch


class LogQuery(BaseModel):
    level: str | None = None
    service: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    search: str | None = None
    limit: int = 500
