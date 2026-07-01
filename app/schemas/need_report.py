from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime
from typing import Optional, Any
from app.models.enums import NeedSeverity, NeedStatus
from app.schemas.location import LocationCoordinate

class NeedReportBase(BaseModel):
    description: str
    severity: NeedSeverity = NeedSeverity.MEDIUM
    population_affected: int = 1
    corroboration_count: int = 1

class NeedReportCreate(NeedReportBase):
    raw_category: str
    location: LocationCoordinate
    reported_by_id: int

class NeedReportUpdate(BaseModel):
    description: Optional[str] = None
    severity: Optional[NeedSeverity] = None
    status: Optional[NeedStatus] = None
    population_affected: Optional[int] = None
    corroboration_count: Optional[int] = None
    location: Optional[LocationCoordinate] = None

class NeedReportResponse(NeedReportBase):
    id: int
    category: str
    raw_category: Optional[str] = None
    location: LocationCoordinate
    reported_by_id: int
    timestamp: datetime
    status: NeedStatus
    task_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def convert_orm(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        res = {}
        for field in cls.model_fields:
            if field == "location":
                res["location"] = LocationCoordinate.from_geoalchemy(getattr(data, "location", None))
            elif hasattr(data, field):
                res[field] = getattr(data, field)
        return res
