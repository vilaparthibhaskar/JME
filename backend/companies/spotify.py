COMPANY_ID = 11

# TODO: Spotify uses a custom careers site — swap _MOCK for real fetch when ready
_MOCK = [
    {
        "id": "sp-001",
        "title": "Backend Engineer, Music Discovery",
        "location": "Remote",
        "remote": True,
        "salary": "$150k\u2013$210k",
        "type": "Full-time",
        "tags": ["Java", "Scala", "Microservices"],
        "posted": "2026-05-28",
        "desc": "Build the recommendation and personalization backend powering Discover Weekly.",
        "url": "https://www.lifeatspotify.com",
    },
    {
        "id": "sp-002",
        "title": "iOS Engineer, Spotify Player",
        "location": "Stockholm, Sweden",
        "remote": True,
        "salary": "$120k\u2013$180k",
        "type": "Full-time",
        "tags": ["Swift", "iOS", "Audio"],
        "posted": "2026-05-24",
        "desc": "Own the core playback experience on Spotify's iOS app, used by 300M+ listeners.",
        "url": "https://www.lifeatspotify.com",
    },
]


async def fetch_jobs() -> list[dict]:
    return [{**j, "companyId": COMPANY_ID} for j in _MOCK]
