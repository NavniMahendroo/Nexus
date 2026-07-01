from sqlalchemy import Column, Integer, ForeignKey, Float, String, DateTime, Enum as SqlEnum, func
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enums import AssignmentStatus

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    volunteer_id = Column(Integer, ForeignKey("volunteers.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, nullable=False, default=0.0)
    match_reasoning = Column(String, nullable=True)
    status = Column(SqlEnum(AssignmentStatus), nullable=False, default=AssignmentStatus.PENDING)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    decided_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    volunteer = relationship("Volunteer", back_populates="assignments")
    task = relationship("Task", back_populates="assignments")
