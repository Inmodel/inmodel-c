import httpx
import time

async def score_deployment_health(deployment_url: str) -> int:
    """Check deployment URL health. Max 20 points."""
    if not deployment_url:
        return 0

    try:
        # Check HTTP ping latency & status
        async with httpx.AsyncClient() as client:
            start_time = time.time()
            response = await client.get(deployment_url, timeout=10.0)
            latency = time.time() - start_time
            
            if response.status_code < 400:
                if latency < 2.0:
                    return 20  # Fast and live
                return 15  # Live but slow
            return 5 # Responded but error
    except Exception:
        return 0  # Dead
