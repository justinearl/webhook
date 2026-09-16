import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, request_views, schemas
from ..db import get_db
from ..security import get_current_user, get_owned_endpoint

logger = logging.getLogger("webhook.endpoints")

router = APIRouter(prefix="/api/endpoints", tags=["endpoints"])


def _to_out(endpoint: models.Endpoint, db: Session) -> schemas.EndpointOut:
    count = db.query(func.count(models.RequestLog.id)).filter(
        models.RequestLog.endpoint_id == endpoint.id
    ).scalar()
    data = schemas.EndpointOut.model_validate(endpoint)
    data.request_count = count or 0
    data.share_token = endpoint.share.token if endpoint.share else None
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
    endpoint: models.Endpoint = Depends(get_owned_endpoint),
    db: Session = Depends(get_db),
):
    return _to_out(endpoint, db)


@router.patch("/{endpoint_id}", response_model=schemas.EndpointOut)
def update_endpoint(
    payload: schemas.EndpointUpdate,
    endpoint: models.Endpoint = Depends(get_owned_endpoint),
    db: Session = Depends(get_db),
):
    changed_fields = payload.model_dump(exclude_unset=True)
    for field, value in changed_fields.items():
        setattr(endpoint, field, value)
    db.commit()
    db.refresh(endpoint)
    logger.info(
        "Endpoint updated",
        extra={
            "endpoint_id": endpoint.id,
            "owner_id": endpoint.owner_id,
            "changed_fields": list(changed_fields),
        },
    )
    return _to_out(endpoint, db)


@router.delete("/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_endpoint(
    endpoint: models.Endpoint = Depends(get_owned_endpoint),
    db: Session = Depends(get_db),
):
    endpoint_id, owner_id = endpoint.id, endpoint.owner_id
    db.delete(endpoint)
    db.commit()
    logger.info("Endpoint deleted", extra={"endpoint_id": endpoint_id, "owner_id": owner_id})


@router.post("/{endpoint_id}/share", response_model=schemas.ShareOut)
def create_share_link(
    endpoint: models.Endpoint = Depends(get_owned_endpoint),
    db: Session = Depends(get_db),
):
    """Enable public read-only sharing. Idempotent: returns the existing link if there is one."""
    if endpoint.share is None:
        endpoint.share = models.EndpointShare()
        db.commit()
        db.refresh(endpoint)
        logger.info(
            "Share link created",
            extra={"endpoint_id": endpoint.id, "owner_id": endpoint.owner_id},
        )
    return schemas.ShareOut(token=endpoint.share.token)


@router.delete("/{endpoint_id}/share", status_code=status.HTTP_204_NO_CONTENT)
def revoke_share_link(
    endpoint: models.Endpoint = Depends(get_owned_endpoint),
    db: Session = Depends(get_db),
):
    """Revoke the share link. The old URL stops working immediately."""
    if endpoint.share is not None:
        db.delete(endpoint.share)
        db.commit()
        logger.info(
            "Share link revoked",
            extra={"endpoint_id": endpoint.id, "owner_id": endpoint.owner_id},
        )


@router.get("/{endpoint_id}/requests", response_model=schemas.RequestLogPage)
def list_requests(
    limit: int = Query(25, ge=1, le=200),
    before: datetime | None = Query(None, description="Only return requests older than this timestamp"),
    endpoint: models.Endpoint = Depends(get_owned_endpoint),
    db: Session = Depends(get_db),
):
    return request_views.request_page(db, endpoint.id, limit, before)


@router.get("/{endpoint_id}/requests/{request_id}", response_model=schemas.RequestLogOut)
def get_request(
    request_id: str,
    endpoint: models.Endpoint = Depends(get_owned_endpoint),
    db: Session = Depends(get_db),
):
    return request_views.request_detail(db, endpoint.id, request_id)


@router.get("/{endpoint_id}/stream")
async def stream_requests(endpoint: models.Endpoint = Depends(get_owned_endpoint)):
    return request_views.request_stream(
        endpoint.id, {"endpoint_id": endpoint.id, "user_id": endpoint.owner_id}
    )
