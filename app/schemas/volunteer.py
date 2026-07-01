from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.schemas.location import LocationCoordinate

class VolunteerBase(BaseModel):
    name: str
    skills: List[str] = Field(default_factory=list)
    availability: Optional[Dict[str, Any]] = None
    contact_info: Optional[str] = None

class VolunteerCreate(VolunteerBase):
    location: LocationCoordinate

class VolunteerUpdate(BaseModel):
    name: Optional[str] = None
    skills: Optional[List[str]] = None
    availability: Optional[Dict[str, Any]] = None
    location: Optional[LocationCoordinate] = None
    contact_info: Optional[str] = None

class VolunteerResponse(VolunteerBase):
    id: int
    location: LocationCoordinate
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def convert_orm(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        # Handle SQLAlchemy model mapping
        res = {}
        for field in cls.model_fields:
            if field == "location":
                res["location"] = LocationCoordinate.from_geoalchemy(getattr(data, "location", None))
            elif hasattr(data, field):
                res[field] = getattr(data, field)
        return res

class VolunteerNearbyResponse(BaseModel):
    volunteer: VolunteerResponse
    distance_km: float

