from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, require_admin
from app.database import get_db
from app.models.booking import BookingSeat
from app.models.event import Event
from app.models.seat import Seat
from app.models.seat_hold import SeatHold
from app.schemas.event import EventCreate, EventDetailResponse, EventListResponse, SeatResponse

router = APIRouter(prefix="/api/events", tags=["Events"])


def event_to_response(db: Session, event: Event) -> EventDetailResponse:
    seats = db.execute(select(Seat).where(Seat.event_id == event.id).order_by(Seat.id)).scalars().all()
    booked_ids = set(db.execute(select(BookingSeat.seat_id).where(BookingSeat.event_id == event.id)).scalars().all())
    now = __import__("datetime").datetime.utcnow()
    active_hold_ids = set(db.execute(
        select(SeatHold.seat_id).where(
            SeatHold.event_id == event.id,
            SeatHold.status == "active",
            SeatHold.expires_at > now,
        )
    ).scalars().all())
    seat_responses = [
        SeatResponse(
            id=seat.id,
            row_label=seat.row_label,
            seat_number=seat.seat_number,
            label=seat.label,
            price=seat.price,
            is_blocked=seat.is_blocked,
            is_booked=(seat.id in booked_ids or seat.id in active_hold_ids),
        )
        for seat in seats
    ]
    blocked_count = sum(seat.is_blocked for seat in seats)
    unavailable_count = sum(seat.id in booked_ids or seat.id in active_hold_ids for seat in seats)
    return EventDetailResponse(
        id=event.id,
        name=event.name,
        category=event.category,
        venue=event.venue,
        event_date=event.event_date,
        description=event.description,
        total_seats=len(seats),
        available_seats=len(seats) - blocked_count - unavailable_count,
        booked_seats=len(booked_ids),
        blocked_seats=blocked_count,
        seats=seat_responses,
    )


@router.post("", response_model=EventDetailResponse, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, db: Session = Depends(get_db), _admin: AuthenticatedUser = Depends(require_admin)):
    event = Event(
        name=payload.name,
        category=payload.category.upper(),
        venue=payload.venue,
        event_date=payload.event_date,
        description=payload.description,
        rows=payload.rows,
        columns=payload.columns,
    )
    db.add(event)
    db.flush()
    for row_index in range(payload.rows):
        row_label = chr(ord("A") + row_index)
        for seat_number in range(1, payload.columns + 1):
            db.add(Seat(
                event_id=event.id,
                row_label=row_label,
                seat_number=seat_number,
                price=1200 if row_index < max(1, payload.rows // 3) else 800,
            ))
    db.commit()
    db.refresh(event)
    return event_to_response(db, event)


@router.get("", response_model=list[EventListResponse])
def list_events(db: Session = Depends(get_db)):
    events = db.execute(select(Event).order_by(Event.event_date)).scalars().all()
    result = []
    for event in events:
        seats = db.execute(select(Seat).where(Seat.event_id == event.id)).scalars().all()
        booked_ids = set(db.execute(select(BookingSeat.seat_id).where(BookingSeat.event_id == event.id)).scalars().all())
        now = __import__("datetime").datetime.utcnow()
        active_hold_ids = set(db.execute(
            select(SeatHold.seat_id).where(
                SeatHold.event_id == event.id,
                SeatHold.status == "active",
                SeatHold.expires_at > now,
            )
        ).scalars().all())
        blocked_count = sum(seat.is_blocked for seat in seats)
        unavailable_count = sum(seat.id in booked_ids or seat.id in active_hold_ids for seat in seats)
        result.append(EventListResponse(
            id=event.id,
            name=event.name,
            category=event.category,
            venue=event.venue,
            event_date=event.event_date,
            description=event.description,
            total_seats=len(seats),
            available_seats=len(seats) - blocked_count - unavailable_count,
            booked_seats=len(booked_ids),
            blocked_seats=blocked_count,
        ))
    return result


@router.get("/{event_id}", response_model=EventDetailResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.execute(select(Event).where(Event.id == event_id)).scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    return event_to_response(db, event)
