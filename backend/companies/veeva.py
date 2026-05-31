from job_fetchers import fetch_greenhouse

COMPANY_ID = 14
_BOARD = "veeva"


async def fetch_jobs() -> list[dict]:
    # Veeva uses Greenhouse ATS — boards-api.greenhouse.io/v1/boards/veeva/jobs
    return await fetch_greenhouse(_BOARD, COMPANY_ID)
