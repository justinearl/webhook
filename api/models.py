import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _share_token() -> str:
    return secrets.token_urlsafe(32)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), default="")
    picture: Mapped[str] = mapped_column(String(1024), default="")
    google_sub: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    endpoints: Mapped[list["Endpoint"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Endpoint(Base):
    __tablename__ = "endpoints"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")

    response_status: Mapped[int] = mapped_column(Integer, default=200)
    response_headers: Mapped[dict] = mapped_column(JSON, default=dict)
    response_body: Mapped[str] = mapped_column(Text, default="")
    response_content_type: Mapped[str] = mapped_column(String(255), default="application/json")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    owner: Mapped["User"] = relationship(back_populates="endpoints")
    requests: Mapped[list["RequestLog"]] = relationship(
        back_populates="endpoint", cascade="all, delete-orphan", order_by="RequestLog.created_at.desc()"
    )
    share: Mapped["EndpointShare | None"] = relationship(
        back_populates="endpoint", cascade="all, delete-orphan", uselist=False
    )


class RequestLog(Base):
    __tablename__ = "request_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    endpoint_id: Mapped[str] = mapped_column(ForeignKey("endpoints.id"), nullable=False, index=True)

    method: Mapped[str] = mapped_column(String(16))
    path: Mapped[str] = mapped_column(String(2048), default="")
    query_params: Mapped[dict] = mapped_column(JSON, default=dict)
    headers: Mapped[dict] = mapped_column(JSON, default=dict)
    body: Mapped[str] = mapped_column(Text, default="")
    content_type: Mapped[str] = mapped_column(String(255), default="")
    client_ip: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)

    endpoint: Mapped["Endpoint"] = relationship(back_populates="requests")


class EndpointShare(Base):
    """A public, read-only link to an endpoint and its recorded requests.

    Kept in its own table rather than as a column on `endpoints` so that
    `Base.metadata.create_all` (which adds missing tables but never missing
    columns) is enough to roll this out onto an existing database.
    """

    __tablename__ = "endpoint_shares"

    token: Mapped[str] = mapped_column(String(64), primary_key=True, default=_share_token)
    endpoint_id: Mapped[str] = mapped_column(
        ForeignKey("endpoints.id"), unique=True, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    endpoint: Mapped["Endpoint"] = relationship(back_populates="share")
