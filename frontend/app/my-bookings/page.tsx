"use client";

import { useEffect, useState } from "react";
import { cancelBooking } from "../../lib/api";

export default function MyBookingsPage() {
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("lastBooking");
    if (stored) setBooking(JSON.parse(stored));
  }, []);

  async function cancel() {
    if (!booking) return;
    try {
      await cancelBooking(booking.booking.id, booking.booking.email);
      sessionStorage.removeItem("lastBooking");
      setBooking(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel booking.");
    }
  }

  return (
    <div className="container section">
      <p className="eyebrow">ACCOUNT</p>
      <h1>My Bookings</h1>
      {error && <div className="error-box">{error}</div>}

      {!booking ? (
        <div className="empty">
          No booking found in this browser session.
        </div>
      ) : (
        <div className="booking-history-card">
          <span className="tag">CONFIRMED</span>
          <h2>{booking.event?.name}</h2>
          <p>{booking.event?.venue}</p>
          <p>
            {booking.event?.event_date
              ? new Date(booking.event.event_date).toLocaleString()
              : ""}
          </p>
          <p>
            Seats: <strong>{booking.booking.seat_labels.join(", ")}</strong>
          </p>
          <p>Booking #{booking.booking.id}</p>
          <button className="button secondary" onClick={cancel}>
            Cancel Booking
          </button>
        </div>
      )}
    </div>
  );
}
