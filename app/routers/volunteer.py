from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.volunteer import Volunteer
from app.schemas.volunteer import VolunteerCreate, VolunteerResponse

router = APIRouter(prefix="/api/volunteers", tags=["Volunteers"])

@router.post("/", response_model=VolunteerResponse, status_code=status.HTTP_201_CREATED)
def create_volunteer(payload: VolunteerCreate, db: Session = Depends(get_db)):
    """
    Register a new volunteer.
    """
    db_volunteer = Volunteer(
        name=payload.name,
        skills=payload.skills,
        availability=payload.availability,
        location=payload.location.to_wkt(),
        contact_info=payload.contact_info
    )
    db.add(db_volunteer)
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer

@router.get("/", response_model=List[VolunteerResponse])
def list_volunteers(db: Session = Depends(get_db)):
    """
    List all registered volunteers.
    """
    return db.query(Volunteer).all()
