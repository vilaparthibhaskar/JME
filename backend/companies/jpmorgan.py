COMPANY_ID = 8

# TODO: JPMorgan uses a custom careers site — swap _MOCK for real fetch when ready
_MOCK = [
    {
        "id": "jp-001",
        "title": "Software Engineer, Payments Platform",
        "location": "New York, NY",
        "remote": True,
        "salary": "$140k\u2013$200k",
        "type": "Full-time",
        "tags": ["Java", "Payments", "Spring Boot"],
        "posted": "2026-05-25",
        "desc": "Build high-throughput payment processing systems handling millions of transactions daily.",
        "url": "https://careers.jpmorgan.com",
    },
    {
        "id": "jp-002",
        "title": "Data Science Analyst, Consumer Banking",
        "location": "Remote",
        "remote": True,
        "salary": "$120k\u2013$180k",
        "type": "Full-time",
        "tags": ["Python", "Data Science", "Banking"],
        "posted": "2026-05-20",
        "desc": "Apply ML to improve credit risk models and customer financial products.",
        "url": "https://careers.jpmorgan.com",
    },
]


async def fetch_jobs() -> list[dict]:
    return [{**j, "companyId": COMPANY_ID} for j in _MOCK]
