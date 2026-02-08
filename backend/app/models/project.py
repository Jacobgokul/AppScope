from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

from app.db.session import Base


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint('owner_id', 'name', name='uq_project_owner_name'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    environment = Column(String(50), default="production")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_agent_heartbeat = Column(DateTime(timezone=True), nullable=True)  # Last time agent sent data

    # Foreign Keys
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="projects")
    api_keys = relationship("APIKey", back_populates="project", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="project", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="project", cascade="all, delete-orphan")
    logs = relationship("LogEvent", back_populates="project", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="project", cascade="all, delete-orphan")
    alert_rules = relationship("AlertRule", back_populates="project", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project {self.name}>"


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key_hash = Column(String(255), nullable=False)  # Hashed API key
    key_prefix = Column(String(20), nullable=False)  # First 16 chars for identification
    name = Column(String(100), default="Default")
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Foreign Keys
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="api_keys")

    def __repr__(self):
        return f"<APIKey {self.key_prefix}...>"
