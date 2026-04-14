"""
Async retry decorator with exponential backoff.

Usage:
    @with_retry(max_attempts=3, backoff_base=1.0)
    async def flaky_call(...):
        ...
"""

import asyncio
import functools
import logging
from typing import Tuple, Type, Optional, Union

logger = logging.getLogger(__name__)

# Default retryable exception types
RETRYABLE_EXCEPTIONS: Tuple[Type[BaseException], ...] = (
    ConnectionError,
    TimeoutError,
    OSError,
)

try:
    import httpx
    RETRYABLE_EXCEPTIONS = RETRYABLE_EXCEPTIONS + (
        httpx.ConnectError,
        httpx.TimeoutException,
        httpx.RemoteProtocolError,
    )
except ImportError:
    pass


def with_retry(
    max_attempts: int = 3,
    backoff_base: float = 1.0,
    retryable: Optional[Tuple[Type[BaseException], ...]] = None,
):
    """
    Decorator that retries an async function on transient failures.

    Args:
        max_attempts: Total number of attempts (including the first call).
        backoff_base: Base delay in seconds. Actual delay = backoff_base * 2^(attempt-1).
        retryable: Tuple of exception types that trigger a retry.
                   Defaults to network-related errors.
    """
    retry_on = retryable or RETRYABLE_EXCEPTIONS

    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await fn(*args, **kwargs)
                except retry_on as exc:
                    last_exc = exc
                    if attempt == max_attempts:
                        logger.error(
                            "[RETRY] %s failed after %d attempts: %s",
                            fn.__name__, max_attempts, exc,
                        )
                        raise
                    delay = backoff_base * (2 ** (attempt - 1))
                    logger.warning(
                        "[RETRY] %s attempt %d/%d failed (%s). Retrying in %.1fs...",
                        fn.__name__, attempt, max_attempts, exc, delay,
                    )
                    await asyncio.sleep(delay)
            # Should never reach here, but just in case
            raise last_exc  # type: ignore[misc]
        return wrapper
    return decorator
