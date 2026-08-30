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


def test_update_order_success(client):
    order = create_order(client).json()
    existing = order["pallets"][0]
    res = client.patch(
        f"/orders/{order['id']}",
        json={
            "client_name": "Globex",
            "order_number": "ORD-00002",
            "sla_due_date": "2026-03-15",
            "pallets": [
                {
                    "id": existing["id"],
                    "pallet_id": existing["pallet_id"],
                    "rack_location": existing["rack_location"],
                }
            ],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["client_name"] == "Globex"
    assert body["order_number"] == "ORD-00002"
    assert body["sla_due_date"] == "2026-03-15"
    # Editing order fields (with the pallet list unchanged) shouldn't touch
    # position or the pallet's own id.
    assert body["position"] == order["position"]
    assert len(body["pallets"]) == 1
    assert body["pallets"][0]["id"] == existing["id"]


def test_update_order_rejects_malformed_order_number(client):
    order = create_order(client).json()
    res = client.patch(
        f"/orders/{order['id']}",
        json={
            "client_name": "Globex",
            "order_number": "not-a-valid-format",
            "sla_due_date": "2026-03-15",
            "pallets": [{"pallet_id": "PLT-0000099", "rack_location": None}],
        },
    )
    assert res.status_code == 422


def test_update_order_requires_at_least_one_pallet(client):
    order = create_order(client).json()
    res = client.patch(
        f"/orders/{order['id']}",
        json={
            "client_name": "Globex",
            "order_number": "ORD-00002",
            "sla_due_date": "2026-03-15",
            "pallets": [],
        },
    )
    assert res.status_code == 422


def test_update_order_adds_new_pallet(client):
    order = create_order(client, pallet_id="PLT-0000001").json()
    existing = order["pallets"][0]
    res = client.patch(
        f"/orders/{order['id']}",
        json={
            "client_name": order["client_name"],
            "order_number": order["order_number"],
            "sla_due_date": order["sla_due_date"],
            "pallets": [
                {"id": existing["id"], "pallet_id": existing["pallet_id"], "rack_location": None},
                {"pallet_id": "PLT-0000002", "rack_location": "CA01-RCK05"},
            ],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body["pallets"]) == 2
    pallet_ids = {p["pallet_id"] for p in body["pallets"]}
    assert pallet_ids == {"PLT-0000001", "PLT-0000002"}


def test_update_order_removes_pallet(client):
    order = create_order(client, pallet_id="PLT-0000001").json()
    existing = order["pallets"][0]
    # Add a second pallet first so we have two to remove one from.
    added = client.patch(
        f"/orders/{order['id']}",
        json={
            "client_name": order["client_name"],
            "order_number": order["order_number"],
            "sla_due_date": order["sla_due_date"],
            "pallets": [
                {"id": existing["id"], "pallet_id": existing["pallet_id"], "rack_location": None},
                {"pallet_id": "PLT-0000002", "rack_location": None},
            ],
        },
    ).json()
    assert len(added["pallets"]) == 2

    # Now submit only the first pallet - the second should be deleted.
    removed = client.patch(
        f"/orders/{order['id']}",
        json={
            "client_name": order["client_name"],
            "order_number": order["order_number"],
            "sla_due_date": order["sla_due_date"],
            "pallets": [
                {"id": existing["id"], "pallet_id": existing["pallet_id"], "rack_location": None},
            ],
        },
    ).json()
    assert len(removed["pallets"]) == 1
    assert removed["pallets"][0]["pallet_id"] == "PLT-0000001"


def test_update_order_pallet_changes_resync_staging(client):
    a = create_order(client, order_number="ORD-00001", pallet_id="PLT-0000001").json()
    b = create_order(client, order_number="ORD-00002", pallet_id="PLT-0000002").json()

    # a is current (lowest position) - its pallet is staged, b's is backlog.
    assert a["pallets"][0]["status"] == "staged"

    # Complete a's only pallet - b should become current.
    a_pallet_id = a["pallets"][0]["id"]
    client.patch(f"/pallets/{a_pallet_id}/status", json={"status": "completed"})
    b_after_complete = next(
        o for o in client.get("/orders").json() if o["id"] == b["id"]
    )
    assert b_after_complete["pallets"][0]["status"] == "staged"

    # Edit order a to add a brand-new pallet (replacing the completed one) -
    # a should reclaim "current" and b's lookahead staging should revert.
    res = client.patch(
        f"/orders/{a['id']}",
        json={
            "client_name": a["client_name"],
            "order_number": a["order_number"],
            "sla_due_date": a["sla_due_date"],
            "pallets": [{"pallet_id": "PLT-0000003", "rack_location": None}],
        },
    )
    assert res.status_code == 200
    assert res.json()["pallets"][0]["status"] == "staged"

    b_final = next(o for o in client.get("/orders").json() if o["id"] == b["id"])
    assert b_final["pallets"][0]["status"] == "backlog"


def test_update_order_unarchives_when_adding_incomplete_pallet(client):
    order = create_order(client, pallet_id="PLT-0000001").json()
    pallet_id = order["pallets"][0]["id"]

    # Completing the order's only pallet archives it (routers/pallets.py).
    client.patch(f"/pallets/{pallet_id}/status", json={"status": "completed"})
    assert order["order_number"] not in [
        o["order_number"] for o in client.get("/orders").json()
    ]

    # Adding a fresh (non-completed) pallet via edit should bring it back.
    res = client.patch(
        f"/orders/{order['id']}",
        json={
            "client_name": order["client_name"],
            "order_number": order["order_number"],
            "sla_due_date": order["sla_due_date"],
            "pallets": [{"pallet_id": "PLT-0000002", "rack_location": None}],
        },
    )
    assert res.status_code == 200
    assert order["order_number"] in [
        o["order_number"] for o in client.get("/orders").json()
    ]


def test_update_missing_order_404(client):
    res = client.patch(
        "/orders/999999",
        json={
            "client_name": "Globex",
            "order_number": "ORD-00002",
            "sla_due_date": "2026-03-15",
            "pallets": [{"pallet_id": "PLT-0000099", "rack_location": None}],
        },
    )
    assert res.status_code == 404


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
