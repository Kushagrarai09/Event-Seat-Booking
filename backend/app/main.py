import os

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
    title="SeatFlow API",
    version="2.0.0",
    description="SeatFlow event booking API with role-based access and expiring seat holds.",
)

# FRONTEND_URL accepts a comma-separated list of exact browser origins.
# Keep localhost available for local development; configure the deployed
# SeatFlow frontend origin in the backend environment for production.
frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
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
    return {"message": "SeatFlow API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
