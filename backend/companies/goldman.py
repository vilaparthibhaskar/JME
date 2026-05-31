COMPANY_ID = 7

# TODO: Goldman Sachs uses a custom careers site — swap _MOCK for real fetch when ready
_MOCK = [
    {
        "id": "gs-001",
        "title": "Quant Developer, Fixed Income",
        "location": "New York, NY",
        "remote": False,
        "salary": "$150k\u2013$220k",
        "type": "Full-time",
        "tags": ["Python", "C++", "Quantitative Finance"],
        "posted": "2026-05-26",
        "desc": "Develop pricing models and risk analytics for fixed income derivatives.",
        "url": "https://www.goldmansachs.com/careers",
    },
    {
        "id": "gs-002",
        "title": "VP, Technology Risk",
        "location": "New York, NY",
        "remote": False,
        "salary": "$180k\u2013$260k",
        "type": "Full-time",
        "tags": ["Risk Management", "Technology", "Finance"],
        "posted": "2026-05-21",
        "desc": "Lead technology risk initiatives across Goldman Sachs' global engineering teams.",
        "url": "https://www.goldmansachs.com/careers",
    },
]


async def fetch_jobs() -> list[dict]:
    return [{**j, "companyId": COMPANY_ID} for j in _MOCK]
