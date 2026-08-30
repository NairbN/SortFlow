from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.order import Order
from app.models.pallet import Pallet
from app.schemas.pallet import PalletBoardRead, PalletStatusUpdate
from app.staging import sync_staging
from app.ws import manager

router = APIRouter(prefix="/pallets", tags=["pallets"])


@router.get("", response_model=list[PalletBoardRead])
def list_board_pallets(db: Session = Depends(get_db)):
    pallets = db.scalars(
        select(Pallet)
        .join(Order)
        .where(Order.archived_at.is_(None))
        .options(joinedload(Pallet.order))
        .order_by(Order.position, Pallet.pallet_id)
    ).all()
    return pallets


@router.patch("/{pallet_id}/status", response_model=PalletBoardRead)
def update_pallet_status(
    pallet_id: int, payload: PalletStatusUpdate, db: Session = Depends(get_db)
):
    pallet = db.get(Pallet, pallet_id)
    if pallet is None:
        raise HTTPException(status_code=404, detail="Pallet not found")

    pallet.status = payload.status
    db.commit()

    if payload.status == "completed":
        order = db.get(Order, pallet.order_id)
        remaining = db.scalar(
            select(Pallet.id)
            .where(Pallet.order_id == order.id)
            .where(Pallet.status != "completed")
            .limit(1)
        )
        if remaining is None:
            order.archived_at = datetime.now(timezone.utc)
            db.commit()

    sync_staging(db)
    db.refresh(pallet)
    manager.notify_changed()
    return pallet
