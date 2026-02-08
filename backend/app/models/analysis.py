from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
import uuid

from app.db.session import Base


class Analysis(Base):
    """
    AI analysis results - stored in regular table (not hypertable).
    """
    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Analysis request context
    time_range_start = Column(DateTime(timezone=True), nullable=False)
    time_range_end = Column(DateTime(timezone=True), nullable=False)
    trigger = Column(String(50), nullable=False)  # manual, alert, scheduled

    # Root cause identification
    root_cause = Column(Text, nullable=False)
    root_cause_component = Column(String(50), nullable=True)  # frontend, backend, database, server
    severity = Column(String(20), nullable=True)  # critical, major, minor, info
    confidence_score = Column(Float, nullable=True)  # 0.0 - 1.0

    # AI response
    summary = Column(Text, nullable=False)
    evidence = Column(JSONB, nullable=True)  # List of evidence items
    suggestions = Column(JSONB, nullable=True)  # List of suggested actions

    # Correlated events
    correlated_metric_ids = Column(JSONB, nullable=True)  # List of metric UUIDs
    correlated_log_ids = Column(JSONB, nullable=True)  # List of log event UUIDs

    # LLM metadata
    llm_model = Column(String(100), nullable=True)
    llm_tokens_used = Column(Integer, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)

    # Foreign Keys
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    project = relationship("Project", back_populates="analyses")

    def __repr__(self):
        return f"<Analysis {self.root_cause_component}: {self.root_cause[:50]}...>"
