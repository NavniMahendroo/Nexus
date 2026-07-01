from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
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

    model_config = ConfigDict(from_attributes=True)
