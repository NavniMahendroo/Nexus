from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import require_role
from app.models.task import Task
from app.models.need_report import NeedReport
from app.models.enums import NeedStatus, TaskStatus
from app.schemas.task import TaskCreate, TaskResponse, UrgencyScoreBreakdown
from app.services.urgency_scoring import (
    calculate_urgency_breakdown,
    recompute_task_urgency,
    batch_recompute_open_tasks
)

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    """
    Creates a new actionable Task, optionally links existing Need Reports,
    and immediately computes the urgency score.
    """
    db_task = Task(
        title=payload.title,
        description=payload.description,
        required_skills=payload.required_skills,
        location=payload.location.to_wkt(),
        status=payload.status,
        urgency_score=0.0,
        urgency_reasoning={}
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # Associate need reports if provided
    if payload.need_report_ids:
        reports = db.query(NeedReport).filter(NeedReport.id.in_(payload.need_report_ids)).all()
        for report in reports:
            report.task_id = db_task.id
            report.status = NeedStatus.CONVERTED_TO_TASK
        db.commit()
        db.refresh(db_task)

    # Immediately calculate and store urgency details
    recompute_task_urgency(db_task, db)
    return db_task

@router.get("/", response_model=List[TaskResponse])
def list_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Lists all Tasks.
    """
    return db.query(Task).offset(skip).limit(limit).all()

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """
    Retrieves a Task by ID.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found."
        )
    return task

@router.get("/{task_id}/urgency-breakdown", response_model=UrgencyScoreBreakdown)
def get_task_urgency_breakdown(task_id: int, db: Session = Depends(get_db)):
    """
    Surfaces the granular, transparent calculation details for the urgency score of a Task.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found."
        )
    return calculate_urgency_breakdown(task)

@router.post("/recompute-urgency", status_code=status.HTTP_200_OK)
def trigger_batch_recompute(db: Session = Depends(get_db), claims: dict = Depends(require_role(["admin"]))):
    """
    Batch recomputes the urgency scores and reasoning breakdown for all open tasks.
    """
    updated_ids = batch_recompute_open_tasks(db)
    return {
        "message": f"Successfully recomputed urgency scores for {len(updated_ids)} open tasks.",
        "updated_task_ids": updated_ids
    }
