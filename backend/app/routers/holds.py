from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, get_current_user
from app.database import get_db
from app.models.booking import Booking, BookingSeat
from app.models.event import Event
from app.models.seat import Seat
from app.models.seat_hold import SeatHold

HOLD_MINUTES = 5
router = APIRouter(prefix="/api/events", tags=["Seat Holds"])


class HoldSeatsRequest(BaseModel):
    seat_ids: list[int] = Field(min_length=1, max_length=10)


class SeatHoldResponse(BaseModel):
    event_id: int
    seat_ids: list[int]
    expires_at: datetime
    hold_minutes: int


def _utcnow() -> datetime:
    # Keep naive UTC because the existing schema uses SQLAlchemy DateTime without timezone.
    return datetime.utcnow()


@router.post("/{event_id}/holds", response_model=SeatHoldResponse, status_code=status.HTTP_201_CREATED)
def hold_seats(event_id: int, payload: HoldSeatsRequest, db: Session = Depends(get_db), user: AuthenticatedUser = Depends(get_current_user)):
    seat_ids = sorted(set(payload.seat_ids))
    if len(seat_ids) != len(payload.seat_ids):
        raise HTTPException(status_code=400, detail="Duplicate seat IDs were provided.")
    now = _utcnow()
    expires_at = now + timedelta(minutes=HOLD_MINUTES)
    try:
        event = db.execute(select(Event).where(Event.id == event_id)).scalar_one_or_none()
        if event is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        seats = db.execute(select(Seat).where(Seat.event_id == event_id, Seat.id.in_(seat_ids)).order_by(Seat.id).with_for_update()).scalars().all()
        if len(seats) != len(seat_ids):
            raise HTTPException(status_code=400, detail="One or more seats do not belong to this event.")
        if any(seat.is_blocked for seat in seats):
            raise HTTPException(status_code=409, detail="One or more selected seats are blocked.")
        booked_ids = set(db.execute(select(BookingSeat.seat_id).where(BookingSeat.event_id == event_id, BookingSeat.seat_id.in_(seat_ids))).scalars().all())
        if booked_ids:
            raise HTTPException(status_code=409, detail="One or more selected seats are already booked.")
        holds = db.execute(select(SeatHold).where(SeatHold.event_id == event_id, SeatHold.seat_id.in_(seat_ids)).order_by(SeatHold.seat_id).with_for_update()).scalars().all()
        holds_by_seat = {hold.seat_id: hold for hold in holds}
        conflicts = [hold.seat_id for hold in holds if hold.status == "active" and hold.expires_at > now and hold.user_id != user.id]
        if conflicts:
            raise HTTPException(status_code=409, detail="One or more seats are temporarily held by another customer.")
        for seat_id in seat_ids:
            hold = holds_by_seat.get(seat_id)
            if hold is None:
                db.add(SeatHold(event_id=event_id, seat_id=seat_id, user_id=user.id, status="active", expires_at=expires_at))
            else:
                hold.user_id = user.id
                hold.status = "active"
                hold.expires_at = expires_at
        db.commit()
        return SeatHoldResponse(event_id=event_id, seat_ids=seat_ids, expires_at=expires_at, hold_minutes=HOLD_MINUTES)
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="The seats were just claimed by another customer. Please refresh and try again.")


@router.delete("/{event_id}/holds", status_code=status.HTTP_204_NO_CONTENT)
def release_holds(event_id: int, payload: HoldSeatsRequest, db: Session = Depends(get_db), user: AuthenticatedUser = Depends(get_current_user)):
    seat_ids = sorted(set(payload.seat_ids))
    now = _utcnow()
    holds = db.execute(select(SeatHold).where(SeatHold.event_id == event_id, SeatHold.seat_id.in_(seat_ids), SeatHold.user_id == user.id, SeatHold.status == "active").with_for_update()).scalars().all()
    for hold in holds:
        hold.status = "released"
        hold.expires_at = now
    db.commit()
