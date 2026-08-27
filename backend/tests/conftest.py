import os
import tempfile

# Must happen before any `app.*` import: app/database.py reads DATABASE_URL
# at module import time, so tests get their own throwaway SQLite file
# instead of touching the real Postgres database.
_test_db_fd, _test_db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_path}"

import pytest
from sqlalchemy import event
from sqlalchemy.engine import Engine
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app


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


@pytest.fixture()
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client
