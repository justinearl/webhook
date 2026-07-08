import os
import secrets


def _resolve_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url or "<" in url:
        # No real Postgres configured (placeholder value) -> fall back to local SQLite.
        return "sqlite:///./webhook.db"
    # We install psycopg (v3), not psycopg2 -> force SQLAlchemy to use that driver
    # even if the URL was handed to us as a plain "postgres(ql)://" scheme.
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _resolve_database_url()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
JWT_SECRET = os.environ.get("JWT_SECRET") or secrets.token_hex(32)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
