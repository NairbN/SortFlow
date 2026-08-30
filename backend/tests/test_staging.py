from datetime import date, datetime, timezone

from sqlalchemy import select

from app.models.order import Order
from app.models.pallet import Pallet
from app.staging import sync_staging


def make_order(db_session, *, position, archived_at=None):
    order = Order(
        client_name="Acme",
        order_number="ORD-00001",
        sla_due_date=date(2026, 1, 1),
        position=position,
        archived_at=archived_at,
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


def make_pallet(db_session, order, *, pallet_id, status="backlog"):
    pallet = Pallet(order_id=order.id, pallet_id=pallet_id, status=status)
    db_session.add(pallet)
    db_session.commit()
    db_session.refresh(pallet)
    return pallet


def test_only_top_order_pallets_get_staged(db_session):
    top = make_order(db_session, position=0)
    other = make_order(db_session, position=1)
    top_pallet = make_pallet(db_session, top, pallet_id="PLT-0000001")
    other_pallet = make_pallet(db_session, other, pallet_id="PLT-0000002")

    sync_staging(db_session)

    db_session.refresh(top_pallet)
    db_session.refresh(other_pallet)
    assert top_pallet.status == "staged"
    assert other_pallet.status == "backlog"


def test_losing_top_spot_reverts_untouched_staged_pallets(db_session):
    order_a = make_order(db_session, position=0)
    order_b = make_order(db_session, position=1)
    pallet_a = make_pallet(db_session, order_a, pallet_id="PLT-0000001")
    pallet_b = make_pallet(db_session, order_b, pallet_id="PLT-0000002")

    sync_staging(db_session)
    db_session.refresh(pallet_a)
    assert pallet_a.status == "staged"

    # order_b overtakes order_a for the #1 spot
    order_b.position = -1
    db_session.commit()
    sync_staging(db_session)

    db_session.refresh(pallet_a)
    db_session.refresh(pallet_b)
    assert pallet_a.status == "backlog"
    assert pallet_b.status == "staged"


def test_in_progress_and_completed_pallets_are_never_reverted(db_session):
    order_a = make_order(db_session, position=0)
    order_b = make_order(db_session, position=1)
    in_progress = make_pallet(
        db_session, order_a, pallet_id="PLT-0000001", status="in_progress"
    )
    completed = make_pallet(
        db_session, order_a, pallet_id="PLT-0000002", status="completed"
    )

    # order_b overtakes order_a for the #1 spot
    order_b.position = -1
    db_session.commit()
    sync_staging(db_session)

    db_session.refresh(in_progress)
    db_session.refresh(completed)
    assert in_progress.status == "in_progress"
    assert completed.status == "completed"


def test_no_active_orders_is_noop(db_session):
    archived = make_order(
        db_session, position=0, archived_at=datetime.now(timezone.utc)
    )
    pallet = make_pallet(db_session, archived, pallet_id="PLT-0000001")

    sync_staging(db_session)

    db_session.refresh(pallet)
    assert pallet.status == "backlog"


def test_next_order_stages_once_top_order_is_fully_drained(db_session):
    order_a = make_order(db_session, position=0)
    order_b = make_order(db_session, position=1)
    # order_a has no backlog/staged pallets left - both already moved on.
    make_pallet(db_session, order_a, pallet_id="PLT-0000001", status="in_progress")
    make_pallet(db_session, order_a, pallet_id="PLT-0000002", status="completed")
    pallet_b = make_pallet(db_session, order_b, pallet_id="PLT-0000003")

    sync_staging(db_session)

    db_session.refresh(pallet_b)
    assert pallet_b.status == "staged"


def test_pallet_returning_to_staged_reclaims_current_order_and_reverts_next(
    db_session,
):
    order_a = make_order(db_session, position=0)
    order_b = make_order(db_session, position=1)
    make_pallet(db_session, order_a, pallet_id="PLT-0000001", status="in_progress")
    pallet_b = make_pallet(db_session, order_b, pallet_id="PLT-0000002")

    # order_a is fully drained (its one pallet is in_progress), so order_b
    # becomes current and gets staged.
    sync_staging(db_session)
    db_session.refresh(pallet_b)
    assert pallet_b.status == "staged"

    # A sorter drags order_a's pallet back into "staged" - order_a is
    # current again, so order_b's lookahead staging should revert.
    order_a_pallet = db_session.scalars(
        select(Pallet).where(Pallet.order_id == order_a.id)
    ).first()
    order_a_pallet.status = "staged"
    db_session.commit()

    sync_staging(db_session)

    db_session.refresh(order_a_pallet)
    db_session.refresh(pallet_b)
    assert order_a_pallet.status == "staged"
    assert pallet_b.status == "backlog"


def test_archived_orders_are_ignored_for_top_selection(db_session):
    archived = make_order(
        db_session, position=-100, archived_at=datetime.now(timezone.utc)
    )
    active = make_order(db_session, position=0)
    archived_pallet = make_pallet(db_session, archived, pallet_id="PLT-0000001")
    active_pallet = make_pallet(db_session, active, pallet_id="PLT-0000002")

    sync_staging(db_session)

    db_session.refresh(archived_pallet)
    db_session.refresh(active_pallet)
    assert archived_pallet.status == "backlog"
    assert active_pallet.status == "staged"
