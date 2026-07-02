from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime
from typing import Optional, Any
from app.models.enums import AssignmentStatus

class AssignmentBase(BaseModel):
    volunteer_id: int
    task_id: int
    match_score: float = 0.0
    match_reasoning: Optional[str] = None
    status: AssignmentStatus = AssignmentStatus.PENDING

class AssignmentCreate(AssignmentBase):
    pass

class AssignmentUpdate(BaseModel):
    status: Optional[AssignmentStatus] = None
    decided_at: Optional[datetime] = None

class AssignmentResponse(AssignmentBase):
    id: int
    assigned_at: datetime
    decided_at: Optional[datetime] = None
    task_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def populate_task_status(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        if hasattr(data, "task") and data.task is not None:
            # Map the task's status enum/string value
            task_status_val = getattr(data.task, "status", None)
            if task_status_val:
                data.task_status = task_status_val.value if hasattr(task_status_val, "value") else str(task_status_val)
        return data
