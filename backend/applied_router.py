"""
Applied Jobs endpoints — track job applications.

All endpoints require a valid JWT passed as ?token=<jwt>.

Routes:
    GET    /api/applied-jobs              → list all applications for current user
    POST   /api/applied-jobs              → create a new application
    PATCH  /api/applied-jobs/{id}         → update status or notes
    DELETE /api/applied-jobs/{id}         → delete
"""

import os
from datetime import datetime
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User as UserModel, AppliedJob, Version

router = APIRouter(prefix="/api/applied-jobs", tags=["applied-jobs"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"

VALID_STATUSES = {
    "applied", "shortlisted", "assessment",
    "interview_in_progress", "rtr", "submitted",
    "interviewed", "rejected",
}


# ── Auth helper ───────────────────────────────────────────────────────────────

def _get_user(token: str, db: Session) -> UserModel:
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Schemas ───────────────────────────────────────────────────────────────────

class AppliedJobCreate(BaseModel):
    company_id:       int
    company_name:     str
    job_title:        str
    version_id:       Optional[int]   = None
    version_name:     Optional[str]   = None
    version_snapshot: Optional[Any]   = None   # full version dict snapshot
    template_name:    Optional[str]   = None
    exp_json:         Optional[str]   = None
    notes:            Optional[str]   = None
    status:           Optional[str]   = "applied"
    applied_at:       Optional[datetime] = None
    job_type:         Optional[str]   = "full_time"  # full_time | contract
    vendor_company:   Optional[str]   = None
    vendor_name:      Optional[str]   = None
    vendor_email:     Optional[str]   = None
    vendor_phone:     Optional[str]   = None
    location:         Optional[str]   = None
    impl_partner:     Optional[str]   = None
    end_client:       Optional[str]   = None


class AppliedJobUpdate(BaseModel):
    status:         Optional[str] = None
    notes:          Optional[str] = None
    job_type:       Optional[str] = None
    vendor_company: Optional[str] = None
    vendor_name:    Optional[str] = None
    vendor_email:   Optional[str] = None
    vendor_phone:   Optional[str] = None
    location:       Optional[str] = None
    impl_partner:   Optional[str] = None
    end_client:     Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
def list_applied_jobs(token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    rows = (
        db.query(AppliedJob)
        .filter(AppliedJob.user_id == user.id)
        .order_by(AppliedJob.applied_at.desc())
        .all()
    )
    return [_serialize(r) for r in rows]


@router.post("")
def create_applied_job(body: AppliedJobCreate, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)

    # Build version snapshot from DB if version_id given but no snapshot provided
    version_snapshot = body.version_snapshot
    version_name     = body.version_name
    if body.version_id and not version_snapshot:
        ver = db.query(Version).filter(
            Version.id == body.version_id,
            Version.user_id == user.id
        ).first()
        if ver:
            version_snapshot = {
                "id":           ver.id,
                "name":         ver.name,
                "projects":     ver.projects,
                "education":    ver.education,
                "cgpa":         ver.cgpa,
                "edu_timeline": ver.edu_timeline,
                "hobbies":      ver.hobbies,
                "achievements": ver.achievements,
                "base_exp_json": ver.base_exp_json,
                "resume_title": ver.resume_title,
                "resume_name_displayed": ver.resume_name_displayed,
                "user_location": ver.user_location,
                "user_email":   ver.user_email,
                "github":       ver.github,
                "linkedin":     ver.linkedin,
                "phone_number": ver.phone_number,
                "skills":       ver.skills,
            }
            version_name = ver.name

    job = AppliedJob(
        user_id          = user.id,
        company_id       = body.company_id,
        company_name     = body.company_name,
        job_title        = body.job_title,
        version_id       = body.version_id,
        version_name     = version_name,
        version_snapshot = version_snapshot,
        template_name    = body.template_name,
        exp_json         = body.exp_json,
        notes            = body.notes,
        status           = body.status if body.status in VALID_STATUSES else "applied",
        applied_at       = body.applied_at or datetime.utcnow(),
        job_type         = body.job_type or "full_time",
        vendor_company   = body.vendor_company,
        vendor_name      = body.vendor_name,
        vendor_email     = body.vendor_email,
        vendor_phone     = body.vendor_phone,
        location         = body.location,
        impl_partner     = body.impl_partner,
        end_client       = body.end_client,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _serialize(job)


@router.patch("/{job_id}")
def update_applied_job(job_id: int, body: AppliedJobUpdate, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    job  = db.query(AppliedJob).filter(
        AppliedJob.id == job_id,
        AppliedJob.user_id == user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    if body.status is not None:
        if body.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")
        job.status = body.status
    if body.notes          is not None: job.notes          = body.notes
    if body.job_type       is not None: job.job_type       = body.job_type
    if body.vendor_company is not None: job.vendor_company = body.vendor_company
    if body.vendor_name    is not None: job.vendor_name    = body.vendor_name
    if body.vendor_email   is not None: job.vendor_email   = body.vendor_email
    if body.vendor_phone   is not None: job.vendor_phone   = body.vendor_phone
    if body.location       is not None: job.location       = body.location
    if body.impl_partner   is not None: job.impl_partner   = body.impl_partner
    if body.end_client     is not None: job.end_client     = body.end_client
    db.commit()
    db.refresh(job)
    return _serialize(job)


@router.delete("/{job_id}")
def delete_applied_job(job_id: int, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    job  = db.query(AppliedJob).filter(
        AppliedJob.id == job_id,
        AppliedJob.user_id == user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(job)
    db.commit()
    return {"ok": True}


# ── Serializer ────────────────────────────────────────────────────────────────

def _serialize(job: AppliedJob) -> dict:
    return {
        "id":               job.id,
        "user_id":          job.user_id,
        "company_id":       job.company_id,
        "company_name":     job.company_name,
        "job_title":        job.job_title,
        "version_id":       job.version_id,
        "version_name":     job.version_name,
        "version_snapshot": job.version_snapshot,
        "template_name":    job.template_name,
        "exp_json":         job.exp_json,
        "notes":            job.notes,
        "status":           job.status,
        "job_type":         job.job_type or "full_time",
        "vendor_company":   job.vendor_company,
        "vendor_name":      job.vendor_name,
        "vendor_email":     job.vendor_email,
        "vendor_phone":     job.vendor_phone,
        "location":         job.location,
        "impl_partner":     job.impl_partner,
        "end_client":       job.end_client,
        "applied_at":       job.applied_at.isoformat() + "Z" if job.applied_at else None,
        "created_at":       job.created_at.isoformat() + "Z" if job.created_at else None,
    }
