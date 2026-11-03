"""AI 调用速率限制（进程内）。"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, status

WINDOW_SECONDS = 60
MAX_REQUESTS = 60

_buckets: dict[str, deque[float]] = defaultdict(deque)


def check_rate_limit(user_key: str) -> None:
    now = time.monotonic()
    bucket = _buckets[user_key]
    while bucket and now - bucket[0] > WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= MAX_REQUESTS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="AI 请求过于频繁，请稍后再试")
    bucket.append(now)
