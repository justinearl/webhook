import logging
from contextlib import asynccontextmanager

import logfire
from fastapi import FastAPI

from api.config import LOGFIRE_TOKEN
from api.db import Base, engine
from api.events import close_redis
from api.routers import auth, endpoints, hooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
    await close_redis()


app = FastAPI(lifespan=lifespan)

if LOGFIRE_TOKEN is not None:
    logfire.configure(token=LOGFIRE_TOKEN)
else:
    # No real Logfire project configured (e.g. local dev) -> don't try to export over the network.
    logfire.configure(send_to_logfire=False)
logfire.instrument_fastapi(app)
logging.basicConfig(level=logging.INFO, handlers=[logfire.LogfireLoggingHandler()])
# logfire.instrument_fastapi already logs a request-level entry for every
# call (and exports it to the dashboard); uvicorn's own access log would
# otherwise print a second, unstructured line for the same request.
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logfire.info("Application started")

app.include_router(auth.router)
app.include_router(endpoints.router)
app.include_router(hooks.router)


@app.get("/api")
def main():
    return {"message": "Hello World"}


app.frontend("/", directory="frontend/dist")
