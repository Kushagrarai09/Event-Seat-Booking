from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import (
    Base,
    engine,
    ensure_booking_seat_constraint,
    ensure_seat_price_column,
)
from app.routers import admin, bookings, events

# For this assignment, create_all keeps local setup simple.
# In a production system, use Alembic migrations.
Base.metadata.create_all(bind=engine)
ensure_seat_price_column()
ensure_booking_seat_constraint()

app = FastAPI(
    title="Event Seat Booking API",
    version="1.0.0",
    description="Concurrency-safe event seat booking backend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(bookings.router)
app.include_router(bookings.user_router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {
        "message": "Event Seat Booking API",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
