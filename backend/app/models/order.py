from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_name: Mapped[str] = mapped_column(String, nullable=False)
    order_number: Mapped[str] = mapped_column(String, nullable=False)
    sla_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    position: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pallets: Mapped[list["Pallet"]] = relationship(back_populates="order", cascade="all, delete-orphan")
