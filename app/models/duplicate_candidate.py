from sqlalchemy import Column, Integer, ForeignKey, Float, String
from sqlalchemy.orm import relationship
from app.models.base import Base

class DuplicateCandidate(Base):
    __tablename__ = "duplicate_candidates"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("need_reports.id", ondelete="CASCADE"), nullable=False)
    duplicate_report_id = Column(Integer, ForeignKey("need_reports.id", ondelete="CASCADE"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="pending")  # "pending", "merged", "rejected"

    # Relationships
    report = relationship("NeedReport", foreign_keys=[report_id])
    duplicate_report = relationship("NeedReport", foreign_keys=[duplicate_report_id])
