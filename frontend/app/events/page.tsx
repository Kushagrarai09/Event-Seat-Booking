"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getEvents } from "../../lib/api";
import { Event } from "../../lib/types";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        const matchesQuery =
          event.name.toLowerCase().includes(query.toLowerCase()) ||
          event.venue.toLowerCase().includes(query.toLowerCase());

        const matchesCategory =
          category === "ALL" || event.category === category;

        return matchesQuery && matchesCategory;
      }),
    [events, query, category]
  );

  return (
    <div className="container section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DISCOVER</p>
          <h1>Events</h1>
        </div>
      </div>

      <div className="filters">
        <input
          suppressHydrationWarning
          placeholder="Search events or venues..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          suppressHydrationWarning
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="ALL">All categories</option>
          <option value="MOVIE">Movies</option>
          <option value="SPORTS">Sports</option>
          <option value="CONCERT">Concerts</option>
          <option value="EVENT">Events</option>
        </select>
      </div>

      {loading && <p>Loading events...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty">No events found.</div>
      )}

      <div className="event-grid">
        {filtered.map((event) => (
          <article className="event-card" key={event.id}>
            <div className="event-cover">
              {event.category}
            </div>
            <div className="event-card-body">
              <span className="tag">{event.category}</span>
              <h2>{event.name}</h2>
              <p>{event.venue}</p>
              <p>{new Date(event.event_date).toLocaleString()}</p>
              <p className="availability">
                {event.available_seats} seats available
              </p>
              <Link
                className="button primary full"
                href={`/events/${event.id}`}
              >
                View Details
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
