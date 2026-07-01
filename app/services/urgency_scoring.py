import math
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.enums import NeedSeverity, TaskStatus
from app.schemas.task import UrgencyScoreBreakdown

# Configurable Weights & Constant Mappings
SEVERITY_MAPPING = {
    NeedSeverity.LOW: 1.0,
    NeedSeverity.MEDIUM: 2.5,
    NeedSeverity.HIGH: 4.0,
    NeedSeverity.CRITICAL: 5.0
}

WEIGHT_SEVERITY = 1.0
WEIGHT_CORROBORATION = 0.5
MAX_CORROBORATION_SCORE = 2.5
WEIGHT_POPULATION = 1.0
DECAY_RATE_DAILY = 0.1  # lambda for exponential decay e^(-lambda * t)

def calculate_urgency_breakdown(task: Task) -> UrgencyScoreBreakdown:
    """
    Computes a transparent, rule-based urgency score breakdown for a Task.
    Does not write or commit changes to the database.
    """
    reports = task.need_reports

    if not reports:
        # Default fallback if there are no reports linked
        return UrgencyScoreBreakdown(
            task_id=task.id if task.id else 0,
            raw_severity="medium",
            severity_score=2.5,
            corroboration_count=0,
            corroboration_score=0.0,
            population_affected=0,
            population_score=0.0,
            days_old=0.0,
            decay_factor=1.0,
            raw_score=2.5,
            final_score=2.5,
            reasoning="No need reports linked. Defaulted to medium severity."
        )

    # 1. Severity Score: Get highest severity of the linked reports
    max_severity = NeedSeverity.LOW
    severity_order = {
        NeedSeverity.LOW: 1,
        NeedSeverity.MEDIUM: 2,
        NeedSeverity.HIGH: 3,
        NeedSeverity.CRITICAL: 4
    }

    for r in reports:
        if severity_order[r.severity] > severity_order[max_severity]:
            max_severity = r.severity

    severity_base = SEVERITY_MAPPING.get(max_severity, 2.5)
    severity_score = severity_base * WEIGHT_SEVERITY

    # 2. Corroboration Score: Sum of corroboration count of reports
    total_corroborations = sum(r.corroboration_count for r in reports)
    corroboration_score = min(total_corroborations * WEIGHT_CORROBORATION, MAX_CORROBORATION_SCORE)

    # 3. Population Affected Score: Log-scaled sum of population affected
    total_population = sum(r.population_affected for r in reports)
    population_score = math.log10(total_population + 1) * WEIGHT_POPULATION

    # 4. Raw Score
    raw_score = severity_score + corroboration_score + population_score

    # 5. Decay Factor: Time difference in days since the most recent report timestamp
    current_time = datetime.now(timezone.utc)
    latest_timestamp = None

    for r in reports:
        ts = r.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if latest_timestamp is None or ts > latest_timestamp:
            latest_timestamp = ts

    if latest_timestamp:
        time_diff = current_time - latest_timestamp
        days_old = max(time_diff.total_seconds() / 86400.0, 0.0)
    else:
        days_old = 0.0

    decay_factor = math.exp(-DECAY_RATE_DAILY * days_old)

    # 6. Final Score (Capped at 10.0)
    final_score = min(raw_score * decay_factor, 10.0)

    reasoning = (
        f"Base Raw Score: {raw_score:.2f} (Severity contribution: {severity_score:.2f} [{max_severity.value}], "
        f"Corroboration contribution: {corroboration_score:.2f} [count: {total_corroborations}], "
        f"Population contribution: {population_score:.2f} [affected: {total_population}]). "
        f"Time decay: {decay_factor:.4f} (Age: {days_old:.2f} days old). "
        f"Final Urgency Score: {final_score:.2f}/10."
    )

    return UrgencyScoreBreakdown(
        task_id=task.id if task.id else 0,
        raw_severity=max_severity.value,
        severity_score=severity_score,
        corroboration_count=total_corroborations,
        corroboration_score=corroboration_score,
        population_affected=total_population,
        population_score=population_score,
        days_old=days_old,
        decay_factor=decay_factor,
        raw_score=raw_score,
        final_score=final_score,
        reasoning=reasoning
    )

def recompute_task_urgency(task: Task, db: Session) -> Task:
    """
    Recalculates the urgency score and saves the result in task.urgency_score and task.urgency_reasoning.
    """
    breakdown = calculate_urgency_breakdown(task)
    task.urgency_score = breakdown.final_score
    task.urgency_reasoning = breakdown.model_dump()
    db.commit()
    db.refresh(task)
    return task

def batch_recompute_open_tasks(db: Session) -> List[int]:
    """
    Recomputes the urgency score for all open tasks.
    """
    tasks = db.query(Task).filter(Task.status == TaskStatus.OPEN).all()
    updated_ids = []
    for task in tasks:
        recompute_task_urgency(task, db)
        updated_ids.append(task.id)
    return updated_ids
