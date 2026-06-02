"""
User Groups endpoints — cross-user collaboration groups with shared message feed.

All endpoints require a valid JWT passed as ?token=<jwt>.

Routes:
    GET    /api/user-groups                        → list all groups user belongs to (admin or member)
    POST   /api/user-groups                        → create a new group (caller becomes admin + member)
    DELETE /api/user-groups/{id}                   → delete group (admin only)

    GET    /api/user-groups/users                  → search users by username (for adding members)

    POST   /api/user-groups/{id}/members           → add member by user_id (admin only)
    DELETE /api/user-groups/{id}/members/{user_id} → remove member (admin only)
    DELETE /api/user-groups/{id}/leave             → leave group (any non-admin member)

    GET    /api/user-groups/{id}/posts             → get posts for group (members only)
    POST   /api/user-groups/{id}/posts             → post a message (members only)
    DELETE /api/user-groups/{id}/posts/{post_id}   → delete post (post owner or group admin)
"""

import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User as UserModel, UserGroup, UserGroupMember, UserGroupPost

router = APIRouter(prefix="/api/user-groups", tags=["user-groups"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"


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
    name: str
    description: Optional[str] = None

class PostCreate(BaseModel):
    content: str


# ── Serializers ────────────────────────────────────────────────────────────────

def _ser_user(u: UserModel):
    return {
        "id": u.id,
        "username": u.username,
        "full_name": u.full_name or u.username,
    }

def _ser_group(g: UserGroup, members: list, current_user_id: int):
    return {
        "id": g.id,
        "name": g.name,
        "description": g.description,
        "admin_id": g.admin_id,
        "members": members,
        "member_count": len(members),
        "is_admin": g.admin_id == current_user_id,
        "created_at": g.created_at.isoformat() if g.created_at else None,
    }

def _ser_post(p: UserGroupPost, author: UserModel):
    return {
        "id": p.id,
        "group_id": p.group_id,
        "user_id": p.user_id,
        "author_username": author.username if author else "unknown",
        "author_full_name": (author.full_name or author.username) if author else "unknown",
        "content": p.content,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }

def _load_group_members(group_id: int, db: Session):
    memberships = db.query(UserGroupMember).filter(UserGroupMember.group_id == group_id).all()
    result = []
    for m in memberships:
        u = db.query(UserModel).filter(UserModel.id == m.user_id).first()
        if u:
            result.append({**_ser_user(u), "joined_at": m.joined_at.isoformat() if m.joined_at else None})
    return result


# ── Group list / create ────────────────────────────────────────────────────────

@router.get("")
def list_groups(token: str = Query(...), db: Session = Depends(get_db)):
    user = _get_user(token, db)
    # Find all group_ids where user is a member
    memberships = db.query(UserGroupMember).filter(UserGroupMember.user_id == user.id).all()
    group_ids = [m.group_id for m in memberships]
    groups = db.query(UserGroup).filter(UserGroup.id.in_(group_ids)).order_by(UserGroup.created_at.desc()).all()
    result = []
    for g in groups:
        members = _load_group_members(g.id, db)
        result.append(_ser_group(g, members, user.id))
    return result


@router.post("")
def create_group(body: GroupCreate, token: str = Query(...), db: Session = Depends(get_db)):
    user = _get_user(token, db)
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Group name is required")
    group = UserGroup(
        name=body.name.strip(),
        description=body.description.strip() if body.description else None,
        admin_id=user.id,
    )
    db.add(group)
    db.flush()  # get group.id
    # Admin is also a member
    db.add(UserGroupMember(group_id=group.id, user_id=user.id))
    db.commit()
    db.refresh(group)
    members = _load_group_members(group.id, db)
    return _ser_group(group, members, user.id)


@router.delete("/{group_id}")
def delete_group(group_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = _get_user(token, db)
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.admin_id != user.id:
        raise HTTPException(status_code=403, detail="Only the group admin can delete this group")
    # Delete posts, members, then group
    db.query(UserGroupPost).filter(UserGroupPost.group_id == group_id).delete()
    db.query(UserGroupMember).filter(UserGroupMember.group_id == group_id).delete()
    db.delete(group)
    db.commit()
    return {"ok": True}


# ── User search (for adding members) ──────────────────────────────────────────

@router.get("/users")
def search_users(
    q: str = Query("", description="Search by username or full name"),
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    _get_user(token, db)  # just auth check
    query = db.query(UserModel).filter(UserModel.is_active == True)
    if q.strip():
        like = f"%{q.strip().lower()}%"
        query = query.filter(
            (UserModel.username.ilike(like)) | (UserModel.full_name.ilike(like))
        )
    users = query.order_by(UserModel.username).limit(20).all()
    return [_ser_user(u) for u in users]


# ── Member management ──────────────────────────────────────────────────────────

@router.post("/{group_id}/members")
def add_member(
    group_id: int,
    user_id: int = Query(..., description="user_id to add"),
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    caller = _get_user(token, db)
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.admin_id != caller.id:
        raise HTTPException(status_code=403, detail="Only the group admin can add members")
    target = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(UserGroupMember).filter(
        UserGroupMember.group_id == group_id,
        UserGroupMember.user_id == user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
    db.add(UserGroupMember(group_id=group_id, user_id=user_id))
    db.commit()
    members = _load_group_members(group_id, db)
    return _ser_group(group, members, caller.id)


@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    caller = _get_user(token, db)
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.admin_id != caller.id:
        raise HTTPException(status_code=403, detail="Only the group admin can remove members")
    if user_id == group.admin_id:
        raise HTTPException(status_code=400, detail="Cannot remove the admin from the group")
    membership = db.query(UserGroupMember).filter(
        UserGroupMember.group_id == group_id,
        UserGroupMember.user_id == user_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(membership)
    db.commit()
    members = _load_group_members(group_id, db)
    return _ser_group(group, members, caller.id)


@router.delete("/{group_id}/leave")
def leave_group(group_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = _get_user(token, db)
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.admin_id == user.id:
        raise HTTPException(status_code=400, detail="Admin cannot leave the group. Delete it instead.")
    membership = db.query(UserGroupMember).filter(
        UserGroupMember.group_id == group_id,
        UserGroupMember.user_id == user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="You are not a member of this group")
    db.delete(membership)
    db.commit()
    return {"ok": True}


# ── Posts ──────────────────────────────────────────────────────────────────────

@router.get("/{group_id}/posts")
def get_posts(group_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = _get_user(token, db)
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    membership = db.query(UserGroupMember).filter(
        UserGroupMember.group_id == group_id,
        UserGroupMember.user_id == user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    posts = db.query(UserGroupPost).filter(
        UserGroupPost.group_id == group_id
    ).order_by(UserGroupPost.created_at.asc()).all()
    result = []
    author_cache = {}
    for p in posts:
        if p.user_id not in author_cache:
            author_cache[p.user_id] = db.query(UserModel).filter(UserModel.id == p.user_id).first()
        result.append(_ser_post(p, author_cache[p.user_id]))
    return result


@router.post("/{group_id}/posts")
def create_post(group_id: int, body: PostCreate, token: str = Query(...), db: Session = Depends(get_db)):
    user = _get_user(token, db)
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    membership = db.query(UserGroupMember).filter(
        UserGroupMember.group_id == group_id,
        UserGroupMember.user_id == user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Post content cannot be empty")
    post = UserGroupPost(group_id=group_id, user_id=user.id, content=body.content.strip())
    db.add(post)
    db.commit()
    db.refresh(post)
    return _ser_post(post, user)


@router.delete("/{group_id}/posts/{post_id}")
def delete_post(group_id: int, post_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = _get_user(token, db)
    group = db.query(UserGroup).filter(UserGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    post = db.query(UserGroupPost).filter(
        UserGroupPost.id == post_id,
        UserGroupPost.group_id == group_id,
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    # Only post owner or group admin can delete
    if post.user_id != user.id and group.admin_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this post")
    db.delete(post)
    db.commit()
    return {"ok": True}
