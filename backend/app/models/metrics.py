from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
import uuid

from app.db.session import Base


class Metric(Base):
    """
    Time-series metrics table.
    Will be converted to TimescaleDB hypertable for efficient time-series storage.
    """
    __tablename__ = "metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    # Metric identification
    metric_type = Column(String(50), nullable=False, index=True)  # cpu, memory, disk, db_connections, latency, etc.
    metric_name = Column(String(100), nullable=False)
    source = Column(String(100), nullable=True)  # server, database, nginx, etc.

    # Values
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=True)  # percent, bytes, ms, count

    # Additional context
    tags = Column(JSONB, nullable=True)  # {"host": "server1", "service": "api"}

    # Foreign Keys
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    project = relationship("Project", back_populates="metrics")
    service = relationship("Service", back_populates="metrics")

    __table_args__ = (
        Index("ix_metrics_project_timestamp", "project_id", "timestamp"),
        Index("ix_metrics_project_type_timestamp", "project_id", "metric_type", "timestamp"),
    )

    def __repr__(self):
        return f"<Metric {self.metric_type}:{self.metric_name}={self.value}>"
