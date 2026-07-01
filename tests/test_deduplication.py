import os
os.environ["TESTING"] = "true"

import pytest
from unittest.mock import MagicMock
from app.models.need_report import NeedReport
from app.models.duplicate_candidate import DuplicateCandidate
from app.models.task import Task
from app.models.enums import NeedSeverity, NeedStatus
from app.services.deduplication import generate_embedding, cosine_similarity, find_potential_duplicates
from app.routers.admin import merge_duplicate_reports

def test_semantic_similarity_near_identical():
    """
    Test 1: Two near-identical descriptions should produce similar mock embeddings
    and score above the threshold.
    """
    desc1 = "Urgent: We need medical aid and doctors for treating injuries immediately."
    desc2 = "Urgent: We need medical aid and doctor support for treating injuries."
    
    emb1 = generate_embedding(desc1)
    emb2 = generate_embedding(desc2)
    
    sim = cosine_similarity(emb1, emb2)
    print(f"Similarity score (near identical): {sim:.4f}")
    assert sim >= 0.85


def test_semantic_similarity_unrelated():
    """
    Test 2: Two clearly unrelated descriptions should produce very different embeddings
    and score below the threshold.
    """
    desc1 = "Urgent: We need medical aid and doctors for treating injuries immediately."
    desc2 = "Looking for temporary shelter tents for displaced families."
    
    emb1 = generate_embedding(desc1)
    emb2 = generate_embedding(desc2)
    
    sim = cosine_similarity(emb1, emb2)
    print(f"Similarity score (unrelated): {sim:.4f}")
    assert sim < 0.60


def test_duplicate_merge_operation():
    """
    Test 3: The merge operation must correctly combine corroboration counts,
    pick the higher severity of the two reports, link both reports to the single Task,
    and update their statuses.
    """
    # Create two reports to merge
    report1 = NeedReport(
        id=10,
        category="medical",
        description="First urgent medical request",
        severity=NeedSeverity.MEDIUM,
        corroboration_count=2,
        population_affected=10,
        location="POINT(-122.333 47.606)",
        status=NeedStatus.RAW
    )
    report2 = NeedReport(
        id=11,
        category="medical",
        description="Second urgent medical request duplicate",
        severity=NeedSeverity.CRITICAL,
        corroboration_count=3,
        population_affected=5,
        location="POINT(-122.330 47.600)",
        status=NeedStatus.RAW
    )
    
    # Create duplicate candidate flag
    candidate = DuplicateCandidate(
        id=1,
        report_id=10,
        duplicate_report_id=11,
        similarity_score=0.92,
        status="pending"
    )
    # Mock relationships
    candidate.report = report1
    candidate.duplicate_report = report2
    
    # Mock DB Session
    mock_db = MagicMock()
    # When querying the candidate, return our mocked candidate
    # When querying Task (task_id is None initially), return None
    mock_db.query.return_value.filter.return_value.first.side_effect = [candidate, None]
    
    # Run the merge operation (from the admin router)
    res = merge_duplicate_reports(candidate_id=1, db=mock_db)
    
    # Verify report status modifications
    assert report1.status == NeedStatus.CONVERTED_TO_TASK
    assert report2.status == NeedStatus.MERGED
    
    # Verify primary report features updated
    # Combined corroboration: 2 + 3 = 5
    assert report1.corroboration_count == 5
    # Max severity: MEDIUM vs CRITICAL -> CRITICAL
    assert report1.severity == NeedSeverity.CRITICAL
    
    # Verify candidate status resolved
    assert candidate.status == "merged"
    
    # Verify database commits were invoked
    assert mock_db.commit.call_count >= 1
