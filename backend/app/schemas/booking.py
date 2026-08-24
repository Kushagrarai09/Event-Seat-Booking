from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class BookingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    seat_ids: list[int] = Field(min_length=1)


class BookingResponse(BaseModel):
    id: int
    event_id: int
    name: str
    email: EmailStr
    seat_labels: list[str]
    total_price: int
    booked_at: datetime
    confirmation_sent: bool


class BookingListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    seat_labels: list[str]
    total_price: int
    booked_at: datetime


class AdminSummary(BaseModel):
    total_seats: int
    booked_seats: int
    available_seats: int
    blocked_seats: int


class BlockSeatRequest(BaseModel):
    blocked: bool
