import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

COMPANY_ID = 1

GOOGLE_CAREERS_URL = (
    "https://www.google.com/about/careers/applications/jobs/results"
    "?q=Software%20Engineer"
    "&location=United%20States"
    "&hl=en"
    "&target_level=EARLY"
    "&target_level=MID"
    "&degree=BACHELORS"
    "&degree=MASTERS"
    "&employment_type=FULL_TIME"
    "&sort_by=date"
)

BASE_URL = "https://www.google.com"
# Relative job hrefs (e.g. "jobs/results/123-title") are relative to this path
APP_BASE = "https://www.google.com/about/careers/applications/"

MIN_JOBS_REQUIRED = 40
MAX_SCROLLS = 5


def clean_text(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def make_job_id(url: str | None, title: str) -> str:
    if url:
        match = re.search(r"/results/(\d+)-", url)
        if match:
            return f"g-{match.group(1)}"

    safe_title = re.sub(r"[^a-zA-Z0-9]+", "-", title.lower()).strip("-")
    return f"g-{safe_title}"


def is_good_software_match(title: str, text: str) -> bool:
    title_l = title.lower()
    text_l = text.lower()

    strong_title_keywords = [
        "software engineer",
        "software developer",
        "backend engineer",
        "frontend engineer",
        "full stack",
        "site reliability engineer",
        "systems engineer",
        "cloud engineer",
        "infrastructure engineer",
    ]

    reject_keywords = [
        "product manager",
        "program manager",
        "ux designer",
        "visual designer",
        "sales",
        "marketing",
        "account executive",
        "legal",
        "finance",
        "recruiter",
        "human resources",
    ]

    if any(bad in title_l for bad in reject_keywords):
        return False

    if any(good in title_l for good in strong_title_keywords):
        return True

    if "software" in title_l and "engineer" in title_l:
        return True

    if "software engineering" in text_l:
        return True

    return False


def score_job(title: str, text: str) -> int:
    title_l = title.lower()
    text_l = text.lower()

    score = 0

    if "software engineer" in title_l:
        score += 100

    if "software engineering" in text_l:
        score += 40

    if "early" in text_l:
        score += 25

    if "mid" in text_l:
        score += 25

    if "bachelor" in text_l:
        score += 15

    if "master" in text_l:
        score += 15

    if "full-time" in text_l or "full time" in text_l:
        score += 15

    tech_keywords = [
        "java",
        "python",
        "c++",
        "go",
        "distributed systems",
        "cloud",
        "backend",
        "frontend",
        "infrastructure",
        "kubernetes",
        "data structures",
        "algorithms",
    ]

    for keyword in tech_keywords:
        if keyword in text_l:
            score += 5

    return score


def extract_tags(text: str) -> list[str]:
    tags = []

    possible_tags = [
        "Java",
        "Python",
        "C++",
        "Go",
        "JavaScript",
        "TypeScript",
        "React",
        "Angular",
        "Cloud",
        "Google Cloud",
        "Distributed Systems",
        "Infrastructure",
        "Backend",
        "Frontend",
        "Full Stack",
        "Kubernetes",
        "Machine Learning",
        "AI",
        "Security",
        "Data",
        "SQL",
    ]

    lower_text = text.lower()

    for tag in possible_tags:
        if tag.lower() in lower_text:
            tags.append(tag)

    return tags[:8]


def extract_location(card_text: str, card_soup=None) -> str:
    # Use known class from inspected HTML: span.r0wTof holds the location text
    if card_soup is not None:
        loc_el = card_soup.find("span", class_="r0wTof")
        if loc_el:
            return clean_text(loc_el.get_text())

    # fallback regex
    location_patterns = [
        r"([A-Za-z\s]+,\s*[A-Z]{2},\s*USA)",
        r"(United States)",
        r"(Remote)",
    ]
    for pattern in location_patterns:
        match = re.search(pattern, card_text)
        if match:
            return clean_text(match.group(1))
    return ""


def extract_company(text: str) -> str:
    for company in ["Google Cloud", "Google DeepMind", "DeepMind", "YouTube", "Google"]:
        if company.lower() in text.lower():
            return company

    return "Google"


def extract_description(text: str) -> str:
    match = re.search(
        r"Minimum qualifications\s*(.*?)(Preferred qualifications|About the job|Responsibilities|Apply|Share|$)",
        text,
        flags=re.IGNORECASE,
    )

    if match:
        return clean_text(match.group(1))[:600]

    return clean_text(text)[:600]


def extract_experience(card_soup, card_text: str) -> str:
    # span.wVSTAb is the experience-level chip Google renders on each card
    # Values seen: "Early", "Mid", "Senior", "Advanced"
    if card_soup is not None:
        chip = card_soup.find("span", class_="wVSTAb")
        if chip:
            level = clean_text(chip.get_text()).lower()
            level_map = {
                "early":    "Entry Level",
                "mid":      "Mid Level",
                "senior":   "Senior Level",
                "advanced": "Senior Level",
            }
            return level_map.get(level, chip.get_text().strip())
    # Fallback: parse "X years" from qualifications text
    m = re.search(r"(\d+)\+?\s*years? of experience", card_text, re.IGNORECASE)
    if m:
        return f"{m.group(1)}+ years"
    return ""


def parse_jobs_from_html(html: str, limit: int = 25) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")

    jobs = []
    seen = set()

    # Each job card is a div.sMn82b; title is h3.QJPWVe inside it.
    for h3 in soup.find_all("h3", class_="QJPWVe"):
        title = clean_text(h3.get_text(" ", strip=True))

        if not title:
            continue

        card = h3.find_parent("div", class_="sMn82b")
        if not card:
            # fallback to nearest block ancestor
            card = h3.find_parent(["li", "div", "article", "section"])
        if not card:
            continue

        card_text = clean_text(card.get_text(" ", strip=True))

        if not is_good_software_match(title, card_text):
            continue

        job_url = None

        # a.WpHeLc is the hidden anchor Google puts on each card — may be empty
        a_tag = card.find("a", class_="WpHeLc")
        if a_tag and a_tag.get("href"):
            href = a_tag["href"]
            job_url = href if href.startswith("http") else urljoin(APP_BASE, href)

        job_id = make_job_id(job_url, title)

        if job_id in seen:
            continue

        seen.add(job_id)

        location = extract_location(card_text, card_soup=card)
        company = extract_company(card_text)
        experience = extract_experience(card, card_text)

        # div.Xsxa1e holds the minimum qualifications block
        desc_el = card.find("div", class_="Xsqa1e")
        desc = clean_text(desc_el.get_text(" ")) if desc_el else extract_description(card_text)

        jobs.append(
            {
                "id": job_id,
                "title": title,
                "location": location,
                "remote": "remote" in location.lower(),
                "salary": None,
                "type": "Full-time",
                "tags": extract_tags(card_text),
                "posted": None,
                "desc": desc,
                "url": job_url or GOOGLE_CAREERS_URL,
                "companyId": COMPANY_ID,
                "company": company,
                "experience": experience,
                "matchScore": score_job(title, card_text),
            }
        )

    return jobs[:limit]


async def fetch_jobs(limit: int = 25) -> list[dict]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )

        page = await browser.new_page(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        )

        await page.goto(GOOGLE_CAREERS_URL, wait_until="load", timeout=30000)
        # Wait for job cards to render (much faster than networkidle)
        await page.wait_for_selector("li h3", timeout=15000)

        jobs = []

        for _ in range(MAX_SCROLLS):
            html = await page.content()
            jobs = parse_jobs_from_html(html, limit=limit)

            if len(jobs) >= MIN_JOBS_REQUIRED:
                break

            await page.mouse.wheel(0, 8000)
            await page.wait_for_timeout(600)

        # Each card is div.sMn82b — grab the title (h3.QJPWVe) and the
        # hidden anchor (a.WpHeLc) from each card independently.
        url_map: dict[str, str] = {}
        cards = await page.query_selector_all("div.sMn82b")
        for card_el in cards:
            h3_el = await card_el.query_selector("h3.QJPWVe")
            a_el  = await card_el.query_selector("a.WpHeLc")
            if not (h3_el and a_el):
                continue
            title = (await h3_el.inner_text()).strip().lower()
            href  = await a_el.get_attribute("href")
            if not href:
                continue
            full_url = href if href.startswith("http") else urljoin(APP_BASE, href)
            url_map[title] = full_url

        await browser.close()

    # Patch each parsed job with its real URL
    for job in jobs:
        title_key = job["title"].lower()
        if title_key in url_map:
            job["url"] = url_map[title_key]
        elif job["id"].startswith("g-") and f"id:{job['id'][2:]}" in url_map:
            job["url"] = url_map[f"id:{job['id'][2:]}"]

    return jobs