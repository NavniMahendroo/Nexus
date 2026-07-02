import os
import random
import argparse
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session

# Force SentenceTransformer to run in real CPU mode during seeding, bypassing the testing mock.
os.environ["TESTING"] = "false"

from app.core.database import SessionLocal
from app.models.organization import Organization
from app.models.volunteer import Volunteer
from app.models.need_report import NeedReport
from app.models.task import Task
from app.models.duplicate_candidate import DuplicateCandidate
from app.models.assignment import Assignment
from app.models.enums import NeedSeverity, NeedStatus, TaskStatus, AssignmentStatus
from app.services.deduplication import generate_embedding, find_potential_duplicates
from app.services.task_creation import create_task_from_reports
from app.services.urgency_scoring import batch_recompute_open_tasks
from app.services.matching import OptimalMatchingStrategy

# Neighborhoods in Seattle with exact lat/long centers
NEIGHBORHOODS = [
    {"name": "Downtown", "lat": 47.6062, "lng": -122.3321},
    {"name": "Capitol Hill", "lat": 47.6253, "lng": -122.3207},
    {"name": "Ballard", "lat": 47.6761, "lng": -122.3862},
    {"name": "Fremont", "lat": 47.6502, "lng": -122.3496},
    {"name": "Queen Anne", "lat": 47.6351, "lng": -122.3568},
    {"name": "University District", "lat": 47.6617, "lng": -122.3131},
    {"name": "Beacon Hill", "lat": 47.5790, "lng": -122.3116},
    {"name": "West Seattle", "lat": 47.5714, "lng": -122.3868}
]

# Random lists to generate names
FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White"]

ORGANIZATIONS = [
    "Seattle Community Food Bank",
    "Cascadia Disaster Medical Corps",
    "Emerald City Emergency Housing Coalition",
    "Puget Sound Clean Water Trust",
    "Green Lake Mutual Aid Society",
    "Capitol Hill First Responders Alliance",
    "Rainier Disaster Relief Network",
    "Salvation Army Seattle Center",
    "Northwest Refugee Support Service",
    "Fremont Crisis Shelter Guild",
    "Ballard Relief Coordination Link",
    "Seattle Union Gospel Mission Unit",
    "Mercy Corps Seattle Team",
    "American Red Cross King County",
    "Beacon Hill Community Helpers"
]

SKILLS_POOL = ["medical", "shelter", "water", "food", "rescue", "logistics", "translation"]

# Realistic description templates
WATER_TEMPLATES = [
    "Clean drinking water shortage reported at the community gym in {nh}. Storage tanks are empty.",
    "Ruptured water main near the library in {nh} has cut off clean hydration supplies. Families requesting bottled water.",
    "Dehydration concerns at the {nh} transit center shelter. Water distribution trucks urgently requested.",
    "Potable water supply contaminated due to runoff in {nh}. Residents require temporary filtration setups."
]

MEDICAL_TEMPLATES = [
    "Trauma support, wound dressings, and insulin needed immediately at {nh} emergency triage station.",
    "Multiple citizens injured with lacerations and sprains near the park in {nh}. Requesting doctor or nurse assistance.",
    "Elderly shelter in {nh} is running low on critical prescriptions, heart medication, and first aid packages.",
    "First aid station in {nh} overwhelmed by casualties following structural collapse. Urgent paramedic dispatch needed."
]

SHELTER_TEMPLATES = [
    "Gymnasium flooded in {nh}. Need 30 temporary weather-proof tents and sleeping bags for displaced families.",
    "Roof collapse at a multifamily complex in {nh}. Local gym is overwhelmed and requires emergency cots.",
    "Displaced families at the community center in {nh} require temporary blankets, tarps, and warm sleeping mats.",
    "Severe structural damage to apartment block in {nh}. Requesting immediate emergency shelter placements."
]

FOOD_TEMPLATES = [
    "Low on dry food supplies, rice bags, and canned nutrients at the {nh} distribution hub.",
    "Starvation risks at the {nh} temporary camp. Requesting non-perishable rations, baby formula, and dry food packs.",
    "Fremont community kitchen in {nh} is running low on ingredients and needs immediate dry food deliveries.",
    "Displaced senior home in {nh} is requesting meal supplies, canned goods, and bottled juices."
]

OTHER_TEMPLATES = [
    "Clearance teams required in {nh} to clean debris, fallen branches, and blocked neighborhood pathways.",
    "Language translators needed at the {nh} coordination office to assist refugee families in intake processes.",
    "Volunteer drivers with utility vehicles requested in {nh} to transport boxes and crisis relief supplies.",
    "Communication lines down at the {nh} post. Requesting emergency radio equipment setup."
]

# Duplicate template pairs
DUPLICATE_PAIRS = [
    {
        "category": "water",
        "description_a": "Critical drinking water shortage at Downtown hub. Clean water tanks are empty.",
        "description_b": "Downtown center reports severe shortage of drinking water. Potable water tanks are completely empty."
    },
    {
        "category": "medical",
        "description_a": "Paramedic team and first aid supplies requested at Capitol Hill medical outpost.",
        "description_b": "Urgent: First aid supplies and doctor support needed at the Capitol Hill medical clinic."
    },
    {
        "category": "shelter",
        "description_a": "Displaced families in Ballard need tents and sleeping bags due to structural flooding.",
        "description_b": "Ballard gym needs blankets, sleeping bags, and temporary tents for flooded families."
    },
    {
        "category": "food",
        "description_a": "Community kitchen in Fremont requires non-perishable canned food and flour bags.",
        "description_b": "Fremont kitchen running extremely low on canned food, flour, and non-perishables."
    },
    {
        "category": "rescue",
        "description_a": "Rooftop rescue team required near University District station to extract trapped residents.",
        "description_b": "Urgent: Roof extraction required near U-District center for stranded individuals."
    }
]

def get_random_location(center_lat, center_lng, radius_km=2.0):
    """Generate a random coordinate point within a specific radius of a neighborhood center."""
    # Crude approximation: 1 degree latitude = 111 km, 1 degree longitude = 111 * cos(lat)
    lat_offset = (random.uniform(-1, 1) * radius_km) / 111.0
    lng_offset = (random.uniform(-1, 1) * radius_km) / (111.0 * 0.67) # cos(47.6) is approx 0.67
    return f"POINT({center_lng + lng_offset:.6f} {center_lat + lat_offset:.6f})"

def seed_database(db: Session, reset: bool):
    if reset:
        print("Resetting database (Cascading Truncate with identity reset)...")
        db.execute(text("TRUNCATE TABLE assignments, duplicate_candidates, need_reports, tasks, volunteers, organizations RESTART IDENTITY CASCADE;"))
        db.commit()

    print("Seeding Organizations...")
    orgs = []
    for name in ORGANIZATIONS:
        org = Organization(name=name, contact_info=f"contact@{name.lower().replace(' ', '')}.org")
        db.add(org)
        orgs.append(org)
    db.commit()
    for o in orgs:
        db.refresh(o)
    org_ids = [o.id for o in orgs]

    print("Seeding Volunteers (200+)...")
    volunteers = []
    
    # Explicitly seed first 4 volunteers to guarantee they get IDs 1, 2, 3, 4
    # and have high-value skills matching open tasks.
    downtown_nh = NEIGHBORHOODS[0]  # Downtown Seattle
    fixed_volunteers = [
        {"name": "Alex Medic", "skills": ["medical"]},
        {"name": "Jordan Shelter", "skills": ["shelter"]},
        {"name": "Taylor Water", "skills": ["water"]},
        {"name": "Morgan Food", "skills": ["food"]}
    ]
    
    for fv in fixed_volunteers:
        location_wkt = get_random_location(downtown_nh["lat"], downtown_nh["lng"], radius_km=1.0)
        volunteer = Volunteer(
            name=fv["name"],
            skills=fv["skills"],
            availability={"days": ["Monday", "Wednesday", "Friday"], "hours": "flexible"},
            location=location_wkt,
            contact_info=f"{fv['name'].lower().replace(' ', '')}@example.com"
        )
        db.add(volunteer)
        volunteers.append(volunteer)

    for i in range(5, 215):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        skills = random.sample(SKILLS_POOL, k=random.randint(1, 3))
        
        # Select random neighborhood center
        nh = random.choice(NEIGHBORHOODS)
        location_wkt = get_random_location(nh["lat"], nh["lng"], radius_km=3.0)
        
        volunteer = Volunteer(
            name=f"{first_name} {last_name}",
            skills=skills,
            availability={"days": random.sample(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], k=random.randint(2, 4)), "hours": random.choice(["morning", "afternoon", "evening", "flexible"])},
            location=location_wkt,
            contact_info=f"{first_name.lower()}.{last_name.lower()}@example.com"
        )
        db.add(volunteer)
        volunteers.append(volunteer)
    db.commit()
    for v in volunteers:
        db.refresh(v)

    print("Seeding NeedReports (500+)...")
    reports_inserted = 0
    # Ingest baseline unique reports
    for i in range(1, 480):
        nh = random.choice(NEIGHBORHOODS)
        category = random.choice(["water", "medical", "shelter", "food", "other"])
        
        # Pick template list
        if category == "water":
            template = random.choice(WATER_TEMPLATES)
        elif category == "medical":
            template = random.choice(MEDICAL_TEMPLATES)
        elif category == "shelter":
            template = random.choice(SHELTER_TEMPLATES)
        elif category == "food":
            template = random.choice(FOOD_TEMPLATES)
        else:
            template = random.choice(OTHER_TEMPLATES)
            
        description = template.format(nh=nh["name"])
        location_wkt = get_random_location(nh["lat"], nh["lng"], radius_km=2.5)
        severity = random.choice([NeedSeverity.LOW, NeedSeverity.MEDIUM, NeedSeverity.HIGH, NeedSeverity.CRITICAL])
        
        # Vary timestamps back over 30 days
        days_offset = random.uniform(0, 30)
        timestamp = datetime.now(timezone.utc) - timedelta(days=days_offset)
        
        embedding = generate_embedding(description)
        
        db_report = NeedReport(
            category=category,
            raw_category=category,
            description=description,
            location=location_wkt,
            severity=severity,
            reported_by_id=random.choice(org_ids),
            population_affected=random.randint(2, 200),
            corroboration_count=random.randint(1, 5),
            status=NeedStatus.RAW,
            timestamp=timestamp,
            embedding=embedding
        )
        db.add(db_report)
        reports_inserted += 1

        # Periodic commit to avoid transactional overflow
        if reports_inserted % 50 == 0:
            db.commit()
            print(f"  Ingested {reports_inserted} reports...")

    db.commit()

    print("Injecting duplicate report pairs (25+ pairs)...")
    for idx, pair in enumerate(DUPLICATE_PAIRS * 5):  # Multiplied to get 25 pairs
        # Find neighborhood center matching description text
        nh = None
        for n in NEIGHBORHOODS:
            if n["name"] in pair["description_a"]:
                nh = n
                break
        if not nh:
            nh = random.choice(NEIGHBORHOODS)

        lat_val = nh["lat"] + random.uniform(-0.002, 0.002)
        lng_val = nh["lng"] + random.uniform(-0.002, 0.002)
        location_wkt_a = f"POINT({lng_val:.6f} {lat_val:.6f})"
        location_wkt_b = f"POINT({lng_val + 0.001:.6f} {lat_val + 0.001:.6f})" # 100 meters away
        
        days_offset = random.uniform(1, 10)
        timestamp = datetime.now(timezone.utc) - timedelta(days=days_offset)
        
        # Insert report A
        desc_a = pair["description_a"]
        report_a = NeedReport(
            category=pair["category"],
            raw_category=pair["category"],
            description=desc_a,
            location=location_wkt_a,
            severity=NeedSeverity.HIGH,
            reported_by_id=random.choice(org_ids),
            population_affected=random.randint(5, 50),
            corroboration_count=1,
            status=NeedStatus.RAW,
            timestamp=timestamp,
            embedding=generate_embedding(desc_a)
        )
        db.add(report_a)
        db.commit()
        db.refresh(report_a)
        
        # Insert duplicate report B
        desc_b = pair["description_b"]
        report_b = NeedReport(
            category=pair["category"],
            raw_category=pair["category"],
            description=desc_b,
            location=location_wkt_b,
            severity=NeedSeverity.HIGH,
            reported_by_id=random.choice(org_ids),
            population_affected=random.randint(5, 50),
            corroboration_count=1,
            status=NeedStatus.RAW,
            timestamp=timestamp,
            embedding=generate_embedding(desc_b)
        )
        db.add(report_b)
        db.commit()
        db.refresh(report_b)

        # Trigger duplicate candidate detection
        potential_duplicates = find_potential_duplicates(report_b, db)
        for dup, score in potential_duplicates:
            if dup.id == report_a.id:
                candidate = DuplicateCandidate(
                    report_id=report_a.id,
                    duplicate_report_id=report_b.id,
                    similarity_score=score,
                    status="pending"
                )
                db.add(candidate)
        db.commit()

    print("Batch Converting a subset of RAW reports into Tasks...")
    raw_reports = db.query(NeedReport).filter(NeedReport.status == NeedStatus.RAW).all()
    # Convert a subset of 120 reports into distinct tasks
    conversion_count = min(len(raw_reports), 120)
    for rep in raw_reports[:conversion_count]:
        create_task_from_reports([rep], db)
    
    print("Recalculating Urgency scores...")
    batch_recompute_open_tasks(db)

    print("Running Pluggable Matching Engine to create initial assignments...")
    open_tasks = db.query(Task).filter(Task.status == TaskStatus.OPEN).all()
    available_vols = db.query(Volunteer).all()
    
    matcher = OptimalMatchingStrategy()
    proposed = matcher.match(open_tasks, available_vols, db)
    
    if proposed:
        db.add_all(proposed)
        db.commit()
        
        # Accept the first 8 proposed assignments immediately to populate active lists
        confirm_limit = min(len(proposed), 8)
        confirmed_vol_ids = []
        
        # Ensure volunteer 1, 2, 3, 4 are confirmed if they have proposed assignments
        for target_id in [1, 2, 3, 4]:
            for p in proposed:
                if p.volunteer_id == target_id:
                    p.status = AssignmentStatus.ACCEPTED
                    task_ref = db.query(Task).filter(Task.id == p.task_id).first()
                    if task_ref:
                        task_ref.status = TaskStatus.ASSIGNED
                    confirmed_vol_ids.append(target_id)
                    break
                
        # Confirm others up to limit
        for p in proposed:
            if len(confirmed_vol_ids) >= confirm_limit:
                break
            if p.volunteer_id in [1, 2, 3, 4]:
                continue # already handled
            p.status = AssignmentStatus.ACCEPTED
            task_ref = db.query(Task).filter(Task.id == p.task_id).first()
            if task_ref:
                task_ref.status = TaskStatus.ASSIGNED
            confirmed_vol_ids.append(p.volunteer_id)
            
        db.commit()
        print(f"Generated {len(proposed)} proposed assignments. Confirmed volunteer IDs: {confirmed_vol_ids}")

    print("\nDatabase seeding completed successfully!")
    print(f"Total Organizations: {len(org_ids)}")
    print(f"Total Volunteers: {len(available_vols)}")
    print(f"Total Need Reports: {db.query(NeedReport).count()}")
    print(f"Total Tasks Created: {db.query(Task).count()}")
    print(f"Total Duplicate Candidate Flags: {db.query(DuplicateCandidate).filter(DuplicateCandidate.status == 'pending').count()}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed PostGIS database with realistic Seattle crisis log data.")
    parser.add_argument("--reset", action="store_true", help="Truncate existing tables before seeding.")
    args = parser.parse_args()

    session = SessionLocal()
    try:
        seed_database(session, args.reset)
    finally:
        session.close()
