COMPANY_ID = 13

# TODO: Epic Systems uses a custom careers site — swap _MOCK for real fetch when ready
_MOCK = [
    {
        "id": "ep-001",
        "title": "Software Developer",
        "location": "Verona, WI",
        "remote": False,
        "salary": "$100k\u2013$140k",
        "type": "Full-time",
        "tags": ["C#", "C++", "Healthcare"],
        "posted": "2026-05-26",
        "desc": "Build and maintain clinical modules in Epic's electronic health record system.",
        "url": "https://careers.epic.com",
    },
    {
        "id": "ep-002",
        "title": "Technical Project Manager",
        "location": "Verona, WI",
        "remote": False,
        "salary": "$90k\u2013$130k",
        "type": "Full-time",
        "tags": ["Project Management", "Healthcare IT", "EMR"],
        "posted": "2026-05-20",
        "desc": "Coordinate software implementation projects at leading healthcare organizations.",
        "url": "https://careers.epic.com",
    },
]


async def fetch_jobs() -> list[dict]:
    return [{**j, "companyId": COMPANY_ID} for j in _MOCK]
