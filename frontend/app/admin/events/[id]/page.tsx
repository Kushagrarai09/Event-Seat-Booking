"use client";

import { useEffect, useState } from "react";
import { getEvent, getAdminSummary, updateSeatBlock } from "../../../../lib/api";
import { Event } from "../../../../lib/types";
import SeatMap from "../../../../components/SeatMap";

export default function AdminEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [event, setEvent] = useState<Event | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");

  async function load(id: number) {
    try {
      const [eventData, summaryData] = await Promise.all([
        getEvent(id),
        getAdminSummary(id),
      ]);
      setEvent(eventData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    }
  }

  useEffect(() => {
    params.then(({ id }) => load(Number(id)));
  }, [params]);

  async function toggleBlock() {
    if (!event || selected.length === 0) return;

    try {
      for (const seatId of selected) {
        const seat = event.seats?.find((s) => s.id === seatId);
        if (seat && !seat.is_booked) {
          await updateSeatBlock(event.id, seatId, !seat.is_blocked);
        }
      }
      setSelected([]);
      await load(event.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update seats.");
    }
  }

  function toggleSelection(seat: any) {
    if (seat.is_booked) return;

    setSelected((current) =>
      current.includes(seat.id)
        ? current.filter((id) => id !== seat.id)
        : [...current, seat.id]
    );
  }

  if (error) return <div className="container section"><p className="error">{error}</p></div>;
  if (!event) return <div className="container section"><p>Loading...</p></div>;

  return (
    <div className="container section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMIN / SEATS</p>
          <h1>{event.name}</h1>
          <p>{event.venue}</p>
        </div>

        <button
          className="button secondary"
          disabled={selected.length === 0}
          onClick={toggleBlock}
        >
          Block / Unblock Selected
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>Total</span><strong>{summary?.total_seats}</strong></div>
        <div className="stat-card"><span>Booked</span><strong>{summary?.booked_seats}</strong></div>
        <div className="stat-card"><span>Available</span><strong>{summary?.available_seats}</strong></div>
        <div className="stat-card"><span>Blocked</span><strong>{summary?.blocked_seats}</strong></div>
      </div>

      <p className="muted">
        Select seats to block or unblock. Booked seats cannot be blocked.
      </p>

      <SeatMap
        seats={event.seats || []}
        selectedIds={selected}
        onToggle={toggleSelection}
      />
    </div>
  );
}
