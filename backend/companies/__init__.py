"""
companies/ package — one file per company, each with its own fetch_jobs() logic.

To add a new company:
  1. Create backend/companies/yourcompany.py with COMPANY_ID and async def fetch_jobs()
  2. Import it here and add to COMPANY_REGISTRY

COMPANY_REGISTRY maps company_id (int) -> fetch_jobs coroutine function.
The jobs router calls each function in parallel via asyncio.gather().
"""

from .google     import fetch_jobs as _google,     COMPANY_ID as _google_id
from .meta       import fetch_jobs as _meta,       COMPANY_ID as _meta_id
from .amazon     import fetch_jobs as _amazon,     COMPANY_ID as _amazon_id
from .microsoft  import fetch_jobs as _microsoft,  COMPANY_ID as _microsoft_id
from .apple      import fetch_jobs as _apple,      COMPANY_ID as _apple_id
from .stripe     import fetch_jobs as _stripe,     COMPANY_ID as _stripe_id
from .goldman    import fetch_jobs as _goldman,    COMPANY_ID as _goldman_id
from .jpmorgan   import fetch_jobs as _jpmorgan,   COMPANY_ID as _jpmorgan_id
from .plaid      import fetch_jobs as _plaid,      COMPANY_ID as _plaid_id
from .netflix    import fetch_jobs as _netflix,    COMPANY_ID as _netflix_id
from .spotify    import fetch_jobs as _spotify,    COMPANY_ID as _spotify_id
from .roblox     import fetch_jobs as _roblox,     COMPANY_ID as _roblox_id
from .epic       import fetch_jobs as _epic,       COMPANY_ID as _epic_id
from .veeva      import fetch_jobs as _veeva,      COMPANY_ID as _veeva_id
from .cloudflare import fetch_jobs as _cloudflare, COMPANY_ID as _cloudflare_id
from .hashicorp  import fetch_jobs as _hashicorp,  COMPANY_ID as _hashicorp_id
from .datadog    import fetch_jobs as _datadog,    COMPANY_ID as _datadog_id

COMPANY_REGISTRY: dict[int, callable] = {
    _google_id:     _google,
    _meta_id:       _meta,
    _amazon_id:     _amazon,
    _microsoft_id:  _microsoft,
    _apple_id:      _apple,
    _stripe_id:     _stripe,
    _goldman_id:    _goldman,
    _jpmorgan_id:   _jpmorgan,
    _plaid_id:      _plaid,
    _netflix_id:    _netflix,
    _spotify_id:    _spotify,
    _roblox_id:     _roblox,
    _epic_id:       _epic,
    _veeva_id:      _veeva,
    _cloudflare_id: _cloudflare,
    _hashicorp_id:  _hashicorp,
    _datadog_id:    _datadog,
}
