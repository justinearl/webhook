import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..events import endpoint_requests_channel, subscribe
from ..security import get_current_user

logger = logging.getLogger("webhook.endpoints")

router = APIRouter(prefix="/api/endpoints", tags=["endpoints"])


def _get_owned_endpoint(endpoint_id: str, db: Session, user: models.User) -> models.Endpoint:
    endpoint = db.get(models.Endpoint, endpoint_id)
    if endpoint is None or endpoint.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Endpoint not found")
    return endpoint


def _to_out(endpoint: models.Endpoint, db: Session) -> schemas.EndpointOut:
    count = db.query(func.count(models.RequestLog.id)).filter(
        models.RequestLog.endpoint_id == endpoint.id
    ).scalar()
    data = schemas.EndpointOut.model_validate(endpoint)
    data.request_count = count or 0
    return data


@router.post("", response_model=schemas.EndpointOut, status_code=status.HTTP_201_CREATED)
def create_endpoint(
    payload: schemas.EndpointCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    endpoint = models.Endpoint(owner_id=user.id, **payload.model_dump())
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    logger.info(
        "Endpoint created",
        extra={"endpoint_id": endpoint.id, "owner_id": user.id, "endpoint_name": endpoint.name},
    )
    return _to_out(endpoint, db)


@router.get("", response_model=list[schemas.EndpointOut])
def list_endpoints(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    endpoints = (
        db.query(models.Endpoint)
        .filter(models.Endpoint.owner_id == user.id)
        .order_by(models.Endpoint.created_at.desc())
        .all()
    )
    return [_to_out(e, db) for e in endpoints]


@router.get("/{endpoint_id}", response_model=schemas.EndpointOut)
def get_endpoint(
    endpoint_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    endpoint = _get_owned_endpoint(endpoint_id, db, user)
    return _to_out(endpoint, db)


@router.patch("/{endpoint_id}", response_model=schemas.EndpointOut)
def update_endpoint(
    endpoint_id: str,
    payload: schemas.EndpointUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    endpoint = _get_owned_endpoint(endpoint_id, db, user)
    changed_fields = payload.model_dump(exclude_unset=True)
    for field, value in changed_fields.items():
        setattr(endpoint, field, value)
    db.commit()
    db.refresh(endpoint)
    logger.info(
        "Endpoint updated",
        extra={"endpoint_id": endpoint.id, "owner_id": user.id, "changed_fields": list(changed_fields)},
    )
    return _to_out(endpoint, db)


@router.delete("/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_endpoint(
    endpoint_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    endpoint = _get_owned_endpoint(endpoint_id, db, user)
    db.delete(endpoint)
    db.commit()
    logger.info("Endpoint deleted", extra={"endpoint_id": endpoint_id, "owner_id": user.id})


@router.get("/{endpoint_id}/requests", response_model=schemas.RequestLogPage)
def list_requests(
    endpoint_id: str,
    limit: int = Query(25, ge=1, le=200),
    before: datetime | None = Query(None, description="Only return requests older than this timestamp"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _get_owned_endpoint(endpoint_id, db, user)
    query = db.query(models.RequestLog).filter(models.RequestLog.endpoint_id == endpoint_id)
    if before is not None:
        query = query.filter(models.RequestLog.created_at < before)

    rows = query.order_by(models.RequestLog.created_at.desc()).limit(limit + 1).all()
    has_more = len(rows) > limit
    return schemas.RequestLogPage(items=rows[:limit], has_more=has_more)


@router.get("/{endpoint_id}/requests/{request_id}", response_model=schemas.RequestLogOut)
def get_request(
    endpoint_id: str,
    request_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _get_owned_endpoint(endpoint_id, db, user)
    log = db.get(models.RequestLog, request_id)
    if log is None or log.endpoint_id != endpoint_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return log


@router.get("/{endpoint_id}/stream")
async def stream_requests(
    endpoint_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    _get_owned_endpoint(endpoint_id, db, user)
    log_context = {"endpoint_id": endpoint_id, "user_id": user.id}

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
