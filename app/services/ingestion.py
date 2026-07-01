import io
import pandas as pd
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.need_report import NeedReport
from app.models.enums import NeedSeverity, NeedStatus
from app.models.organization import Organization
from app.services.taxonomy import normalize_category
from app.services.deduplication import generate_embedding, find_potential_duplicates
from app.models.duplicate_candidate import DuplicateCandidate


def parse_and_insert_need_reports(
    file_bytes: bytes,
    filename: str,
    db: Session
) -> Tuple[int, int, List[Dict[str, Any]]]:
    """
    Parses a CSV or Excel bulk file containing Need Reports, validates the rows, and inserts valid reports.
    Returns:
        (inserted_count, failed_count, list_of_errors)
        Errors have structure: {"row": row_number, "errors": ["error message 1", ...]}
    """
    # 1. Read file into a pandas DataFrame
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            return 0, 0, [{"row": 0, "errors": ["Unsupported file format. Please upload .csv, .xls, or .xlsx"]}]
    except Exception as e:
        return 0, 0, [{"row": 0, "errors": [f"Failed to parse file structure: {str(e)}"]}]

    # 2. Fetch valid NGO organization IDs to avoid redundant queries
    existing_org_ids = set(r[0] for r in db.query(Organization.id).all())

    inserted_count = 0
    errors = []
    need_reports_to_insert = []

    # Expected column mapping
    required_cols = {"description", "latitude", "longitude", "severity", "reported_by_id"}
    df.columns = [col.strip().lower() for col in df.columns]

    # Verify if columns are missing
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        return 0, 0, [{"row": 0, "errors": [f"Missing required columns: {', '.join(missing_cols)}"]}]

    # 3. Iterate and validate each row (1-indexed for sheets)
    for idx, row in df.iterrows():
        row_num = idx + 2  # standard 1-based index (plus header row)
        row_errors = []

        # Validate reported_by_id
        reported_by_val = row.get("reported_by_id")
        try:
            reported_by_id = int(reported_by_val)
            if reported_by_id not in existing_org_ids:
                row_errors.append(f"reported_by_id {reported_by_id} does not exist.")
        except (ValueError, TypeError):
            row_errors.append(f"reported_by_id must be an integer, got '{reported_by_val}'.")

        # Validate description
        description = str(row.get("description", "")).strip()
        if not description or description == "nan":
            row_errors.append("description is required and cannot be empty.")

        # Validate latitude and longitude
        lat_val = row.get("latitude")
        lng_val = row.get("longitude")
        latitude = None
        longitude = None

        try:
            latitude = float(lat_val)
            if not (-90.0 <= latitude <= 90.0):
                row_errors.append(f"latitude must be between -90.0 and 90.0, got {latitude}.")
        except (ValueError, TypeError):
            row_errors.append(f"latitude must be a float, got '{lat_val}'.")

        try:
            longitude = float(lng_val)
            if not (-180.0 <= longitude <= 180.0):
                row_errors.append(f"longitude must be between -180.0 and 180.0, got {longitude}.")
        except (ValueError, TypeError):
            row_errors.append(f"longitude must be a float, got '{lng_val}'.")

        # Validate severity
        severity_val = str(row.get("severity", "")).strip().lower()
        severity = None
        try:
            severity = NeedSeverity(severity_val)
        except ValueError:
            valid_severities = ", ".join([v.value for v in NeedSeverity])
            row_errors.append(f"severity must be one of [{valid_severities}], got '{severity_val}'.")

        # Optional: population_affected
        population_affected = 1
        if "population_affected" in df.columns:
            pop_val = row.get("population_affected")
            if pd.notna(pop_val):
                try:
                    population_affected = int(pop_val)
                    if population_affected < 0:
                        row_errors.append("population_affected cannot be negative.")
                except (ValueError, TypeError):
                    row_errors.append(f"population_affected must be an integer, got '{pop_val}'.")

        # Optional: corroboration_count
        corroboration_count = 1
        if "corroboration_count" in df.columns:
            corr_val = row.get("corroboration_count")
            if pd.notna(corr_val):
                try:
                    corroboration_count = int(corr_val)
                    if corroboration_count < 1:
                        row_errors.append("corroboration_count must be at least 1.")
                except (ValueError, TypeError):
                    row_errors.append(f"corroboration_count must be an integer, got '{corr_val}'.")

        # Optional: raw_category / category
        raw_category = str(row.get("raw_category", "other")).strip() if "raw_category" in df.columns else "other"
        if raw_category == "nan":
            raw_category = "other"

        if row_errors:
            errors.append({"row": row_num, "errors": row_errors})
            continue

        # 4. Generate postgis point geography
        wkt_location = f"POINT({longitude} {latitude})"

        # 5. Normalize category taxonomy
        category = normalize_category(raw_category, description=description)

        need_report = NeedReport(
            category=category,
            raw_category=raw_category,
            description=description,
            location=wkt_location,
            severity=severity,
            reported_by_id=reported_by_id,
            status=NeedStatus.RAW,
            population_affected=population_affected,
            corroboration_count=corroboration_count,
            embedding=generate_embedding(description)
        )
        need_reports_to_insert.append(need_report)

    # 6. Bulk write if no error or write valid records
    # Let's save all valid rows and report invalid ones
    if need_reports_to_insert:
        db.add_all(need_reports_to_insert)
        db.commit()

        # Run duplicate detection for the newly inserted reports
        duplicate_candidates = []
        for report in need_reports_to_insert:
            potential_duplicates = find_potential_duplicates(report, db)
            for dup_report, score in potential_duplicates:
                candidate = DuplicateCandidate(
                    report_id=report.id,
                    duplicate_report_id=dup_report.id,
                    similarity_score=score,
                    status="pending"
                )
                duplicate_candidates.append(candidate)

        if duplicate_candidates:
            db.add_all(duplicate_candidates)
            db.commit()

        inserted_count = len(need_reports_to_insert)

    failed_count = len(errors)
    return inserted_count, failed_count, errors
