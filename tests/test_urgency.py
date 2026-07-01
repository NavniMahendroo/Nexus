import pytest
import math
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
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

    # 1. High-severity report setup (severity Critical = 5.0, pop = 500, reports = 1)
    report_high = NeedReport(
        id=1,
        severity=NeedSeverity.CRITICAL,
        population_affected=500,
        corroboration_count=5,  # raw count is 5, but we use len(reports) = 1 for task scoring
        timestamp=current_time
    )
    task_high = Task(id=1, status=TaskStatus.OPEN, need_reports=[report_high])

    # 2. Low-severity report setup (severity Low = 1.0, pop = 2, reports = 1)
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
    
    # Corroboration count should equal len(reports) which is 1 for both
    assert breakdown_high.corroboration_count == 1
    assert breakdown_low.corroboration_count == 1

def test_recency_exponential_decay():
    """
    Test 2: Recency decay must apply ONLY to corroboration and population components,
    leaving severity at full weight.
    """
    current_time = datetime.now(timezone.utc)
    ten_days_ago = current_time - timedelta(days=10)

    # 1. Recent task (0 days old)
    # Severity High = 4.0, Pop = 100 (log10(101) = 2.0), reports = 1 (corrob = 0.5)
    # Raw components: severity = 4.0, recency-sensitive = 2.5
    report_recent = NeedReport(
        id=3,
        severity=NeedSeverity.HIGH,
        population_affected=100,
        corroboration_count=2,
        timestamp=current_time
    )
    task_recent = Task(id=3, status=TaskStatus.OPEN, need_reports=[report_recent])

    # 2. Old task (10 days old) with identical metrics
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

    # Verify that severity component is NOT decayed
    assert breakdown_old.severity_score == 4.0
    
    # Expected old score = severity_score + (corroboration_score + population_score) * expected_decay
    # 4.0 + (0.5 + 2.0) * 0.3678 = 4.0 + 0.9195 = 4.9195
    expected_old_score = breakdown_recent.severity_score + (breakdown_recent.corroboration_score + breakdown_recent.population_score) * expected_decay
    assert math.isclose(breakdown_old.final_score, expected_old_score, abs_tol=1e-2)
    
    # The old task's score is decayed but does not decay the severity to 0 (stays above 4.0)
    assert breakdown_recent.final_score > breakdown_old.final_score
    assert breakdown_old.final_score > 4.0

def test_batch_recompute():
    """
    Test 3: Batch recompute queries all open tasks, recomputes, and issues a single commit.
    """
    current_time = datetime.now(timezone.utc)
    
    # Setup mock tasks
    report1 = NeedReport(id=5, severity=NeedSeverity.MEDIUM, population_affected=10, timestamp=current_time)
    task1 = Task(id=101, status=TaskStatus.OPEN, need_reports=[report1], urgency_score=0.0)

    report2 = NeedReport(id=6, severity=NeedSeverity.HIGH, population_affected=50, timestamp=current_time)
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
    
    # Verify DB commit was called EXACTLY ONCE for the entire batch
    assert mock_db.commit.call_count == 1
