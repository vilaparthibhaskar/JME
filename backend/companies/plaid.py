from job_fetchers import fetch_greenhouse

COMPANY_ID = 9
_BOARD = "plaid"


async def fetch_jobs() -> list[dict]:
    # Plaid uses Greenhouse ATS — boards-api.greenhouse.io/v1/boards/plaid/jobs
    return await fetch_greenhouse(_BOARD, COMPANY_ID)
