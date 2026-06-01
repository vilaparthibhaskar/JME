"""
User Companies endpoints — per-user company list for Applied Jobs tracking.

Routes:
    GET    /api/user-companies          → list user's companies
    POST   /api/user-companies          → create { name, color }
    DELETE /api/user-companies/{id}     → delete company from user's list only
"""

import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User as UserModel, UserCompany

router = APIRouter(prefix="/api/user-companies", tags=["user-companies"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"


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


class CompanyCreate(BaseModel):
    name:  str
    color: Optional[str] = "#667eea"


def _serialize(c: UserCompany) -> dict:
    return {
        "id":         c.id,
        "name":       c.name,
        "color":      c.color or "#667eea",
        "created_at": c.created_at.isoformat() + "Z" if c.created_at else None,
    }


@router.get("")
def list_companies(token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    rows = (
        db.query(UserCompany)
        .filter(UserCompany.user_id == user.id)
        .order_by(UserCompany.created_at.asc())
        .all()
    )
    return [_serialize(r) for r in rows]


@router.post("")
def create_company(body: CompanyCreate, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Company name is required")
    # Prevent duplicate names (case-insensitive) per user
    existing = (
        db.query(UserCompany)
        .filter(UserCompany.user_id == user.id, UserCompany.name.ilike(body.name.strip()))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="A company with this name already exists")
    c = UserCompany(
        user_id    = user.id,
        name       = body.name.strip(),
        color      = body.color or "#667eea",
        created_at = datetime.utcnow(),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _serialize(c)


@router.delete("/{company_id}")
def delete_company(company_id: int, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    company = db.query(UserCompany).filter(
        UserCompany.id == company_id,
        UserCompany.user_id == user.id,
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    db.delete(company)
    db.commit()
    return {"ok": True, "deleted_company_id": company_id}
