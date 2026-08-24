import logging

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.booking_service import cancel_booking, create_booking

router = APIRouter(prefix="/api/events", tags=["Bookings"])
user_router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


@router.post(
    "/{event_id}/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
)
def book_seats(
    event_id: int,
    payload: BookingCreate,
    db: Session = Depends(get_db),
):
    booking = create_booking(db, event_id, payload)

    seat_labels = sorted(
        [item.seat.label for item in booking.booking_seats]
    )
    total_price = sum(item.seat.price for item in booking.booking_seats)

    logging.getLogger(__name__).info(
        "Mock booking confirmation email: booking_id=%s recipient=%s seats=%s",
        booking.id,
        booking.booker_email,
        ", ".join(seat_labels),
    )

    return BookingResponse(
        id=booking.id,
        event_id=booking.event_id,
        name=booking.booker_name,
        email=booking.booker_email,
        seat_labels=seat_labels,
        total_price=total_price,
        booked_at=booking.booked_at,
        confirmation_sent=True,
    )

@user_router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_user_booking(
    booking_id: int,
    email: str = Query(min_length=3),
    db: Session = Depends(get_db),
):
    cancel_booking(db, booking_id, email)
