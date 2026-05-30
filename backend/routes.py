from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from models import User as UserModel, Version as VersionModel, Prompt as PromptModel
from schemas import UserCreate, User, UserUpdate, ChangePassword, GenerateResume, VersionCreate, VersionUpdate, VersionResponse, PromptCreate, PromptUpdate, PromptResponse
from security import hash_password, verify_password
from database import get_db
from docxtpl import DocxTemplate, RichText
import os
import json
import tempfile
from pathlib import Path

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "change-this-admin-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta=None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user - can be admin with secret key"""
    # Check if user already exists
    db_user = db.query(UserModel).filter(
        (UserModel.email == user.email) | (UserModel.username == user.username)
    ).first()
    
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered"
        )
    
    # Check if trying to register as admin
    is_admin = False
    if user.admin_key:
        if user.admin_key == ADMIN_SECRET_KEY:
            is_admin = True
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid admin secret key"
            )
    
    # Create new user
    hashed_password = hash_password(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        is_active=True,
        is_admin=is_admin
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User.model_validate(db_user)
    }

@router.post("/login")
def login_user(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    """Login user and return access token - accepts username or email"""
    # Try to find user by username or email
    user = db.query(UserModel).filter(
        (UserModel.username == username) | (UserModel.email == username)
    ).first()
    
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User.model_validate(user)
    }

@router.get("/me", response_model=User)
def get_current_user(token: str, db: Session = Depends(get_db)):
    """Get current user from token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

@router.patch("/profile", response_model=User)
def update_user_profile(token: str, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Update current user profile information"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Update fields if provided
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    
    # Don't allow changing username or email for now (can be added later with validation)
    # if user_update.username is not None:
    #     user.username = user_update.username
    # if user_update.email is not None:
    #     user.email = user_update.email
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/change-password")
def change_password(token: str, password_change: ChangePassword, db: Session = Depends(get_db)):
    """Change user password"""
    # Validate passwords match
    if password_change.new_password != password_change.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )
    
    # Validate password length
    if len(password_change.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    # Verify token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Verify current password
    if not verify_password(password_change.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    user.hashed_password = hash_password(password_change.new_password)
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password changed successfully"}


# Resume Router
resume_router = APIRouter(prefix="/api/resume", tags=["resume"])

@resume_router.post("/generate")
def generate_resume(token: str, request: GenerateResume):
    """Generate resume from JSON data using template"""
    # Verify token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        resume_json = request.resume_data
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON format for resume data"
        )
    
    # Get template path
    template_path = Path(__file__).parent / "template" / "template.docx"
    
    if not template_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Resume template not found"
        )
    
    try:
        # Load and render template
        doc = DocxTemplate(str(template_path))

        # Convert link fields to clickable RichText hyperlinks
        # Template must use {{r FIELD}} syntax for these
        link_labels = {
            'LEETCODE': 'Leetcode',
            'GITHUB': 'GitHub',
            'LINKEDIN': 'LinkedIn',
        }
        for link_field, label in link_labels.items():
            if resume_json.get(link_field):
                url = resume_json[link_field]
                href = url if url.startswith('http') else f'https://{url}'
                rt = RichText()
                rt.add(label, url_id=doc.build_url_id(href), color='219ebc', underline=True)
                resume_json[link_field] = rt

        doc.render(resume_json)
        
        # Create temporary file for output
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp_file:
            tmp_path = tmp_file.name
            doc.save(tmp_path)
        
        # Return file as download
        filename = f"{username}_Resume.docx"
        return FileResponse(
            path=tmp_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating resume: {str(e)}"
        )


# Prompts Router
prompts_router = APIRouter(prefix="/api/prompts", tags=["prompts"])


def _get_user_for_prompts(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@prompts_router.get("/", response_model=list[PromptResponse])
def list_prompts(token: str, db: Session = Depends(get_db)):
    user = _get_user_for_prompts(token, db)
    return db.query(PromptModel).filter(PromptModel.user_id == user.id).order_by(PromptModel.created_at.desc()).all()


@prompts_router.post("/", response_model=PromptResponse, status_code=201)
def create_prompt(token: str, data: PromptCreate, db: Session = Depends(get_db)):
    user = _get_user_for_prompts(token, db)
    prompt = PromptModel(user_id=user.id, title=data.title, content=data.content)
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@prompts_router.put("/{prompt_id}", response_model=PromptResponse)
def update_prompt(prompt_id: int, token: str, data: PromptUpdate, db: Session = Depends(get_db)):
    user = _get_user_for_prompts(token, db)
    prompt = db.query(PromptModel).filter(PromptModel.id == prompt_id, PromptModel.user_id == user.id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    if data.title is not None:
        prompt.title = data.title
    if data.content is not None:
        prompt.content = data.content
    prompt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prompt)
    return prompt


@prompts_router.delete("/{prompt_id}")
def delete_prompt(prompt_id: int, token: str, db: Session = Depends(get_db)):
    user = _get_user_for_prompts(token, db)
    prompt = db.query(PromptModel).filter(PromptModel.id == prompt_id, PromptModel.user_id == user.id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()
    return {"message": "Prompt deleted successfully"}

# Versions Router
versions_router = APIRouter(prefix="/api/versions", tags=["versions"])


def _get_user_from_token(token: str, db: Session) -> UserModel:
    """Helper to decode token and return the user."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@versions_router.get("/", response_model=list[VersionResponse])
def get_versions(token: str, db: Session = Depends(get_db)):
    """Get all versions for the current user."""
    user = _get_user_from_token(token, db)
    return db.query(VersionModel).filter(VersionModel.user_id == user.id).order_by(VersionModel.created_at.desc()).all()


@versions_router.post("/", response_model=VersionResponse)
def create_version(token: str, version: VersionCreate, db: Session = Depends(get_db)):
    """Create a new version for the current user."""
    user = _get_user_from_token(token, db)
    db_version = VersionModel(user_id=user.id, **version.model_dump())
    db.add(db_version)
    db.commit()
    db.refresh(db_version)
    return db_version


@versions_router.put("/{version_id}", response_model=VersionResponse)
def update_version(version_id: int, token: str, version: VersionUpdate, db: Session = Depends(get_db)):
    """Update an existing version."""
    user = _get_user_from_token(token, db)
    db_version = db.query(VersionModel).filter(
        VersionModel.id == version_id, VersionModel.user_id == user.id
    ).first()
    if not db_version:
        raise HTTPException(status_code=404, detail="Version not found")
    update_data = version.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_version, key, value)
    db_version.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_version)
    return db_version


@versions_router.delete("/{version_id}")
def delete_version(version_id: int, token: str, db: Session = Depends(get_db)):
    """Delete a version."""
    user = _get_user_from_token(token, db)
    db_version = db.query(VersionModel).filter(
        VersionModel.id == version_id, VersionModel.user_id == user.id
    ).first()
    if not db_version:
        raise HTTPException(status_code=404, detail="Version not found")
    db.delete(db_version)
    db.commit()
    return {"message": "Version deleted successfully"}
