# Event Seat Booking System

A full-stack event seat booking platform built for the NeuBitAt Full-Stack Development Internship assignment.

## Stack

- Frontend: Next.js + TypeScript
- Backend: FastAPI + SQLAlchemy
- Database: MySQL
- Deployment target: Vercel + Railway + MySQL

## Core design

The most important requirement is concurrency-safe booking.

A booking request:

1. Starts a database transaction.
2. Sorts requested seat IDs.
3. Locks the corresponding seat rows with `SELECT ... FOR UPDATE`.
4. Verifies that all seats belong to the event and are not blocked.
5. Checks whether any requested seat is already booked.
6. Creates one booking plus all booking-seat records.
7. Commits only if every requested seat is available.
8. Rolls back everything and returns `409 Conflict` if any seat is unavailable.

A database `UNIQUE(event_id, seat_id)` constraint is the final protection against duplicate bookings.

This makes multi-seat booking atomic: if one requested seat is unavailable, none of the requested seats are booked.

## Project structure

```text
event-seat-booking/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── database.py
│   │   └── main.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── .env.local.example
│   └── package.json
└── README.md
```

## Backend setup

Create a MySQL database:

```sql
CREATE DATABASE event_booking;
```

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

and update the database credentials.

Then:

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```



API docs:

```text
http://localhost:8000/docs
```

## Frontend setup

```bash
cd frontend
npm install
```

Copy:

```text
frontend/.env.local.example
```

to:

```text
frontend/.env.local
```

Then:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

## Main API endpoints

```text
POST   /api/events
GET    /api/events
GET    /api/events/{event_id}
POST   /api/events/{event_id}/bookings

GET    /api/admin/events/{event_id}/summary
GET    /api/admin/events/{event_id}/bookings
PATCH  /api/admin/events/{event_id}/seats/{seat_id}
```

## Concurrency test

Open two terminals and send booking requests for the same seat as close together as possible.

Expected:

```text
Request A -> 201 Created
Request B -> 409 Conflict
```

The database must contain exactly one booking for that event-seat pair.

For a multi-seat request such as `[1, 2, 3]`, if seat `2` is already booked, the entire request fails and seats `1` and `3` are not booked by that request.

## Important design decisions

### Why derive booked state from bookings?

`seats.is_blocked` represents an administrative block. Booking state is represented by `booking_seats`.

Therefore:

```text
blocked = seats.is_blocked
booked = booking_seats exists
available = not blocked and not booked
```

This avoids duplicating mutable booking state in the seats table.

### Why `booking_seats`?

A booking can contain multiple seats. A separate join table lets one booking group multiple seats while still enforcing:

```text
UNIQUE(event_id, seat_id)
```

## Production notes

For deployment:

- Set `DATABASE_URL` on the backend.
- Set `NEXT_PUBLIC_API_URL` on the frontend.
- Configure FastAPI CORS for the deployed Vercel domain.
- Use a managed MySQL instance.
- Do not commit `.env` files.
