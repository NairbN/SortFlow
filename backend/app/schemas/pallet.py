from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PalletStatus = Literal["backlog", "staged", "in_progress", "completed"]


class PalletCreate(BaseModel):
    pallet_id: str = Field(pattern=r"^PLT-\d{7}$")
    rack_location: str | None = None


class PalletRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    pallet_id: str
    rack_location: str | None
    status: str
    created_at: datetime


class PalletStatusUpdate(BaseModel):
    status: PalletStatus


class OrderSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_name: str
    order_number: str
    sla_due_date: date


class PalletBoardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pallet_id: str
    rack_location: str | None
    status: str
    order: OrderSummary
