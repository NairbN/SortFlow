from fastapi.testclient import TestClient

from app.main import app


def test_health_does_not_require_api_key():
    with TestClient(app) as client:
        res = client.get("/health")
    assert res.status_code == 200


def test_orders_requires_api_key():
    with TestClient(app) as client:
        res = client.get("/orders")
    assert res.status_code == 401


def test_orders_rejects_wrong_api_key():
    with TestClient(app, headers={"X-API-Key": "wrong-key"}) as client:
        res = client.get("/orders")
    assert res.status_code == 401


def test_pallets_requires_api_key():
    with TestClient(app) as client:
        res = client.get("/pallets")
    assert res.status_code == 401
