"""
Recruiter Groups endpoints — named groups of recruiter contacts.

All endpoints require a valid JWT passed as ?token=<jwt>.

Routes:
    GET    /api/recruiter-groups         → list all groups for current user
    POST   /api/recruiter-groups         → create a new group
    PATCH  /api/recruiter-groups/{id}    → update group name and/or members
    DELETE /api/recruiter-groups/{id}    → delete group (does NOT delete recruiters)
"""

import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User as UserModel, RecruiterGroup

router = APIRouter(prefix="/api/recruiter-groups", tags=["recruiter-groups"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"


# ── Auth helper ────────────────────────────────────────────────────────────────

def _get_user(token: str, db: Session) -> UserModel:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Schemas ────────────────────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    name:       str
    member_ids: Optional[List[int]] = []

class GroupUpdate(BaseModel):
    name:       Optional[str]       = None
    member_ids: Optional[List[int]] = None


# ── Serializer ─────────────────────────────────────────────────────────────────

def _serialize(g: RecruiterGroup) -> dict:
    return {
        "id":         g.id,
        "name":       g.name,
        "member_ids": g.member_ids or [],
        "created_at": g.created_at.isoformat() if g.created_at else None,
        "updated_at": g.updated_at.isoformat() if g.updated_at else None,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("")
def list_groups(token: str = "", db: Session = Depends(get_db)):
    user = _get_user(token, db)
    groups = db.query(RecruiterGroup).filter(RecruiterGroup.user_id == user.id).order_by(RecruiterGroup.created_at).all()
    return [_serialize(g) for g in groups]


@router.post("", status_code=201)
def create_group(body: GroupCreate, token: str = "", db: Session = Depends(get_db)):
    user = _get_user(token, db)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Group name is required")
    g = RecruiterGroup(
        user_id    = user.id,
        name       = name,
        member_ids = list(body.member_ids or []),
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return _serialize(g)


@router.patch("/{group_id}")
def update_group(group_id: int, body: GroupUpdate, token: str = "", db: Session = Depends(get_db)):
    user = _get_user(token, db)
    g = db.query(RecruiterGroup).filter(RecruiterGroup.id == group_id, RecruiterGroup.user_id == user.id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    if body.name is not None:
        stripped = body.name.strip()
        if not stripped:
            raise HTTPException(status_code=422, detail="Group name cannot be empty")
        g.name = stripped
    if body.member_ids is not None:
        g.member_ids = list(body.member_ids)
    g.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(g)
    return _serialize(g)


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: int, token: str = "", db: Session = Depends(get_db)):
    user = _get_user(token, db)
    g = db.query(RecruiterGroup).filter(RecruiterGroup.id == group_id, RecruiterGroup.user_id == user.id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(g)
    db.commit()
