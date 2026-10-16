# Event Seat Booking System

A full-stack event reservation platform using Next.js, FastAPI and MySQL. The backend focuses on database-correct seat allocation, authenticated users, and expiring five-minute seat holds.

## Stack

- Frontend: Next.js, React, TypeScript
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: MySQL
- Deployment: Vercel + Railway

## Features

### Public
- Browse events and event details
- View seat layout, prices, and availability

### Accounts and access control
- Register and sign in with email and password
- Passwords are stored as PBKDF2 hashes, not plaintext
- Signed bearer access tokens expire after 24 hours
- Customer registration never accepts a role from the client
- Set `ADMIN_EMAILS` on the server to bootstrap designated administrator accounts
- Event creation and administrative endpoints require an administrator token
- Booking and cancellation require an authenticated account

### Seat reservation workflow
1. Sign in to your account.
2. Choose available seats.
3. Request a five-minute hold for the selected seats.
4. Complete checkout before the countdown expires.
5. The API confirms booking only if the hold is still active and owned by that account.
6. If another customer holds the seats or the hold expires, the API returns a conflict and the customer must select again.

The hold is represented by one database row per event-seat pair. Requests lock the seat and hold rows in a consistent order, and MySQL's unique constraints remain an additional protection against competing allocations. The booking transaction consumes the hold and creates all booking-seat records atomically.

Expired rows can be reclaimed when another hold is requested. Expired holds are ignored when calculating availability. A periodic cleanup task can be added later to keep old rows tidy; correctness does not depend on that cleanup task running.

## Environment configuration

Create `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:3306/DATABASE
JWT_SECRET_KEY=generate-a-random-secret-of-at-least-32-characters
ADMIN_EMAILS=admin@example.com
FRONTEND_URL=http://localhost:3000
```

Generate a secret locally:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use your real deployed database credentials only in your hosting provider's environment settings. Do not commit `.env` files, database passwords, or the signing secret.

Configure `NEXT_PUBLIC_API_URL` in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The `ADMIN_EMAILS` list is a server-side allowlist of email addresses that receive the admin role at registration. For production use, prefer an explicit, audited administrator provisioning process and do not expose the admin allowlist publicly.

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend requires a reachable MySQL database and the environment variables above. API docs are available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## API overview

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Signed-in user |
| GET | `/api/events` | Public |
| GET | `/api/events/{event_id}` | Public |
| POST | `/api/events` | Admin |
| POST | `/api/events/{event_id}/holds` | Signed-in user |
| DELETE | `/api/events/{event_id}/holds` | Signed-in user |
| POST | `/api/events/{event_id}/bookings` | Signed-in user with a valid hold |
| DELETE | `/api/bookings/{booking_id}` | Booking owner |
| GET/PATCH/DELETE | `/api/admin/...` | Admin |

Send the access token as:

```
Authorization: Bearer <access_token>
```

## Notes and limitations

- Email delivery is not configured; booking responses intentionally report `confirmation_sent: false`.
- Payment processing is not implemented in this phase. A seat hold is not a payment, and a confirmed booking is currently created when checkout is submitted.
- The current authentication token is stored in browser local storage by the sample frontend. For a public production service, prefer a hardened server-managed session or secure, HttpOnly cookie design, add rate limiting and password reset flows, and review CSRF and XSS protections.
- The app uses `Base.metadata.create_all` for convenience. Use versioned Alembic migrations for production deployments, and back up the database before applying schema changes.
- Existing deployments need the new environment variables and new tables before the new code is deployed. Do not deploy this branch to a production database until migrations and current-data compatibility have been checked.

## Original concurrency guarantee

The booking transaction and unique constraint on `(event_id, seat_id)` in `booking_seats` prevent duplicate confirmed bookings. The additional hold table serializes claims for an event-seat pair and allows the active hold to expire or be consumed by a booking.
