import os

from fastapi import Depends, FastAPI

from app.auth import require_api_key
from app.routers import orders, pallets

# Schema is created/altered by Alembic (see alembic/), not here - `alembic
# upgrade head` runs before this app starts (see Dockerfile / docker-compose
# command:), so by the time this module imports, the schema already matches.

# FastAPI's built-in /docs, /redoc, and /openapi.json routes sit outside the
# require_api_key gate below (it's applied per-router, not app-wide), so they
# publicly expose the API's shape by default. Not sensitive data - the real
# routes still require the key - but no reason to leave it open in production.
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development") == "production"

app = FastAPI(
    title="SortFlow API",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

app.include_router(orders.router, dependencies=[Depends(require_api_key)])
app.include_router(pallets.router, dependencies=[Depends(require_api_key)])


@app.get("/health")
def health_check():
    return {"status": "ok"}
