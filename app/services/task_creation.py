from typing import List
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.need_report import NeedReport
from app.models.enums import NeedStatus, TaskStatus, NeedSeverity
from app.services.urgency_scoring import recompute_task_urgency

def create_task_from_reports(reports: List[NeedReport], db: Session) -> Task:
    """
    Shared service function to create an actionable Task from one or more NeedReports.
    
    If one report is provided, it handles single-report task conversion.
    If multiple reports are provided, it handles duplicate/conflict merging.
    
    Updates report statuses, links them to the new task, computes merged severity/corroborations
    if merging, and immediately calculates the task's urgency score before returning.
    """
    if not reports:
        raise ValueError("Cannot create task from empty reports list.")

    primary = reports[0]
    
    # 1. Compute title and description
    if len(reports) == 1:
        title = f"Task: {primary.category.capitalize()} Need"
        description = primary.description
    else:
        title = f"Merged: {primary.category.capitalize()} Need"
        description = "Merged duplicate reports:\n" + "\n".join(f"- {r.description}" for r in reports)

    # 2. Build the Task object
    db_task = Task(
        title=title,
        description=description,
        required_skills=[],
        location=primary.location,
        status=TaskStatus.OPEN,
        urgency_score=0.0,
        urgency_reasoning={}
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # 3. Perform fields merge and state transitions
    severity_order = {
        NeedSeverity.LOW: 1,
        NeedSeverity.MEDIUM: 2,
        NeedSeverity.HIGH: 3,
        NeedSeverity.CRITICAL: 4
    }

    # Primary report transitions to CONVERTED_TO_TASK
    primary.task_id = db_task.id
    primary.status = NeedStatus.CONVERTED_TO_TASK

    if len(reports) > 1:
        # Sum corroborations and select highest severity
        combined_corrob = sum(r.corroboration_count for r in reports)
        max_severity = max((r.severity for r in reports), key=lambda s: severity_order[s])
        
        primary.corroboration_count = combined_corrob
        primary.severity = max_severity

        # Secondary reports transition to MERGED
        for sec in reports[1:]:
            sec.task_id = db_task.id
            sec.status = NeedStatus.MERGED

    # Save report state changes
    db.commit()

    # 4. Immediately calculate and store urgency details
    recompute_task_urgency(db_task, db)

    return db_task
