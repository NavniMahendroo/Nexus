from pydantic import BaseModel, Field
from typing import Any, Dict
from geoalchemy2.elements import WKBElement
from geoalchemy2.shape import to_shape
from shapely.geometry import Point

class LocationCoordinate(BaseModel):
    latitude: float = Field(..., description="Latitude of the location", ge=-90.0, le=90.0)
    longitude: float = Field(..., description="Longitude of the location", ge=-180.0, le=180.0)

    def to_wkt(self) -> str:
        """Convert to Well-Known Text (WKT) format: 'POINT(longitude latitude)'"""
        return f"POINT({self.longitude} {self.latitude})"

    @classmethod
    def from_geoalchemy(cls, geom: Any) -> "LocationCoordinate":
        """Helper to convert GeoAlchemy2 WKBElement or string to LocationCoordinate schema"""
        if geom is None:
            return None
        if isinstance(geom, WKBElement):
            shape = to_shape(geom)
            return cls(latitude=shape.y, longitude=shape.x)
        if isinstance(geom, str) and geom.startswith("POINT"):
            # Simple parse for POINT(lng lat)
            parts = geom.replace("POINT", "").replace("(", "").replace(")", "").strip().split()
            if len(parts) == 2:
                return cls(latitude=float(parts[1]), longitude=float(parts[0]))
        # Fallback if it's already a dict/object with lat/lng attributes
        if hasattr(geom, "x") and hasattr(geom, "y"):
            return cls(latitude=geom.y, longitude=geom.x)
        if isinstance(geom, dict) and "latitude" in geom and "longitude" in geom:
            return cls(latitude=geom["latitude"], longitude=geom["longitude"])
        raise ValueError(f"Unsupported geometry format: {type(geom)}")
