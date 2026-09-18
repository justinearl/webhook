"""Test fixtures: a throwaway SQLite database, the API routers mounted on a
bare FastAPI app (no frontend, no Logfire), and Google auth swapped for a
dependency override that hands back a fixed user.

Config is read from the environment at import time, so it's pinned here
before anything under `api` is imported.
"""

import os
import tempfile

_tmpdir = tempfile.mkdtemp(prefix="webhook-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmpdir}/test.db"
os.environ["REDIS_URL"] = "dummy"
os.environ["LOGFIRE_TOKEN"] = "dummy"
os.environ["JWT_SECRET"] = "test-secret"

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from api import models  # noqa: E402
from api.db import Base, SessionLocal, engine  # noqa: E402
from api.routers import endpoints, hooks, shared  # noqa: E402
from api.security import get_current_user  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _make_user(db, email):
    user = models.User(email=email, name=email.split("@")[0], google_sub=f"sub-{email}")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user(db):
    return _make_user(db, "owner@example.com")


@pytest.fixture
def other_user(db):
    return _make_user(db, "someone-else@example.com")


def _app_for(user_id):
    app = FastAPI()
    app.include_router(endpoints.router)
    app.include_router(hooks.router)
    app.include_router(shared.router)

    def current_user():
        session = SessionLocal()
        try:
            return session.get(models.User, user_id)
        finally:
            session.close()

    app.dependency_overrides[get_current_user] = current_user
    return app


@pytest.fixture
def client(user):
    """Client authenticated as `user`."""
    return TestClient(_app_for(user.id))


@pytest.fixture
def other_client(other_user):
    """Client authenticated as a different user, for ownership checks."""
    return TestClient(_app_for(other_user.id))


@pytest.fixture
def endpoint(client):
    return client.post("/api/endpoints", json={"name": "test"}).json()
