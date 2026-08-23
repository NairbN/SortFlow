from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.pallet import Pallet


def sync_staging(db: Session) -> None:
    """Keep pallet staging in sync with SLA queue priority.

    Only the current #1 active order's backlog pallets are staged. If an
    order loses the #1 spot, any of its pallets still sitting untouched in
    "staged" revert to "backlog" - pallets already in_progress/completed
    are left alone.
    """
    top_order = db.scalars(
        select(Order)
        .where(Order.archived_at.is_(None))
        .order_by(Order.position)
        .limit(1)
    ).first()

    top_order_id = top_order.id if top_order is not None else -1

    db.execute(
        update(Pallet)
        .where(Pallet.status == "staged")
        .where(Pallet.order_id != top_order_id)
        .values(status="backlog")
    )

    if top_order is not None:
        db.execute(
            update(Pallet)
            .where(Pallet.order_id == top_order.id)
            .where(Pallet.status == "backlog")
            .values(status="staged")
        )

    db.commit()
