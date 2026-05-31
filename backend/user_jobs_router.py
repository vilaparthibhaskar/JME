"""
User-job interaction endpoints — save, discard, list.

All endpoints require a valid JWT passed as ?token=<jwt>.

Routes:
    GET    /api/user-jobs           → {job_id: {status, title, url, ...}, ...}
    POST   /api/user-jobs/{job_id}  → upsert status ('saved' | 'discarded')
    DELETE /api/user-jobs/{job_id}  → remove status (reset to "unseen")
"""

import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User as UserModel, UserJob

router = APIRouter(prefix="/api/user-jobs", tags=["user-jobs"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"


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

class JobStatusBody(BaseModel):
    status:     str       # 'saved' | 'discarded'
    title:      str = ""
    url:        str = ""
    company_id: int = 0


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
def get_statuses(token: str, db: Session = Depends(get_db)):
    """Return a map of job_id → status info for all jobs this user has interacted with."""
    user = _get_user(token, db)
    rows = db.query(UserJob).filter(UserJob.user_id == user.id).all()
    return {
        row.job_id: {
            "status":       row.status,
            "title":        row.title,
            "url":          row.url,
            "company_id":   row.company_id,
            "first_seen_at": row.first_seen_at.isoformat() if row.first_seen_at else None,
            "updated_at":   row.updated_at.isoformat() if row.updated_at else None,
        }
        for row in rows
    }


@router.post("/{job_id}")
def set_status(job_id: str, body: JobStatusBody, token: str, db: Session = Depends(get_db)):
    """Upsert a saved/discarded status for a job."""
    if body.status not in ("saved", "discarded"):
        raise HTTPException(status_code=400, detail="status must be 'saved' or 'discarded'")
    user = _get_user(token, db)
    row  = db.query(UserJob).filter(
        UserJob.user_id == user.id, UserJob.job_id == job_id
    ).first()
    if row:
        row.status     = body.status
        row.updated_at = datetime.utcnow()
    else:
        row = UserJob(
            user_id    = user.id,
            job_id     = job_id,
            company_id = body.company_id,
            title      = body.title,
            url        = body.url,
            status     = body.status,
        )
        db.add(row)
    db.commit()
    return {"ok": True, "job_id": job_id, "status": body.status}


@router.delete("/{job_id}")
def remove_status(job_id: str, token: str, db: Session = Depends(get_db)):
    """Remove any saved/discarded status (mark as unseen again)."""
    user = _get_user(token, db)
    db.query(UserJob).filter(
        UserJob.user_id == user.id, UserJob.job_id == job_id
    ).delete()
    db.commit()
    return {"ok": True}
