import logging
import os
import secrets

logger = logging.getLogger("webhook.config")


def _require(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(
            f"Missing required environment variable {name!r}. Set a real value, "
            f'or "dummy" to explicitly opt out for local development.'
        )
    return value


def _is_placeholder(value: str) -> bool:
    return value.strip().lower() == "dummy"


def _resolve_database_url() -> str:
    url = _require("DATABASE_URL")
    if _is_placeholder(url):
        logger.warning("DATABASE_URL is a placeholder -> falling back to local SQLite (webhook.db).")
        return "sqlite:///./webhook.db"
    # We install psycopg (v3), not psycopg2 -> force SQLAlchemy to use that driver
    # even if the URL was handed to us as a plain "postgres(ql)://" scheme.
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _resolve_redis_url() -> str | None:
    url = _require("REDIS_URL")
    if _is_placeholder(url):
        logger.warning("REDIS_URL is a placeholder -> falling back to in-process pub/sub (single instance only).")
        return None
    return url


def _resolve_logfire_token() -> str | None:
    token = _require("LOGFIRE_TOKEN")
    if _is_placeholder(token):
        logger.warning("LOGFIRE_TOKEN is a placeholder -> Logfire export disabled.")
        return None
    return token


DATABASE_URL = _resolve_database_url()
REDIS_URL = _resolve_redis_url()
LOGFIRE_TOKEN = _resolve_logfire_token()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
JWT_SECRET = os.environ.get("JWT_SECRET") or secrets.token_hex(32)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
