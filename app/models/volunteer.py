from sqlalchemy import Column, Integer, String, DateTime, func, JSON
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from app.models.base import Base

class Volunteer(Base):
    __tablename__ = "volunteers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    skills = Column(ARRAY(String), nullable=False, default=list)
    availability = Column(JSON, nullable=True)  # Structured availability, e.g. {"days": ["Monday", "Wednesday"], "hours": "evening"}
    location = Column(Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=False)
    contact_info = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    assignments = relationship("Assignment", back_populates="volunteer")
