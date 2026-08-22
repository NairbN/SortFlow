from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PalletCreate(BaseModel):
    pallet_id: str
    rack_location: str | None = None


class PalletRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    pallet_id: str
    rack_location: str | None
    created_at: datetime
