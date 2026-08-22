from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order
from app.models.pallet import Pallet
from app.schemas.order import OrderCreate, OrderRead, OrderReorder

router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("", response_model=list[OrderRead])
def list_orders(db: Session = Depends(get_db)):
    orders = db.scalars(select(Order).order_by(Order.position)).all()
    return orders

@router.post("", response_model=OrderRead, status_code=201)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    max_position = db.scalar(select(Order.position).order_by(Order.position.desc()).limit(1))
    new_position = (max_position or 0) + 1

    order = Order(
        client_name=payload.client_name,
        order_number=payload.order_number,
        sla_due_date=payload.sla_due_date,
        position=new_position,
        pallets=[Pallet(pallet_id=p.pallet_id, rack_location=p.rack_location) for p in payload.pallets],
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()

@router.patch("/{order_id}/reorder", response_model=OrderRead)
def reorder_order(order_id: int, payload: OrderReorder, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    prev_position = None
    if payload.previous_order_id is not None:
        prev_order = db.get(Order, payload.previous_order_id)
        if prev_order is None:
            raise HTTPException(status_code=404, detail="previous_order_id not found")
        prev_position = prev_order.position

    next_position = None
    if payload.next_order_id is not None:
        next_order = db.get(Order, payload.next_order_id)
        if next_order is None:
            raise HTTPException(status_code=404, detail="next_order_id not found")
        next_position = next_order.position

    if prev_position is not None and next_position is not None:
        order.position = (prev_position + next_position) / 2
    elif prev_position is not None:
        order.position = prev_position + 1
    elif next_position is not None:
        order.position = next_position - 1
    else:
        order.position = 0

    db.commit()
    db.refresh(order)
    return order
