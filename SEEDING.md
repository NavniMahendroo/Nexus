# Database Seeding Engine Guide

Nexus includes a high-performance database seeding engine located in [app/db/seed_data.py](file:///c:/Users/Navni%20Mahendroo/Desktop/PROJECTS/Nexus/app/db/seed_data.py) to populate the PostGIS database with realistic, clustered disaster logistics data.

---

## Seeding Details & Geography

All generated records are clustered around **real Seattle coordinates** instead of being scattered randomly in the ocean. Coordinates are dynamically generated with small random offsets relative to center points in:
* Downtown Seattle
* Capitol Hill
* Ballard
* Fremont
* Queen Anne
* University District
* Beacon Hill
* West Seattle

---

## Seed Data Counts

Seeding populates the database with:
* **15 Organizations**: Registered NGOs (e.g. Seattle Community Food Bank, Cascadia Disaster Medical Corps).
* **214 Volunteers**: Seeded with randomized skills subsets (`medical`, `shelter`, `water`, `food`, `rescue`, etc.), schedule availabilities, and spatial positions.
* **500+ Need Reports**: Parameterized descriptions (dehydration reports, structural trauma clinics, shelter flooding) with varied severity ratings and timestamps spread over the last 30 days to test the Recency Decay scoring formulas.
* **25+ Cosine Similarity Flags**: Intentionally inserted semantic duplicate pairs flagged in a `pending` status.
* **120 Tasks**: Auto-converted and consolidated from a subset of unconverted RAW reports.
* **Assignments (Pre-run)**: Pre-runs the Hungarian Optimal strategy to establish proposed pairings:
  * **8 assignments are automatically ACCEPTED** (allowing you to log in as a volunteer and see active missions immediately).
  * The rest remain in a **PENDING** proposal state.

---

## Execution Instructions

To execute the seed data script:

1. **Activate Virtual Environment**:
   ```bash
   venv\Scripts\activate
   ```
2. **Run Script with Reset Flag**:
   The `--reset` argument triggers a cascading truncate of existing data to guarantee an idempotent start:
   ```bash
   python -m app.db.seed_data --reset
   ```

> [!NOTE]
> The seed script runs the real `SentenceTransformer('all-MiniLM-L6-v2')` model locally on your CPU to generate authentic embeddings for the 500+ reports. Depending on your CPU, this process will take **1 to 2 minutes** to complete.

---

## Testing Volunteer Dashboards
Once seeded, you can log in as a relief volunteer using these credentials:
* **Volunteer 1**: Username `volunteer1` / Password `volunteerpassword`
* **Volunteer 2**: Username `volunteer2` / Password `volunteerpassword`
* **Volunteer 3**: Username `volunteer3` / Password `volunteerpassword`
* **General Admin**: Username `admin` / Password `adminpassword`
