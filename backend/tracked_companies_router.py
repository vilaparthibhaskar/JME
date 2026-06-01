"""
Independent user companies endpoints for the Companies page.

Routes:
    GET    /api/tracked-companies
    POST   /api/tracked-companies
    DELETE /api/tracked-companies/{company_id}
"""

import os
import random
import re
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User as UserModel, UserTrackedCompany, UserTrackedCompanyGroup
from schemas import TrackedCompanyCreate, TrackedCompanyResponse

router = APIRouter(prefix="/api/tracked-companies", tags=["tracked-companies"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def _get_user(token: str, db: Session) -> UserModel:
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


def _normalize_url(raw: str) -> str:
    url = (raw or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Apply URL is required")
    if not (url.startswith("http://") or url.startswith("https://")):
        url = f"https://{url}"
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Apply URL must be a valid URL")
    return url


def _random_light_hex() -> str:
    r = random.randint(222, 246)
    g = random.randint(228, 248)
    b = random.randint(222, 246)
    return f"#{r:02x}{g:02x}{b:02x}"


def _normalize_card_color(raw: Optional[str]) -> str:
    val = (raw or "").strip()
    if not val:
        return _random_light_hex()
    if HEX_COLOR_RE.fullmatch(val):
        return val.lower()
    return _random_light_hex()


@router.get("", response_model=list[TrackedCompanyResponse])
def list_tracked_companies(token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    return (
        db.query(UserTrackedCompany)
        .filter(UserTrackedCompany.user_id == user.id)
        .order_by(UserTrackedCompany.created_at.desc())
        .all()
    )


@router.post("", response_model=TrackedCompanyResponse)
def create_tracked_company(body: TrackedCompanyCreate, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)

    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Company name is required")

    apply_url = _normalize_url(body.apply_url)
    card_color = _normalize_card_color(body.card_color)

    duplicate = (
        db.query(UserTrackedCompany)
        .filter(
            UserTrackedCompany.user_id == user.id,
            UserTrackedCompany.name.ilike(name),
            UserTrackedCompany.apply_url == apply_url,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Company with same apply URL already exists")

    row = UserTrackedCompany(user_id=user.id, name=name, apply_url=apply_url, card_color=card_color)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{company_id}")
def delete_tracked_company(company_id: int, token: str, db: Session = Depends(get_db)):
    user = _get_user(token, db)
    row = (
        db.query(UserTrackedCompany)
        .filter(UserTrackedCompany.id == company_id, UserTrackedCompany.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")

    groups = (
        db.query(UserTrackedCompanyGroup)
        .filter(UserTrackedCompanyGroup.user_id == user.id)
        .all()
    )
    for g in groups:
        member_ids = g.member_ids or []
        if company_id in member_ids:
            g.member_ids = [mid for mid in member_ids if mid != company_id]

    db.delete(row)
    db.commit()
    return {"ok": True, "deleted_company_id": company_id}
