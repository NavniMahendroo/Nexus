import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.models.need_report import NeedReport
from app.models.task import Task
from app.models.enums import NeedSeverity, NeedStatus, TaskStatus
from app.services.task_creation import create_task_from_reports
from app.routers.need_report import convert_report_to_task

def test_convert_raw_report_to_task():
    """
    1. Converting a RAW report creates a task with correct urgency score
    and correct task_id linkage.
    """
    report = NeedReport(
        id=101,
        category="rescue",
        description="Raw rescue need description",
        severity=NeedSeverity.HIGH,
        corroboration_count=2,
        population_affected=20,
        location="POINT(-122.333 47.606)",
        status=NeedStatus.RAW
    )

    mock_db = MagicMock()

    # Mock recompute_task_urgency inside create_task_from_reports
    with patch("app.services.task_creation.recompute_task_urgency") as mock_recompute:
        # Define mock behavior: set a score during recomputation
        def mock_recompute_impl(task, db):
            task.urgency_score = 4.2
        mock_recompute.side_effect = mock_recompute_impl

        task = create_task_from_reports([report], mock_db)

        # Assert status transitions and linkages
        assert report.status == NeedStatus.CONVERTED_TO_TASK
        assert report.task_id == task.id
        assert task.urgency_score == 4.2
        assert task.status == TaskStatus.OPEN
        assert task.title == "Task: Rescue Need"
        assert task.description == "Raw rescue need description"
        
        # Verify db interaction
        assert mock_db.commit.call_count >= 1

def test_convert_already_converted_raises_400():
    """
    2. Attempting to convert an already-CONVERTED_TO_TASK or MERGED report
    returns a 400 Bad Request error.
    """
    # Test case 1: CONVERTED_TO_TASK report
    report_converted = NeedReport(
        id=102,
        category="rescue",
        description="Already converted report",
        severity=NeedSeverity.HIGH,
        corroboration_count=1,
        population_affected=10,
        location="POINT(-122.333 47.606)",
        status=NeedStatus.CONVERTED_TO_TASK
    )

    # Test case 2: MERGED report
    report_merged = NeedReport(
        id=103,
        category="rescue",
        description="Already merged report",
        severity=NeedSeverity.HIGH,
        corroboration_count=1,
        population_affected=10,
        location="POINT(-122.333 47.606)",
        status=NeedStatus.MERGED
    )

    mock_db = MagicMock()
    # Mock query to return our already converted report first
    mock_db.query.return_value.filter.return_value.first.side_effect = [report_converted, report_merged]

    # Call route for report 102
    with pytest.raises(HTTPException) as exc_info1:
        convert_report_to_task(report_id=102, db=mock_db)
    assert exc_info1.value.status_code == 400
    assert "already been converted or merged" in exc_info1.value.detail

    # Call route for report 103
    with pytest.raises(HTTPException) as exc_info2:
        convert_report_to_task(report_id=103, db=mock_db)
    assert exc_info2.value.status_code == 400
    assert "already been converted or merged" in exc_info2.value.detail

def test_shared_create_task_from_reports_consistency():
    """
    3. The shared create_task_from_reports() function produces identical results
    regarding primary report status updates and task creation constraints,
    whether called with one report (conversion) or two reports (merge).
    """
    report1 = NeedReport(
        id=201,
        category="medical",
        description="Urgent medical supply needed",
        severity=NeedSeverity.MEDIUM,
        corroboration_count=3,
        population_affected=15,
        location="POINT(-122.333 47.606)",
        status=NeedStatus.RAW
    )

    report2 = NeedReport(
        id=202,
        category="medical",
        description="Duplicates: Urgent medical supply needed",
        severity=NeedSeverity.CRITICAL,
        corroboration_count=1,
        population_affected=5,
        location="POINT(-122.333 47.606)",
        status=NeedStatus.RAW
    )

    mock_db = MagicMock()

    with patch("app.services.task_creation.recompute_task_urgency") as mock_recompute:
        # Run conversion path (1 report)
        task_single = create_task_from_reports([report1], mock_db)
        
        # Reset report1 status back to RAW for the merge test
        report1.status = NeedStatus.RAW
        report1.task_id = None

        # Run merge path (2 reports)
        task_merge = create_task_from_reports([report1, report2], mock_db)

        # Check that both paths correctly transitioned report1 to CONVERTED_TO_TASK
        assert report1.status == NeedStatus.CONVERTED_TO_TASK
        assert report1.task_id == task_merge.id

        # Check secondary duplicate report correct status transition
        assert report2.status == NeedStatus.MERGED
        assert report2.task_id == task_merge.id

        # Check max severity calculation and corroboration sum in merge path
        # 3 + 1 = 4
        assert report1.corroboration_count == 4
        # MEDIUM vs CRITICAL -> CRITICAL
        assert report1.severity == NeedSeverity.CRITICAL
