# HR Automation System — Frontend

React frontend for the HR Automation System. Built with React 19, Vite, Tailwind CSS, Zustand, and Apisauce.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm or yarn
- The [HR_Module backend](../HR_Module) running locally (this app talks to it over HTTP)

## Setup

```bash
cd frontend
npm install
```

## Configure the API URL

Create a `.env` file inside `frontend/` (or copy an existing `.env.example` if present):

```bash
VITE_API_URL=http://127.0.0.1:8001
```

Point this at wherever your HR_Module backend is running.

## Run the dev server

```bash
cd frontend
npm run dev
```

Vite will print the local URL (default `http://localhost:5173`). If that port is taken, pass a different one:

```bash
npm run dev -- --port 5175
```

## Other scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build to `frontend/dist` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project structure

```
frontend/src/
├── components/   # Reusable UI components
├── features/     # Feature modules (auth, employees, attendance, etc.)
├── store/        # Zustand global state
├── services/     # API clients (Apisauce)
├── hooks/        # Custom hooks
├── constants/    # Shared constants
└── utils/        # Utility functions
```

## Notes

- All API calls go through `frontend/src/services/apiClient.js`. Make sure `VITE_API_URL` matches your backend's host/port or requests will fail with connection errors.
- Auth token is stored via the Zustand `authStore`; a 401 response (other than from the login request itself) logs the user out and redirects to `/login`.
