from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SqlEnum, func, JSON
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from app.models.base import Base
from app.models.enums import NeedSeverity, NeedStatus

class NeedReport(Base):
    __tablename__ = "need_reports"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True, nullable=False)  # Normalized taxonomy category, e.g., "water", "medical"
    raw_category = Column(String, nullable=True)  # Raw unnormalized string submitted by user
    description = Column(String, nullable=False)
    location = Column(Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=False)
    severity = Column(SqlEnum(NeedSeverity), nullable=False, default=NeedSeverity.MEDIUM)
    reported_by_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(SqlEnum(NeedStatus), nullable=False, default=NeedStatus.RAW)
    population_affected = Column(Integer, nullable=False, default=1)
    corroboration_count = Column(Integer, nullable=False, default=1)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    embedding = Column(JSON, nullable=True)  # JSON-serialized list of floats (sentence embedding)

    # Relationships
    reporter = relationship("Organization", back_populates="reports")
    task = relationship("Task", back_populates="need_reports")

