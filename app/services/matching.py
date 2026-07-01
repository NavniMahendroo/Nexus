import time
import numpy as np
from scipy.optimize import linear_sum_assignment
from typing import List, Tuple, Protocol
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.volunteer import Volunteer
from app.models.assignment import Assignment
from app.models.enums import AssignmentStatus
from app.services.geospatial import compute_distance_km, get_volunteers_within_radius, get_coords

class MatchingStrategy(Protocol):
    def match(
        self,
        tasks: List[Task],
        volunteers: List[Volunteer],
        db: Session
    ) -> List[Assignment]:
        """
        Calculates proposed assignments between open tasks and available volunteers.
        Returns Transient (in-memory) Assignment objects.
        """
        ...

def compute_distance_matrix_np(tasks: List[Task], volunteers: List[Volunteer]) -> np.ndarray:
    """
    Precomputes a distance matrix of size (num_tasks, num_volunteers) using
    vectorized NumPy operations for maximum efficiency without database round trips.
    """
    if not tasks or not volunteers:
        return np.zeros((len(tasks), len(volunteers)))

    # Extract coordinates (lon, lat) using the utility function
    task_coords = np.array([get_coords(t.location) for t in tasks])       # Shape: (T, 2)
    vol_coords = np.array([get_coords(v.location) for v in volunteers])   # Shape: (V, 2)

    # Task coordinates
    task_lons = task_coords[:, 0:1] # Shape: (T, 1)
    task_lats = task_coords[:, 1:2] # Shape: (T, 1)

    # Volunteer coordinates
    vol_lons = vol_coords[:, 0]     # Shape: (V,)
    vol_lats = vol_coords[:, 1]     # Shape: (V,)

    # Convert all to radians
    lat1 = np.radians(task_lats)
    lon1 = np.radians(task_lons)
    lat2 = np.radians(vol_lats)
    lon2 = np.radians(vol_lons)

    # Haversine formula
    dlat = lat2 - lat1  # Shape: (T, V) due to broadcasting
    dlon = lon2 - lon1  # Shape: (T, V) due to broadcasting

    a = np.sin(dlat / 2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0)**2
    c = 2.0 * np.arcsin(np.sqrt(a))
    R = 6371.0  # Earth radius in km
    return R * c

def calculate_match_score(
    task: Task, 
    volunteer: Volunteer, 
    db: Session = None, 
    max_radius_km: float = 50.0,
    precomputed_distance_km: float = None
) -> Tuple[float, str]:
    """
    Utility function to score a task-volunteer pairing.
    Returns:
        (match_score [0.0 - 1.0], human-readable explanation)
    """
    # 1. Skill Overlap (60% weight)
    if not task.required_skills:
        skill_score = 1.0
        overlap_skills = []
    else:
        req_set = set(task.required_skills)
        vol_skills = volunteer.skills or []
        vol_set = set(vol_skills)
        overlap_skills = list(req_set & vol_set)
        skill_score = len(overlap_skills) / len(req_set)

    # 2. Availability (20% weight)
    # Checks if volunteer has availability data populated.
    has_avail = bool(volunteer.availability)
    avail_score = 1.0 if has_avail else 0.5
    avail_reason = "available" if has_avail else "general availability assumed"

    # 3. Distance (20% weight)
    # Real geospatial distance matching with inverse decay and max radius boundary check.
    distance_km = precomputed_distance_km if precomputed_distance_km is not None else compute_distance_km(db, task, volunteer)
    
    if distance_km is None or distance_km > max_radius_km:
        distance_score = 0.0
        distance_reason = "outside search radius"
    else:
        # Inverse decay function: approaches 1.0 near 0km and decays toward 0
        distance_score = 1.0 / (1.0 + distance_km)
        distance_reason = f"{distance_km:.1f}km away"

    # Combined matching score
    match_score = (skill_score * 0.6) + (avail_score * 0.2) + (distance_score * 0.2)

    # Structured explanation text
    skills_found = ", ".join(overlap_skills) if overlap_skills else "none"
    task_urgency = task.urgency_score if task.urgency_score is not None else 0.0
    explanation = (
        f"Matched: {distance_reason}, skill overlap [{skills_found}] (score: {skill_score:.2f}), "
        f"{avail_reason}, task urgency score {task_urgency:.1f}/10"
    )

    return match_score, explanation


class GreedyMatchingStrategy:
    """
    Greedy Matching Strategy.
    Time Complexity: O(T * V)
      - We iterate through available volunteers to find the best match for each task.
    """
    def match(
        self,
        tasks: List[Task],
        volunteers: List[Volunteer],
        db: Session
    ) -> List[Assignment]:
        # Sort tasks by urgency descending
        sorted_tasks = sorted(tasks, key=lambda t: t.urgency_score or 0.0, reverse=True)
        assignments = []
        available_vols = list(volunteers)

        # Precompute distance matrix between all tasks and volunteers once
        dist_matrix = compute_distance_matrix_np(tasks, volunteers)

        # Maps for quick index lookup in the matrix
        task_to_idx = {task.id: idx for idx, task in enumerate(tasks)}
        vol_to_idx = {vol.id: idx for idx, vol in enumerate(volunteers)}

        for task in sorted_tasks:
            if not available_vols:
                break

            # Pre-filter using ST_DWithin to fetch only volunteers within search radius
            candidate_vols = get_volunteers_within_radius(db, task.location, 50.0, available_vols)
            if not candidate_vols:
                continue

            best_vol = None
            best_score = -1.0
            best_explanation = ""
            t_idx = task_to_idx[task.id]

            for vol in candidate_vols:
                # Look up precomputed distance to avoid query round trips
                v_idx = vol_to_idx[vol.id]
                dist_km = dist_matrix[t_idx, v_idx]

                score, explanation = calculate_match_score(
                    task, 
                    vol, 
                    db=None, 
                    max_radius_km=50.0, 
                    precomputed_distance_km=dist_km
                )
                if score > best_score:
                    best_score = score
                    best_vol = vol
                    best_explanation = explanation

            if best_vol:
                assignments.append(
                    Assignment(
                        volunteer_id=best_vol.id,
                        task_id=task.id,
                        match_score=best_score,
                        match_reasoning=best_explanation,
                        status=AssignmentStatus.PENDING
                    )
                )
                available_vols.remove(best_vol)

        return assignments


class OptimalMatchingStrategy:
    """
    Optimal Matching Strategy (Hungarian Algorithm).
    Time Complexity: O(n^3) where n = max(T, V).
      - Computes cost matrix of dimensions T x V where cost = 1.0 - match_score.
      - Solves the linear sum assignment problem using scipy's linear_sum_assignment.
    """
    def match(
        self,
        tasks: List[Task],
        volunteers: List[Volunteer],
        db: Session
    ) -> List[Assignment]:
        if not tasks or not volunteers:
            return []

        assignments = []
        num_tasks = len(tasks)
        num_vols = len(volunteers)

        # Precompute the full distance matrix between all tasks and volunteers once
        dist_matrix = compute_distance_matrix_np(tasks, volunteers)

        # Maps for quick index lookup in the matrix
        vol_to_idx = {vol.id: idx for idx, vol in enumerate(volunteers)}

        # Build cost matrix for linear_sum_assignment (Hungarian Algorithm minimizes cost)
        cost_matrix = np.zeros((num_tasks, num_vols))
        score_cache = {}

        for t_idx, task in enumerate(tasks):
            # Pre-filter using ST_DWithin to identify candidate volunteers within range
            candidate_vols = get_volunteers_within_radius(db, task.location, 50.0, volunteers)
            candidate_ids = {v.id for v in candidate_vols}

            for v_idx, vol in enumerate(volunteers):
                dist_km = dist_matrix[t_idx, v_idx]
                if vol.id in candidate_ids:
                    # Inside search radius: compute score using precomputed distance
                    score, explanation = calculate_match_score(
                        task, 
                        vol, 
                        db=None, 
                        max_radius_km=50.0, 
                        precomputed_distance_km=dist_km
                    )
                else:
                    # Outside search radius: skip distance calculation, setting distance to infinity
                    score, explanation = calculate_match_score(
                        task, 
                        vol, 
                        db=None, 
                        max_radius_km=50.0, 
                        precomputed_distance_km=float('inf')
                    )
                
                cost_matrix[t_idx, v_idx] = 1.0 - score
                score_cache[(t_idx, v_idx)] = (score, explanation)

        # Solve assignment minimizing total cost (which maximizes total score utility)
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        for r_idx, c_idx in zip(row_ind, col_ind):
            task = tasks[r_idx]
            vol = volunteers[c_idx]
            score, explanation = score_cache[(r_idx, c_idx)]

            assignments.append(
                Assignment(
                    volunteer_id=vol.id,
                    task_id=task.id,
                    match_score=score,
                    match_reasoning=explanation,
                    status=AssignmentStatus.PENDING
                )
            )

        return assignments
