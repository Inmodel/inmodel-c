"""SSE endpoint for real-time leaderboard updates."""

import asyncio
import json
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
from app.events import subscribe, unsubscribe

router = APIRouter()


async def _event_generator(request: Request, queue: asyncio.Queue):
    """Yield SSE events from the subscriber queue."""
    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield {
                    "event": event["event"],
                    "data": json.dumps(event["data"], default=str),
                }
            except asyncio.TimeoutError:
                # Send keepalive comment to prevent timeouts
                yield {"comment": "keepalive"}
    finally:
        unsubscribe(queue)


@router.get("/events/leaderboard")
async def leaderboard_sse(request: Request):
    """Server-Sent Events stream for live leaderboard updates."""
    queue = subscribe()
    return EventSourceResponse(_event_generator(request, queue))
