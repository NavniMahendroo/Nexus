from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# In production/deployment, we might want to check/verify connection pool settings.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # checks connection health before issuing queries
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
