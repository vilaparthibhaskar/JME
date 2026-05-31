"""
Recruiters endpoints — track recruiter contacts.

All endpoints require a valid JWT passed as ?token=<jwt>.

Routes:
    GET    /api/recruiters         → list all recruiters for current user
    POST   /api/recruiters         → create a new recruiter
    PATCH  /api/recruiters/{id}    → update a recruiter
    DELETE /api/recruiters/{id}    → delete a recruiter
"""

import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User as UserModel, Recruiter

router = APIRouter(prefix="/api/recruiters", tags=["recruiters"])

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

class RecruiterCreate(BaseModel):
    name:         str
    company:      Optional[str] = None
    title:        Optional[str] = None
    email:        Optional[str] = None
    phone:        Optional[str] = None
    linkedin:     Optional[str] = None
    notes:        Optional[str] = None
    last_contact: Optional[str] = None   # "YYYY-MM-DD"


class RecruiterUpdate(BaseModel):
    name:         Optional[str] = None
    company:      Optional[str] = None
    title:        Optional[str] = None
    email:        Optional[str] = None
    phone:        Optional[str] = None
    linkedin:     Optional[str] = None
    notes:        Optional[str] = None
    last_contact: Optional[str] = None


# ── Serializer ────────────────────────────────────────────────────────────────

def _serialize(r: Recruiter) -> dict:
    return {
        "id":           r.id,
        "name":         r.name,
        "company":      r.company,
        "title":        r.title,
        "email":        r.email,
        "phone":        r.phone,
        "linkedin":     r.linkedin,
        "notes":        r.notes,
        "last_contact": r.last_contact,
        "created_at":   r.created_at.isoformat() if r.created_at else None,
        "updated_at":   r.updated_at.isoformat() if r.updated_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
def list_recruiters(token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    recruiters = (
        db.query(Recruiter)
        .filter(Recruiter.user_id == user.id)
        .order_by(Recruiter.created_at.desc())
        .all()
    )
    return [_serialize(r) for r in recruiters]


@router.post("", status_code=201)
def create_recruiter(body: RecruiterCreate, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    rec = Recruiter(
        user_id      = user.id,
        name         = body.name.strip(),
        company      = body.company,
        title        = body.title,
        email        = body.email,
        phone        = body.phone,
        linkedin     = body.linkedin,
        notes        = body.notes,
        last_contact = body.last_contact,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _serialize(rec)


@router.patch("/{rec_id}")
def update_recruiter(rec_id: int, body: RecruiterUpdate, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    rec = db.query(Recruiter).filter(Recruiter.id == rec_id, Recruiter.user_id == user.id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recruiter not found")
    if body.name        is not None: rec.name         = body.name.strip()
    if body.company     is not None: rec.company      = body.company
    if body.title       is not None: rec.title        = body.title
    if body.email       is not None: rec.email        = body.email
    if body.phone       is not None: rec.phone        = body.phone
    if body.linkedin    is not None: rec.linkedin     = body.linkedin
    if body.notes       is not None: rec.notes        = body.notes
    if body.last_contact is not None: rec.last_contact = body.last_contact
    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _serialize(rec)


@router.delete("/{rec_id}", status_code=204)
def delete_recruiter(rec_id: int, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    rec = db.query(Recruiter).filter(Recruiter.id == rec_id, Recruiter.user_id == user.id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recruiter not found")
    db.delete(rec)
    db.commit()
