"""
GET /api/jobs — aggregated job feed endpoint (cache-aware, TTL-enforced).

On first load (use_cache=false)  : scrapes live, writes results to DB cache, returns fresh data.
                                   BUT if the DB cache for a company was written within the last
                                   CACHE_TTL_SECONDS seconds, the fresh-scrape is skipped and
                                   the cached data is returned instead (TTL protection).
On subsequent loads (use_cache=true): reads from DB cache instantly (<100 ms).

Query params:
    company_ids  str   required  e.g. "1,3,5"
    page         int   default 1
    per_page     int   default 12
    search       str   optional  filters on title and tags
    date_from    str   optional  "YYYY-MM-DD" inclusive lower bound
    date_to      str   optional  "YYYY-MM-DD" inclusive upper bound
    use_cache    bool  default false

Response:
    { jobs: [...], total: int, page: int, per_page: int, has_more: bool, from_cache: bool,
      ttl_remaining: dict }   # seconds until each company cache expires (0 = already expired)
"""

import asyncio
import hashlib
import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from companies import COMPANY_REGISTRY
from database import get_db
from models import CompanyJobCache

jobs_router = APIRouter(prefix="/api", tags=["jobs"])

# ── TTL ───────────────────────────────────────────────────────────────────────
CACHE_TTL_SECONDS = 300  # 5 minutes


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_job_id(job: dict) -> str:
    """Derive a stable, unique job identifier from the job's URL or existing id."""
    url = job.get("url", "")
    m = re.search(r"/jobs/results/(\d+)", url)
    if m:
        return f"google_{m.group(1)}"
    m = re.search(r"/profile/job_details/(\d+)", url)
    if m:
        return f"meta_{m.group(1)}"
    if "id" in job:
        return f"c{job.get('companyId', 0)}_{job['id']}"
    key = f"{job.get('companyId', 0)}:{job.get('title', '')}"
    return "h_" + hashlib.md5(key.encode()).hexdigest()[:12]


def _stamp_ids(jobs: list[dict]) -> list[dict]:
    for j in jobs:
        if "job_id" not in j:
            j["job_id"] = _make_job_id(j)
    return jobs


def _filter_and_sort(jobs: list[dict], search: str, date_from: str, date_to: str) -> list[dict]:
    if search:
        q = search.lower()
        jobs = [j for j in jobs if q in j.get("title", "").lower()
                or q in " ".join(j.get("tags") or []).lower()]
    if date_from:
        jobs = [j for j in jobs if (j.get("posted") or "") >= date_from]
    if date_to:
        jobs = [j for j in jobs if (j.get("posted") or "") <= date_to]
    jobs.sort(key=lambda j: j.get("posted") or "", reverse=True)
    return jobs


def _paginate(jobs, page, per_page):
    total = len(jobs)
    start = (page - 1) * per_page
    end   = start + per_page
    return jobs[start:end], total, end < total


# ── Endpoint ──────────────────────────────────────────────────────────────────

@jobs_router.get("/jobs")
async def get_jobs(
    company_ids: str = "",
    page: int = 1,
    per_page: int = 12,
    search: str = "",
    date_from: str = "",
    date_to: str = "",
    use_cache: bool = False,
    db: Session = Depends(get_db),
):
    empty = {"jobs": [], "total": 0, "page": page, "per_page": per_page,
             "has_more": False, "ttl_remaining": {}}

    ids: list[int] = [int(p) for p in company_ids.split(",") if p.strip().isdigit()]
    if not ids:
        return {**empty, "from_cache": False}

    # ── Cache path (instant DB read) ──────────────────────────────────────────
    if use_cache:
        all_jobs: list[dict] = []
        ttl_remaining: dict[str, int] = {}
        for cid in ids:
            row = db.query(CompanyJobCache).filter(CompanyJobCache.company_id == cid).first()
            if row:
                all_jobs.extend(row.jobs)
                age = (datetime.utcnow() - row.cached_at).total_seconds()
                ttl_remaining[str(cid)] = max(0, int(CACHE_TTL_SECONDS - age))
        if not all_jobs:
            return {**empty, "from_cache": True}
        all_jobs = _filter_and_sort(all_jobs, search, date_from, date_to)
        page_jobs, total, has_more = _paginate(all_jobs, page, per_page)
        return {"jobs": page_jobs, "total": total, "page": page, "per_page": per_page,
                "has_more": has_more, "from_cache": True, "ttl_remaining": ttl_remaining}

    # ── Fresh-scrape path (with TTL enforcement) ──────────────────────────────
    valid_ids = [cid for cid in ids if cid in COMPANY_REGISTRY]
    if not valid_ids:
        return {**empty, "from_cache": False}

    now = datetime.utcnow()
    ttl_cutoff = now - timedelta(seconds=CACHE_TTL_SECONDS)

    # Split: companies whose cache is still fresh vs. those that need re-scraping
    ttl_blocked: list[int] = []   # cache < 5 min old → serve from cache
    to_scrape:   list[int] = []   # cache missing or stale → scrape live

    cache_rows: dict[int, CompanyJobCache] = {}
    for cid in valid_ids:
        row = db.query(CompanyJobCache).filter(CompanyJobCache.company_id == cid).first()
        if row:
            cache_rows[cid] = row
        if row and row.cached_at and row.cached_at > ttl_cutoff:
            ttl_blocked.append(cid)
        else:
            to_scrape.append(cid)

    all_jobs: list[dict] = []
    ttl_remaining: dict[str, int] = {}

    # Serve TTL-blocked companies straight from DB
    for cid in ttl_blocked:
        row = cache_rows[cid]
        all_jobs.extend(row.jobs)
        age = (now - row.cached_at).total_seconds()
        ttl_remaining[str(cid)] = max(0, int(CACHE_TTL_SECONDS - age))

    # Scrape stale/missing companies
    if to_scrape:
        tasks   = [COMPANY_REGISTRY[cid]() for cid in to_scrape]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for cid, r in zip(to_scrape, results):
            if isinstance(r, Exception):
                # Fall back to stale cache if available rather than returning nothing
                if cid in cache_rows:
                    all_jobs.extend(cache_rows[cid].jobs)
                continue
            _stamp_ids(r)
            all_jobs.extend(r)
            ttl_remaining[str(cid)] = CACHE_TTL_SECONDS
            # Persist to cache (upsert)
            row = cache_rows.get(cid) or db.query(CompanyJobCache).filter(
                CompanyJobCache.company_id == cid).first()
            if row:
                row.jobs      = r
                row.cached_at = now
            else:
                db.add(CompanyJobCache(company_id=cid, jobs=r, cached_at=now))
        db.commit()

    from_cache = len(to_scrape) == 0   # True only if every company was TTL-blocked
    all_jobs = _filter_and_sort(all_jobs, search, date_from, date_to)
    page_jobs, total, has_more = _paginate(all_jobs, page, per_page)
    return {"jobs": page_jobs, "total": total, "page": page, "per_page": per_page,
            "has_more": has_more, "from_cache": from_cache, "ttl_remaining": ttl_remaining}
