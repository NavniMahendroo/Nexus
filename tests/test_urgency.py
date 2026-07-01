import pytest
import math
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from app.models.task import Task
from app.models.need_report import NeedReport
from app.models.enums import NeedSeverity, TaskStatus
from app.services.urgency_scoring import (
    calculate_urgency_breakdown,
    recompute_task_urgency,
    batch_recompute_open_tasks
)

def test_urgency_factor_scaling():
    """
    Test 1: A high-severity, recent report with high population affected
    must score significantly higher than a low-severity, low-population report.
    """
    current_time = datetime.now(timezone.utc)

    # 1. High-severity report setup
    report_high = NeedReport(
        id=1,
        severity=NeedSeverity.CRITICAL,
        population_affected=500,
        corroboration_count=5,
        timestamp=current_time
    )
    task_high = Task(id=1, status=TaskStatus.OPEN, need_reports=[report_high])

    # 2. Low-severity report setup
    report_low = NeedReport(
        id=2,
        severity=NeedSeverity.LOW,
        population_affected=2,
        corroboration_count=1,
        timestamp=current_time
    )
    task_low = Task(id=2, status=TaskStatus.OPEN, need_reports=[report_low])

    breakdown_high = calculate_urgency_breakdown(task_high)
    breakdown_low = calculate_urgency_breakdown(task_low)

    print(f"High urgency breakdown: {breakdown_high.model_dump()}")
    print(f"Low urgency breakdown: {breakdown_low.model_dump()}")

    # Assert critical task scores significantly higher
    assert breakdown_high.final_score > breakdown_low.final_score
    
    # Assert breakdown elements
    assert breakdown_high.raw_severity == "critical"
    assert breakdown_low.raw_severity == "low"
    assert breakdown_high.population_affected == 500
    assert breakdown_low.population_affected == 2
    assert breakdown_high.corroboration_count == 5
    assert breakdown_low.corroboration_count == 1

def test_recency_exponential_decay():
    """
    Test 2: Identical reports must show exponential decay based on days passed.
    """
    current_time = datetime.now(timezone.utc)
    ten_days_ago = current_time - timedelta(days=10)

    # 1. Recent task (0 days old)
    report_recent = NeedReport(
        id=3,
        severity=NeedSeverity.HIGH,
        population_affected=100,
        corroboration_count=2,
        timestamp=current_time
    )
    task_recent = Task(id=3, status=TaskStatus.OPEN, need_reports=[report_recent])

    # 2. Old task (10 days old)
    report_old = NeedReport(
        id=4,
        severity=NeedSeverity.HIGH,
        population_affected=100,
        corroboration_count=2,
        timestamp=ten_days_ago
    )
    task_old = Task(id=4, status=TaskStatus.OPEN, need_reports=[report_old])

    breakdown_recent = calculate_urgency_breakdown(task_recent)
    breakdown_old = calculate_urgency_breakdown(task_old)

    # Recent should decay near-zero (decay_factor close to 1)
    assert math.isclose(breakdown_recent.decay_factor, 1.0, abs_tol=1e-3)
    assert breakdown_recent.days_old < 0.01

    # Old task decay factor should match: e^(-lambda * days) = e^(-0.1 * 10) = e^(-1) = ~0.3678
    expected_decay = math.exp(-0.1 * 10.0)
    assert math.isclose(breakdown_old.decay_factor, expected_decay, abs_tol=1e-2)
    assert math.isclose(breakdown_old.days_old, 10.0, abs_tol=1e-2)

    # Final score of recent must be higher due to decay on the old task
    assert breakdown_recent.final_score > breakdown_old.final_score
    assert math.isclose(breakdown_old.final_score, breakdown_recent.final_score * expected_decay, abs_tol=1e-2)

def test_batch_recompute():
    """
    Test 3: Batch recompute queries all open tasks, recomputes scores, and persists to DB.
    """
    current_time = datetime.now(timezone.utc)
    
    # Setup mock tasks
    report1 = NeedReport(id=5, severity=NeedSeverity.MEDIUM, population_affected=10, corroboration_count=1, timestamp=current_time)
    task1 = Task(id=101, status=TaskStatus.OPEN, need_reports=[report1], urgency_score=0.0)

    report2 = NeedReport(id=6, severity=NeedSeverity.HIGH, population_affected=50, corroboration_count=2, timestamp=current_time)
    task2 = Task(id=102, status=TaskStatus.OPEN, need_reports=[report2], urgency_score=0.0)

    mock_db = MagicMock()
    # Mocking db.query(Task).filter(Task.status == TaskStatus.OPEN).all()
    mock_db.query.return_value.filter.return_value.all.return_value = [task1, task2]

    # Run batch recompute
    updated_ids = batch_recompute_open_tasks(mock_db)

    assert updated_ids == [101, 102]
    
    # Assert tasks were updated with scores
    assert task1.urgency_score > 0.0
    assert task2.urgency_score > 0.0
    assert task2.urgency_score > task1.urgency_score  # High vs Medium scaling
    
    # Verify DB commits and refreshes were called
    assert mock_db.commit.call_count == 2
    assert mock_db.refresh.call_count == 2
