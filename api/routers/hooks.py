from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db

router = APIRouter(prefix="/hook", tags=["hooks"])

HOP_BY_HOP_HEADERS = {"host", "content-length", "connection"}


async def _handle(endpoint_id: str, extra_path: str, request: Request, db: Session) -> Response:
    endpoint = db.get(models.Endpoint, endpoint_id)
    if endpoint is None:
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

    return Response(
        content=endpoint.response_body,
        status_code=endpoint.response_status,
        headers=endpoint.response_headers or None,
        media_type=endpoint.response_content_type,
    )


@router.api_route(
    "/{endpoint_id}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
)
async def receive_root(endpoint_id: str, request: Request, db: Session = Depends(get_db)):
    return await _handle(endpoint_id, "", request, db)


@router.api_route(
    "/{endpoint_id}/{extra_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
)
async def receive_sub(endpoint_id: str, extra_path: str, request: Request, db: Session = Depends(get_db)):
    return await _handle(endpoint_id, extra_path, request, db)
