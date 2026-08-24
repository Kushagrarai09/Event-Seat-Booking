from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="EVENT")
    venue: Mapped[str] = mapped_column(String(255), nullable=False)
    event_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rows: Mapped[int] = mapped_column(Integer, nullable=False)
    columns: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    seats = relationship(
        "Seat",
        back_populates="event",
        cascade="all, delete-orphan",
    )

    bookings = relationship(
        "Booking",
        back_populates="event",
        cascade="all, delete-orphan",
    )
