from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GoogleLoginRequest(BaseModel):
    credential: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    picture: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class EndpointCreate(BaseModel):
    name: str = ""
    description: str = ""
    response_status: int = 200
    response_headers: dict[str, str] = Field(default_factory=dict)
    response_body: str = ""
    response_content_type: str = "application/json"


class EndpointUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    response_status: int | None = None
    response_headers: dict[str, str] | None = None
    response_body: str | None = None
    response_content_type: str | None = None


class EndpointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    response_status: int
    response_headers: dict
    response_body: str
    response_content_type: str
    created_at: datetime
    updated_at: datetime
    request_count: int = 0


class RequestLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    endpoint_id: str
    method: str
    path: str
    query_params: dict
    headers: dict
    body: str
    content_type: str
    client_ip: str
    created_at: datetime


class RequestLogSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    method: str
    path: str
    client_ip: str
    created_at: datetime


class RequestLogPage(BaseModel):
    items: list[RequestLogSummary]
    has_more: bool
