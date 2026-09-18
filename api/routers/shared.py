"""Public, read-only access to an endpoint via its share link.

Every route here is unauthenticated: possession of the share token *is* the
credential, so it is treated like one — no route accepts a plain endpoint id,
and revoking the token (DELETE /api/endpoints/{id}/share) kills access
immediately.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, request_views, schemas
from ..db import get_db
from ..rate_limit import check_rate_limit

logger = logging.getLogger("webhook.shared")

router = APIRouter(prefix="/api/shared", tags=["shared"])


async def enforce_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    retry_after = await check_rate_limit(client_ip, scope="shared")
    if retry_after is not None:
        logger.warning("Rate limit exceeded for share-link viewer", extra={"client_ip": client_ip})
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests, slow down.",
            headers={"Retry-After": str(retry_after)},
        )


def get_shared_endpoint(token: str, db: Session = Depends(get_db)) -> models.Endpoint:
    share = db.get(models.EndpointShare, token)
    if share is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This share link is invalid or has been revoked.",
        )
    return share.endpoint


@router.get("/{token}", response_model=schemas.SharedEndpointOut, dependencies=[Depends(enforce_rate_limit)])
def get_shared(
    endpoint: models.Endpoint = Depends(get_shared_endpoint),
    db: Session = Depends(get_db),
):
    count = db.query(func.count(models.RequestLog.id)).filter(
        models.RequestLog.endpoint_id == endpoint.id
    ).scalar()
    data = schemas.SharedEndpointOut.model_validate(endpoint)
    data.request_count = count or 0
    return data


@router.get(
    "/{token}/requests",
    response_model=schemas.RequestLogPage,
    dependencies=[Depends(enforce_rate_limit)],
)
def list_shared_requests(
    limit: int = Query(25, ge=1, le=200),
    before: datetime | None = Query(None, description="Only return requests older than this timestamp"),
    method: str | None = Query(None, max_length=16, description="Only this HTTP method"),
    q: str | None = Query(None, max_length=200, description="Case-insensitive match on path or body"),
    endpoint: models.Endpoint = Depends(get_shared_endpoint),
    db: Session = Depends(get_db),
):
    return request_views.request_page(db, endpoint.id, limit, before, method=method, q=q)


@router.get(
    "/{token}/requests/{request_id}",
    response_model=schemas.RequestLogOut,
    dependencies=[Depends(enforce_rate_limit)],
)
def get_shared_request(
    request_id: str,
    endpoint: models.Endpoint = Depends(get_shared_endpoint),
    db: Session = Depends(get_db),
):
    return request_views.request_detail(db, endpoint.id, request_id)


@router.get("/{token}/stream")
async def stream_shared_requests(endpoint: models.Endpoint = Depends(get_shared_endpoint)):
    return request_views.request_stream(endpoint.id, {"endpoint_id": endpoint.id, "shared": True})
