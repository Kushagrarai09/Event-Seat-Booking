from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.booking import Booking, BookingSeat
from app.models.event import Event
from app.models.seat import Seat
from app.schemas.booking import (
    AdminSummary,
    BlockSeatRequest,
    BookingListItem,
)
from app.services.booking_service import cancel_booking, cancel_event

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_admin_event(event_id: int, db: Session = Depends(get_db)):
    cancel_event(db, event_id)


@router.get(
    "/events/{event_id}/summary",
    response_model=AdminSummary,
)
def event_summary(event_id: int, db: Session = Depends(get_db)):
    event = db.execute(
        select(Event).where(Event.id == event_id)
    ).scalar_one_or_none()

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")

    total = db.scalar(
        select(func.count(Seat.id)).where(Seat.event_id == event_id)
    ) or 0

    blocked = db.scalar(
        select(func.count(Seat.id)).where(
            Seat.event_id == event_id,
            Seat.is_blocked.is_(True),
        )
    ) or 0

    booked = db.scalar(
        select(func.count(BookingSeat.id)).where(
            BookingSeat.event_id == event_id
        )
    ) or 0

    return AdminSummary(
        total_seats=total,
        booked_seats=booked,
        available_seats=total - blocked - booked,
        blocked_seats=blocked,
    )


@router.get(
    "/events/{event_id}/bookings",
    response_model=list[BookingListItem],
)
def list_bookings(event_id: int, db: Session = Depends(get_db)):
    bookings = db.execute(
        select(Booking)
        .where(Booking.event_id == event_id)
        .order_by(Booking.booked_at.desc())
    ).scalars().all()

    result = []

    for booking in bookings:
        result.append(
            BookingListItem(
                id=booking.id,
                name=booking.booker_name,
                email=booking.booker_email,
                seat_labels=sorted(
                    item.seat.label for item in booking.booking_seats
                ),
                total_price=sum(item.seat.price for item in booking.booking_seats),
                booked_at=booking.booked_at,
            )
        )

    return result


@router.patch(
    "/events/{event_id}/seats/{seat_id}",
)
def update_seat_block(
    event_id: int,
    seat_id: int,
    payload: BlockSeatRequest,
    db: Session = Depends(get_db),
):
    seat = db.execute(
        select(Seat).where(
            Seat.id == seat_id,
            Seat.event_id == event_id,
        )
    ).scalar_one_or_none()

    if seat is None:
        raise HTTPException(status_code=404, detail="Seat not found.")

    if payload.blocked:
        already_booked = db.execute(
            select(BookingSeat).where(
                BookingSeat.event_id == event_id,
                BookingSeat.seat_id == seat_id,
            )
        ).scalar_one_or_none()

        if already_booked:
            raise HTTPException(
                status_code=409,
                detail="A booked seat cannot be blocked.",
            )

    seat.is_blocked = payload.blocked
    db.commit()

    return {
        "message": "Seat updated.",
        "seat_id": seat.id,
        "label": seat.label,
        "is_blocked": seat.is_blocked,
    }


@router.delete("/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_admin_booking(booking_id: int, db: Session = Depends(get_db)):
    cancel_booking(db, booking_id)
