from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
import uuid

from app.db.session import Base


class LogEvent(Base):
    """
    Log events table.
    Will be converted to TimescaleDB hypertable for efficient time-series storage.
    """
    __tablename__ = "log_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    # Log identification
    level = Column(String(20), nullable=False, index=True)  # error, warn, info, debug
    source = Column(String(100), nullable=True)  # app.log, nginx.access, etc.
    service_name = Column(String(100), nullable=True)  # backend, frontend, database (legacy, prefer service_id)

    # Content
    message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)

    # HTTP context (if applicable)
    http_method = Column(String(10), nullable=True)
    http_path = Column(String(500), nullable=True)
    http_status = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)

    # Additional context
    extra_metadata = Column(JSONB, nullable=True)  # Additional structured data

    # Foreign Keys
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    project = relationship("Project", back_populates="logs")
    service = relationship("Service", back_populates="logs")

    __table_args__ = (
        Index("ix_logs_project_timestamp", "project_id", "timestamp"),
        Index("ix_logs_project_level_timestamp", "project_id", "level", "timestamp"),
    )

    def __repr__(self):
        return f"<LogEvent [{self.level}] {self.message[:50]}...>"
