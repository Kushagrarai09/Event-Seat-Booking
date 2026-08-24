from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    booker_name: Mapped[str] = mapped_column(String(255), nullable=False)
    booker_email: Mapped[str] = mapped_column(String(320), nullable=False)
    booked_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    event = relationship("Event", back_populates="bookings")
    booking_seats = relationship(
        "BookingSeat",
        back_populates="booking",
        cascade="all, delete-orphan",
    )


class BookingSeat(Base):
    __tablename__ = "booking_seats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seat_id: Mapped[int] = mapped_column(
        ForeignKey("seats.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    booking = relationship("Booking", back_populates="booking_seats")
    seat = relationship("Seat")

    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "seat_id",
            name="uq_event_booked_seat",
        ),
    )
