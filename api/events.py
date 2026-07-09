import asyncio
import json
from collections import defaultdict

import redis.asyncio as redis

from .config import REDIS_URL

HEARTBEAT_SECONDS = 15.0

_redis_client: redis.Redis | None = None
_memory_subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)


def _get_redis() -> redis.Redis | None:
    global _redis_client
    if REDIS_URL is None:
        return None
    if _redis_client is None:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None


async def publish(channel: str, data: dict) -> None:
    client = _get_redis()
    if client is None:
        # Single-process fallback: fan out directly to local subscriber queues.
        for queue in list(_memory_subscribers.get(channel, [])):
            queue.put_nowait(data)
        return
    await client.publish(channel, json.dumps(data))


async def subscribe(channel: str):
    """Async generator yielding dict events published to `channel`.

    Yields None periodically (every HEARTBEAT_SECONDS) when idle, so callers
    can emit a keep-alive to stop proxies/load balancers from closing the
    connection during quiet periods.
    """
    client = _get_redis()

    if client is None:
        queue: asyncio.Queue = asyncio.Queue()
        _memory_subscribers[channel].add(queue)
        try:
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_SECONDS)
                    yield data
                except asyncio.TimeoutError:
                    yield None
        finally:
            _memory_subscribers[channel].discard(queue)
        return

    pubsub = client.pubsub()
    await pubsub.subscribe(channel)
    try:
        while True:
            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=HEARTBEAT_SECONDS
            )
            if message is None:
                yield None
                continue
            yield json.loads(message["data"])
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
