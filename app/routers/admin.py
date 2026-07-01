from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.duplicate_candidate import DuplicateCandidate
from app.models.need_report import NeedReport
from app.models.task import Task
from app.models.enums import NeedStatus, TaskStatus, NeedSeverity
from app.schemas.duplicate_candidate import DuplicateCandidateResponse
from app.services.urgency_scoring import recompute_task_urgency

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

    # 2. Get/Create task
    task_id = report.task_id or dup_report.task_id
    db_task = None
    if task_id:
        db_task = db.query(Task).filter(Task.id == task_id).first()

    if not db_task:
        # Create a new Task combining titles and descriptions
        db_task = Task(
            title=f"Merged: {report.category.capitalize()} Need",
            description=f"Merged duplicate reports:\n- {report.description}\n- {dup_report.description}",
            required_skills=[],
            location=report.location,
            status=TaskStatus.OPEN,
            urgency_score=0.0,
            urgency_reasoning={}
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)

    # 3. Perform fields merge
    # Statuses
    report.task_id = db_task.id
    report.status = NeedStatus.CONVERTED_TO_TASK

    dup_report.task_id = db_task.id
    dup_report.status = NeedStatus.MERGED

    # Combine raw corroboration count as informational metadata only.
    # Note: Task urgency scoring uses len(task.need_reports) (the count of distinct report rows),
    # so updating NeedReport.corroboration_count here is for record-keeping/metadata purposes only.
    severity_order = {
        NeedSeverity.LOW: 1,
        NeedSeverity.MEDIUM: 2,
        NeedSeverity.HIGH: 3,
        NeedSeverity.CRITICAL: 4
    }
    
    combined_corrob_metadata = report.corroboration_count + dup_report.corroboration_count
    max_severity = max(report.severity, dup_report.severity, key=lambda s: severity_order[s])

    report.corroboration_count = combined_corrob_metadata
    report.severity = max_severity

    # Resolve candidate status
    candidate.status = "merged"

    # Commit all changes to the database
    db.commit()

    # Recompute task urgency
    recompute_task_urgency(db_task, db)

    return {
        "message": "NeedReports merged successfully",
        "task_id": db_task.id,
        "informational_combined_corroboration_count": combined_corrob_metadata,
        "severity_assigned": max_severity
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
