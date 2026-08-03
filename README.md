# HR Automation System

A full-stack HR automation platform: employee management, RBAC, attendance/working-hours tracking, company announcements, job postings, and a Gmail-driven resume-shortlisting pipeline with ATS scoring and Google Calendar interview scheduling.

This is a monorepo containing three projects:

| Folder | What it is | Stack |
|---|---|---|
| [`HR_Module_Backend/`](HR_Module_Backend/) | Core HR API — auth/RBAC, employees, attendance, announcements, job postings, resume shortlisting, interview scheduling | FastAPI, SQLAlchemy (SQLite), Pydantic v2 |
| [`HR_Module_Frontend/`](HR_Module_Frontend/) | Web client for the HR API above | React 19, Vite, Tailwind CSS, Zustand, Apisauce |
| [`Resume-Matcher/`](Resume-Matcher/) | Third-party ATS scoring service ([srbhr/Resume-Matcher](https://github.com/srbhr/Resume-Matcher)), consumed by the backend's resume-ingestion pipeline for match scoring | FastAPI, Next.js |

Each folder has its own `README.md` with full setup details — this file just covers how the pieces fit together.

## Architecture

```
HR_Module_Frontend  ──HTTP──>  HR_Module_Backend  ──HTTP──>  Resume-Matcher (ATS scoring)
   (Vite, :5173)                 (FastAPI, :8001)              (FastAPI, :8000)
                                       │
                                       ├── Gmail API   (resume ingestion, notifications)
                                       └── Google Calendar API (interview scheduling)
```

- The frontend is a pure API client — all backend calls go through `VITE_API_URL`.
- The backend polls Gmail for incoming resumes, sends them to Resume-Matcher for ATS scoring, and schedules interviews on Google Calendar once a candidate is shortlisted.
- Resume-Matcher is a separate, independently-run service — the backend only talks to it over HTTP (`ats_base_url` setting).

## Quick start

Run these in three separate terminals.

**1. Backend** ([full instructions](HR_Module_Backend/README.md))
```bash
cd HR_Module_Backend
python -m venv venv && venv\Scripts\Activate.ps1   # Windows; use `source venv/bin/activate` on macOS/Linux
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**2. Frontend** ([full instructions](HR_Module_Frontend/README.md))
```bash
cd HR_Module_Frontend/frontend
npm install
npm run dev
```

**3. Resume-Matcher** (optional — only needed for ATS scoring; [full instructions](Resume-Matcher/SETUP.md))
```bash
cd Resume-Matcher
# see SETUP.md — Docker Compose or manual apps/backend + apps/frontend setup
```

Once running:
- Frontend: `http://localhost:5173`
- Backend API docs: `http://127.0.0.1:8001/docs`
- Resume-Matcher: `http://localhost:8000`

## Notes

- The backend works standalone without Resume-Matcher/Gmail/Calendar configured — those integrations degrade gracefully (see [`HR_Module_Backend/README.md`](HR_Module_Backend/README.md#configuration)) if left unconfigured.
- Secrets (`jwt_secret`, `password_encryption_key`, Google OAuth credentials) are dev-default placeholders in source — **generate and set your own before any shared/deployed use**; see the backend README's Configuration section.
