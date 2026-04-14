import httpx
import time
import logging
from typing import Optional
from app.utils.retry import with_retry

logger = logging.getLogger(__name__)

_client: Optional[httpx.AsyncClient] = None

async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=10.0)
    return _client

@with_retry(max_attempts=3, backoff_base=1.0)
async def _check_url(client: httpx.AsyncClient, url: str) -> tuple[int, float]:
    """Perform the actual HTTP check, retried on network failures."""
    start_time = time.time()
    response = await client.get(url)
    latency = time.time() - start_time
    return response.status_code, latency

async def score_deployment_health(deployment_url: str) -> int:
    """Check deployment URL health. Max 20 points."""
    if not deployment_url:
        return 0

    try:
        client = await get_client()
        status_code, latency = await _check_url(client, deployment_url)
        
        if status_code < 400:
            if latency < 2.0:
                return 20  # Fast and live
            return 15  # Live but slow
        return 5 # Responded but error
    except Exception as e:
        logger.warning(f"[DEPLOY] Health check failed after retries for {deployment_url}: {e}")
        return 0  # Dead

