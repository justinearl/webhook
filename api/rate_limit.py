import time

from .config import HOOK_RATE_LIMIT_PER_MINUTE
from .events import get_redis_client

WINDOW_SECONDS = 60

_memory_counters: dict[str, int] = {}
_memory_expiry: dict[str, float] = {}


async def _increment(key: str, window_seconds: int) -> tuple[int, int]:
    """Increment the counter for `key`, returning (count, seconds_until_reset)."""
    client = get_redis_client()

    if client is None:
        now = time.monotonic()
        # Opportunistic cleanup so this dict doesn't grow forever in a long-running process.
        for stale_key in [k for k, expires_at in _memory_expiry.items() if expires_at <= now]:
            _memory_counters.pop(stale_key, None)
            _memory_expiry.pop(stale_key, None)

        _memory_counters[key] = _memory_counters.get(key, 0) + 1
        _memory_expiry.setdefault(key, now + window_seconds)
        return _memory_counters[key], max(0, int(_memory_expiry[key] - now))

    count = await client.incr(key)
    if count == 1:
        await client.expire(key, window_seconds)
    ttl = await client.ttl(key)
    return count, max(ttl, 0)


async def check_rate_limit(identifier: str, limit: int = HOOK_RATE_LIMIT_PER_MINUTE) -> int | None:
    """Fixed-window rate limit check.

    Returns None if `identifier` is within `limit` calls for the current
    window, otherwise the number of seconds until the window resets.
    """
    bucket = int(time.time() // WINDOW_SECONDS)
    count, retry_after = await _increment(f"ratelimit:hook:{identifier}:{bucket}", WINDOW_SECONDS)
    if count > limit:
        return retry_after or WINDOW_SECONDS
    return None
