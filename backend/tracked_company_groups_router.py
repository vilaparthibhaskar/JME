"""
Tracked Company Groups endpoints — named groups of tracked companies.

Routes:
    GET    /api/tracked-company-groups
    POST   /api/tracked-company-groups
    PATCH  /api/tracked-company-groups/{group_id}
    DELETE /api/tracked-company-groups/{group_id}
"""

import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User as UserModel, UserTrackedCompanyGroup

router = APIRouter(prefix="/api/tracked-company-groups", tags=["tracked-company-groups"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"


def _get_user(token: str, db: Session) -> UserModel:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


class GroupCreate(BaseModel):
    name: str
    member_ids: Optional[List[int]] = []


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    member_ids: Optional[List[int]] = None


def _serialize(g: UserTrackedCompanyGroup) -> dict:
    return {
        "id": g.id,
        "name": g.name,
        "member_ids": g.member_ids or [],
        "created_at": g.created_at.isoformat() if g.created_at else None,
        "updated_at": g.updated_at.isoformat() if g.updated_at else None,
    }


@router.get("")
def list_groups(token: str = "", db: Session = Depends(get_db)):
    user = _get_user(token, db)
    groups = (
        db.query(UserTrackedCompanyGroup)
        .filter(UserTrackedCompanyGroup.user_id == user.id)
        .order_by(UserTrackedCompanyGroup.created_at.asc())
        .all()
    )
    return [_serialize(g) for g in groups]


@router.post("", status_code=201)
def create_group(body: GroupCreate, token: str = "", db: Session = Depends(get_db)):
    user = _get_user(token, db)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Group name is required")

    row = UserTrackedCompanyGroup(
        user_id=user.id,
        name=name,
        member_ids=list(body.member_ids or []),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.patch("/{group_id}")
def update_group(group_id: int, body: GroupUpdate, token: str = "", db: Session = Depends(get_db)):
    user = _get_user(token, db)
    row = (
        db.query(UserTrackedCompanyGroup)
        .filter(UserTrackedCompanyGroup.id == group_id, UserTrackedCompanyGroup.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Group not found")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Group name cannot be empty")
        row.name = name

    if body.member_ids is not None:
        row.member_ids = list(body.member_ids)

    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: int, token: str = "", db: Session = Depends(get_db)):
    user = _get_user(token, db)
    row = (
        db.query(UserTrackedCompanyGroup)
        .filter(UserTrackedCompanyGroup.id == group_id, UserTrackedCompanyGroup.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Group not found")

    db.delete(row)
    db.commit()
