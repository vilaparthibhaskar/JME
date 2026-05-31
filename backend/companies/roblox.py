from job_fetchers import fetch_greenhouse

COMPANY_ID = 12
_BOARD = "roblox"


async def fetch_jobs() -> list[dict]:
    # Roblox uses Greenhouse ATS — boards-api.greenhouse.io/v1/boards/roblox/jobs
    return await fetch_greenhouse(_BOARD, COMPANY_ID)
