import os

from dotenv import load_dotenv

from sqlalchemy import create_engine, inspect, text

from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=280,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_booking_seat_constraint() -> None:
    """Add the booking invariant to databases created before the model constraint."""
    inspector = inspect(engine)
    unique_constraints = inspector.get_unique_constraints("booking_seats")
    has_event_seat_constraint = any(
        set(constraint.get("column_names") or []) == {"event_id", "seat_id"}
        for constraint in unique_constraints
    )

    if not has_event_seat_constraint:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE booking_seats "
                    "ADD CONSTRAINT uq_event_booked_seat "
                    "UNIQUE (event_id, seat_id)"
                )
            )


def ensure_seat_price_column() -> None:
    columns = {column["name"] for column in inspect(engine).get_columns("seats")}
    if "price" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE seats ADD COLUMN price INTEGER NOT NULL DEFAULT 800")
            )