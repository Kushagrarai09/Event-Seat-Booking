"use client";

import { useEffect, useState } from "react";
import { getAdminBookings, getEvent } from "../../../../../lib/api";
import { Booking, Event } from "../../../../../lib/types";

export default function AdminBookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [event, setEvent] = useState<Event | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    params.then(async ({ id }) => {
      const eventId = Number(id);
      const [eventData, bookingData] = await Promise.all([
        getEvent(eventId),
        getAdminBookings(eventId),
      ]);
      setEvent(eventData);
      setBookings(bookingData);
    });
  }, [params]);

  if (!event) {
    return <div className="container section"><p>Loading bookings...</p></div>;
  }

  return (
    <div className="container section">
      <p className="eyebrow">ADMIN / BOOKINGS</p>
      <h1>{event.name}</h1>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Seats</th>
              <th>Name</th>
              <th>Email</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>#{booking.id}</td>
                <td>{booking.seat_labels.join(", ")}</td>
                <td>{booking.name}</td>
                <td>{booking.email}</td>
                <td>{new Date(booking.booked_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bookings.length === 0 && (
        <div className="empty">No bookings yet.</div>
      )}
    </div>
  );
}
