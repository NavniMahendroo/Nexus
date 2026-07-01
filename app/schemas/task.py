from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.models.enums import TaskStatus
from app.schemas.location import LocationCoordinate

class TaskBase(BaseModel):
    title: str
    description: str
    required_skills: List[str] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.OPEN

class TaskCreate(TaskBase):
    location: LocationCoordinate
    urgency_score: float = 0.0
    urgency_reasoning: Optional[Dict[str, Any]] = None
    need_report_ids: Optional[List[int]] = Field(default=None, description="Optional list of constituent Need Report IDs")

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    status: Optional[TaskStatus] = None
    urgency_score: Optional[float] = None
    urgency_reasoning: Optional[Dict[str, Any]] = None
    location: Optional[LocationCoordinate] = None

class TaskResponse(TaskBase):
    id: int
    location: LocationCoordinate
    urgency_score: float
    urgency_reasoning: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

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

class UrgencyScoreBreakdown(BaseModel):
    task_id: int
    raw_severity: str
    severity_score: float
    corroboration_count: int
    corroboration_score: float
    population_affected: int
    population_score: float
    days_old: float
    decay_factor: float
    raw_score: float
    final_score: float
    reasoning: str
