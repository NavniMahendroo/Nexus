import sys

modules_to_test = [
    ("fastapi", "FastAPI"),
    ("pydantic", "Pydantic"),
    ("pydantic_settings", "Pydantic Settings"),
    ("sqlalchemy", "SQLAlchemy"),
    ("geoalchemy2", "GeoAlchemy2"),
    ("psycopg2", "psycopg2-binary"),
    ("alembic", "Alembic"),
    ("pandas", "Pandas"),
    ("openpyxl", "openpyxl (Excel engine)"),
    ("shapely", "Shapely"),
    ("scipy", "Scipy (Optimization tool)"),
    ("numpy", "NumPy"),
    ("sentence_transformers", "Sentence Transformers"),
]

missing_any = False

print("=== Checking Third-Party Dependencies ===")
for module_name, display_name in modules_to_test:
    try:
        __import__(module_name)
        print(f"[OK] {display_name} is installed and importable.")
    except ImportError as e:
        print(f"[FAIL] {display_name} (module: '{module_name}') is MISSING.")
        missing_any = True

print("\n=== Checking Application Module Imports ===")
app_imports = [
    "app.core.config",
    "app.core.database",
    "app.models.enums",
    "app.models.base",
    "app.models.organization",
    "app.models.volunteer",
    "app.models.need_report",
    "app.models.task",
    "app.models.assignment",
    "app.schemas.location",
    "app.schemas.organization",
    "app.schemas.volunteer",
    "app.schemas.need_report",
    "app.schemas.task",
    "app.schemas.assignment",
    "app.services.taxonomy",
    "app.services.ingestion",
    "app.services.urgency_scoring",
    "app.services.geospatial",
    "app.services.matching",
    "app.routers.organization",
    "app.routers.volunteer",
    "app.routers.need_report",
    "app.routers.tasks",
    "app.routers.matching",
    "app.models.duplicate_candidate",
    "app.schemas.duplicate_candidate",
    "app.services.deduplication",
    "app.routers.admin",
    "app.main"
]

for import_path in app_imports:
    try:
        __import__(import_path, fromlist=["*"])
        print(f"[OK] {import_path} imports successfully.")
    except ImportError as e:
        print(f"[FAIL] {import_path} import failed: {e}")
        missing_any = True

if missing_any:
    print("\n[WARNING] Some imports failed. Please ensure you have activated your virtual environment and run:")
    print("pip install -r requirements.txt")
    sys.exit(1)
else:
    print("\n[SUCCESS] All backend imports resolve successfully!")
    sys.exit(0)
