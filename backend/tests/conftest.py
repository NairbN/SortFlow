import os
import tempfile

# Must happen before any `app.*` import: app/database.py reads DATABASE_URL
# at module import time, so tests get their own throwaway SQLite file
# instead of touching the real Postgres database.
_test_db_fd, _test_db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_path}"

# app/auth.py also reads an env var at import time (same reasoning as
# DATABASE_URL above) - set a fixed test value so import doesn't crash.
TEST_API_KEY = "test-api-key"
os.environ["BACKEND_API_KEY"] = TEST_API_KEY

import pytest
from sqlalchemy import event
from sqlalchemy.engine import Engine
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.rate_limit import reset as reset_rate_limit


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture(autouse=True)
def reset_db():
    """Give every test a clean set of tables, regardless of test order."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Every TestClient shares the same fake client IP, so failed-attempt
    counts from one test would otherwise bleed into the next."""
    reset_rate_limit()
    yield


@pytest.fixture()
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    # Every route except /health requires this header now (see app/auth.py)
    # - set it once here so existing tests don't each need updating.
    with TestClient(app, headers={"X-API-Key": TEST_API_KEY}) as test_client:
        yield test_client
