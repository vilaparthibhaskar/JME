import asyncio
import logging
import re
from datetime import datetime

from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

COMPANY_ID = 5
BASE_URL = "https://jobs.apple.com"
TARGET_JOBS = 40
_PAGES = 2  # 20 jobs per page

_SEARCH_URL = (
    "https://jobs.apple.com/en-us/search"
    "?location=united-states-USA"
    "&team=apps-and-frameworks-SFTWR-AF"
    "+cloud-and-infrastructure-SFTWR-CLD"
    "+information-systems-and-technology-SFTWR-ISTECH"
    "&page={page}"
)

_TAG_PATTERNS = [
    r'\bSwift\b', r'\bObjective-C\b', r'\bPython\b', r'\bJava\b', r'\bKotlin\b',
    r'\bJavaScript\b', r'\bTypeScript\b', r'\bC\+\+\b', r'\bC#\b', r'\bRust\b',
    r'\bGo\b', r'\bRuby\b', r'\bSQL\b', r'\bML\b', r'\biOS\b', r'\bmacOS\b',
    r'\bvisionOS\b', r'\bLinux\b', r'\bAWS\b', r'\bGCP\b', r'\bAzure\b',
    r'\bKubernetes\b', r'\bDocker\b', r'\bXcode\b', r'\bCore\s*ML\b',
    r'\bTensorFlow\b', r'\bPyTorch\b', r'\bSpark\b', r'\bREST\b', r'\bCI/CD\b',
]

_MONTHS = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12',
}

_STATE_ABBR = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Florida': 'FL',
    'Georgia': 'GA', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN',
    'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA',
    'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI',
    'Minnesota': 'MN', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
    'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
    'New York': 'NY', 'North Carolina': 'NC', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
    'South Carolina': 'SC', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'Wisconsin': 'WI',
}


def _parse_date(s: str) -> str:
    m = re.match(r'(\w+)\s+(\d+),\s+(\d{4})', s.strip())
    if not m:
        return datetime.utcnow().strftime('%Y-%m-%d')
    month, day, year = m.group(1), m.group(2).zfill(2), m.group(3)
    return f"{year}-{_MONTHS.get(month, '01')}-{day}"


def _extract_tags(text: str) -> list[str]:
    found = []
    for pat in _TAG_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            label = m.group(0)
            if label not in found:
                found.append(label)
    return found[:6]


def _extract_experience(text: str) -> str:
    m = re.search(r'(\d+)\s*[\u2013\-]\s*\d+\s*\+?\s*years?', text, re.IGNORECASE)
    if m:
        lo = int(m.group(1))
        if lo <= 2:
            return 'Entry Level'
        elif lo <= 5:
            return 'Mid Level'
        return 'Senior Level'
    m2 = re.search(r'(\d+)\+\s*years?', text, re.IGNORECASE)
    if m2:
        n = int(m2.group(1))
        if n <= 2:
            return 'Entry Level'
        elif n <= 5:
            return 'Mid Level'
        return 'Senior Level'
    return 'Mid Level'


def _simplify_location(loc: str) -> str:
    if not loc:
        return 'United States'
    if 'multiple locations' in loc.lower():
        return 'Multiple US Locations'
    parts = [p.strip() for p in loc.split(',')]
    if len(parts) >= 2:
        city = parts[0]
        state = parts[1]
        abbr = _STATE_ABBR.get(state, state[:2].upper() if len(state) > 2 else state)
        return f"{city}, {abbr}"
    return loc


async def _fetch_detail(browser, url: str, sem: asyncio.Semaphore) -> dict:
    async with sem:
        page = await browser.new_page()
        try:
            await page.goto(url, wait_until='load', timeout=30000)
            await page.wait_for_timeout(2000)
            body = await page.inner_text('body')
        except Exception as e:
            logger.warning(f"Apple detail fetch failed {url}: {e}")
            return {'desc': '', 'location': '', 'tags': [], 'experience': 'Mid Level'}
        finally:
            await page.close()

    location = ''
    for line in body.split('\n')[:25]:
        line = line.strip()
        if 'United States' in line and ',' in line:
            location = _simplify_location(line)
            break
        if line.lower() == 'multiple locations':
            location = 'Multiple US Locations'
            break

    desc = ''
    idx_desc = body.find('\nDescription\n')
    if idx_desc >= 0:
        start = idx_desc + len('\nDescription\n')
        end = len(body)
        for stopper in ['\nResponsibilities\n', '\nMinimum Qualifications\n', '\nRequired Qualifications\n']:
            pos = body.find(stopper, start)
            if pos >= 0:
                end = min(end, pos)
        desc = body[start:end].strip()[:400]

    if not desc:
        m = re.search(r'Role Number:\n[\w\-]+\n(.+?)(?:\nDescription\n|\nResponsibilities\n)',
                      body, re.DOTALL)
        if m:
            desc = m.group(1).strip()[:400]

    qualifications = ''
    for kw in ['\nMinimum Qualifications\n', '\nRequired Qualifications\n', '\nBasic Qualifications\n']:
        idx_q = body.find(kw)
        if idx_q >= 0:
            start_q = idx_q + len(kw)
            end_q = len(body)
            for stopper in ['\nPreferred Qualifications\n', '\nAdditional Requirements\n']:
                pos = body.find(stopper, start_q)
                if pos >= 0:
                    end_q = min(end_q, pos)
            qualifications = body[start_q:min(start_q + 600, end_q)].strip()
            break

    tags = _extract_tags(qualifications + ' ' + desc)
    experience = _extract_experience(qualifications)

    return {'desc': desc, 'location': location, 'tags': tags, 'experience': experience}


async def _scrape_listing_page(browser, page_num: int, sem: asyncio.Semaphore) -> list[dict]:
    url = _SEARCH_URL.format(page=page_num)
    async with sem:
        page = await browser.new_page()
        try:
            await page.goto(url, wait_until='load', timeout=30000)
            await page.wait_for_timeout(3000)

            jobs = []
            links = await page.query_selector_all('a.link-inline.t-intro')
            for lnk in links:
                href = await lnk.get_attribute('href')
                if not href:
                    continue
                title_raw = await lnk.inner_text()

                m = re.search(r'/details/([\d]+(?:-[\d]+)?)', href)
                job_id = f"apple_{m.group(1).replace('-', '_')}" if m else f"apple_{abs(hash(href))}"

                date_str = ''
                try:
                    parent = await lnk.evaluate_handle('el => el.closest(".job-list-item")')
                    date_el = await parent.query_selector('span.job-posted-date')
                    if date_el:
                        date_str = (await date_el.inner_text()).strip()
                except Exception:
                    pass

                jobs.append({
                    'job_id': job_id,
                    'title': title_raw.strip(),
                    'href': href,
                    'posted': _parse_date(date_str) if date_str else datetime.utcnow().strftime('%Y-%m-%d'),
                })
            return jobs

        except Exception as e:
            logger.warning(f"Apple listing page {page_num} failed: {e}")
            return []
        finally:
            await page.close()


async def fetch_jobs() -> list[dict]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        )

        listing_sem = asyncio.Semaphore(2)
        detail_sem = asyncio.Semaphore(4)

        listing_tasks = [
            _scrape_listing_page(browser, pg, listing_sem)
            for pg in range(1, _PAGES + 1)
        ]
        pages_results = await asyncio.gather(*listing_tasks)
        cards = [c for page in pages_results for c in page]

        seen: set[str] = set()
        unique_cards: list[dict] = []
        for c in cards:
            if c['job_id'] not in seen:
                seen.add(c['job_id'])
                unique_cards.append(c)

        unique_cards = unique_cards[:TARGET_JOBS]

        detail_tasks = [
            _fetch_detail(browser, BASE_URL + c['href'], detail_sem)
            for c in unique_cards
        ]
        details = await asyncio.gather(*detail_tasks)

        await browser.close()

        results = []
        for card, detail in zip(unique_cards, details):
            results.append({
                'job_id': card['job_id'],
                'title': card['title'],
                'location': detail['location'] or 'United States',
                'remote': False,
                'salary': '',
                'type': 'Full-time',
                'tags': detail['tags'],
                'experience': detail['experience'],
                'posted': card['posted'],
                'desc': detail['desc'],
                'url': BASE_URL + card['href'],
                'companyId': COMPANY_ID,
            })

        logger.info(f"Apple: scraped {len(results)} jobs")
        return results