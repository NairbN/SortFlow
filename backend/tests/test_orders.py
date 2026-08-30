def create_order(client, order_number="ORD-00001", pallet_id="PLT-0000001", **overrides):
    payload = {
        "client_name": "Acme",
        "order_number": order_number,
        "sla_due_date": "2026-01-01",
        "pallets": [{"pallet_id": pallet_id, "rack_location": None}],
        **overrides,
    }
    return client.post("/orders", json=payload)


def test_create_order_success(client):
    res = create_order(client)
    assert res.status_code == 201
    body = res.json()
    assert body["client_name"] == "Acme"
    assert body["position"] == 1.0
    assert len(body["pallets"]) == 1
    # It's the only (and therefore #1) order, so sync_staging() run inside
    # create_order immediately promotes its backlog pallet to staged.
    assert body["pallets"][0]["status"] == "staged"


def test_create_order_rejects_malformed_order_number(client):
    for bad in ["ORD-1", "ORD-000001", "ord-00001", "00001", "ORD-0000a"]:
        res = create_order(client, order_number=bad)
        assert res.status_code == 422, bad


def test_create_order_rejects_malformed_pallet_id(client):
    for bad in ["PLT-1", "PLT-00000001", "plt-0000001", "0000001", "PLT-000000a"]:
        res = create_order(client, pallet_id=bad)
        assert res.status_code == 422, bad


def test_create_order_requires_at_least_one_pallet(client):
    res = client.post(
        "/orders",
        json={
            "client_name": "Acme",
            "order_number": "ORD-00001",
            "sla_due_date": "2026-01-01",
            "pallets": [],
        },
    )
    assert res.status_code == 422


def test_create_order_position_ignores_archived_orders(client):
    # Regression test: create_order's max-position query used to include
    # archived orders, which could skew where new orders land.
    first = create_order(client, order_number="ORD-00001", pallet_id="PLT-0000001").json()
    pallet_id = first["pallets"][0]["id"]
    client.patch(f"/pallets/{pallet_id}/status", json={"status": "completed"})

    # first order should now be archived and gone from the active list
    assert first["order_number"] not in [
        o["order_number"] for o in client.get("/orders").json()
    ]

    # first is archived, so there are zero *active* orders left - position
    # should reset to 1.0, not continue from the archived order's position
    # (2.0), which is what the bug would have produced.
    second = create_order(client, order_number="ORD-00002", pallet_id="PLT-0000002").json()
    assert second["position"] == 1.0


def test_reorder_between_two_orders_averages_position(client):
    a = create_order(client, order_number="ORD-00001", pallet_id="PLT-0000001").json()
    b = create_order(client, order_number="ORD-00002", pallet_id="PLT-0000002").json()
    c = create_order(client, order_number="ORD-00003", pallet_id="PLT-0000003").json()

    res = client.patch(
        f"/orders/{c['id']}/reorder",
        json={"previous_order_id": a["id"], "next_order_id": b["id"]},
    )
    assert res.status_code == 200
    assert res.json()["position"] == (a["position"] + b["position"]) / 2


def test_reorder_to_top_and_bottom(client):
    a = create_order(client, order_number="ORD-00001", pallet_id="PLT-0000001").json()
    b = create_order(client, order_number="ORD-00002", pallet_id="PLT-0000002").json()

    to_top = client.patch(
        f"/orders/{b['id']}/reorder",
        json={"previous_order_id": None, "next_order_id": a["id"]},
    ).json()
    assert to_top["position"] == a["position"] - 1

    to_bottom = client.patch(
        f"/orders/{b['id']}/reorder",
        json={"previous_order_id": a["id"], "next_order_id": None},
    ).json()
    assert to_bottom["position"] == a["position"] + 1


def test_delete_order_cascades_pallets(client, db_session):
    from app.models.pallet import Pallet

    order = create_order(client).json()
    res = client.delete(f"/orders/{order['id']}")
    assert res.status_code == 204

    remaining = db_session.query(Pallet).filter_by(order_id=order["id"]).all()
    assert remaining == []


def test_list_orders_excludes_archived(client):
    order = create_order(client).json()
    pallet_id = order["pallets"][0]["id"]
    client.patch(f"/pallets/{pallet_id}/status", json={"status": "completed"})

    order_numbers = [o["order_number"] for o in client.get("/orders").json()]
    assert order["order_number"] not in order_numbers


def test_reorder_missing_order_404(client):
    res = client.patch(
        "/orders/999999/reorder",
        json={"previous_order_id": None, "next_order_id": None},
    )
    assert res.status_code == 404


def test_delete_missing_order_404(client):
    res = client.delete("/orders/999999")
    assert res.status_code == 404
