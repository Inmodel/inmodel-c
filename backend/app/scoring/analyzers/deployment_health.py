import httpx
import time
from typing import Optional

_client: Optional[httpx.AsyncClient] = None

async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=10.0)
    return _client

async def score_deployment_health(deployment_url: str) -> int:
    """Check deployment URL health. Max 20 points."""
    if not deployment_url:
        return 0

    try:
        client = await get_client()
        start_time = time.time()
        response = await client.get(deployment_url)
        latency = time.time() - start_time
        
        if response.status_code < 400:
            if latency < 2.0:
                return 20  # Fast and live
            return 15  # Live but slow
        return 5 # Responded but error
    except Exception:
        return 0  # Dead
