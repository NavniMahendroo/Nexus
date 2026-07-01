from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.organization import router as organization_router
from app.routers.volunteer import router as volunteer_router
from app.routers.need_report import router as need_report_router
from app.routers.tasks import router as tasks_router
from app.routers.matching import router as matching_router
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent Matching System for Community Needs and Volunteers",
    version="1.0.0"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(organization_router)
app.include_router(volunteer_router)
app.include_router(need_report_router)
app.include_router(tasks_router)
app.include_router(matching_router)

@app.get("/")
def read_root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "documentation": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
