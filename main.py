import os
from contextlib import asynccontextmanager

import logfire
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.db import Base, engine
from api.events import close_redis
from api.routers import auth, endpoints, hooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
    await close_redis()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logfire.configure(token=os.environ["LOGFIRE_TOKEN"])
logfire.instrument_fastapi(app)
logfire.info("Application started")

app.include_router(auth.router)
app.include_router(endpoints.router)
app.include_router(hooks.router)


@app.get("/api")
def main():
    return {"message": "Hello World"}


app.frontend("/", directory="frontend/dist")
