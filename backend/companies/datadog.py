from job_fetchers import fetch_greenhouse

COMPANY_ID = 17
_BOARD = "datadoghq"


async def fetch_jobs() -> list[dict]:
    # Datadog uses Greenhouse ATS — boards-api.greenhouse.io/v1/boards/datadoghq/jobs
    return await fetch_greenhouse(_BOARD, COMPANY_ID)
