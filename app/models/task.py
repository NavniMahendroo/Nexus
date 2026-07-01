from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SqlEnum, func, JSON
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from app.models.base import Base
from app.models.enums import TaskStatus

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(String, nullable=False)
    required_skills = Column(ARRAY(String), nullable=False, default=list)
    location = Column(Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=False)
    urgency_score = Column(Float, nullable=False, default=0.0)
    urgency_reasoning = Column(JSON, nullable=True)  # Breakdown reasoning dict
    status = Column(SqlEnum(TaskStatus), nullable=False, default=TaskStatus.OPEN)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    need_reports = relationship("NeedReport", back_populates="task")
    assignments = relationship("Assignment", back_populates="task")
