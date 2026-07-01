import pytest
from unittest.mock import MagicMock
from app.services.taxonomy import normalize_category
from app.services.ingestion import parse_and_insert_need_reports

def test_normalize_category():
    # Test raw category matching
    assert normalize_category("clean drinking water") == "water"
    assert normalize_category("need medical help") == "medical"
    assert normalize_category("emergency shelter") == "shelter"
    assert normalize_category("canned food rations") == "food"
    assert normalize_category("something else") == "other"
    
    # Test description fallback matching
    assert normalize_category("urgent need", "We need bottles of clean water here") == "water"
    assert normalize_category("request", "A doctor is required to treat the injured") == "medical"
    assert normalize_category("supplies", "Temporary tents for refugees") == "shelter"
    assert normalize_category("assistance", "Distributing bread and rice") == "food"
    assert normalize_category("miscellaneous", "Cleaning up road debris") == "other"


def test_bulk_ingestion_validation():
    # Test bulk ingestion with mock DB to isolate and verify spreadsheet validation logic
    mock_db = MagicMock()
    # Mock organization check: org ID 1 and 2 exist
    mock_db.query.return_value.all.return_value = [(1,), (2,)]

    # 1. Test CSV file with validation errors
    csv_content = (
        "description,latitude,longitude,severity,reported_by_id,population_affected,corroboration_count,raw_category\n"
        "Need water here,45.0,-120.0,high,1,10,2,drinking water\n"  # Valid row
        "Need doctor,120.0,-120.0,critical,2,5,1,medical\n"       # Invalid lat (>90)
        "Need shelter,45.0,-120.0,invalid_sev,2,5,1,shelter\n"    # Invalid severity
        "Need food,45.0,-120.0,medium,999,5,1,food\n"             # Invalid reported_by_id (not in existing_org_ids)
    )

    inserted, failed, errors = parse_and_insert_need_reports(
        csv_content.encode("utf-8"),
        "test_reports.csv",
        mock_db
    )

    assert inserted == 1
    assert failed == 3
    assert len(errors) == 3

    # Row 3 (Index 1) has lat error
    assert any("latitude must be between -90.0 and 90.0" in err for err in errors[0]["errors"])
    # Row 4 (Index 2) has severity error
    assert any("severity must be one of" in err for err in errors[1]["errors"])
    # Row 5 (Index 3) has reported_by_id error
    assert any("reported_by_id 999 does not exist" in err for err in errors[2]["errors"])
