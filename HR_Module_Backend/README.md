# HR Module

FastAPI backend for HR management — employees, roles/permissions, attendance, working hours, announcements, job postings, resume shortlisting (with Gmail-based resume ingestion and ATS scoring), and interview scheduling via Google Calendar.

## Tech Stack

- **FastAPI** + **Uvicorn**
- **SQLAlchemy** (SQLite by default)
- **Pydantic v2** (`pydantic-settings`)
- **APScheduler** for background jobs (Gmail polling, announcement notifications)
- **Google API** (Gmail + Calendar) for resume ingestion and interview scheduling
- JWT auth (`python-jose`) with `passlib`/`bcrypt` password hashing

## Prerequisites

- Python 3.10+
- A Google Cloud OAuth client (only needed if you use Gmail resume ingestion / Calendar interview scheduling)

## Setup

```bash
# from the repo root
python -m venv venv
```

**Windows (PowerShell):**
```powershell
venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

## Configuration

Settings are defined in [backend/app/config.py](backend/app/config.py) and can be overridden via a `.env` file placed in `backend/` (loaded automatically). Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `database_url` | `sqlite:///./hr_app.db` | SQLAlchemy database URL |
| `jwt_secret` | dev default | **Change in production** — JWT signing key |
| `password_encryption_key` | dev default | **Change in production** — Fernet key for recoverable password storage |
| `gmail_credentials_file` | `credentials/credentials.json` | Google OAuth client secret path |
| `gmail_token_file` | `credentials/token.json` | Generated OAuth token path |
| `gmail_query` | `is:unread has:attachment filename:pdf` | Gmail search query for resume ingestion |
| `gmail_poll_interval_minutes` | `5` | How often the Gmail poller runs |
| `ats_base_url` | `http://localhost:8000/api/v1` | Resume Matcher ATS scoring service URL |
| `upload_dir` | `uploads` | Where ingested resumes are stored |

Generate your own secrets rather than using the defaults, e.g.:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Gmail / Calendar integration (optional)

If you want resume ingestion via Gmail and interview scheduling via Google Calendar:

1. Place your OAuth client secret at `backend/credentials/credentials.json`.
2. Run the one-time authorization flow (opens a browser for consent):
   ```bash
   cd backend
   python scripts/authorize_gmail.py
   ```
3. This writes `backend/credentials/token.json`, which the background poller and scheduler auto-refresh afterwards.

Skip this section if you don't need those features — the rest of the API works without it.

## Running the server

From the `backend/` directory, with the virtual environment activated:

```bash
uvicorn app.main:app --reload --port 8001
```

The API will be available at:
- Base URL: `http://127.0.0.1:8001`
- Interactive docs (Swagger UI): `http://127.0.0.1:8001/docs`
- ReDoc: `http://127.0.0.1:8001/redoc`

On startup, the app creates database tables (if missing) and starts background jobs for Gmail resume polling and announcement notifications.

## Project structure

```
backend/
  app/
    auth/          # JWT auth, login/dependencies
    core/          # scheduler, permissions, security
    integrations/   # Gmail, Google Calendar clients
    models/         # SQLAlchemy models
    routers/        # FastAPI route modules
    schemas/        # Pydantic schemas
    services/       # business logic
    config.py       # Settings (env-driven)
    database.py     # SQLAlchemy engine/session
    main.py         # FastAPI app entrypoint
  credentials/      # Google OAuth credentials/token (not committed)
  scripts/          # one-off scripts (e.g. Gmail authorization)
  uploads/          # ingested resume files
  requirements.txt
```
