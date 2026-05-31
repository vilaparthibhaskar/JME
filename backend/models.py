from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, UniqueConstraint
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    resume_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    resume_downloads = Column(Integer, default=0)

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email}, is_admin={self.is_admin})>"


class Version(Base):
    __tablename__ = "versions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)

    # Projects: [{"TITLE": "...", "TECH": "...", "POINTS": [...]}]
    projects = Column(JSON, nullable=True)

    # Education
    education = Column(String, nullable=True)
    cgpa = Column(String, nullable=True)
    edu_timeline = Column(String, nullable=True)

    # Hobbies: list of strings
    hobbies = Column(JSON, nullable=True)
    achievements = Column(JSON, nullable=True)

    # Base experience JSON (stored as raw JSON text, keyed by 'experiences')
    base_exp_json = Column(Text, nullable=True)

    # Personal / contact info
    resume_title = Column(String, nullable=True)
    resume_name_displayed = Column(String, nullable=True)
    user_location = Column(String, nullable=True)
    user_email = Column(String, nullable=True)
    github = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    leetcode = Column(String, nullable=True)

    # Skills: [{"SKILL_NAME": "...", "SKILLS": "..."}]
    skills = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Version(id={self.id}, name={self.name}, user_id={self.user_id})>"


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Prompt(id={self.id}, title={self.title}, user_id={self.user_id})>"


class UserJob(Base):
    """Tracks a user's interaction status (saved / discarded) with a specific job."""
    __tablename__ = "user_jobs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id      = Column(String(255), nullable=False)   # stable id from _make_job_id
    company_id  = Column(Integer, nullable=False)
    title       = Column(String(500))
    url         = Column(Text)
    status      = Column(String(50), nullable=False)    # 'saved' | 'discarded'
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_job_id"),
    )

    def __repr__(self):
        return f"<UserJob(user_id={self.user_id}, job_id={self.job_id}, status={self.status})>"


class CompanyJobCache(Base):
    """Stores the most-recently scraped job list for each company (one row per company)."""
    __tablename__ = "company_job_cache"

    company_id = Column(Integer, primary_key=True)
    jobs       = Column(JSON, nullable=False)   # full list of job dicts, un-paginated
    cached_at  = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<CompanyJobCache(company_id={self.company_id}, jobs={len(self.jobs or [])}, cached_at={self.cached_at})>"

