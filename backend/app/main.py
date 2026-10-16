from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 - import all models before create_all
from app.database import Base, engine, ensure_booking_seat_constraint, ensure_seat_price_column
from app.routers import admin, auth, bookings, events, holds

# Retained for simple local setup; production schema changes should use Alembic.
Base.metadata.create_all(bind=engine)
ensure_seat_price_column()
ensure_booking_seat_constraint()

app = FastAPI(
    title="Event Seat Booking API",
    version="2.0.0",
    description="Event booking API with role-based access and expiring seat holds.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"https://event-seat-booking.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(holds.router)
app.include_router(bookings.router)
app.include_router(bookings.user_router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": "Event Seat Booking API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
