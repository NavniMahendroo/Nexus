import math
import logging
import shapely.wkt
from geoalchemy2.elements import WKBElement
from geoalchemy2.shape import to_shape
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Tuple
from app.models.task import Task
from app.models.volunteer import Volunteer

logger = logging.getLogger(__name__)

def get_coords(location) -> Tuple[float, float]:
    """
    Extract (longitude, latitude) from a location field.
    Can handle WKBElement, WKT strings, shapely points, or dicts.
    """
    if location is None:
        raise ValueError("Location coordinate is None")
    if isinstance(location, WKBElement):
        shape = to_shape(location)
        return shape.x, shape.y
    if isinstance(location, str):
        # E.g., "POINT(-122.33 47.60)"
        if "POINT" in location.upper():
            shape = shapely.wkt.loads(location)
            return shape.x, shape.y
        # Split by comma or space if plain string
        parts = location.replace("(", "").replace(")", "").replace(",", " ").split()
        if len(parts) == 2:
            return float(parts[0]), float(parts[1])
    if hasattr(location, "x") and hasattr(location, "y"):
        return location.x, location.y
    if isinstance(location, dict) and "longitude" in location and "latitude" in location:
        return float(location["longitude"]), float(location["latitude"])
    if isinstance(location, (list, tuple)) and len(location) == 2:
        return float(location[0]), float(location[1])
        
    raise ValueError(f"Unsupported geometry/location format: {type(location)}")


def haversine_distance(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """
    Computes the great-circle distance between two points on the Earth's surface
    in kilometers using the Haversine formula.
    """
    R = 6371.0  # Radius of Earth in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def compute_distance_km(db: Session, task: Task, volunteer: Volunteer) -> float:
    """
    Computes the real geodesic distance in kilometers between a Task and a Volunteer
    using PostGIS ST_Distance if database is present and objects are persisted.
    Otherwise, falls back to Python Haversine computation.
    """
    if db is not None and task.id is not None and volunteer.id is not None:
        try:
            # ST_Distance on geography type computes distance on WGS 84 ellipsoid in meters.
            # Querying using table columns by ID is 100% safe from bind parameter/casting issues.
            distance_meters = db.query(
                func.ST_Distance(Task.location, Volunteer.location)
            ).filter(
                Task.id == task.id,
                Volunteer.id == volunteer.id
            ).scalar()
            if distance_meters is not None:
                return float(distance_meters) / 1000.0
        except Exception as e:
            logger.warning("PostGIS ST_Distance calculation failed: %s. Falling back to python Haversine.", e)
            
    # Python fallback using Haversine formula
    try:
        lon1, lat1 = get_coords(task.location)
        lon2, lat2 = get_coords(volunteer.location)
        return haversine_distance(lon1, lat1, lon2, lat2)
    except Exception as e:
        logger.warning("Haversine fallback calculation failed: %s.", e)
        return 0.0


def get_volunteers_within_radius(
    db: Session,
    task_location,
    radius_km: float,
    available_volunteers: List[Volunteer]
) -> List[Volunteer]:
    """
    Filters and returns volunteers within the given radius_km of a task location, sorted by distance ascending.
    Uses ST_DWithin and ST_Distance order if a live Postgres DB is available, otherwise falls back to Haversine.
    
    Why ST_DWithin is index-friendly:
    ST_DWithin(geom1, geom2, distance) checks if two geometries are within a specified distance
    of each other. In PostGIS, geography ST_DWithin leverages a GiST (spatial) index by first checking
    the index bounding box boundaries. This allows high-performance index scans to discard 
    the vast majority of out-of-range points in O(log N) average time.
    In contrast, filtering on ST_Distance(geom1, geom2) <= distance cannot use the spatial index
    efficiently for row selection; the database must compute the exact distance for EVERY volunteer
    in the database (O(N) full table scan), which doesn't scale.
    """
    if not available_volunteers:
        return []

    if db is not None:
        try:
            vol_ids = [v.id for v in available_volunteers]
            radius_meters = radius_km * 1000.0
            
            # Run ST_DWithin query in database and order nearest-first using ST_Distance
            return db.query(Volunteer).filter(
                Volunteer.id.in_(vol_ids),
                func.ST_DWithin(Volunteer.location, task_location, radius_meters)
            ).order_by(
                func.ST_Distance(Volunteer.location, task_location)
            ).all()
        except Exception as e:
            logger.warning("PostGIS ST_DWithin query failed: %s. Falling back to python filtering.", e)

    # Python Fallback using Haversine distance
    filtered_vols_with_dist = []
    try:
        lon1, lat1 = get_coords(task_location)
        for vol in available_volunteers:
            lon2, lat2 = get_coords(vol.location)
            dist = haversine_distance(lon1, lat1, lon2, lat2)
            if dist <= radius_km:
                filtered_vols_with_dist.append((vol, dist))
        
        # Sort results by distance ascending
        filtered_vols_with_dist.sort(key=lambda item: item[1])
        return [item[0] for item in filtered_vols_with_dist]
    except Exception as e:
        # Fail closed on radius filtering exceptions
        logger.warning("Haversine filtering failed: %s. Returning empty list (fail closed).", e)
        return []
