"""
Async fetchers for each ATS type supported by the jobs router.

All fetchers return a list of normalized job dicts with these keys:
    id          str   — ATS job ID
    companyId   int   — frontend company ID (injected by caller)
    title       str
    location    str
    remote      bool
    salary      str   — may be empty
    type        str   — e.g. "Full-time"
    tags        list  — up to 3 strings
    posted      str   — "YYYY-MM-DD"
    desc        str   — plain text, max 300 chars
    url         str   — apply / listing URL
"""

import re
import httpx
from datetime import datetime, timezone


_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; JME/1.0)"}
_TIMEOUT = 10.0


def _strip_html(text: str) -> str:
    """Remove HTML tags and collapse whitespace, capped at 300 chars."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:300]


async def fetch_greenhouse(board: str, company_id: int) -> list[dict]:
    """Fetch jobs from Greenhouse's public boards API."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(url, headers=_HEADERS)
            r.raise_for_status()
            data = r.json()
    except Exception:
        return []

    jobs = []
    for j in data.get("jobs", []):
        location = j.get("location", {}).get("name", "") or ""
        remote = "remote" in location.lower()

        posted_raw = j.get("updated_at") or ""
        posted = posted_raw[:10] if posted_raw else ""

        departments = [
            d["name"] for d in j.get("departments", []) if d.get("name")
        ]

        jobs.append({
            "id":        str(j.get("id", "")),
            "companyId": company_id,
            "title":     j.get("title", ""),
            "location":  location,
            "remote":    remote,
            "salary":    "",
            "type":      "Full-time",
            "tags":      departments[:3],
            "posted":    posted,
            "desc":      _strip_html(j.get("content", "")),
            "url":       j.get("absolute_url", ""),
        })

    return jobs


async def fetch_lever(board: str, company_id: int) -> list[dict]:
    """Fetch jobs from Lever's public postings API."""
    url = f"https://api.lever.co/v0/postings/{board}?mode=json"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(url, headers=_HEADERS)
            r.raise_for_status()
            data = r.json()
    except Exception:
        return []

    jobs = []
    for j in data:
        cats = j.get("categories") or {}
        location = cats.get("location") or ""
        remote = (
            "remote" in location.lower()
            or j.get("workplaceType", "") == "remote"
        )

        ts = j.get("createdAt") or 0
        try:
            posted = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime(
                "%Y-%m-%d"
            )
        except Exception:
            posted = ""

        tags = []
        if cats.get("team"):
            tags.append(cats["team"])
        if cats.get("department"):
            tags.append(cats["department"])

        jobs.append({
            "id":        j.get("id", ""),
            "companyId": company_id,
            "title":     j.get("text", ""),
            "location":  location,
            "remote":    remote,
            "salary":    "",
            "type":      cats.get("commitment") or "Full-time",
            "tags":      tags[:3],
            "posted":    posted,
            "desc":      _strip_html(
                j.get("description") or j.get("descriptionPlain") or ""
            ),
            "url":       j.get("hostedUrl", ""),
        })

    return jobs
