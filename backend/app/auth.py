import hmac
import os

from fastapi import Header, HTTPException, Request

from app.rate_limit import is_rate_limited, record_failure

# Fails loudly at import time if unset, matching app/database.py's pattern
# for DATABASE_URL - a silently-empty secret would lock out every request
# rather than crash, which is a much worse failure mode to debug.
BACKEND_API_KEY = os.environ["BACKEND_API_KEY"]


def require_api_key(request: Request, x_api_key: str = Header(default="")) -> None:
    """Shared-secret check between the Next.js server and this API.

    The browser never calls this backend directly - every request comes
    from the Next.js server, which already gates real users behind the
    frontend's password. This exists so the backend itself isn't wide open
    to anyone who finds its URL once deployed.
    """
    client_ip = request.client.host if request.client else "unknown"
    if is_rate_limited(client_ip):
        raise HTTPException(status_code=429, detail="Too many failed attempts, try again later")

    if not hmac.compare_digest(x_api_key, BACKEND_API_KEY):
        record_failure(client_ip)
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
