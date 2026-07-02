from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.duplicate_candidate import DuplicateCandidate
from app.models.need_report import NeedReport
from app.models.task import Task
from app.models.enums import NeedStatus, TaskStatus, NeedSeverity
from app.schemas.duplicate_candidate import DuplicateCandidateResponse
from app.services.task_creation import create_task_from_reports

router = APIRouter(prefix="/api/admin", tags=["Admin (Deduplication Review)"])

@router.get("/duplicate-candidates", response_model=List[DuplicateCandidateResponse])
def list_duplicate_candidates(db: Session = Depends(get_db)):
    """
    Lists all pending duplicate flags with both reports' text, severity, and similarity scores.
    """
    return db.query(DuplicateCandidate).filter(DuplicateCandidate.status == "pending").all()

@router.post("/duplicate-candidates/{candidate_id}/merge", status_code=status.HTTP_200_OK)
def merge_duplicate_reports(candidate_id: int, db: Session = Depends(get_db)):
    """
    Merges two duplicate NeedReports into a single Task.
    Combines their corroboration count and assigns the higher severity of the two.
    Sets duplicate report status to 'merged' and primary report to 'converted_to_task'.
    """
    # 1. Fetch candidate
    candidate = db.query(DuplicateCandidate).filter(DuplicateCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Duplicate candidate with id {candidate_id} not found."
        )

    if candidate.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate candidate is already resolved (status: '{candidate.status}')."
        )

    report = candidate.report
    dup_report = candidate.duplicate_report

    # 2. Invoke unified task creation service to merge the reports
    db_task = create_task_from_reports([report, dup_report], db)

    # 3. Resolve candidate status
    candidate.status = "merged"
    db.commit()

    return {
        "message": "NeedReports merged successfully",
        "task_id": db_task.id,
        "informational_combined_corroboration_count": report.corroboration_count,
        "severity_assigned": report.severity
    }

@router.post("/duplicate-candidates/{candidate_id}/reject", status_code=status.HTTP_200_OK)
def reject_duplicate_flag(candidate_id: int, db: Session = Depends(get_db)):
    """
    Rejects the duplicate flag, confirming both NeedReports are distinct.
    Marks status as 'rejected'.
    """
    candidate = db.query(DuplicateCandidate).filter(DuplicateCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Duplicate candidate with id {candidate_id} not found."
        )

    if candidate.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate candidate is already resolved (status: '{candidate.status}')."
        )

    candidate.status = "rejected"
    db.commit()

    return {"message": "Duplicate candidate flag rejected. Reports confirmed distinct."}
