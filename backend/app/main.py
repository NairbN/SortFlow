from fastapi import FastAPI

from app.database import Base, engine
from app.routers import orders, pallets

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SortFlow API")

app.include_router(orders.router)
app.include_router(pallets.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
