from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingSeat
from app.models.event import Event
from app.models.seat import Seat
from app.models.seat_hold import SeatHold
from app.schemas.booking import BookingCreate


def create_booking(db: Session, event_id: int, payload: BookingCreate, user_id: int | None = None) -> Booking:
    if len(payload.seat_ids) != len(set(payload.seat_ids)):
        raise HTTPException(status_code=400, detail="Duplicate seat IDs were provided.")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required to book seats.")
    requested_ids = sorted(payload.seat_ids)
    now = datetime.utcnow()
    try:
        event = db.execute(select(Event).where(Event.id == event_id)).scalar_one_or_none()
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        seats = db.execute(select(Seat).where(Seat.event_id == event_id, Seat.id.in_(requested_ids)).order_by(Seat.id).with_for_update()).scalars().all()
        if len(seats) != len(requested_ids):
            raise HTTPException(status_code=400, detail="One or more seats do not belong to this event.")
        blocked = [seat.label for seat in seats if seat.is_blocked]
        if blocked:
            raise HTTPException(status_code=409, detail=f"Blocked seats cannot be booked: {', '.join(blocked)}")
        existing_ids = set(db.execute(select(BookingSeat.seat_id).where(BookingSeat.event_id == event_id, BookingSeat.seat_id.in_(requested_ids))).scalars().all())
        if existing_ids:
            raise HTTPException(status_code=409, detail="One or more selected seats are already booked.")
        holds = db.execute(select(SeatHold).where(SeatHold.event_id == event_id, SeatHold.seat_id.in_(requested_ids)).order_by(SeatHold.seat_id).with_for_update()).scalars().all()
        holds_by_seat = {hold.seat_id: hold for hold in holds}
        invalid_ids = [sid for sid in requested_ids if sid not in holds_by_seat or holds_by_seat[sid].status != "active" or holds_by_seat[sid].expires_at <= now or holds_by_seat[sid].user_id != user_id]
        if invalid_ids:
            raise HTTPException(status_code=409, detail="Your seat hold has expired or is no longer valid. Select the seats again.")
        booking = Booking(event_id=event_id, booker_name=payload.name.strip(), booker_email=str(payload.email).lower())
        db.add(booking)
        db.flush()
        for seat in seats:
            db.add(BookingSeat(booking_id=booking.id, event_id=event_id, seat_id=seat.id))
        for hold in holds:
            hold.status = "consumed"
        db.commit()
        db.refresh(booking)
        return booking
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="One or more selected seats were just booked by another user.")
    except Exception:
        db.rollback()
        raise


def cancel_booking(db: Session, booking_id: int, email: str | None = None) -> None:
    booking = db.execute(select(Booking).where(Booking.id == booking_id).with_for_update()).scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if email is not None and booking.booker_email.lower() != email.lower():
        raise HTTPException(status_code=404, detail="Booking not found.")
    db.delete(booking)
    db.commit()


def cancel_event(db: Session, event_id: int) -> None:
    event = db.execute(select(Event).where(Event.id == event_id).with_for_update()).scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    db.delete(event)
    db.commit()
