from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Seat(Base):
    __tablename__ = "seats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    row_label: Mapped[str] = mapped_column(String(10), nullable=False)
    seat_number: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False, default=800)
    is_blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    event = relationship("Event", back_populates="seats")

    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "row_label",
            "seat_number",
            name="uq_event_seat_label",
        ),
    )

    @property
    def label(self) -> str:
        return f"{self.row_label}{self.seat_number}"
