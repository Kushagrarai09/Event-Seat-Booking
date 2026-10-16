# SeatFlow

Discover events. Secure your seat. Make every experience count.

SeatFlow is a full-stack event discovery and seat reservation platform. The frontend is built with Next.js and TypeScript, while the backend exposes a FastAPI REST API backed by MySQL and SQLAlchemy.

> **Project status:** Account authentication, role-based access, five-minute seat holds, and database-backed booking protection are present in the current feature branch. Payment processing, email delivery, and full production observability are not yet implemented. Review and test this branch before production deployment.

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Frontend](#frontend)
- [Backend](#backend)
- [API reference](#api-reference)
- [Environment variables](#environment-variables)
- [Run locally](#run-locally)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security and production checklist](#security-and-production-checklist)
- [Current limitations](#current-limitations)

## Features

### Event discovery and seats
- Browse events and open event details.
- View seat layout, seat prices, and availability.
- Create events through protected administrator routes.

### Accounts and authorization
- Register and sign in using email and password.
- Store password hashes instead of plaintext passwords.
- Use signed bearer access tokens with a 24-hour expiry.
- Keep role assignment server-controlled; registration does not accept a role from the client.
- Use `ADMIN_EMAILS` as a server-side allowlist for administrator bootstrap.
- Require authentication to hold seats, create bookings, and cancel a user's own booking.
- Restrict event management and admin endpoints to administrators.

### Temporary seat holds and booking consistency
1. A signed-in customer selects available seats.
2. The API creates a hold for five minutes.
3. The customer submits the booking before the hold expires.
4. The API checks that the hold is active and belongs to the signed-in user.
5. The booking transaction creates booking-seat rows and consumes the hold atomically.
6. If a seat is already booked, held by another customer, or the hold has expired, the API rejects the conflicting request.

MySQL row locking and a unique constraint on `(event_id, seat_id)` in `booking_seats` provide database-level protection against duplicate confirmed bookings. Expired holds can be reclaimed when a new hold is requested; correctness does not depend on a background cleanup job.

## Architecture

```text
Browser
  |
  v
Next.js frontend (frontend/)
  |  HTTP/JSON + Bearer access token
  v
FastAPI REST API (backend/app/)
  |
  v
SQLAlchemy ORM
  |
  v
MySQL database
```

The frontend calls the API using `NEXT_PUBLIC_API_URL`. The backend validates requests, applies authentication/authorization rules, and uses database transactions to protect seat allocation.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend/API | Python, FastAPI, Pydantic |
| Database access | SQLAlchemy |
| Database | MySQL |
| Authentication | Password hashing, signed bearer tokens |
| API documentation | FastAPI OpenAPI / Swagger UI |
| Deployment | Frontend and API can be hosted as separate services on Render; MySQL on a compatible managed MySQL provider |

## Repository structure

```text
.
├── frontend/
│   ├── app/                 # Next.js routes and UI
│   ├── components/          # Reusable UI components, if present
│   ├── lib/                 # Frontend API/auth helpers, if present
│   └── .env.local.example   # Frontend environment example
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, middleware and router registration
│   │   ├── auth.py          # Authentication dependencies and token handling
│   │   ├── database.py      # SQLAlchemy engine and database session
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── routers/         # Auth, events, holds, bookings and admin routes
│   │   └── services/        # Booking business logic
│   ├── tests/               # Automated backend tests
│   ├── requirements.txt
│   ├── .env.example
│   └── seed.sql
└── README.md
```

## Frontend

The Next.js application provides the user interface for event discovery, account access, seat selection, the hold countdown, and booking submission.

### Frontend configuration

Create `frontend/.env.local` from `frontend/.env.local.example` and set:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For a deployed frontend, replace the local URL with the public base URL of the deployed FastAPI service. Do not include `/docs` or an endpoint path in this variable unless the frontend's API helper explicitly expects it.

### Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Backend

The backend is a FastAPI application. Its entry point is `backend/app/main.py`; routers separate authentication, event, hold, booking, and administrator operations. SQLAlchemy manages database sessions and persistence.

### Backend configuration

Create `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:3306/DATABASE
JWT_SECRET_KEY=replace-with-a-long-random-secret
ADMIN_EMAILS=admin@example.com
FRONTEND_URL=http://localhost:3000
```

Generate a secret locally:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use URL-encoded credentials if the database username or password contains special characters. Put real credentials only in local environment files or your hosting provider's secret/environment settings; never commit them.

### Start the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment:

```powershell
# Windows PowerShell
.venv\Scripts\Activate.ps1
```

```bash
# macOS/Linux
source .venv/bin/activate
```

Then install and start:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend requires a reachable MySQL database and the configured environment variables. The local API base URL is `http://localhost:8000`.

## API reference

Interactive API documentation is generated by FastAPI:

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI schema: `http://localhost:8000/openapi.json`
- Health check: `GET /health`
- Root information: `GET /`

The following is a high-level route guide. Use Swagger UI on the running version to confirm exact request schemas, response fields, and any additional admin routes.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register an account |
| POST | `/api/auth/login` | Public | Sign in and receive an access token |
| GET | `/api/auth/me` | Authenticated | Get the current account |
| GET | `/api/events` | Public | List events and availability |
| GET | `/api/events/{event_id}` | Public | Get event details |
| POST | `/api/events` | Admin | Create an event |
| POST | `/api/events/{event_id}/holds` | Authenticated | Hold selected seats temporarily |
| DELETE | `/api/events/{event_id}/holds` | Authenticated | Release the current user's holds for the event |
| POST | `/api/events/{event_id}/bookings` | Authenticated with valid hold | Create a booking and consume the hold |
| DELETE | `/api/bookings/{booking_id}` | Booking owner | Cancel a booking |
| `/api/admin/...` | See Swagger UI | Admin | Administrative operations registered by the backend |

### Authentication header

For protected endpoints, send the access token returned by login:

```http
Authorization: Bearer <access_token>
```

### Common outcomes

- `401 Unauthorized`: authentication is missing or invalid.
- `403 Forbidden`: the account does not have the required role.
- `404 Not Found`: the resource does not exist or is intentionally hidden from the caller.
- `409 Conflict`: a seat is already booked, held by another user, or the hold is no longer valid.
- `422 Unprocessable Entity`: request data failed validation.

## Environment variables

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | Backend | MySQL SQLAlchemy connection URL |
| `JWT_SECRET_KEY` | Backend | Secret used to sign/validate access tokens |
| `ADMIN_EMAILS` | Backend | Comma-separated allowlist for administrator bootstrap, as supported by the application |
| `FRONTEND_URL` | Backend | Comma-separated list of allowed frontend origins for CORS; defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Frontend | Base URL of the FastAPI API |

The example values are placeholders. Never add real credentials or signing secrets to Git.

## Testing

The repository includes a backend tests directory and a manual concurrency test script. Install backend dependencies, configure a **dedicated test database**, and run the tests supported by the current test suite:

```bash
cd backend
pytest
```

Do not point destructive or concurrency tests at production data. Before merging or deploying, verify at least:

- Registration, login, and invalid credentials.
- Admin-only event operations.
- Users cannot cancel bookings owned by another account.
- A hold expires and cannot be used after expiry.
- Two users cannot confirm the same event-seat pair.
- Booking failure rolls back the transaction and does not leave seats inconsistently allocated.

A passing local test suite does not by itself establish that production deployment is safe; check CI status and deployment configuration as well.

## Deployment

Deploy the frontend and backend as separate services:

### Frontend service
- Service type: Node web service
- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Environment: `NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-HOST`

Use a static-site deployment only if the Next.js app is explicitly configured for static export.

### Backend service
- Root directory: `backend`
- Build/install command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Configure `DATABASE_URL`, `JWT_SECRET_KEY`, and `ADMIN_EMAILS` in the host's environment settings.
- Configure CORS to allow the exact deployed frontend origin.

### Database
The app currently expects MySQL. Render's PostgreSQL service is not a drop-in replacement for MySQL. Use a compatible managed MySQL service or deliberately migrate and test the application's database driver, schema, and SQL behavior before switching database engines.

Before deploying a branch with authentication/seat-hold changes to an existing database, review schema compatibility, back up important data, and use versioned migrations for production schema evolution.

## Security and production checklist

- [ ] Use HTTPS for public deployments.
- [ ] Keep database credentials and signing secrets out of source control.
- [ ] Configure CORS for the exact frontend origin.
- [ ] Verify authorization on every protected endpoint.
- [ ] Add login/registration rate limiting and password-reset flows before public launch.
- [ ] Review browser token storage and consider secure, HttpOnly cookies or a server-managed session.
- [ ] Use Alembic or another versioned migration strategy instead of relying on startup-time schema changes.
- [ ] Add payment-provider verification and idempotency before implementing real payments.
- [ ] Add structured logs, request IDs, metrics, and tracing; avoid logging secrets or personal/payment data.
- [ ] Confirm CI checks pass and run integration/concurrency tests against a dedicated test database.

## Current limitations

- Payment processing and payment webhooks are **not implemented**. A seat hold is not a payment; booking submission currently confirms a booking when the hold is valid.
- Email delivery is not configured; booking responses report `confirmation_sent: false`.
- Authentication tokens are stored in browser local storage by the sample frontend. Review the security trade-offs before public production use.
- The application currently calls `Base.metadata.create_all` and includes small compatibility helpers. Use reviewed, versioned migrations for production database changes.
- CORS reads `FRONTEND_URL` as a comma-separated list of exact allowed origins; set it to the deployed frontend origin in production.
- Production-grade metrics, distributed tracing, and payment lifecycle states are roadmap items, not completed functionality.

## Concurrency guarantee

The database unique constraint on `(event_id, seat_id)` in `booking_seats` prevents duplicate confirmed allocations. Seat holds add a temporary reservation layer, and booking creation consumes valid holds within a database transaction.
