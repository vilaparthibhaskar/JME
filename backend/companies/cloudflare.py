from job_fetchers import fetch_greenhouse

COMPANY_ID = 15
_BOARD = "cloudflare"


async def fetch_jobs() -> list[dict]:
    # Cloudflare uses Greenhouse ATS — boards-api.greenhouse.io/v1/boards/cloudflare/jobs
    return await fetch_greenhouse(_BOARD, COMPANY_ID)
