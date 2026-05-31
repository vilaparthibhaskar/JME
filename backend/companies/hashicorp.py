from job_fetchers import fetch_greenhouse

COMPANY_ID = 16
_BOARD = "hashicorp"


async def fetch_jobs() -> list[dict]:
    # HashiCorp uses Greenhouse ATS — boards-api.greenhouse.io/v1/boards/hashicorp/jobs
    return await fetch_greenhouse(_BOARD, COMPANY_ID)
