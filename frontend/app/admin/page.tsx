"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEvents } from "../../lib/api";
import { Event } from "../../lib/types";

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    getEvents().then(setEvents).catch(console.error);
  }, []);

  return (
    <div className="container section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Dashboard</h1>
        </div>
        <Link className="button primary" href="/admin/events/create">
          Create Event
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Events</span>
          <strong>{events.length}</strong>
        </div>
        <div className="stat-card">
          <span>Total Seats</span>
          <strong>{events.reduce((a, e) => a + e.total_seats, 0)}</strong>
        </div>
        <div className="stat-card">
          <span>Booked</span>
          <strong>{events.reduce((a, e) => a + e.booked_seats, 0)}</strong>
        </div>
        <div className="stat-card">
          <span>Available</span>
          <strong>{events.reduce((a, e) => a + e.available_seats, 0)}</strong>
        </div>
      </div>

      <h2>Events</h2>

      <div className="admin-list">
        {events.map((event) => (
          <div className="admin-event" key={event.id}>
            <div>
              <span className="tag">{event.category}</span>
              <h3>{event.name}</h3>
              <p>{event.venue}</p>
            </div>

            <div className="admin-numbers">
              <span>Booked <strong>{event.booked_seats}</strong></span>
              <span>Available <strong>{event.available_seats}</strong></span>
              <span>Blocked <strong>{event.blocked_seats}</strong></span>
            </div>

            <div className="admin-actions">
              <Link href={`/admin/events/${event.id}`}>Manage</Link>
              <Link href={`/admin/events/${event.id}/bookings`}>Bookings</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
