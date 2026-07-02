import pytest
from app.models.task import Task
from app.models.volunteer import Volunteer
from app.models.enums import TaskStatus
from app.services.matching import GreedyMatchingStrategy, OptimalMatchingStrategy, calculate_match_score

def test_greedy_urgency_priority():
    """
    Test 1: Greedy Strategy must assign the highest-urgency tasks first,
    even if it consumes a volunteer that could also fit a lower-urgency task.
    """
    # Two tasks requiring medical skills, one is highly urgent, one is low urgency.
    task_urgent = Task(id=1, title="Critical Injury Clinic", required_skills=["medical"], urgency_score=9.0, location="POINT(-122.33 47.60)")
    task_low = Task(id=2, title="First Aid Training", required_skills=["medical"], urgency_score=3.0, location="POINT(-122.33 47.60)")
    
    # Only one volunteer available who has the required skill
    volunteer = Volunteer(id=101, name="Dr. Alex", skills=["medical"], availability={"slots": "weekend"}, location="POINT(-122.33 47.60)")
    
    greedy = GreedyMatchingStrategy()
    # Execute matching
    assignments = greedy.match([task_urgent, task_low], [volunteer], db=None)
    
    # Volunteer should be matched to the critical task, leaving the low urgency task unmatched
    assert len(assignments) == 1
    assignment = assignments[0]
    assert assignment.task_id == 1  # Matches the urgent task
    assert assignment.volunteer_id == 101

def test_optimal_vs_greedy_utility():
    """
    Test 2: Assert that the Hungarian Algorithm (Optimal strategy) produces a
    better global assignment configuration than the Greedy strategy on sub-optimal edge cases.
    
    Scenario:
    - Task A: urgency = 9.0, requires ["medical", "shelter"]
    - Task B: urgency = 8.0, requires ["medical"]
    - Volunteer X: skills = ["medical"] (availability defined)
    - Volunteer Y: skills = ["shelter"] (availability defined)
    
    Matching scores (skill_overlap * 0.6 + avail * 0.2 + dist * 0.2):
    - Task A (needs both):
      - Vol X (has medical): overlap 1/2 = 0.5. Match score = 0.5*0.6 + 0.4 = 0.7
      - Vol Y (has shelter): overlap 1/2 = 0.5. Match score = 0.5*0.6 + 0.4 = 0.7
    - Task B (needs medical only):
      - Vol X (has medical): overlap 1/1 = 1.0. Match score = 1.0*0.6 + 0.4 = 1.0
      - Vol Y (has shelter): overlap 0/1 = 0.0. Match score = 0.0*0.6 + 0.4 = 0.4
      
    Greedy Execution (processes A first because urgency 9.0 > 8.0):
    - Task A evaluated. Vol X score is 0.7, Vol Y score is 0.7. Ties, let's say it picks Vol X.
    - Task B evaluated next. Remaining Vol Y score is 0.4.
    - Total Match Score = 0.7 (A-X) + 0.4 (B-Y) = 1.1.
    - Total Urgency-Weighted Coverage = 9.0*0.7 + 8.0*0.4 = 6.3 + 3.2 = 9.5
    
    Optimal Execution (Hungarian minimizing cost):
    - Can choose between (A-X, B-Y) -> score 1.1 OR (A-Y, B-X) -> score 0.7 + 1.0 = 1.7.
    - Resolves to (A-Y, B-X) since it yields highest global utility.
    - Total Match Score = 1.7.
    - Total Urgency-Weighted Coverage = 9.0*0.7 + 8.0*1.0 = 6.3 + 8.0 = 14.3
    """
    task_a = Task(id=1, title="Need clinic & tent support", required_skills=["medical", "shelter"], urgency_score=9.0, location="POINT(-122.33 47.60)")
    task_b = Task(id=2, title="Need medic checkup", required_skills=["medical"], urgency_score=8.0, location="POINT(-122.33 47.60)")
    
    vol_x = Volunteer(id=101, name="Medic X", skills=["medical"], availability={"status": "active"}, location="POINT(-122.33 47.60)")
    vol_y = Volunteer(id=102, name="Shelter Y", skills=["shelter"], availability={"status": "active"}, location="POINT(-122.33 47.60)")
    
    # 1. Run Greedy
    greedy = GreedyMatchingStrategy()
    greedy_assignments = greedy.match([task_a, task_b], [vol_x, vol_y], db=None)
    
    # Sum scores and coverage for greedy
    greedy_total_score = sum(a.match_score for a in greedy_assignments)
    greedy_coverage = sum(
        a.match_score * (9.0 if a.task_id == 1 else 8.0) for a in greedy_assignments
    )
    
    # 2. Run Optimal
    optimal = OptimalMatchingStrategy()
    optimal_assignments = optimal.match([task_a, task_b], [vol_x, vol_y], db=None)
    
    # Sum scores and coverage for optimal
    optimal_total_score = sum(a.match_score for a in optimal_assignments)
    optimal_coverage = sum(
        a.match_score * (9.0 if a.task_id == 1 else 8.0) for a in optimal_assignments
    )
    
    # Print benchmark details
    print(f"Greedy: Total Score = {greedy_total_score:.2f}, Weighted Coverage = {greedy_coverage:.2f}")
    print(f"Optimal: Total Score = {optimal_total_score:.2f}, Weighted Coverage = {optimal_coverage:.2f}")
    
    # Assert Optimal makes the globally superior selection
    assert optimal_total_score > greedy_total_score
    assert optimal_coverage > greedy_coverage
    
    # Assert specific assignments chosen by optimal
    # Optimal matches: A (id 1) -> Y (id 102), B (id 2) -> X (id 101)
    optimal_map = {a.task_id: a.volunteer_id for a in optimal_assignments}
    assert optimal_map[1] == 102
    assert optimal_map[2] == 101

def test_no_double_assignments():
    """
    Test 3: Assert that a volunteer is never assigned to multiple tasks in a single matching run.
    """
    tasks = [
        Task(id=1, title="Task 1", required_skills=["medical"], urgency_score=5.0, location="POINT(-122.33 47.60)"),
        Task(id=2, title="Task 2", required_skills=["medical"], urgency_score=4.0, location="POINT(-122.33 47.60)"),
        Task(id=3, title="Task 3", required_skills=["medical"], urgency_score=3.0, location="POINT(-122.33 47.60)")
    ]
    
    volunteers = [
        Volunteer(id=101, name="Vol 1", skills=["medical"], availability={"status": "yes"}, location="POINT(-122.33 47.60)"),
        Volunteer(id=102, name="Vol 2", skills=["medical"], availability={"status": "yes"}, location="POINT(-122.33 47.60)")
    ]
    
    greedy = GreedyMatchingStrategy()
    optimal = OptimalMatchingStrategy()
    
    greedy_res = greedy.match(tasks, volunteers, db=None)
    optimal_res = optimal.match(tasks, volunteers, db=None)
    
    # Verify greedy double assignments
    assigned_vols_greedy = [a.volunteer_id for a in greedy_res]
    assert len(assigned_vols_greedy) == len(set(assigned_vols_greedy))
    assert len(assigned_vols_greedy) <= 2
    
    # Verify optimal double assignments
    assigned_vols_optimal = [a.volunteer_id for a in optimal_res]
    assert len(assigned_vols_optimal) == len(set(assigned_vols_optimal))
    assert len(assigned_vols_optimal) <= 2
