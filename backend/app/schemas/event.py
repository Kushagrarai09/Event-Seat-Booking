from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EventCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    category: str = Field(default="EVENT", max_length=50)
    venue: str = Field(min_length=2, max_length=255)
    event_date: datetime
    description: str | None = None
    rows: int = Field(ge=1, le=26)
    columns: int = Field(ge=1, le=50)


class SeatResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    row_label: str
    seat_number: int
    label: str
    is_blocked: bool
    is_booked: bool


class EventListResponse(BaseModel):
    id: int
    name: str
    category: str
    venue: str
    event_date: datetime
    description: str | None
    total_seats: int
    available_seats: int
    booked_seats: int
    blocked_seats: int


class EventDetailResponse(EventListResponse):
    seats: list[SeatResponse]
