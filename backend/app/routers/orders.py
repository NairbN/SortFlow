from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order
from app.models.pallet import Pallet
from app.schemas.order import OrderCreate, OrderRead, OrderReorder, OrderUpdate
from app.staging import sync_staging
from app.ws import manager

router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("", response_model=list[OrderRead])
def list_orders(db: Session = Depends(get_db)):
    orders = db.scalars(
        select(Order).where(Order.archived_at.is_(None)).order_by(Order.position)
    ).all()
    return orders

@router.post("", response_model=OrderRead, status_code=201)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    max_position = db.scalar(
        select(Order.position)
        .where(Order.archived_at.is_(None))
        .order_by(Order.position.desc())
        .limit(1)
    )
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
    sync_staging(db)
    db.refresh(order)
    manager.notify_changed()
    return order

@router.patch("/{order_id}", response_model=OrderRead)
def update_order(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    order.client_name = payload.client_name
    order.order_number = payload.order_number
    order.sla_due_date = payload.sla_due_date

    # Diff the submitted pallet list against what the order currently has:
    # matched ids get updated in place, unmatched submitted rows are new
    # pallets, and existing pallets absent from the submitted list are
    # removed (cascade="all, delete-orphan" on Order.pallets handles the
    # actual delete once they're dropped from the collection).
    existing_by_id = {p.id: p for p in order.pallets}
    submitted_ids = {p.id for p in payload.pallets if p.id in existing_by_id}

    order.pallets[:] = [p for p in order.pallets if p.id in submitted_ids]

    for p in payload.pallets:
        if p.id in existing_by_id and p.id in submitted_ids:
            pallet = existing_by_id[p.id]
            pallet.pallet_id = p.pallet_id
            pallet.rack_location = p.rack_location
        else:
            order.pallets.append(Pallet(pallet_id=p.pallet_id, rack_location=p.rack_location))

    db.commit()
    db.refresh(order)

    # update_pallet_status archives an order the moment its last pallet
    # reaches "completed" (see routers/pallets.py); adding/removing pallets
    # here can just as easily break or restore that condition (e.g. adding
    # a fresh backlog pallet to an order that had been archived), so the
    # archived_at invariant needs to be re-checked here too rather than only
    # ever being set by the status-update path.
    remaining_incomplete = db.scalar(
        select(Pallet.id)
        .where(Pallet.order_id == order.id)
        .where(Pallet.status != "completed")
        .limit(1)
    )
    if remaining_incomplete is not None:
        order.archived_at = None
    elif order.archived_at is None:
        order.archived_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)

    # Adding/removing pallets can change whether this order is "current"
    # (see staging.py) - unlike a plain field edit, this needs a re-sync.
    sync_staging(db)
    db.refresh(order)
    manager.notify_changed()
    return order

@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    sync_staging(db)
    manager.notify_changed()

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
    sync_staging(db)
    db.refresh(order)
    manager.notify_changed()
    return order
