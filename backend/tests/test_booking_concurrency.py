import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import pytest

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    pytest.skip("Set TEST_DATABASE_URL to run MySQL booking tests.", allow_module_level=True)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.booking import Booking, BookingSeat
from app.models.event import Event
from app.models.seat import Seat


@pytest.fixture(scope="module", autouse=True)
def database_schema():
    Base.metadata.create_all(bind=engine)
    yield


def create_event(seat_count: int) -> tuple[int, list[int]]:
    db = SessionLocal()
    try:
        event = Event(
            name="Concurrency Test",
            category="TEST",
            venue="Test Venue",
            event_date=datetime.utcnow() + timedelta(days=1),
            rows=1,
            columns=seat_count,
        )
        db.add(event)
        db.flush()
        seats = [
            Seat(event_id=event.id, row_label="A", seat_number=index)
            for index in range(1, seat_count + 1)
        ]
        db.add_all(seats)
        db.commit()
        return event.id, [seat.id for seat in seats]
    finally:
        db.close()


def delete_event(event_id: int) -> None:
    db = SessionLocal()
    try:
        event = db.get(Event, event_id)
        if event:
            db.delete(event)
            db.commit()
    finally:
        db.close()


def test_concurrent_booking_allows_one_request():
    event_id, seat_ids = create_event(1)
    try:
        def book():
            with TestClient(app) as client:
                return client.post(
                    f"/api/events/{event_id}/bookings",
                    json={
                        "name": "Concurrent User",
                        "email": "concurrent@example.com",
                        "seat_ids": seat_ids,
                    },
                ).status_code

        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = list(executor.map(lambda _: book(), range(2)))

        assert sorted(statuses) == [201, 409]

        db = SessionLocal()
        try:
            count = db.scalar(
                select(func.count(BookingSeat.id)).where(
                    BookingSeat.event_id == event_id,
                    BookingSeat.seat_id == seat_ids[0],
                )
            )
            assert count == 1
        finally:
            db.close()
    finally:
        delete_event(event_id)


def test_multi_seat_booking_rolls_back_when_one_seat_is_taken():
    event_id, seat_ids = create_event(3)
    try:
        with TestClient(app) as client:
            taken_response = client.post(
                f"/api/events/{event_id}/bookings",
                json={
                    "name": "First User",
                    "email": "first@example.com",
                    "seat_ids": [seat_ids[1]],
                },
            )
            assert taken_response.status_code == 201

            response = client.post(
                f"/api/events/{event_id}/bookings",
                json={
                    "name": "Second User",
                    "email": "second@example.com",
                    "seat_ids": seat_ids,
                },
            )
            assert response.status_code == 409

        db = SessionLocal()
        try:
            booked_seats = db.scalars(
                select(BookingSeat.seat_id).where(
                    BookingSeat.event_id == event_id
                )
            ).all()
            assert booked_seats == [seat_ids[1]]
            assert db.scalar(
                select(func.count(Booking.id)).where(
                    Booking.event_id == event_id
                )
            ) == 1
        finally:
            db.close()
    finally:
        delete_event(event_id)
