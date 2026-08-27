def create_order(client, order_number, pallet_ids):
    payload = {
        "client_name": "Acme",
        "order_number": order_number,
        "sla_due_date": "2026-01-01",
        "pallets": [{"pallet_id": pid, "rack_location": None} for pid in pallet_ids],
    }
    return client.post("/orders", json=payload).json()


def test_update_pallet_status(client):
    order = create_order(client, "ORD-00001", ["PLT-0000001"])
    pallet_id = order["pallets"][0]["id"]

    res = client.patch(f"/pallets/{pallet_id}/status", json={"status": "in_progress"})
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"


def test_pallet_not_found_404(client):
    res = client.patch("/pallets/999999/status", json={"status": "in_progress"})
    assert res.status_code == 404


def test_completing_all_pallets_archives_order(client):
    order = create_order(client, "ORD-00001", ["PLT-0000001", "PLT-0000002"])
    ids = [p["id"] for p in order["pallets"]]

    client.patch(f"/pallets/{ids[0]}/status", json={"status": "completed"})
    still_active = [o["order_number"] for o in client.get("/orders").json()]
    assert order["order_number"] in still_active

    client.patch(f"/pallets/{ids[1]}/status", json={"status": "completed"})
    now_active = [o["order_number"] for o in client.get("/orders").json()]
    assert order["order_number"] not in now_active


def test_completion_cascades_to_next_top_order_staging(client):
    top = create_order(client, "ORD-00001", ["PLT-0000001"])
    second = create_order(client, "ORD-00002", ["PLT-0000002"])

    board = {p["pallet_id"]: p for p in client.get("/pallets").json()}
    assert board["PLT-0000001"]["status"] == "staged"
    assert board["PLT-0000002"]["status"] == "backlog"

    client.patch(
        f"/pallets/{top['pallets'][0]['id']}/status", json={"status": "completed"}
    )

    board = {p["pallet_id"]: p for p in client.get("/pallets").json()}
    assert "PLT-0000001" not in board
    assert board["PLT-0000002"]["status"] == "staged"


def test_board_excludes_archived_orders(client):
    order = create_order(client, "ORD-00001", ["PLT-0000001"])
    client.patch(
        f"/pallets/{order['pallets'][0]['id']}/status", json={"status": "completed"}
    )

    board = client.get("/pallets").json()
    assert board == []
