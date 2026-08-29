from fastapi import Depends, FastAPI

from app.auth import require_api_key
from app.database import Base, engine
from app.routers import orders, pallets

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SortFlow API")

app.include_router(orders.router, dependencies=[Depends(require_api_key)])
app.include_router(pallets.router, dependencies=[Depends(require_api_key)])


@app.get("/health")
def health_check():
    return {"status": "ok"}
