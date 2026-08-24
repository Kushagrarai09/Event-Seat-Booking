from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.booking import Booking, BookingSeat
from app.models.event import Event
from app.models.seat import Seat
from app.schemas.booking import BookingCreate


def create_booking(
    db: Session,
    event_id: int,
    payload: BookingCreate,
) -> Booking:
    if len(payload.seat_ids) != len(set(payload.seat_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate seat IDs were provided.",
        )

    requested_ids = sorted(payload.seat_ids)

    event = db.execute(
        select(Event).where(Event.id == event_id)
    ).scalar_one_or_none()

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )

    try:
        # The transaction begins implicitly when the first DB operation occurs.
        # FOR UPDATE locks the requested seat rows until commit/rollback.
        seats = db.execute(
            select(Seat)
            .where(
                Seat.event_id == event_id,
                Seat.id.in_(requested_ids),
            )
            .order_by(Seat.id)
            .with_for_update()
        ).scalars().all()

        if len(seats) != len(requested_ids):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more seats do not belong to this event.",
            )

        blocked = [seat.label for seat in seats if seat.is_blocked]
        if blocked:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Blocked seats cannot be booked: {', '.join(blocked)}",
            )

        existing_bookings = db.execute(
            select(BookingSeat.seat_id)
            .where(
                BookingSeat.event_id == event_id,
                BookingSeat.seat_id.in_(requested_ids),
            )
        ).scalars().all()

        if existing_bookings:
            booked_map = {seat.id: seat.label for seat in seats}
            labels = [booked_map[sid] for sid in existing_bookings]
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "One or more selected seats were just booked: "
                    + ", ".join(labels)
                ),
            )

        booking = Booking(
            event_id=event_id,
            booker_name=payload.name.strip(),
            booker_email=str(payload.email).lower(),
        )
        db.add(booking)
        db.flush()

        for seat in seats:
            db.add(
                BookingSeat(
                    booking_id=booking.id,
                    event_id=event_id,
                    seat_id=seat.id,
                )
            )

        db.commit()

        db.refresh(booking)
        return booking

    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        # The UNIQUE(event_id, seat_id) constraint is our database-level
        # final safeguard against a duplicate booking.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more selected seats were just booked by another user.",
        )
