import asyncio
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

COMPANY_ID = 2

META_CAREERS_URL = (
    "https://www.metacareers.com/jobsearch"
    "?teams[0]=Software%20Engineering"
    "&teams[1]=University%20Grad%20-%20Engineering%2C%20Tech%20%26%20Design"
    "&offices[0]=Austin%2C%20TX"
    "&offices[1]=Ashburn%2C%20VA"
    "&offices[2]=Aiken%2C%20SC"
    "&offices[3]=Atlanta%2C%20GA"
    "&offices[4]=Aurora%2C%20IL"
    "&offices[5]=Altoona%2C%20IA"
    "&offices[6]=Beaver%20Dam%2C%20WI"
    "&offices[7]=Bellevue%2C%20WA"
    "&offices[8]=Boston%2C%20MA"
    "&offices[9]=Bowling%20Green%2C%20OH"
    "&offices[10]=Burlingame%2C%20CA"
    "&offices[11]=Chicago%2C%20IL"
    "&offices[12]=Washington%2C%20DC"
    "&offices[13]=Utah%20County%2C%20UT"
    "&offices[14]=Sunnyvale%2C%20CA"
    "&offices[15]=Stanton%20Springs%2C%20GA"
    "&offices[16]=Chandler%2C%20AZ"
    "&offices[17]=Denver%2C%20CO"
    "&offices[18]=Detroit%2C%20MI"
    "&offices[19]=Forest%20City%2C%20NC"
    "&offices[20]=Fort%20Worth%2C%20TX"
    "&offices[21]=Durham%2C%20NC"
    "&offices[22]=El%20Paso%2C%20TX"
    "&offices[23]=Henrico%2C%20VA"
    "&offices[24]=Temple%2C%20TX"
    "&offices[25]=Seattle%2C%20WA"
    "&offices[26]=Santa%20Clara%2C%20CA"
    "&offices[27]=Irvine%2C%20CA"
    "&roles[0]=Full%20time%20employment"
    "&sort_by_new=true"
)

BASE_URL = "https://www.metacareers.com"

MIN_JOBS_REQUIRED = 40
MAX_SCROLLS = 12


def clean_text(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def make_job_id(url: str | None, title: str) -> str:
    if url:
        # Meta job URLs: /profile/job_details/<id>
        match = re.search(r"/profile/job_details/(\d+)", url)
        if match:
            return f"m-{match.group(1)}"

    safe_title = re.sub(r"[^a-zA-Z0-9]+", "-", title.lower()).strip("-")
    return f"m-{safe_title}"


def is_good_software_match(title: str, text: str) -> bool:
    title_l = title.lower()
    text_l = text.lower()

    strong_title_keywords = [
        "software engineer",
        "software engineering",
        "backend engineer",
        "frontend engineer",
        "full stack",
        "full-stack",
        "infrastructure engineer",
        "systems engineer",
        "production engineer",
        "data engineer",
        "machine learning engineer",
        "security engineer",
        "ios engineer",
        "android engineer",
        "university grad",
        "new grad",
    ]

    reject_keywords = [
        "product manager",
        "program manager",
        "project manager",
        "technical program manager",
        "designer",
        "ux",
        "sales",
        "marketing",
        "account manager",
        "recruiter",
        "human resources",
        "legal",
        "finance",
        "policy",
        "communications",
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

    if "software engineering" in title_l:
        score += 90

    if "university grad" in title_l or "new grad" in title_l:
        score += 45

    if "full time" in text_l or "full-time" in text_l:
        score += 25

    if "bachelor" in text_l:
        score += 15

    if "master" in text_l:
        score += 15

    tech_keywords = [
        "java",
        "python",
        "c++",
        "go",
        "javascript",
        "typescript",
        "react",
        "distributed systems",
        "backend",
        "frontend",
        "full stack",
        "infrastructure",
        "machine learning",
        "ai",
        "data structures",
        "algorithms",
        "kubernetes",
        "cloud",
        "linux",
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
        "Backend",
        "Frontend",
        "Full Stack",
        "Distributed Systems",
        "Infrastructure",
        "Machine Learning",
        "AI",
        "Data",
        "Cloud",
        "Kubernetes",
        "Linux",
        "Security",
        "Mobile",
        "iOS",
        "Android",
    ]

    lower_text = text.lower()

    for tag in possible_tags:
        if tag.lower() in lower_text:
            tags.append(tag)

    return tags[:8]


def extract_location(card_text: str) -> str:
    locations = []

    # Match common US city/state format
    matches = re.findall(r"\b[A-Z][A-Za-z .'-]+,\s*[A-Z]{2}\b", card_text)
    for loc in matches:
        loc = clean_text(loc)
        if loc not in locations:
            locations.append(loc)

    if "Remote" in card_text:
        locations.append("Remote")

    return ", ".join(locations[:4])


def extract_description(card_text: str) -> str:
    text = clean_text(card_text)

    # Remove repeated UI words if they appear in card text
    text = re.sub(r"\bApply to Job\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\bSave Job\b", "", text, flags=re.IGNORECASE)
    text = clean_text(text)

    return text[:600]


def extract_posted(card_text: str) -> str | None:
    # Meta may show phrases like "Posted 3 days ago"
    match = re.search(
        r"(posted\s+\d+\s+(day|days|hour|hours|week|weeks|month|months)\s+ago)",
        card_text,
        flags=re.IGNORECASE,
    )
    if match:
        return clean_text(match.group(1))

    return None


def extract_experience(card_text: str) -> str:
    # Match patterns like "5+ years of experience", "3 years experience"
    m = re.search(r"(\d+)\+?\s*years?(?:\s+of)?\s+experience", card_text, re.IGNORECASE)
    if m:
        return f"{m.group(1)}+ years"
    return ""


def parse_jobs_from_html(html: str, limit: int = 40) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")

    jobs = []
    seen = set()

    # Meta wraps each job card in <a href="/profile/job_details/<id>">
    # The <h3> title lives inside that anchor.
    anchors = soup.find_all("a", href=re.compile(r"/profile/job_details/\d+"))

    for a_tag in anchors:
        href = a_tag.get("href", "")
        job_url = href if href.startswith("http") else urljoin(BASE_URL, href)

        h3 = a_tag.find("h3")
        if not h3:
            continue
        title = clean_text(h3.get_text())
        if not title or len(title) < 4:
            continue
        if not is_good_software_match(title, title):
            continue

        job_id = make_job_id(job_url, title)
        if job_id in seen:
            continue
        seen.add(job_id)

        card_text = clean_text(a_tag.get_text(" ", strip=True))
        location = extract_location(card_text)
        desc = extract_description(card_text)

        jobs.append(
            {
                "id": job_id,
                "title": title,
                "location": location,
                "remote": "remote" in location.lower(),
                "salary": None,
                "type": "Full-time",
                "tags": extract_tags(card_text),
                "posted": extract_posted(card_text),
                "desc": desc,
                "url": job_url,
                "companyId": COMPANY_ID,
                "company": "Meta",
                "experience": extract_experience(card_text),
            }
        )

    return jobs[:limit]


async def click_load_more_if_exists(page) -> bool:
    possible_buttons = [
        "text=Load more",
        "text=See more jobs",
        "text=Show more",
        "button:has-text('Load more')",
        "button:has-text('See more')",
        "button:has-text('Show more')",
    ]

    for selector in possible_buttons:
        try:
            locator = page.locator(selector)
            if await locator.count() > 0 and await locator.first.is_visible():
                await locator.first.click(timeout=3000)
                await page.wait_for_timeout(1200)
                return True
        except Exception:
            pass

    return False


async def _fetch_experience(browser, url: str, semaphore) -> str:
    """Open the job detail page and extract the minimum years of experience."""
    async with semaphore:
        try:
            detail = await browser.new_page()
            await detail.goto(url, wait_until="load", timeout=20000)
            await detail.wait_for_timeout(1500)
            text = await detail.inner_text("body")
            await detail.close()
            m = re.search(
                r"(\d+)\+?\s*years?(?:\s+of)?(?:\s+programming)?\s+experience",
                text,
                re.IGNORECASE,
            )
            if m:
                return f"{m.group(1)}+ years"
        except Exception:
            pass
    return ""


async def fetch_jobs(limit: int = 40) -> list[dict]:
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
            ),
            viewport={"width": 1440, "height": 1200},
        )

        await page.goto(META_CAREERS_URL, wait_until="load", timeout=45000)

        # Meta sometimes renders slowly, so wait for job links if possible.
        try:
            await page.wait_for_selector("a[href*='/profile/job_details/']", timeout=20000)
        except PlaywrightTimeoutError:
            # Still parse whatever HTML loaded.
            pass

        jobs = []
        previous_count = 0
        stable_rounds = 0

        for _ in range(MAX_SCROLLS):
            html = await page.content()
            jobs = parse_jobs_from_html(html, limit=limit)

            if len(jobs) >= min(limit, MIN_JOBS_REQUIRED):
                break

            clicked = await click_load_more_if_exists(page)

            await page.mouse.wheel(0, 10000)
            await page.wait_for_timeout(1200)

            current_count = len(jobs)

            if current_count == previous_count and not clicked:
                stable_rounds += 1
            else:
                stable_rounds = 0

            previous_count = current_count

            if stable_rounds >= 3:
                break

        # Enrich each job with experience from its detail page (3 in parallel)
        semaphore = asyncio.Semaphore(3)
        experiences = await asyncio.gather(
            *[_fetch_experience(browser, job["url"], semaphore) for job in jobs]
        )
        for job, exp in zip(jobs, experiences):
            job["experience"] = exp

        await browser.close()

    return jobs[:limit]