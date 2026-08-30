from fastapi.testclient import TestClient

from app.main import app
from conftest import TEST_API_KEY


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


def test_repeated_wrong_key_attempts_get_rate_limited():
    with TestClient(app) as client:
        for _ in range(10):
            res = client.get("/orders", headers={"X-API-Key": "wrong-key"})
            assert res.status_code == 401

        res = client.get("/orders", headers={"X-API-Key": "wrong-key"})
        assert res.status_code == 429

        # Even the correct key is blocked while the client is rate limited.
        res = client.get("/orders", headers={"X-API-Key": TEST_API_KEY})
        assert res.status_code == 429
