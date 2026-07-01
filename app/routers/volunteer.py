from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.volunteer import Volunteer
from app.models.task import Task
from app.models.assignment import Assignment
from app.models.enums import AssignmentStatus
from app.schemas.volunteer import VolunteerCreate, VolunteerResponse, VolunteerNearbyResponse
from app.services.geospatial import compute_distance_km, get_volunteers_within_radius

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

@router.get("/nearby", response_model=List[VolunteerNearbyResponse])
def get_nearby_volunteers(
    task_id: int,
    radius_km: float = Query(50.0, description="Search radius in kilometers"),
    db: Session = Depends(get_db)
):
    """
    Returns available volunteers (those without accepted assignments) located within
    radius_km of the specified Task's location, sorted by distance ascending.
    """
    # 1. Fetch Task
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found."
        )

    # 2. Find available volunteer IDs (no ACCEPTED assignments)
    assigned_volunteer_ids = db.query(Assignment.volunteer_id).filter(
        Assignment.status == AssignmentStatus.ACCEPTED
    ).subquery()

    # 3. Retrieve available volunteers
    available_vols = db.query(Volunteer).filter(
        ~Volunteer.id.in_(assigned_volunteer_ids)
    ).all()

    # 4. Filter by radius using ST_DWithin (with Python-based fallback)
    nearby_vols = get_volunteers_within_radius(db, task.location, radius_km, available_vols)

    # 5. Compute distances and construct responses
    results = []
    for vol in nearby_vols:
        dist = compute_distance_km(db, task, vol)
        results.append(VolunteerNearbyResponse(volunteer=vol, distance_km=dist))

    # 6. Sort results by distance ascending
    results.sort(key=lambda x: x.distance_km)

    return results

