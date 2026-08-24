"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEvent } from "../../../lib/api";
import { Event } from "../../../lib/types";

export default function EventDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id }) =>
      getEvent(Number(id))
        .then(setEvent)
        .catch((err) => setError(err.message))
    );
  }, [params]);

  if (error) return <div className="container section"><p className="error">{error}</p></div>;
  if (!event) return <div className="container section"><p>Loading event...</p></div>;

  return (
    <div className="container section">
      <div className="event-detail-cover">
        <span>{event.category}</span>
        <h1>{event.name}</h1>
      </div>

      <div className="detail-grid">
        <div>
          <span className="tag">{event.category}</span>
          <h1>{event.name}</h1>
          <p className="lead">{event.description || "Join this event and choose your preferred seats."}</p>

          <div className="info-list">
            <p>📍 {event.venue}</p>
            <p>📅 {new Date(event.event_date).toLocaleDateString()}</p>
            <p>🕒 {new Date(event.event_date).toLocaleTimeString()}</p>
          </div>
        </div>

        <aside className="summary-card">
          <h2>Availability</h2>
          <strong>{event.available_seats}</strong>
          <span>seats available</span>
          <Link
            className="button primary full"
            href={`/events/${event.id}/seats`}
          >
            Select Seats
          </Link>
        </aside>
      </div>
    </div>
  );
}
