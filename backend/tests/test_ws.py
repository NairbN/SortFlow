from fastapi.testclient import TestClient

from app.main import app
from conftest import TEST_API_KEY


def test_websocket_connects():
    with TestClient(app) as client:
        with client.websocket_connect("/ws"):
            pass


def test_creating_an_order_broadcasts_to_connected_clients():
    with TestClient(app) as client:
        with client.websocket_connect("/ws") as websocket:
            client.post(
                "/orders",
                headers={"X-API-Key": TEST_API_KEY},
                json={
                    "client_name": "Acme",
                    "order_number": "ORD-00001",
                    "sla_due_date": "2026-01-01",
                    "pallets": [{"pallet_id": "PLT-0000001", "rack_location": None}],
                },
            )
            assert websocket.receive_text() == "changed"


def test_updating_pallet_status_broadcasts_to_connected_clients():
    with TestClient(app) as client:
        client.post(
            "/orders",
            headers={"X-API-Key": TEST_API_KEY},
            json={
                "client_name": "Acme",
                "order_number": "ORD-00001",
                "sla_due_date": "2026-01-01",
                "pallets": [{"pallet_id": "PLT-0000001", "rack_location": None}],
            },
        )

        with client.websocket_connect("/ws") as websocket:
            client.patch(
                "/pallets/1/status",
                headers={"X-API-Key": TEST_API_KEY},
                json={"status": "in_progress"},
            )
            assert websocket.receive_text() == "changed"
