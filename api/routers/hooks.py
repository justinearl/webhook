import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..events import endpoint_requests_channel, publish
from ..rate_limit import check_rate_limit

logger = logging.getLogger("webhook.hooks")

router = APIRouter(prefix="/hook", tags=["hooks"])

HOP_BY_HOP_HEADERS = {"host", "content-length", "connection"}


async def enforce_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    retry_after = await check_rate_limit(client_ip)
    if retry_after is not None:
        logger.warning("Rate limit exceeded for hook caller", extra={"client_ip": client_ip})
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests, slow down.",
            headers={"Retry-After": str(retry_after)},
        )


async def _handle(endpoint_id: str, extra_path: str, request: Request, db: Session) -> Response:
    endpoint = db.get(models.Endpoint, endpoint_id)
    if endpoint is None:
        logger.warning(
            "Hook call to unknown endpoint",
            extra={
                "endpoint_id": endpoint_id,
                "method": request.method,
                "client_ip": request.client.host if request.client else "",
            },
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown callback endpoint")

    body_bytes = await request.body()
    try:
        body_text = body_bytes.decode("utf-8")
    except UnicodeDecodeError:
        body_text = body_bytes.decode("latin-1", errors="replace")

    log = models.RequestLog(
        endpoint_id=endpoint.id,
        method=request.method,
        path=f"/{extra_path}" if extra_path else "/",
        query_params=dict(request.query_params),
        headers={k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP_HEADERS},
        body=body_text,
        content_type=request.headers.get("content-type", ""),
        client_ip=request.client.host if request.client else "",
    )
    db.add(log)
    db.commit()

    logger.info(
        "Recorded incoming request",
        extra={
            "endpoint_id": endpoint.id,
            "owner_id": endpoint.owner_id,
            "request_log_id": log.id,
            "method": log.method,
            "path": log.path,
            "client_ip": log.client_ip,
            "content_type": log.content_type,
            "body_size": len(body_bytes),
        },
    )

    summary = schemas.RequestLogSummary.model_validate(log).model_dump(mode="json")
    try:
        await publish(endpoint_requests_channel(endpoint.id), summary)
    except Exception:
        # The request is already saved -> a broken live-update push must never
        # fail the response the caller (the webhook sender) is waiting on.
        logger.exception(
            "Failed to publish live update",
            extra={"endpoint_id": endpoint.id, "request_log_id": log.id},
        )

    return Response(
        content=endpoint.response_body,
        status_code=endpoint.response_status,
        headers=endpoint.response_headers or None,
        media_type=endpoint.response_content_type,
    )


@router.api_route(
    "/{endpoint_id}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    dependencies=[Depends(enforce_rate_limit)],
)
async def receive_root(endpoint_id: str, request: Request, db: Session = Depends(get_db)):
    return await _handle(endpoint_id, "", request, db)


@router.api_route(
    "/{endpoint_id}/{extra_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    dependencies=[Depends(enforce_rate_limit)],
)
async def receive_sub(endpoint_id: str, extra_path: str, request: Request, db: Session = Depends(get_db)):
    return await _handle(endpoint_id, extra_path, request, db)
