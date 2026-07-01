from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.need_report import NeedReport
from app.models.organization import Organization
from app.models.enums import NeedStatus
from app.schemas.need_report import NeedReportCreate, NeedReportResponse
from app.services.taxonomy import normalize_category
from app.services.ingestion import parse_and_insert_need_reports

router = APIRouter(prefix="/api/reports", tags=["Need Reports"])

@router.post("/", response_model=NeedReportResponse, status_code=status.HTTP_201_CREATED)
def create_need_report(payload: NeedReportCreate, db: Session = Depends(get_db)):
    """
    Intake form endpoint for NGOs to submit raw need reports.
    Validates the reporter ID, normalizes the raw category, and saves the report.
    """
    # Verify organization exists
    org = db.query(Organization).filter(Organization.id == payload.reported_by_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Organization with id {payload.reported_by_id} does not exist."
        )

    # Normalize category using raw_category and description
    category = normalize_category(payload.raw_category, payload.description)

    db_report = NeedReport(
        category=category,
        raw_category=payload.raw_category,
        description=payload.description,
        location=payload.location.to_wkt(),
        severity=payload.severity,
        reported_by_id=payload.reported_by_id,
        population_affected=payload.population_affected,
        corroboration_count=payload.corroboration_count,
        status=NeedStatus.RAW
    )

    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.post("/bulk", status_code=status.HTTP_200_OK)
async def bulk_upload_need_reports(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Bulk upload CSV/Excel files containing multiple Need Reports.
    Validates rows individually and reports errors with line/row numbers.
    """
    if not file.filename.endswith((".csv", ".xls", ".xlsx")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only CSV and Excel files are accepted."
        )

    file_bytes = await file.read()
    inserted, failed, errors = parse_and_insert_need_reports(file_bytes, file.filename, db)

    return {
        "filename": file.filename,
        "records_inserted": inserted,
        "records_failed": failed,
        "errors": errors
    }

@router.get("/", response_model=List[NeedReportResponse])
def list_need_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve list of raw need reports.
    """
    return db.query(NeedReport).offset(skip).limit(limit).all()
