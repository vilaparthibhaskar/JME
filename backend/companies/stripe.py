from job_fetchers import fetch_greenhouse

COMPANY_ID = 6
_BOARD = "stripe"


async def fetch_jobs() -> list[dict]:
    # Stripe uses Greenhouse ATS — boards-api.greenhouse.io/v1/boards/stripe/jobs
    return await fetch_greenhouse(_BOARD, COMPANY_ID)
