from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.pallet import PalletCreate, PalletRead


class OrderCreate(BaseModel):
    client_name: str
    order_number: str = Field(pattern=r"^ORD-\d{5}$")
    sla_due_date: date
    pallets: list[PalletCreate] = Field(min_length=1)


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_name: str
    order_number: str
    sla_due_date: date
    position: float
    created_at: datetime
    pallets: list[PalletRead]


class OrderReorder(BaseModel):
    previous_order_id: int | None = None
    next_order_id: int | None = None


class OrderUpdate(BaseModel):
    client_name: str
    order_number: str = Field(pattern=r"^ORD-\d{5}$")
    sla_due_date: date
