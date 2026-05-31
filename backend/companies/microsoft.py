import asyncio
import datetime
import re

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

COMPANY_ID = 4

BASE_URL = "https://apply.careers.microsoft.com"

# 2 pages × 20 = 40 jobs, SW Engineering / Entry + Mid-Level / Full-Time / US
_SEARCH_TPL = (
    "https://apply.careers.microsoft.com/careers"
    "?start={start}"
    "&location=United+States%2C+Multiple+Locations%2C+Multiple+Locations"
    "&sort_by=timestamp"
    "&filter_include_remote=1"
    "&filter_career_discipline=Software+Engineering%2CData+Science"
    "&filter_employment_type=full-time"
    "&filter_profession=software+engineering"
    "&filter_seniority=Mid-Level%2CEntry"
)

TARGET_JOBS = 40
_PAGES = 2  # start=0, start=20

_STATE_ABBR = {
    "Washington": "WA", "California": "CA", "Texas": "TX", "New York": "NY",
    "North Carolina": "NC", "Virginia": "VA", "Massachusetts": "MA",
    "Colorado": "CO", "Georgia": "GA", "Illinois": "IL", "Florida": "FL",
    "Arizona": "AZ", "Oregon": "OR", "Utah": "UT", "Nevada": "NV",
    "Idaho": "ID", "Michigan": "MI", "Ohio": "OH", "Pennsylvania": "PA",
}

_TAG_PATTERNS: list[tuple[str, list[str]]] = [
    ("C#",                  ["c#"]),
    ("C++",                 ["c++"]),
    (".NET",                [".net", "dotnet"]),
    ("Java",                ["java"]),
    ("Python",              ["python"]),
    ("Go",                  ["golang"]),
    ("JavaScript",          ["javascript"]),
    ("TypeScript",          ["typescript"]),
    ("React",               ["react"]),
    ("Azure",               ["azure"]),
    ("AWS",                 ["aws"]),
    ("Kubernetes",          ["kubernetes", "k8s"]),
    ("Docker",              ["docker"]),
    ("Machine Learning",    ["machine learning"]),
    ("AI",                  ["artificial intelligence", " ai "]),
    ("Distributed Systems", ["distributed systems"]),
    ("Rust",                ["rust"]),
    ("SQL",                 ["sql"]),
    ("Security",            ["security"]),
    ("Cloud",               ["cloud computing", "cloud services", "cloud infrastructure"]),
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _parse_exact_date(text: str) -> str:
    """'May 29, 2026' → '2026-05-29'"""
    try:
        dt = datetime.datetime.strptime(text.strip(), "%B %d, %Y")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return ""


def _relative_to_date(text: str) -> str:
    """'Posted 3 days ago' → approximate ISO date"""
    today = datetime.date.today()
    m = re.search(r"(\d+)\s+day", text, re.IGNORECASE)
    if m:
        return (today - datetime.timedelta(days=int(m.group(1)))).isoformat()
    if re.search(r"a day|today|just now", text, re.IGNORECASE):
        return today.isoformat()
    m2 = re.search(r"(\d+)\s+month", text, re.IGNORECASE)
    if m2:
        return (today - datetime.timedelta(days=int(m2.group(1)) * 30)).isoformat()
    m3 = re.search(r"(\d+)\s+week", text, re.IGNORECASE)
    if m3:
        return (today - datetime.timedelta(weeks=int(m3.group(1)))).isoformat()
    return today.isoformat()


def _simplify_location(raw: str) -> str:
    """'United States, Washington, Redmond + 2 more' → 'Redmond, WA + more'"""
    more_suffix = " + more" if re.search(r"\+\s*\d+\s*more", raw, re.IGNORECASE) else ""
    clean = re.sub(r"\+\s*\d+\s*more", "", raw, flags=re.IGNORECASE).strip()
    clean = re.sub(r"^United States,\s*", "", clean).strip()
    # Catch "Multiple Locations, Multiple Locations" style
    if "multiple locations" in clean.lower():
        return "Multiple US Locations"
    parts = [p.strip() for p in clean.split(",")]
    if len(parts) >= 2:
        state = parts[0].strip()
        city  = parts[1].strip()
        abbr  = _STATE_ABBR.get(state, state)
        return f"{city}, {abbr}{more_suffix}"
    return raw


def _extract_tags(text: str) -> list[str]:
    lower = text.lower()
    return [label for label, pats in _TAG_PATTERNS if any(p in lower for p in pats)][:6]


def _extract_experience(text: str) -> str:
    m = re.search(
        r"(\d+)\+?\s*years?\s+(?:of\s+)?(?:technical engineering|software|coding|engineering|development)",
        text,
        re.IGNORECASE,
    )
    if m:
        yrs = int(m.group(1))
        if yrs <= 2:
            return "Entry Level"
        if yrs <= 5:
            return "Mid Level"
        return "Senior Level"
    return "Mid Level"  # URL filter already limits to Entry/Mid


# ── Detail page fetcher ───────────────────────────────────────────────────────

async def _fetch_detail(browser, job_id: str, semaphore) -> dict:
    async with semaphore:
        page = await browser.new_page()
        try:
            await page.goto(f"{BASE_URL}/careers/job/{job_id}", wait_until="load", timeout=30000)
            await page.wait_for_timeout(2000)
            text = await page.inner_text("body")
        finally:
            await page.close()

    # Exact posted date
    m = re.search(r"Date posted\s+(\w+ \d+,\s*\d{4})", text)
    posted = _parse_exact_date(m.group(1)) if m else ""

    # Overview → description: slice text between 'Overview' and the next section header
    desc = ""
    idx_ov = text.find("\nOverview")
    if idx_ov >= 0:
        ov_start = idx_ov + len("\nOverview")
        ov_chunk = text[ov_start:ov_start + 1200]
        # stop at the next major section heading
        for stopper in ["Responsibilities", "Required Qualifications", "Minimum Qualifications", "Preferred Qualifications", "Basic Qualifications"]:
            stop_idx = ov_chunk.find(stopper)
            if stop_idx > 0:
                ov_chunk = ov_chunk[:stop_idx]
                break
        desc = _clean(ov_chunk)[:300]

    # Required qualifications → tags + experience
    quals = ""
    for header in ["Required Qualifications", "Minimum Qualifications", "Basic Qualifications"]:
        idx_q = text.find(header)
        if idx_q >= 0:
            q_chunk = text[idx_q:idx_q + 800]
            for stopper in ["Other Requirements", "Preferred Qualifications", "Responsibilities", "Benefits"]:
                stop_idx = q_chunk.find(stopper)
                if stop_idx > 0:
                    q_chunk = q_chunk[:stop_idx]
                    break
            quals = q_chunk
            break
    if not quals:
        quals = text[:2000]

    return {
        "posted":     posted,
        "desc":       desc,
        "tags":       _extract_tags(quals),
        "experience": _extract_experience(quals),
    }


# ── Listing page fetcher ──────────────────────────────────────────────────────

async def _fetch_listing(browser, start: int, semaphore) -> list[dict]:
    async with semaphore:
        page = await browser.new_page()
        try:
            await page.goto(_SEARCH_TPL.format(start=start), wait_until="load", timeout=35000)
            await page.wait_for_timeout(4000)
            html = await page.content()
        finally:
            await page.close()

    soup  = BeautifulSoup(html, "html.parser")
    cards = soup.find_all("div", attrs={"data-test-id": "job-listing"})

    stubs = []
    for card in cards:
        link = card.find("a")
        if not link:
            continue
        href = link.get("href", "")
        m = re.search(r"/careers/job/(\d+)", href)
        if not m:
            continue
        job_id = m.group(1)

        title_el  = card.find("div", class_=lambda c: c and "title" in c)
        loc_el    = card.find("div", class_=lambda c: c and "fieldValue" in c)
        posted_el = card.find("div", class_=lambda c: c and "subData" in c)

        title      = _clean(title_el.get_text())  if title_el  else ""
        raw_loc    = _clean(loc_el.get_text())    if loc_el    else ""
        posted_rel = _clean(posted_el.get_text()) if posted_el else ""

        stubs.append({
            "id":         job_id,
            "job_id":     f"microsoft_{job_id}",
            "title":      title,
            "location":   _simplify_location(raw_loc),
            "posted_rel": posted_rel,
            "url":        f"{BASE_URL}/careers/job/{job_id}",
        })

    return stubs


# ── Public entry point ────────────────────────────────────────────────────────

async def fetch_jobs() -> list[dict]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )

        # Phase 1: listing pages (parallel, semaphore 2)
        list_sem   = asyncio.Semaphore(2)
        page_tasks = [_fetch_listing(browser, s, list_sem) for s in [i * 20 for i in range(_PAGES)]]
        page_res   = await asyncio.gather(*page_tasks, return_exceptions=True)

        stubs: list[dict] = []
        seen:  set[str]   = set()
        for r in page_res:
            if isinstance(r, Exception):
                print(f"[microsoft] listing error: {r}")
                continue
            for job in r:
                if job["id"] not in seen:
                    seen.add(job["id"])
                    stubs.append(job)
        stubs = stubs[:TARGET_JOBS]

        # Phase 2: detail pages (parallel, semaphore 4)
        detail_sem = asyncio.Semaphore(4)
        detail_res = await asyncio.gather(
            *[_fetch_detail(browser, s["id"], detail_sem) for s in stubs],
            return_exceptions=True,
        )

        await browser.close()

    jobs = []
    for stub, detail in zip(stubs, detail_res):
        if isinstance(detail, Exception):
            print(f"[microsoft] detail error {stub['id']}: {detail}")
            detail = {}

        posted = detail.get("posted") or _relative_to_date(stub.get("posted_rel", ""))
        loc    = stub["location"]

        jobs.append({
            "id":         stub["id"],
            "job_id":     stub["job_id"],
            "title":      stub["title"],
            "location":   loc,
            "remote":     "remote" in loc.lower() or "multiple" in loc.lower(),
            "salary":     "",
            "type":       "Full-time",
            "tags":       detail.get("tags", []),
            "posted":     posted,
            "desc":       detail.get("desc", ""),
            "url":        stub["url"],
            "experience": detail.get("experience", "Mid Level"),
            "companyId":  COMPANY_ID,
        })

    return jobs
