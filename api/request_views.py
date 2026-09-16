"""Read-only views over an endpoint's recorded requests.

Shared by the owner-authenticated routes (routers/endpoints.py) and the
public share-link routes (routers/shared.py), which return the same data and
differ only in how the caller is authorised.
"""

import json
import logging
from datetime import datetime

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from . import models, schemas
from .events import endpoint_requests_channel, subscribe

logger = logging.getLogger("webhook.requests")


def request_page(
    db: Session, endpoint_id: str, limit: int, before: datetime | None
) -> schemas.RequestLogPage:
    query = db.query(models.RequestLog).filter(models.RequestLog.endpoint_id == endpoint_id)
    if before is not None:
        query = query.filter(models.RequestLog.created_at < before)

    rows = query.order_by(models.RequestLog.created_at.desc()).limit(limit + 1).all()
    has_more = len(rows) > limit
    return schemas.RequestLogPage(items=rows[:limit], has_more=has_more)


def request_detail(db: Session, endpoint_id: str, request_id: str) -> models.RequestLog:
    log = db.get(models.RequestLog, request_id)
    if log is None or log.endpoint_id != endpoint_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return log


def request_stream(endpoint_id: str, log_context: dict) -> StreamingResponse:
    async def event_stream():
        logger.info("SSE stream opened", extra=log_context)
        try:
            async for event in subscribe(endpoint_requests_channel(endpoint_id)):
                if event is None:
                    yield ": keep-alive\n\n"
                else:
                    yield f"data: {json.dumps(event)}\n\n"
        except Exception:
            logger.exception("SSE stream failed", extra=log_context)
            raise
        finally:
            logger.info("SSE stream closed", extra=log_context)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
