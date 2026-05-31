from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from routes import router as auth_router, resume_router, versions_router, prompts_router, admin_router
from jobs_router import jobs_router
from user_jobs_router import router as user_jobs_router
from database import engine
from models import Base

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

# Include routers
app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(versions_router)
app.include_router(prompts_router)
app.include_router(admin_router)
app.include_router(jobs_router)
app.include_router(user_jobs_router)

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
