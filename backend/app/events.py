"""
Simple in-process pub/sub for broadcasting score updates to SSE clients.
"""

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)

_subscribers: list[asyncio.Queue] = []


def subscribe() -> asyncio.Queue:
    """Create a new subscriber queue."""
    q: asyncio.Queue = asyncio.Queue(maxsize=64)
    _subscribers.append(q)
    logger.info(f"[EVENTS] New subscriber. Total: {len(_subscribers)}")
    return q


def unsubscribe(q: asyncio.Queue) -> None:
    """Remove a subscriber queue."""
    try:
        _subscribers.remove(q)
    except ValueError:
        pass
    logger.info(f"[EVENTS] Subscriber removed. Total: {len(_subscribers)}")


async def broadcast(event_type: str, data: Any) -> None:
    """Push an event to all subscribers. Non-blocking — drops if queue is full."""
    dead: list[asyncio.Queue] = []
    for q in _subscribers:
        try:
            q.put_nowait({"event": event_type, "data": data})
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        try:
            _subscribers.remove(q)
        except ValueError:
            pass
