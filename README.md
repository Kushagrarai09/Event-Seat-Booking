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
DELETE /api/bookings/{booking_id}?email={email}

GET    /api/admin/events/{event_id}/summary
GET    /api/admin/events/{event_id}/bookings
PATCH  /api/admin/events/{event_id}/seats/{seat_id}
DELETE /api/admin/bookings/{booking_id}
DELETE /api/admin/events/{event_id}
```

## Concurrency test

Use this procedure to demonstrate the highest-weighted requirement during an
interview. Keep MySQL, FastAPI, and Next.js running in separate terminals.

### 1. Confirm both services are running

In PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-WebRequest http://localhost:3000/events -UseBasicParsing | Select-Object StatusCode
```

Expected output is backend `status: ok` and frontend status `200`.

### 2. Find an available event and seat

Run this from any PowerShell terminal. It selects the first event with an
available seat and prints the IDs needed by the booking request:

```powershell
$events = Invoke-RestMethod http://127.0.0.1:8000/api/events
$event = $events | Where-Object { $_.available_seats -gt 0 } | Select-Object -First 1
$detail = Invoke-RestMethod "http://127.0.0.1:8000/api/events/$($event.id)"
$seat = $detail.seats | Where-Object { -not $_.is_booked -and -not $_.is_blocked } | Select-Object -First 1

"event_id=$($event.id), seat_id=$($seat.id), seat_label=$($seat.label)"
```

Do not use a seat that is already booked or blocked. If no seat is available,
create a new event from `http://localhost:3000/admin/events/create`.

### 3. Send two booking requests concurrently

The following command starts two separate PowerShell jobs against the same
event and seat. Both requests use the same `seat_ids` value, but different
bookers:

```powershell
$url = "http://127.0.0.1:8000/api/events/$($event.id)/bookings"
$requests = @(
	@{ name = "Interviewer Request A"; email = "request-a@example.com"; seat_ids = @([int]$seat.id) },
	@{ name = "Interviewer Request B"; email = "request-b@example.com"; seat_ids = @([int]$seat.id) }
)

$jobs = foreach ($request in $requests) {
	$body = $request | ConvertTo-Json -Compress
	Start-Job -ScriptBlock {
		param($url, $body)
		try {
			$response = Invoke-WebRequest -Uri $url -Method Post -ContentType "application/json" -Body $body
			[pscustomobject]@{ Status = [int]$response.StatusCode; Body = $response.Content }
		} catch {
			$status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "No response" }
			$errorBody = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
			[pscustomobject]@{ Status = $status; Body = $errorBody }
		}
	} -ArgumentList $url, $body
}

$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job
$results | Format-List
```

Expected result:

```text
one response: Status = 201
one response: Status = 409
```

The `201` response contains the successful booking. The `409` response should
contain a clear message such as `One or more selected seats were just booked`.
There must never be two `201` responses.

### 4. Verify only one booking exists in MySQL

Use the credentials from `backend/.env` and the event and seat IDs printed in
step 2:

```sql
USE event_booking;

SELECT booking_id, event_id, seat_id
FROM booking_seats
WHERE event_id = <event_id> AND seat_id = <seat_id>;

SHOW CREATE TABLE booking_seats;
```

Expected database result:

- The first query returns exactly one row.
- `SHOW CREATE TABLE` contains `UNIQUE KEY uq_event_booked_seat (event_id,seat_id)`.

This proves that the result is protected by MySQL, not just by the frontend
seat map or a Python availability check.

### 5. Demonstrate atomic multi-seat booking

Refresh the event first so the seat list reflects the concurrency test result:

```powershell
$detail = Invoke-RestMethod "http://127.0.0.1:8000/api/events/$($event.id)"
```

Find three available seats from an event detail response:

```powershell
$threeSeats = @($detail.seats | Where-Object { -not $_.is_booked -and -not $_.is_blocked } | Select-Object -First 3)
$threeSeats | Select-Object id, label, price
```

Book the middle seat first:

```powershell
$takenBody = @{
	name = "Existing Booker"
	email = "existing@example.com"
	seat_ids = @([int]$threeSeats[1].id)
} | ConvertTo-Json

Invoke-RestMethod $url -Method Post -ContentType "application/json" -Body $takenBody
```

Now submit all three seats in one request:

```powershell
$allThreeBody = @{
	name = "Atomicity Demo"
	email = "atomic@example.com"
	seat_ids = @($threeSeats | ForEach-Object { [int]$_.id })
} | ConvertTo-Json

try {
	Invoke-WebRequest $url -Method Post -ContentType "application/json" -Body $allThreeBody
} catch {
	[int]$_.Exception.Response.StatusCode
	$_.ErrorDetails.Message
}
```

Expected result is `409 Conflict`. Query the database again and explain that
only the earlier middle-seat booking exists. The attempted atomic booking did
not create a booking for either of the other two seats.

### What to explain to the interviewer

Say: "The backend sorts all requested seat IDs and locks the corresponding seat
rows with `SELECT ... FOR UPDATE` in one transaction. It checks every seat
before inserting anything. The `UNIQUE(event_id, seat_id)` constraint is the
database-level final safeguard. If one seat loses a race, the transaction is
rolled back and the API returns 409, so a multi-seat request can never partially
book."

Automated MySQL verification uses an isolated test database:

```powershell
cd backend
$env:TEST_DATABASE_URL = "mysql+pymysql://user:password@localhost/event_booking_test"
python -m pytest tests/test_booking_concurrency.py -q
```

The backend startup also checks existing `booking_seats` tables and adds the
`UNIQUE(event_id, seat_id)` constraint when it is missing. Existing rows are
preserved; duplicate legacy rows must be resolved before that constraint can be added.

## How to Explain the Project

### Short project explanation

This is a full-stack event seat booking system. Users can browse events, view
the live seat map, select one or more seats, and complete a booking. Admins can
create events, block seats, view booking summaries, and inspect bookings.

The most important part of the project is that booking correctness is enforced
by the backend and MySQL, so two users cannot successfully reserve the same
event seat.

### How to explain the booking flow

1. The frontend loads the event and its current seat availability from FastAPI.
2. The user selects seats and submits their name, email, and seat IDs.
3. The backend sorts the seat IDs and locks those seat rows with
	`SELECT ... FOR UPDATE` inside one transaction.
4. It validates ownership, administrative blocks, and existing bookings.
5. It creates one booking and all of its `booking_seats` rows, then commits once.
6. If any seat is unavailable, the transaction rolls back and the API returns
	`409 Conflict`; no selected seat is partially booked.

### How to explain the database protection

The `booking_seats` table has a unique constraint on `(event_id, seat_id)`. This
means MySQL itself rejects a duplicate event-seat pair even if two requests
reach the application at the same time. The service catches that database
conflict, rolls back the transaction, and returns a clear 409 response instead
of exposing a raw SQL error or overwriting a booking.

Seat IDs are locked in sorted order to keep concurrent multi-seat requests
consistent and reduce deadlock risk. The database constraint is the final
source of truth; the frontend seat map is only a convenience for users and is
not treated as a booking guarantee.

### Features to mention

- Event creation with automatically generated rows and seats.
- Seat map showing available, selected, booked, and administratively blocked seats.
- Single-seat and atomic multi-seat bookings.
- Clear HTTP responses: `201` for success, `400` for invalid selections, `404`
  for missing events or seats, and `409` for booking conflicts.
- Admin event summaries and booking lists.
- Non-destructive startup schema check for the booking uniqueness constraint.
- Frontend conflict handling that clears stale selections, refreshes the seat
  map, and does not show a failed booking as successful.

### How to demonstrate concurrency in an interview

1. Start MySQL, the FastAPI backend, and the Next.js frontend.
2. Create or choose an event with an available seat, then note its `event_id`
	and `seat_id` from the seat map or API response.
3. Send two `POST /api/events/{event_id}/bookings` requests for that same seat
	at nearly the same time, using different names or email addresses.
4. Show that the responses are exactly one `201 Created` and one `409 Conflict`.
5. Explain that the successful transaction owns the unique event-seat row, while
	the losing transaction is rolled back.
6. For the atomicity demonstration, book one seat from `[A1, A2, A3]` first,
	then submit all three seats in a second request. The second request returns
	409, and the database contains no new booking for A1 or A3.

The automated version of this demonstration is in
`backend/tests/test_booking_concurrency.py` and requires an isolated
`TEST_DATABASE_URL`.

## Bonus Features

### Booking cancellation

Users can cancel the booking saved in their browser session from **My
Bookings**. The request includes the booking email as a lightweight ownership
check because this project does not include authentication. Admins can cancel
any booking from the event's booking list. Cancellation deletes the booking
and its related seat rows in one database transaction, making those seats
available again.

Admins can also cancel any created event from the admin dashboard. This removes
the event and its related seats, bookings, and booking-seat records through the
existing database cascade relationships. The dashboard asks for confirmation
before performing this destructive action.

### Seat price tiers

New events assign front-row seats a higher price (`₹1200`) and other rows the
standard price (`₹800`). Prices are stored on each seat, returned by the seat
map API, and summed from the selected seats for the booking total. Existing
databases receive the `seats.price` column with a default of `800` at startup.

### Mock booking confirmation

After a successful booking, the backend logs a mock confirmation email with the
booking ID, recipient, and seat labels. The response also includes
`confirmation_sent: true`, and the success page displays the booking total.
No external email provider or credentials are required.

## Evaluation Checklist and Known Limitations

- **Concurrency:** MySQL row locks, deterministic seat ordering, one transaction,
	and `UNIQUE(event_id, seat_id)` guarantee one winner for a contested seat.
- **Schema:** Events, seats, bookings, and normalized booking-seat records are
	connected with foreign keys and cascade cleanup.
- **API:** Resource-oriented event, booking, and admin endpoints use `201`,
	`204`, `400`, `404`, and `409` appropriately; unexpected database failures
	are not returned as raw SQL messages.
- **UI:** The seat map has an explicit legend, disabled booked/blocked seats,
	accessible status labels, price visibility, conflict refresh, and a simple
	checkout flow.
- **README:** Setup, schema choices, concurrency demonstration, tests, bonus
	features, and trade-offs are documented here.

Known limitations: the project has no authentication, so user cancellation
uses the booking email as a lightweight ownership check and admin routes are
not protected by login. The startup schema check is intentionally minimal and
non-destructive; duplicate legacy booking rows must be cleaned up before the
unique constraint can be added. Confirmation emails are logs only, not real
email delivery.

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
