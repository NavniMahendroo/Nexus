import pytest
from unittest.mock import MagicMock
from app.models.task import Task
from app.models.volunteer import Volunteer
from app.services.geospatial import compute_distance_km, get_volunteers_within_radius
from app.services.matching import calculate_match_score

def test_distance_calculation_correctness():
    """
    Test 1: Distance calculation correctness between two known coordinate pairs.
    Seattle, WA (task) to a nearby volunteer location (~0.72 km away).
    """
    task = Task(id=1, location="POINT(-122.333 47.606)")  # Seattle, WA
    volunteer = Volunteer(id=101, location="POINT(-122.330 47.600)")
    
    # We pass db=None, which will trigger the python fallback (Haversine formula)
    dist = compute_distance_km(db=None, task=task, volunteer=volunteer)
    # The Haversine distance between those two points is ~0.72 km.
    assert dist > 0.6 and dist < 0.8


def test_distance_calculation_mocked_postgis():
    """
    Test 2: Test PostGIS code path using database mock.
    """
    task = Task(id=1, location="POINT(-122.333 47.606)")
    volunteer = Volunteer(id=101, location="POINT(-122.330 47.600)")
    
    mock_db = MagicMock()
    # Mock the chained db.query().filter().scalar() call.
    # PostGIS ST_Distance returns distance in meters. Let's return 750 meters.
    mock_db.query.return_value.filter.return_value.scalar.return_value = 750.0
    
    dist = compute_distance_km(db=mock_db, task=task, volunteer=volunteer)
    assert dist == 0.75  # 750 / 1000
    mock_db.query.assert_called_once()


def test_radius_pre_filter_mocked_postgis():
    """
    Test 5: Test PostGIS ST_DWithin and ordering code path using database mock.
    """
    task = Task(id=1, location="POINT(-122.333 47.606)")
    vol_near = Volunteer(id=101, name="Near", location="POINT(-122.330 47.600)")
    
    mock_db = MagicMock()
    # Mocking db.query().filter().order_by().all() to return [vol_near]
    mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [vol_near]
    
    filtered = get_volunteers_within_radius(
        db=mock_db,
        task_location=task.location,
        radius_km=50.0,
        available_volunteers=[vol_near]
    )
    
    assert filtered == [vol_near]
    mock_db.query.assert_called_once()


def test_radius_pre_filter_excluding_out_of_range():
    """
    Test 3: Radius pre-filter correctly excludes volunteers who are out of range.
    Task location is Seattle. One volunteer is near (~0.72km), one is far (~300km).
    """
    task = Task(id=1, location="POINT(-122.333 47.606)")
    vol_near = Volunteer(id=101, name="Near", location="POINT(-122.330 47.600)")
    vol_far = Volunteer(id=102, name="Far", location="POINT(-121.000 45.000)")
    
    # Pre-filter using python fallback (db=None)
    filtered = get_volunteers_within_radius(
        db=None,
        task_location=task.location,
        radius_km=50.0,
        available_volunteers=[vol_near, vol_far]
    )
    
    assert vol_near in filtered
    assert vol_far not in filtered
    assert len(filtered) == 1


def test_distance_based_score_ranking():
    """
    Test 4: Distance-based score correctly ranks a closer volunteer above a farther one
    with equal skill match and availability.
    """
    task = Task(id=1, title="Medical Task", required_skills=["medical"], location="POINT(-122.333 47.606)")
    vol_near = Volunteer(id=101, name="Near Volunteer", skills=["medical"], location="POINT(-122.330 47.600)")  # ~0.72km
    vol_far = Volunteer(id=102, name="Far Volunteer", skills=["medical"], location="POINT(-122.300 47.600)")  # ~2.6km
    
    score_near, reason_near = calculate_match_score(task, vol_near, db=None, max_radius_km=50.0)
    score_far, reason_far = calculate_match_score(task, vol_far, db=None, max_radius_km=50.0)
    
    # Closer volunteer should have a higher score
    assert score_near > score_far
    assert "0.7km away" in reason_near
    assert "2.6km away" in reason_far


def test_vectorized_distance_matrix():
    """
    Test 6: Verify the vectorized NumPy distance matrix matches single-pair Haversine calculations.
    """
    import numpy as np
    from app.services.matching import compute_distance_matrix_np
    from app.services.geospatial import haversine_distance, get_coords
    
    tasks = [
        Task(id=1, location="POINT(-122.333 47.606)"),
        Task(id=2, location="POINT(-122.100 47.100)")
    ]
    volunteers = [
        Volunteer(id=101, location="POINT(-122.330 47.600)"),
        Volunteer(id=102, location="POINT(-121.000 45.000)"),
        Volunteer(id=103, location="POINT(-122.200 47.300)")
    ]
    
    dist_matrix = compute_distance_matrix_np(tasks, volunteers)
    
    assert dist_matrix.shape == (2, 3)
    
    # Check that each element matches haversine_distance
    for t_idx, task in enumerate(tasks):
        for v_idx, vol in enumerate(volunteers):
            lon1, lat1 = get_coords(task.location)
            lon2, lat2 = get_coords(vol.location)
            single_dist = haversine_distance(lon1, lat1, lon2, lat2)
            assert np.isclose(dist_matrix[t_idx, v_idx], single_dist, rtol=1e-5)

