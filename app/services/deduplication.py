import os
import math
import numpy as np
import logging
from typing import List, Tuple
from sqlalchemy.orm import Session
from geoalchemy2 import func
from app.models.need_report import NeedReport
from app.models.enums import NeedStatus
from app.services.geospatial import get_coords, haversine_distance

logger = logging.getLogger(__name__)

# Search radius configuration for deduplication checks
DUPLICATE_SEARCH_RADIUS_KM = 20.0

# Lazy loaded model
_model = None

def get_embedding_model():
    """
    Lazy-loads and returns the sentence-transformers model.
    In testing environment (if TESTING env var is set), it bypasses loading the real model
    to avoid downloading model weights over the internet.
    """
    global _model
    if _model is None:
        if os.environ.get("TESTING") == "true":
            # Mock model that matches interface
            class MockModel:
                def encode(self, text: str) -> np.ndarray:
                    # Generate a deterministic mock embedding based on character values
                    chars = [ord(c) for c in text[:100]]
                    # Pad to 384 dimensions
                    arr = np.zeros(384)
                    for idx, char in enumerate(chars):
                        arr[idx % 384] = char / 255.0
                    # Normalize vector so cosine similarity calculations are simple
                    norm = np.linalg.norm(arr)
                    if norm > 0.0:
                        arr = arr / norm
                    return arr
            _model = MockModel()
        else:
            from sentence_transformers import SentenceTransformer
            # We choose 'all-MiniLM-L6-v2' because it is a lightweight model (~90MB, 384 dimensions)
            # which offers a great trade-off between embedding generation speed, model file size, and
            # semantic text matching accuracy. It runs extremely fast on standard CPUs, making it ideal
            # for a portfolio/local project where massive multi-GPU environments aren't available.
            _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

def generate_embedding(text: str) -> List[float]:
    """
    Generates a 384-dimensional sentence embedding for the input text using sentence-transformers.
    Returns None if generation fails or text is empty.
    """
    if not text:
        return None
    try:
        model = get_embedding_model()
        emb = model.encode(text)
        return emb.tolist()
    except Exception as e:
        logger.warning("Failed to generate sentence embedding: %s", e)
        return None

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """
    Computes cosine similarity between two float vectors.
    """
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    arr1 = np.array(v1)
    arr2 = np.array(v2)
    dot = np.dot(arr1, arr2)
    norm1 = np.linalg.norm(arr1)
    norm2 = np.linalg.norm(arr2)
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return float(dot / (norm1 * norm2))

def get_reports_within_radius(
    db: Session, 
    report_location, 
    radius_km: float, 
    same_category: str, 
    exclude_report_id: int
) -> List[NeedReport]:
    """
    Fetches NeedReports within radius_km that have the same category and are not merged/closed.
    """
    radius_meters = radius_km * 1000.0
    
    query = db.query(NeedReport).filter(
        NeedReport.id != exclude_report_id,
        NeedReport.category == same_category,
        NeedReport.status != NeedStatus.MERGED,
        NeedReport.status != NeedStatus.CLOSED
    )
    
    if report_location is None:
        return query.all()
        
    try:
        # DB-level PostGIS filter
        return query.filter(
            func.ST_DWithin(NeedReport.location, report_location, radius_meters)
        ).all()
    except Exception as e:
        # Fallback to python filtering
        logger.warning("PostGIS ST_DWithin filtering for reports failed: %s. Falling back to python.", e)
        all_candidate_reports = query.all()
        filtered = []
        try:
            lon1, lat1 = get_coords(report_location)
            for r in all_candidate_reports:
                lon2, lat2 = get_coords(r.location)
                dist = haversine_distance(lon1, lat1, lon2, lat2)
                if dist <= radius_km:
                    filtered.append(r)
        except Exception as fallback_err:
            logger.warning("Haversine fallback filtering for reports failed: %s. Returning empty list.", fallback_err)
            return []
        return filtered

def find_potential_duplicates(
    report: NeedReport, 
    db: Session, 
    threshold: float = 0.85
) -> List[Tuple[NeedReport, float]]:
    """
    Computes cosine similarity between the new report's embedding and existing unmerged reports
    (filtered first by same category and geographic proximity) and returns candidates above threshold.
    """
    if report.embedding is None:
        return []
        
    # Spatial/Category pre-filter (DUPLICATE_SEARCH_RADIUS_KM to search local area)
    candidates = get_reports_within_radius(
        db, 
        report.location, 
        radius_km=DUPLICATE_SEARCH_RADIUS_KM, 
        same_category=report.category,
        exclude_report_id=report.id
    )
    
    potential_duplicates = []
    for cand in candidates:
        if cand.embedding is None:
            continue
        sim = cosine_similarity(report.embedding, cand.embedding)
        if sim >= threshold:
            potential_duplicates.append((cand, sim))
            
    return potential_duplicates
