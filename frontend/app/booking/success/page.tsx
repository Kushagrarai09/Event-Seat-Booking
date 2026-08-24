"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function BookingSuccessPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("lastBooking");
    if (stored) setData(JSON.parse(stored));
  }, []);

  if (!data) {
    return (
      <div className="container section">
        <p>No recent booking found.</p>
        <Link className="button primary" href="/events">Browse Events</Link>
      </div>
    );
  }

  const { booking, event } = data;

  return (
    <div className="container section narrow">
      <div className="success-card">
        <div className="success-icon">✓</div>
        <p className="eyebrow">BOOKING CONFIRMED</p>
        <h1>Your seats are secured.</h1>

        <div className="ticket">
          <h2>{event?.name || "Event"}</h2>
          <p>{event?.venue}</p>
          <p>{event?.event_date ? new Date(event.event_date).toLocaleString() : ""}</p>

          <hr />

          <p><strong>Booking ID:</strong> #{booking.id}</p>
          <p><strong>Name:</strong> {booking.name}</p>
          <p><strong>Email:</strong> {booking.email}</p>
          <p><strong>Seats:</strong> {booking.seat_labels.join(", ")}</p>
          <p><strong>Total:</strong> ₹{booking.total_price}</p>
        </div>

        <Link className="button primary full" href="/events">
          Book Another Event
        </Link>
      </div>
    </div>
  );
}
