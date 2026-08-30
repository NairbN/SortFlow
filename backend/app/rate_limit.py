import time
from collections import defaultdict

WINDOW_SECONDS = 60
MAX_ATTEMPTS = 10

# In-memory only: fine because Railway runs this backend as a single
# long-lived process (unlike the frontend's serverless functions), so state
# actually persists between requests within a deployment.
_failed_attempts: dict[str, list[float]] = defaultdict(list)


def is_rate_limited(key: str) -> bool:
    now = time.time()
    attempts = _failed_attempts[key]
    attempts[:] = [t for t in attempts if now - t < WINDOW_SECONDS]
    return len(attempts) >= MAX_ATTEMPTS


def record_failure(key: str) -> None:
    _failed_attempts[key].append(time.time())


def reset() -> None:
    """Test-only: clears tracked state so tests don't leak into each other."""
    _failed_attempts.clear()
