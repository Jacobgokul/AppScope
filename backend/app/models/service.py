from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
import enum

from app.db.session import Base


class ServiceType(str, enum.Enum):
    """Service types that can be monitored."""
    BACKEND_API = "backend_api"
    FRONTEND = "frontend"
    POSTGRESQL = "postgresql"
    MONGODB = "mongodb"
    REDIS = "redis"
    MICROSERVICE = "microservice"
    LANGFUSE = "langfuse"
    CUSTOM = "custom"


class Service(Base):
    """Represents a service being monitored within a project.

    A project can have multiple services (e.g., backend, frontend, database).
    Each service has its own configuration and health status.
    """
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)  # e.g., "main-backend", "user-db"
    service_type = Column(Enum(ServiceType), nullable=False)
    description = Column(Text, nullable=True)

    # Flexible JSON configuration for service-specific settings
    # e.g., {"db_host": "localhost", "db_port": 5432}
    # or {"api_url": "https://api.example.com"}
    config = Column(JSON, nullable=True, default=dict)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)  # Last time agent sent data for this service

    # Foreign Keys
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="services")
    alert_rules = relationship("AlertRule", back_populates="service", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="service", cascade="all, delete-orphan")
    logs = relationship("LogEvent", back_populates="service", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Service {self.name} ({self.service_type})>"
