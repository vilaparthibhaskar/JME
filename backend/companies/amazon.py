import asyncio
import datetime
import re

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

COMPANY_ID = 3

BASE_URL = "https://www.amazon.jobs"

# 4 pages × 10 = 40 jobs, sorted by most recent, SW dev / Full-Time / Seattle metro
_SEARCH_TPL = (
    "https://www.amazon.jobs/en/search"
    "?offset={offset}&result_limit=10&sort=recent"
    "&category[]=software-development"
    "&job_type[]=Full-Time"
    "&country[]=USA"
    "&distanceType=Mi&radius=24km"
    "&loc_group_id=seattle-metro"
    "&loc_query=Greater+Seattle+Area%2C+WA%2C+United+States"
    "&base_query="
)

TARGET_JOBS = 40
_PAGES = 4  # offsets 0, 10, 20, 30


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _parse_date(raw: str) -> str:
    """'Posted May 29, 2026' → '2026-05-29'"""
    try:
        dt = datetime.datetime.strptime(raw.replace("Posted ", "").strip(), "%B %d, %Y")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return raw


def _extract_experience(text: str) -> str:
    """Infer seniority from the first 'X+ years' mention in qualifications."""
    m = re.search(
        r"(\d+)\+?\s*years? of (?:non-internship professional )?(?:software|front.?end|mobile|software engineering)",
        text,
        re.IGNORECASE,
    )
    if m:
        yrs = int(m.group(1))
        if yrs <= 1:
            return "Entry Level"
        if yrs <= 3:
            return "Mid Level"
        return "Senior Level"
    return ""


_TAG_PATTERNS: list[tuple[str, list[str]]] = [
    ("Java",                ["java"]),
    ("Python",              ["python"]),
    ("C++",                 ["c++"]),
    ("C#",                  ["c#"]),
    ("Go",                  ["golang", " go "]),
    ("JavaScript",          ["javascript"]),
    ("TypeScript",          ["typescript"]),
    ("React",               ["react"]),
    ("Node.js",             ["node.js", "nodejs"]),
    ("SQL",                 ["sql"]),
    ("AWS",                 ["aws", "amazon web services"]),
    ("Distributed Systems", ["distributed systems"]),
    ("Machine Learning",    ["machine learning"]),
    ("Kubernetes",          ["kubernetes", "k8s"]),
    ("Docker",              ["docker"]),
    ("Scala",               ["scala"]),
    ("Rust",                ["rust"]),
    ("Perl",                ["perl"]),
    ("Backend",             ["backend", "back-end", "back end"]),
    ("Frontend",            ["frontend", "front-end", "front end"]),
    ("Full Stack",          ["full stack", "fullstack"]),
    ("Data Structures",     ["data structures"]),
    ("Algorithms",          ["algorithms"]),
    ("Microservices",       ["microservices"]),
    ("Security",            ["security"]),
]


def _extract_tags(text: str) -> list[str]:
    lower = text.lower()
    tags = [label for label, pats in _TAG_PATTERNS if any(p in lower for p in pats)]
    return tags[:6]


# ── Page fetcher ──────────────────────────────────────────────────────────────

async def _fetch_page(browser, offset: int, semaphore) -> list[dict]:
    async with semaphore:
        page = await browser.new_page()
        try:
            url = _SEARCH_TPL.format(offset=offset)
            await page.goto(url, wait_until="load", timeout=35000)
            await page.wait_for_timeout(3000)
            html = await page.content()
        finally:
            await page.close()

    soup = BeautifulSoup(html, "html.parser")
    tiles = soup.find_all("div", attrs={"data-job-id": True})

    jobs: list[dict] = []
    for tile in tiles:
        job_id_str = tile.get("data-job-id", "")
        title_el = tile.find("a", class_="job-link")
        if not title_el:
            continue

        title   = _clean(title_el.get_text())
        href    = title_el.get("href", "")
        job_url = BASE_URL + href if href else BASE_URL

        # Locations — filter out separator "|" and "Job ID: XXXX" entries
        loc_items = tile.select("div.location-and-id li")
        locs = [
            _clean(li.get_text())
            for li in loc_items
            if _clean(li.get_text()) not in ("|",)
            and not _clean(li.get_text()).startswith("Job ID:")
        ]
        location = " | ".join(locs) if locs else ""

        date_el = tile.find("span", class_="posting-date")
        posted  = _parse_date(_clean(date_el.get_text()) if date_el else "")

        qualif_el   = tile.find("div", class_="qualifications-preview")
        qualif_text = _clean(qualif_el.get_text(" ")) if qualif_el else ""

        tags       = _extract_tags(qualif_text)
        experience = _extract_experience(qualif_text)
        remote     = "remote" in location.lower() or "remote" in qualif_text.lower()

        # Short description: first 3 qualification bullets joined
        bullets = qualif_el.find_all("li") if qualif_el else []
        desc    = "  •  ".join(_clean(li.get_text()) for li in bullets[:3]) if bullets else qualif_text[:220]

        jobs.append({
            "id":         job_id_str,
            "job_id":     f"amazon_{job_id_str}",
            "title":      title,
            "location":   location,
            "remote":     remote,
            "salary":     "",
            "type":       "Full-time",
            "tags":       tags,
            "posted":     posted,
            "desc":       desc,
            "url":        job_url,
            "experience": experience,
            "companyId":  COMPANY_ID,
        })

    return jobs


# ── Public entry point ────────────────────────────────────────────────────────

async def fetch_jobs() -> list[dict]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        semaphore = asyncio.Semaphore(2)   # max 2 concurrent page loads
        offsets   = [i * 10 for i in range(_PAGES)]   # [0, 10, 20, 30]

        results = await asyncio.gather(
            *[_fetch_page(browser, off, semaphore) for off in offsets],
            return_exceptions=True,
        )
        await browser.close()

    all_jobs: list[dict] = []
    seen: set[str] = set()
    for r in results:
        if isinstance(r, Exception):
            print(f"[amazon] page error: {r}")
            continue
        for job in r:
            if job["id"] not in seen:
                seen.add(job["id"])
                all_jobs.append(job)

    return all_jobs[:TARGET_JOBS]
