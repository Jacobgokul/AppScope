from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    environment: str = "production"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    environment: str | None = None
    is_active: bool | None = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    environment: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_agent_heartbeat: datetime | None = None
    agent_connected: bool = False

    class Config:
        from_attributes = True

    @classmethod
    def from_project(cls, project):
        """Create response from project model with computed agent_connected field."""
        from datetime import datetime, timezone

        # Agent is connected if heartbeat received within last 2 minutes (120 seconds)
        agent_connected = False
        if project.last_agent_heartbeat:
            time_diff = datetime.now(timezone.utc) - project.last_agent_heartbeat
            agent_connected = time_diff.total_seconds() < 120

        return cls(
            id=project.id,
            name=project.name,
            description=project.description,
            environment=project.environment,
            is_active=project.is_active,
            created_at=project.created_at,
            updated_at=project.updated_at,
            last_agent_heartbeat=project.last_agent_heartbeat,
            agent_connected=agent_connected,
        )


class APIKeyResponse(BaseModel):
    id: UUID
    key_prefix: str
    name: str
    is_active: bool
    last_used_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectWithAPIKey(BaseModel):
    project: ProjectResponse
    api_key: str  # Full API key (only shown once on creation)


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
