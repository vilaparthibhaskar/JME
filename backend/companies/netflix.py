from job_fetchers import fetch_lever

COMPANY_ID = 10
_BOARD = "netflix"


async def fetch_jobs() -> list[dict]:
    # Netflix uses Lever ATS — api.lever.co/v0/postings/netflix
    return await fetch_lever(_BOARD, COMPANY_ID)
