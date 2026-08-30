import asyncio

from fastapi import WebSocket

MAX_CONNECTIONS = 50


class ConnectionManager:
    """Broadcasts a content-free "something changed" signal to connected
    browsers so they know to refetch. Carries no order/pallet data itself,
    so unlike the REST API it doesn't need BACKEND_API_KEY-level auth - the
    browser connects to this directly (see app/main.py), and the real data
    still only ever reaches it through the existing authenticated path.
    """

    def __init__(self) -> None:
        self.active: list[WebSocket] = []
        self.loop: asyncio.AbstractEventLoop | None = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self.loop = loop

    async def connect(self, websocket: WebSocket) -> bool:
        if len(self.active) >= MAX_CONNECTIONS:
            return False
        await websocket.accept()
        self.active.append(websocket)
        return True

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active:
            self.active.remove(websocket)

    async def _broadcast(self) -> None:
        dead = []
        for ws in self.active:
            try:
                await ws.send_text("changed")
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    def notify_changed(self) -> None:
        """Thread-safe: call from sync route handlers (FastAPI runs them in
        a worker thread) to broadcast to every connected WebSocket client.
        """
        if self.loop is None:
            return
        asyncio.run_coroutine_threadsafe(self._broadcast(), self.loop)


manager = ConnectionManager()
