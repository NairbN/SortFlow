from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OutboundCategoryCreate(BaseModel):
    category_name: str
    current_pallet_number: str | None = None
    rack_location: str | None = None


class OutboundCategoryUpdate(BaseModel):
    category_name: str | None = None
    current_pallet_number: str | None = None
    rack_location: str | None = None


class OutboundCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_name: str
    current_pallet_number: str | None
    rack_location: str | None
    updated_at: datetime
