from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.schemas.need_report import NeedReportResponse

class DuplicateCandidateResponse(BaseModel):
    id: int
    report_id: int
    duplicate_report_id: int
    similarity_score: float
    status: str
    report: NeedReportResponse
    duplicate_report: NeedReportResponse

    model_config = ConfigDict(from_attributes=True)
