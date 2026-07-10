# webhook

A self-hosted webhook.site-style callback catcher. Sign in with Google, generate unique URLs, point any webhook sender at them, and watch requests land in the dashboard in real time.

## Features

- **Google Sign-In** — no passwords, accounts are created on first login.
- **Callback endpoints** — generate unique `/hook/{id}` URLs that accept any HTTP method, with a configurable canned response (status code, headers, body, content type).
- **Live request feed** — incoming calls appear in the dashboard instantly via Server-Sent Events, no refresh needed.
- **Full request detail** — inspect headers, query params, and body for every call, with pagination for endpoints with a lot of history.
- **Rate limited** — the public hook receiver is capped per caller IP to protect it from abuse.

## Stack

- **Backend**: FastAPI, SQLAlchemy (Postgres in production, SQLite fallback locally), Redis (pub/sub for live updates, falls back to in-process for local dev), Logfire for observability.
- **Frontend**: Vite + React + Material UI, served by the same FastAPI app in production (`app.frontend`).


## Local development

Requires [uv](https://docs.astral.sh/uv/) and Node 24+.

```bash
# Backend
source .envrc          # or let direnv auto-load it
uv sync
uv run fastapi dev main.py --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # proxies /api and /hook to :8000, see vite.config.js
```

Visit `http://localhost:5173`.

### Environment variables

Set in `.envrc`. `DATABASE_URL`, `REDIS_URL`, and `LOGFIRE_TOKEN` must be present but can be `"dummy"` to opt out locally — the app falls back to SQLite / in-process pub/sub / no telemetry export respectively, and logs a warning so it's obvious. Leaving one of them fully unset (not even `"dummy"`) is a startup error by design — see `api/config.py`.

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | yes | Google OAuth client ID — verifies ID tokens server-side (`api/security.py`) |
| `VITE_GOOGLE_CLIENT_ID` | yes (build-time) | Same value, exposed to the frontend build. Derived from `GOOGLE_CLIENT_ID` in `.envrc` so there's one source of truth |
| `DATABASE_URL` | yes (or `"dummy"`) | Postgres connection string. `"dummy"` → local SQLite (`webhook.db`) |
| `REDIS_URL` | yes (or `"dummy"`) | Redis connection string, needed for live updates to work correctly across multiple app instances. `"dummy"` → in-process pub/sub (single instance only) |
| `LOGFIRE_TOKEN` | yes (or `"dummy"`) | [Logfire](https://logfire.dev) write token. `"dummy"` → telemetry export disabled |
| `JWT_SECRET` | no, but strongly recommended | Signs session tokens. If unset, a random secret is generated per process — fine for a single local run, but in production it silently invalidates all sessions on every restart and breaks auth across multiple instances. Set a fixed, real value. |
| `HOOK_RATE_LIMIT_PER_MINUTE` | no (default `60`) | Per-IP request cap on the public `/hook/{id}` receiver |

### Testing authenticated endpoints without a real Google login

`/api/auth/login` needs a real Google ID token, which is impractical to obtain outside a browser. Mint a user and session token directly instead:

```bash
uv run python -c "
from api.db import SessionLocal, Base, engine
from api import models
from api.security import create_access_token

Base.metadata.create_all(bind=engine)
db = SessionLocal()
user = models.User(email='test@example.com', name='Test User', picture='', google_sub='test-sub')
db.add(user)
db.commit()
db.refresh(user)
print('TOKEN=' + create_access_token(user.id))
"
```

Then use `Authorization: Bearer <token>` on any `/api/*` request.

## Deployment

`.github/workflows/deploy.yml` builds the frontend and deploys to [FastAPI Cloud](https://fastapicloud.com) on every push to `master`. Required GitHub Actions secrets:

- `GOOGLE_CLIENT_ID` — same value as local `.envrc`, used to build the frontend (aliased to `VITE_GOOGLE_CLIENT_ID` in the workflow)
- `FASTAPI_CLOUD_TOKEN`, `FASTAPI_CLOUD_APP_ID` — from your FastAPI Cloud project

FastAPI Cloud itself needs all the runtime env vars from the table above (`GOOGLE_CLIENT_ID`, `DATABASE_URL`, `REDIS_URL`, `LOGFIRE_TOKEN`, `JWT_SECRET`) set to real values in its dashboard — it does **not** need `VITE_GOOGLE_CLIENT_ID`, since the frontend arrives pre-built from CI.

To deploy manually instead:

```bash
uv run fastapi deploy
```
