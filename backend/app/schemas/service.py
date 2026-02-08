from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

from app.models.service import ServiceType


class ServiceCreate(BaseModel):
    """Schema for creating a new service."""
    name: str = Field(..., min_length=1, max_length=255, description="Service name (e.g., 'main-backend')")
    service_type: ServiceType = Field(..., description="Type of service being monitored")
    description: str | None = Field(None, description="Optional description")
    config: dict = Field(default_factory=dict, description="Service-specific configuration")

    class Config:
        use_enum_values = True


class ServiceUpdate(BaseModel):
    """Schema for updating an existing service."""
    name: str | None = Field(None, min_length=1, max_length=255)
    service_type: ServiceType | None = None
    description: str | None = None
    config: dict | None = None
    is_active: bool | None = None

    class Config:
        use_enum_values = True


class ServiceResponse(BaseModel):
    """Schema for service response."""
    id: UUID
    name: str
    service_type: str
    description: str | None
    config: dict
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_heartbeat: datetime | None
    project_id: UUID

    class Config:
        from_attributes = True


class ServiceListResponse(BaseModel):
    """Schema for listing services."""
    services: list[ServiceResponse]
    total: int


class ServiceStatus(BaseModel):
    """Schema for service connection status."""
    service_id: UUID
    service_name: str
    service_type: str
    is_connected: bool
    last_heartbeat: datetime | None
    time_since_heartbeat: str | None  # Human-readable time (e.g., "5 minutes ago")


class AgentStatusResponse(BaseModel):
    """Schema for agent connection status across all services."""
    project_id: UUID
    project_name: str
    services: list[ServiceStatus]
    total_services: int
    connected_services: int
    disconnected_services: int
