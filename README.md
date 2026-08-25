# Event Seat Booking System

A full-stack event seat booking system built with:

- Next.js
- FastAPI
- MySQL
- Railway
- Vercel

## Live Demo

Frontend:
https://event-seat-booking-ten.vercel.app

Backend API:
https://backend-production-c281.up.railway.app

Swagger API Docs:
https://backend-production-c281.up.railway.app/docs

## GitHub

https://github.com/Kushagrarai09/Event-Seat-Booking

## Features

### Admin
- Create events
- Configure rows × columns seating
- Block/unblock seats
- View event booking summary
- View bookings
- Cancel events/bookings

### User
- Browse events
- View seat layout
- Select multiple seats
- Book seats
- Cancel bookings
- View booking information

## Tech Stack

Frontend:
Next.js

Backend:
FastAPI

Database:
MySQL

Deployment:
Vercel + Railway

## Database Design

Events
    ↓
Seats
    ↓
Bookings

Each event has multiple seats.

Each booking references an event and one or more seats.

A database-level unique constraint prevents the same
event seat from being booked more than once.

## Concurrency Handling

Concurrency handling is the core part of this project.

The booking operation is protected at the database level using
a transaction together with a unique constraint on:

(event_id, seat_id)

This prevents two concurrent requests from successfully
booking the same seat.

If two users attempt to book the same seat simultaneously:

Request 1 → SUCCESS
Request 2 → 409 CONFLICT

The second request receives a clear error instead of
silently overwriting the first booking.

## Atomic Multi-seat Booking

If a user selects multiple seats and even one seat becomes
unavailable during the booking operation, the complete
transaction is rolled back.

Therefore:

3 seats requested
↓
1 seat unavailable
↓
0 seats booked

rather than partially booking 2 seats.

## Concurrency Test

The concurrency behavior was tested by sending two
near-simultaneous booking requests for the same seat.

Expected result:

Request A → 200 SUCCESS
Request B → 409 CONFLICT

Only one booking is created.

## Local Setup

### Backend

cd backend

Create and activate virtual environment.

Install dependencies:

pip install -r requirements.txt

Run:

uvicorn app.main:app --reload

Backend:

http://localhost:8000

Swagger:

http://localhost:8000/docs

### Frontend

cd frontend

npm install

Create .env.local:

NEXT_PUBLIC_API_URL=http://localhost:8000

Run:

npm run dev

Frontend:

http://localhost:3000