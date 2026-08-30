from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.pallet import Pallet


def sync_staging(db: Session) -> None:
    """Keep pallet staging in sync with SLA queue priority.

    Only one active order's backlog pallets are staged at a time: the
    highest-priority order that still has pallets sitting in backlog or
    staged. Once that order is fully drained (every pallet has moved on to
    in_progress/completed - i.e. nothing left in staged), the next order in
    the queue becomes current and its backlog pallets get staged. If a
    pallet is dragged back into "staged" for an earlier order, that order
    becomes current again and any lookahead-staged pallets on later orders
    revert to "backlog" - pallets already in_progress/completed are never
    touched by this.
    """
    orders = db.scalars(
        select(Order).where(Order.archived_at.is_(None)).order_by(Order.position)
    ).all()

    current_order = None
    for order in orders:
        remaining = db.scalar(
            select(func.count())
            .select_from(Pallet)
            .where(Pallet.order_id == order.id)
            .where(Pallet.status.in_(["backlog", "staged"]))
        )
        if remaining:
            current_order = order
            break

    current_order_id = current_order.id if current_order is not None else -1

    db.execute(
        update(Pallet)
        .where(Pallet.status == "staged")
        .where(Pallet.order_id != current_order_id)
        .values(status="backlog")
    )

    if current_order is not None:
        db.execute(
            update(Pallet)
            .where(Pallet.order_id == current_order.id)
            .where(Pallet.status == "backlog")
            .values(status="staged")
        )

    db.commit()
