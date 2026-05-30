from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    admin_key: Optional[str] = None  # Secret key for admin registration

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    resume_name: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class GenerateResume(BaseModel):
    resume_data: Dict[str, Any]
    template: Optional[str] = "template1"

class User(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    resume_name: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectItem(BaseModel):
    TITLE: str
    TECH: Optional[str] = None
    POINTS: Optional[List[str]] = None


class SkillItem(BaseModel):
    SKILL_NAME: str
    SKILLS: Optional[str] = None


class VersionBase(BaseModel):
    name: str
    projects: Optional[List[ProjectItem]] = None
    education: Optional[str] = None
    cgpa: Optional[str] = None
    edu_timeline: Optional[str] = None
    hobbies: Optional[List[str]] = None
    achievements: Optional[List[str]] = None
    base_exp_json: Optional[str] = None
    resume_title: Optional[str] = None
    resume_name_displayed: Optional[str] = None
    user_location: Optional[str] = None
    user_email: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    phone_number: Optional[str] = None
    leetcode: Optional[str] = None
    skills: Optional[List[SkillItem]] = None


class VersionCreate(VersionBase):
    pass


class VersionUpdate(VersionBase):
    name: Optional[str] = None


class VersionResponse(VersionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PromptBase(BaseModel):
    title: str
    content: str


class PromptCreate(PromptBase):
    pass


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class PromptResponse(PromptBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
