import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect

from app.auth import require_api_key
from app.routers import orders, pallets
from app.ws import manager

# Schema is created/altered by Alembic (see alembic/), not here - `alembic
# upgrade head` runs before this app starts (see Dockerfile / docker-compose
# command:), so by the time this module imports, the schema already matches.

# FastAPI's built-in /docs, /redoc, and /openapi.json routes sit outside the
# require_api_key gate below (it's applied per-router, not app-wide), so they
# publicly expose the API's shape by default. Not sensitive data - the real
# routes still require the key - but no reason to leave it open in production.
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development") == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ConnectionManager.notify_changed() is called from sync route handlers,
    # which FastAPI runs in a worker thread - it needs the running event
    # loop captured here to schedule broadcasts back onto it safely.
    manager.set_loop(asyncio.get_running_loop())
    yield


app = FastAPI(
    title="SortFlow API",
    lifespan=lifespan,
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

app.include_router(orders.router, dependencies=[Depends(require_api_key)])
app.include_router(pallets.router, dependencies=[Depends(require_api_key)])


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.websocket("/ws")
async def ws_updates(websocket: WebSocket):
    if not await manager.connect(websocket):
        await websocket.close(code=1013)  # 1013 = "Try Again Later"
        return
    try:
        while True:
            # Nothing sent by clients is meaningful - just keep the socket
            # open and let ConnectionManager push to it from elsewhere.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
