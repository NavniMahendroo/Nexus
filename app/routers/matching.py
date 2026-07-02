from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import time
from typing import List, Dict, Any
from app.core.database import get_db
from app.core.security import require_role
from app.models.task import Task
from app.models.volunteer import Volunteer
from app.models.assignment import Assignment
from app.models.enums import TaskStatus, AssignmentStatus
from app.schemas.assignment import AssignmentResponse
from app.services.matching import GreedyMatchingStrategy, OptimalMatchingStrategy

router = APIRouter(prefix="/api/matching", tags=["Matching"])

def get_open_tasks_and_available_volunteers(db: Session):
    """
    Helper to fetch tasks that are OPEN and volunteers who are not currently ASSIGNED
    to any accepted assignment.
    """
    tasks = db.query(Task).filter(Task.status == TaskStatus.OPEN).all()
    
    # Available volunteers: volunteers who do not have an ACCEPTED assignment
    assigned_volunteer_ids = db.query(Assignment.volunteer_id).filter(
        Assignment.status == AssignmentStatus.ACCEPTED
    ).subquery()
    
    volunteers = db.query(Volunteer).filter(
        ~Volunteer.id.in_(assigned_volunteer_ids)
    ).all()
    
    return tasks, volunteers

@router.post("/run", response_model=List[AssignmentResponse], status_code=status.HTTP_200_OK)
def run_matching(
    strategy: str = Query(..., pattern="^(greedy|optimal)$", description="Matching strategy to use: 'greedy' or 'optimal'"),
    db: Session = Depends(get_db),
    claims: dict = Depends(require_role(["admin"]))
):
    """
    Runs volunteer-to-task matching using the selected strategy.
    Deletes all existing PENDING assignments, runs the algorithm,
    persists new proposed PENDING assignments, and returns them.
    """
    tasks, volunteers = get_open_tasks_and_available_volunteers(db)
    
    if not tasks or not volunteers:
        # Clear existing pending assignments even if there is nothing to match
        db.query(Assignment).filter(Assignment.status == AssignmentStatus.PENDING).delete()
        db.commit()
        return []

    # Pluggable strategy selection
    if strategy == "greedy":
        matcher = GreedyMatchingStrategy()
    else:
        matcher = OptimalMatchingStrategy()

    # Deletes previous PENDING assignments to avoid overlap/duplication
    db.query(Assignment).filter(Assignment.status == AssignmentStatus.PENDING).delete()
    db.commit()

    proposed_assignments = matcher.match(tasks, volunteers, db)

    # Persist the newly generated PENDING assignments
    if proposed_assignments:
        db.add_all(proposed_assignments)
        db.commit()
        for pa in proposed_assignments:
            db.refresh(pa)

    return proposed_assignments

@router.post("/confirm/{assignment_id}", response_model=AssignmentResponse, status_code=status.HTTP_200_OK)
def confirm_assignment(assignment_id: int, db: Session = Depends(get_db), claims: dict = Depends(require_role(["admin"]))):
    """
    Confirms a proposed PENDING assignment.
    Changes Assignment status to ACCEPTED and Task status to ASSIGNED.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with id {assignment_id} not found."
        )

    if assignment.status == AssignmentStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment is already confirmed/accepted."
        )

    # Verify task is still open and volunteer is still available
    task = db.query(Task).filter(Task.id == assignment.task_id).first()
    if not task or task.status != TaskStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The associated Task is no longer open."
        )

    # Update Assignment and Task status
    assignment.status = AssignmentStatus.ACCEPTED
    assignment.decided_at = datetime.now(timezone.utc)
    task.status = TaskStatus.ASSIGNED

    db.commit()
    db.refresh(assignment)
    return assignment

@router.post("/decline/{assignment_id}", response_model=AssignmentResponse, status_code=status.HTTP_200_OK)
def decline_assignment(assignment_id: int, db: Session = Depends(get_db)):
    """
    Declines a proposed PENDING assignment.
    Changes status to DECLINED.
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with id {assignment_id} not found."
        )

    if assignment.status != AssignmentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only decline pending assignments. Current status: {assignment.status.value}."
        )

    assignment.status = AssignmentStatus.DECLINED
    assignment.decided_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(assignment)
    return assignment

@router.post("/status/{assignment_id}", response_model=AssignmentResponse, status_code=status.HTTP_200_OK)
def update_assignment_status(assignment_id: int, task_status: TaskStatus = Query(..., description="New task status"), db: Session = Depends(get_db)):
    """
    Updates the progression status of a task for an accepted assignment (e.g., in_progress, completed).
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with id {assignment_id} not found."
        )

    if assignment.status != AssignmentStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update task progression status unless the assignment is ACCEPTED."
        )

    task = db.query(Task).filter(Task.id == assignment.task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task associated with assignment not found."
        )

    task.status = task_status
    db.commit()
    db.refresh(assignment)
    return assignment

@router.get("/compare", status_code=status.HTTP_200_OK)
def compare_matching_strategies(db: Session = Depends(get_db), claims: dict = Depends(require_role(["admin"]))):
    """
    Benchmarks and compares the Greedy and Hungarian (Optimal) strategies
    on the current set of open tasks and available volunteers.
    Does not save or commit any assignments to the database.
    """
    tasks, volunteers = get_open_tasks_and_available_volunteers(db)
    
    if not tasks or not volunteers:
        return {
            "greedy": {"matched_count": 0, "total_urgency_weighted_coverage": 0.0, "runtime_ms": 0.0},
            "optimal": {"matched_count": 0, "total_urgency_weighted_coverage": 0.0, "runtime_ms": 0.0}
        }

    task_urgencies = {t.id: (t.urgency_score or 0.0) for t in tasks}

    # 1. Benchmark Greedy
    greedy_matcher = GreedyMatchingStrategy()
    start_greedy = time.perf_counter()
    greedy_matches = greedy_matcher.match(tasks, volunteers, db)
    end_greedy = time.perf_counter()
    greedy_runtime = (end_greedy - start_greedy) * 1000.0

    greedy_coverage = sum(
        m.match_score * task_urgencies.get(m.task_id, 0.0) for m in greedy_matches
    )

    # 2. Benchmark Optimal (Hungarian)
    optimal_matcher = OptimalMatchingStrategy()
    start_optimal = time.perf_counter()
    optimal_matches = optimal_matcher.match(tasks, volunteers, db)
    end_optimal = time.perf_counter()
    optimal_runtime = (end_optimal - start_optimal) * 1000.0

    optimal_coverage = sum(
        m.match_score * task_urgencies.get(m.task_id, 0.0) for m in optimal_matches
    )

    return {
        "greedy": {
            "matched_count": len(greedy_matches),
            "total_urgency_weighted_coverage": round(greedy_coverage, 4),
            "runtime_ms": round(greedy_runtime, 4)
        },
        "optimal": {
            "matched_count": len(optimal_matches),
            "total_urgency_weighted_coverage": round(optimal_coverage, 4),
            "runtime_ms": round(optimal_runtime, 4)
        }
    }
