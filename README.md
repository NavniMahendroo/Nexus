# Nexus - Intelligent Disaster Relief Matching Platform

Nexus is an intelligent, high-performance community need aggregation and volunteer matching engine designed for humanitarian and disaster relief organizations. The platform ingests unstructured disaster need reports from the field, normalizes their taxonomy, dynamically scores task urgency with recency time decay, resolves duplicate conflict flags using machine learning embeddings, and coordinates volunteer-to-task routing using geospatial indices and pluggable optimization algorithms.

---

## Architecture Overview

```text
               +-------------------------------------------+
               |             React Frontend                |
               | (Vite, Leaflet Map, AuthContext, Tailwind)|
               +--------------------+----------------------+
                                    |
                                    | REST API (JWT Bearer)
                                    v
               +--------------------+----------------------+
               |             FastAPI Server                |
               |       (Auth, Intake, Admin, Routing)       |
               +----------+---------+---------+------------+
                          |         |         |
      ML Embeddings       |         |         | Geospatial / Relational Queries
      (all-MiniLM-L6-v2)  v         |         v
     +-----------------------+      |    +------------------------+
     | Sentence Transformers |      |    | PostgreSQL DB (PostGIS)|
     +-----------------------+      |    +------------------------+
                                    v
                         +-----------------------+
                         | Matching Engine       |
                         | (Greedy / Hungarian)  |
                         +-----------------------+
```

---

## Technical Stack & Decoupled Design

### Backend Service (FastAPI)
* **Framework**: FastAPI (async Python ASGI framework).
* **Database Layer**: PostgreSQL with `PostGIS` geospatial extensions, accessed via SQLAlchemy ORM.
* **Geospatial Processing**:
  * Coordinate storage using `Geography(Point, srid=4326)` for precise ellipsoidal meter calculations.
  * GiST (Generalized Search Tree) spatial indexing on task and volunteer location columns for rapid proximity calculations.
  * `ST_DWithin` filtering applied in the database layer before calculations to reduce memory footprint.
  * NumPy-vectorized Haversine matrices for in-memory coordinate calculations to prevent $N+1$ database roundtrips.
* **Semantic Deduplication**:
  * Sentence embeddings generated locally using Hugging Face's `all-MiniLM-L6-v2` transformer model (384-dimensional vector).
  * In-memory cosine similarity scanning pre-filtered by spatial search radius to bypass database table scans.
* **Authentication**: Token-based JWT authorization using `PyJWT` and password cryptography using `passlib[bcrypt]`.

### Frontend Client (React)
* **Build Tooling**: Vite (Single Page Application).
* **Routing**: React Router DOM (fully guarded with login role-based middlewares).
* **Interactive Mapping**: Leaflet mapping via React Leaflet displaying coordinates on a customized dark-matter background.
* **Styling**: Tailwind CSS (supporting a premium glassmorphic dark interface).

---

## Mathematical Explanations & Core Engines

### 1. Urgency Scoring Engine
Each task's relative priority score (ranging from $0.0$ to $10.0$) is calculated dynamically using a recency decay function:

$$\text{Urgency Score} = \text{Severity Weight} + (\text{Corroboration Score} + \text{Population Score}) \times e^{-0.1t}$$

* **Decoupled Urgency**: The base `Severity Weight` is decoupled from the time decay coefficient. This ensures that a critical task (e.g., core infrastructure failure) remains at high priority regardless of age, while minor reports decay dynamically over time.
* **Corroboration Score**: Multi-report volume counts are converted into an additive score factor.
* **Population Affected Score**: Scaled logarithmically using $\log_{10}(\text{population})$ to prevent outlier reports from skewing scores.
* **Time Decay ($t$)**: Time elapsed since the report was generated (in days).

---

### 2. Spatial-Semantic Deduplication
When a new need report is ingested, the engine automatically checks for duplicate reports within a specific search area:
1. **Spatial & Category Filter**: Extracts reports matching the same category within a $20\text{km}$ radius (`DUPLICATE_SEARCH_RADIUS_KM = 20.0`).
2. **Cosine Similarity**: Calculates similarity score between the new report description ($u$) and nearby descriptions ($v$):

$$\text{Similarity} = \frac{u \cdot v}{\|u\| \|v\|}$$

3. **Resolution**: If the similarity score meets or exceeds `threshold` ($0.85$), the system registers a `DuplicateCandidate` record in a pending status.
4. **Resolution Logic**:
   * **Merge**: Links both report entries to a single consolidated Task, sums their corroboration counts, assigns the highest severity category, and updates the task urgency.
   * **Reject**: Rejects the candidate flag, marking reports as confirmed-distinct so they are not flagged against each other again.

---

### 3. Pluggable Matching Strategies

#### Greedy Strategy ($\mathcal{O}(T \cdot V)$)
Sequentially pairs volunteers and tasks starting with the highest individual match score. This strategy is fast and efficient for simple matches, but can lead to local bottlenecks where specialized volunteers are matched to generic tasks.

#### Optimal Strategy ($\mathcal{O}(n^3)$)
Formulates matching as a bipartite graph assignment problem. It precomputes a full $T \times V$ distance matrix once using vectorized NumPy Haversine math, then solves the assignment problem globally using the Kuhn-Munkres (Hungarian) algorithm:

$$\max \sum_{i} \sum_{j} c_{ij} x_{ij}$$

where $c_{ij}$ is the match score between task $i$ and volunteer $j$, and $x_{ij} \in \{0, 1\}$ represents the assignment. This strategy maximizes global utility and ensures specialized volunteers are prioritized for critical, high-skill tasks.

---

## Database Schemas & Models

### `need_reports`
Stores raw intake submissions from field agents and NGOs.
* `id` (Integer, Primary Key)
* `category` (String, Index) - Normalized taxonomy category (e.g. water, medical, shelter, food)
* `raw_category` (String) - Original user input
* `description` (String) - Detailed text description of the emergency
* `location` (Geography Point, srid=4326) - Location coordinates
* `severity` (Enum: low, medium, high, critical) - Base severity level
* `reported_by_id` (Integer, Foreign Key) - Associated organization ID
* `status` (Enum: raw, converted_to_task, merged, closed) - Intake progression status
* `population_affected` (Integer) - Estimated headcount affected
* `corroboration_count` (Integer) - Reporting confirmation volume counter
* `task_id` (Integer, Foreign Key) - Linked consolidated task
* `embedding` (JSON) - 384-dimensional sentence embedding list

### `tasks`
Represents validated, actionable units of work.
* `id` (Integer, Primary Key)
* `title` (String) - Summarized task heading
* `description` (String) - Merged details from associated need reports
* `required_skills` (JSON) - String array of required skills
* `location` (Geography Point, srid=4326) - Task center coordinates
* `status` (Enum: open, assigned, in_progress, completed, archived) - Current task status
* `urgency_score` (Float) - Computed urgency priority rating
* `urgency_reasoning` (JSON) - Score breakdown variables mapping

### `volunteers`
Stores details of registered relief volunteers.
* `id` (Integer, Primary Key)
* `name` (String) - Volunteer name
* `contact_info` (String) - Contact details
* `skills` (JSON) - String array of skills
* `location` (Geography Point, srid=4326) - Volunteer location
* `availability` (Boolean) - Availability toggle

### `assignments`
Connects volunteers and tasks.
* `id` (Integer, Primary Key)
* `task_id` (Integer, Foreign Key) - Mapped task ID
* `volunteer_id` (Integer, Foreign Key) - Mapped volunteer ID
* `match_score` (Float) - Relative match quality score
* `match_reasoning` (String) - Explanation reasoning text
* `status` (Enum: pending, accepted, declined) - Assignment status
* `assigned_at` (DateTime) - Creation timestamp
* `decided_at` (DateTime) - Accept/Decline decision timestamp

### `duplicate_candidates`
Stores flagged duplicate need reports for review.
* `id` (Integer, Primary Key)
* `report_id` (Integer, Foreign Key) - Reference report
* `duplicate_report_id` (Integer, Foreign Key) - Flagged report
* `similarity_score` (Float) - Cosine similarity score
* `status` (String, default: "pending") - Review status (pending, merged, rejected)

---

## API Endpoints Reference

### Authentication Router
* `POST /api/auth/login` - Authenticates user credentials and returns a JWT token.
  * **Payload**: `{ "username": "admin", "password": "adminpassword" }`
  * **Response**: Includes `access_token`, `token_type`, `role`, and `username`.

### Need Reports Router
* `POST /api/reports/` - Ingests a new need report, normalizes category, generates description embedding, runs duplicate detection, and registers duplicate flags.
* `POST /api/reports/bulk` - Uploads a CSV/Excel file containing multiple reports, parses rows, runs batch deduplication, and commits records.
* `GET /api/reports/` - Lists ingested need reports.
* `POST /api/reports/{report_id}/convert-to-task` - Converts a RAW unlinked NeedReport to a Task, linking them together and calculating task urgency.

### Tasks Router
* `GET /api/tasks/` - Lists tasks.
* `GET /api/tasks/{id}/urgency-breakdown` - Returns the detailed math breakdown behind a task's urgency score.
* `POST /api/tasks/recompute-urgency` - (Admin only) Triggers batch urgency recalculations for all open tasks.

### Matching Router
* `POST /api/matching/run?strategy={strategy}` - (Admin only) Clears pending matches, executes the selected strategy (greedy/optimal), and returns proposed assignments.
* `POST /api/matching/confirm/{id}` - (Admin only) Confirms a proposed matching assignment, changing assignment status to `accepted` and task to `assigned`.
* `POST /api/matching/decline/{id}` - Declines a proposed assignment, changing status to `declined`.
* `POST /api/matching/status/{id}?task_status={status}` - Updates the progression status of an accepted assignment's task (e.g. `in_progress`, `completed`).
* `GET /api/matching/compare` - (Admin only) Returns runtime, coverage score, and match count benchmarks for both strategies.

### Admin Router
* `GET /api/admin/duplicate-candidates` - (Admin only) Lists pending duplicate flags.
* `POST /api/admin/duplicate-candidates/{id}/merge` - (Admin only) Resolves conflict, merges details to a single Task, and links records.
* `POST /api/admin/duplicate-candidates/{id}/reject` - (Admin only) Dismisses the flag, confirming the reports are distinct.

### Volunteer Router
* `GET /api/volunteers/nearby` - Finds volunteers within a radius sorted by distance.

---

## Report-Driven Task Creation Workflow
To prevent stand-alone or hypothetical tasks from drifting from field realities, Tasks can **only** be created from verified Need Reports in two ways:
1. **Single Report Conversion**: Converting an un-flagged RAW report via the **Need Reports Ingestion Console** (`POST /api/reports/{id}/convert-to-task`).
2. **Semantic Merge**: Merging two duplicate flagged reports through the deduplication review console (`POST /api/admin/duplicate-candidates/{id}/merge`).

Both paths reuse the shared service function `create_task_from_reports()` inside `app/services/task_creation.py` to ensure consistency.

---

## Workspace Dashboards Structure

### NGO Administrator Dashboard
* **Live Map & Urgency**: Features PostGIS geospatial distribution plots and Leaflet heatmap layers, paired with real-time Urgency Score parameter breakdowns.
* **Need Reports Ingestion**: Prominent portal for submitting raw report forms and reviewing/converting the unlinked reports queue.
* **Duplicate Review**: Double-panel cosines similarity comparator for merging or rejecting semantic duplicate candidates.
* **Pluggable Matching**: Strategy benchmarks optimizer grid to assign volunteers using Greedy vs Hungarian assignment models.

### Volunteer Dashboard
* **Pending Proposals**: Lists new proposed match assignments waiting for confirmation.
* **Active Missions**: Displays accepted assignments with state badges and task progress controls ("Start Task" and "Resolve Task").
* **Completed Archive**: Holds histories of resolved assignments.

---

## Getting Started

### 1. Backend Setup
1. **Initialize Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://postgres:<your-postgres-password>@localhost:5432/nexus
   APP_NAME="Nexus Disaster Relief Hub"
   ```

2. **Install Dependencies**:
   ```bash
   venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. **Verify Database Setup**:
   Ensure PostgreSQL is running and has the PostGIS extension enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

4. **Run Alembic Migrations**:
   ```bash
   venv\Scripts\alembic upgrade head
   ```

5. **Start Dev Server**:
   ```bash
   $env:TESTING="false"
   venv\Scripts\uvicorn app.main:app --reload
   ```

---

### 2. Frontend Setup
1. **Navigate and Install**:
   ```bash
   cd frontend
   npm install
   ```

2. **Boot Client App**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

### 3. Running Unit Tests
Run the test suite using mock embedding models to skip downloading heavy model weights over the network:
```bash
$env:TESTING="true"
venv\Scripts\pytest
```

---

## Demo Credentials
Use these pre-configured accounts to access the dashboards:
* **NGO Administrator Dashboard**:
  * **Username**: `admin`
  * **Password**: `adminpassword`
* **Volunteer Dashboard**:
  * **Username**: `volunteer`
  * **Password**: `volunteerpassword`

---

## Troubleshooting & Database Connection Tips

### Special Characters in Password
If your local PostgreSQL password contains special characters (like `@`), they must be URL-encoded in the `DATABASE_URL` connection string:
* `@` becomes `%40`
* `#` becomes `%23`
* `/` becomes `%2F`

*Example:* `postgresql://postgres:p%40ssw0rd@localhost:5432/nexus`

### Alembic ConfigParser Percent Error
Alembic parses database connection strings internally as `.ini` property fields. If your connection string contains a percent symbol `%` (due to URL encoding), it can raise an `invalid interpolation syntax` error. 

The application automatically escapes `%` as `%%` dynamically inside `app/db/env.py` to prevent this issue. No manual escaping of `%` is required inside the `.env` file.

