from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from routes import router as auth_router, resume_router, versions_router, prompts_router, admin_router
from jobs_router import jobs_router
from user_jobs_router import router as user_jobs_router
from applied_router import router as applied_router
from user_companies_router import router as user_companies_router
from tracked_companies_router import router as tracked_companies_router
from tracked_company_groups_router import router as tracked_company_groups_router
from recruiters_router import router as recruiters_router
from recruiter_groups_router import router as recruiter_groups_router
from user_groups_router import router as user_groups_router
from database import engine
from models import Base
from sqlalchemy import text

load_dotenv()

# CORS: in production set ALLOWED_ORIGINS env var to your frontend URL
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app = FastAPI(title="JME Backend", version="1.0.0")

# CORS middleware MUST be added first, before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all tables on startup (safe - only creates missing tables)
Base.metadata.create_all(bind=engine)

# Add theme_color column if it doesn't exist yet (one-time migration)
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN theme_color VARCHAR DEFAULT '#52796f'"))
        conn.commit()
except Exception:
    pass  # Column already exists

# Add job_type + vendor/location columns to applied_jobs if they don't exist (one-time migration)
_applied_migrations = [
    "ALTER TABLE applied_jobs ADD COLUMN job_type VARCHAR(20) DEFAULT 'full_time'",
    "ALTER TABLE applied_jobs ADD COLUMN vendor_company VARCHAR(255)",
    "ALTER TABLE applied_jobs ADD COLUMN vendor_name VARCHAR(255)",
    "ALTER TABLE applied_jobs ADD COLUMN vendor_email VARCHAR(255)",
    "ALTER TABLE applied_jobs ADD COLUMN vendor_phone VARCHAR(50)",
    "ALTER TABLE applied_jobs ADD COLUMN location VARCHAR(255)",
    "ALTER TABLE applied_jobs ADD COLUMN impl_partner VARCHAR(255)",
    "ALTER TABLE applied_jobs ADD COLUMN end_client VARCHAR(255)",
]
for _stmt in _applied_migrations:
    try:
        with engine.connect() as conn:
            conn.execute(text(_stmt))
            conn.commit()
    except Exception:
        pass  # Column already exists

# Add card_color to tracked companies if it doesn't exist (one-time migration)
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE user_tracked_companies ADD COLUMN card_color VARCHAR(20) DEFAULT '#eaf3ff'"))
        conn.commit()
except Exception:
    pass  # Column already exists

# Include routers
app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(versions_router)
app.include_router(prompts_router)
app.include_router(admin_router)
app.include_router(jobs_router)
app.include_router(user_jobs_router)
app.include_router(applied_router)
app.include_router(user_companies_router)
app.include_router(tracked_companies_router)
app.include_router(tracked_company_groups_router)
app.include_router(recruiters_router)
app.include_router(recruiter_groups_router)
app.include_router(user_groups_router)

# Health check endpoint
@app.get("/")
def read_root():
    return {"message": "JME Backend is running!", "status": "ok"}

# Test endpoint
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
