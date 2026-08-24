"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SeatMap from "../../../../components/SeatMap";
import { getEvent } from "../../../../lib/api";
import { Event, Seat } from "../../../../lib/types";
import { useSearchParams } from "next/navigation";

export default function SeatSelectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("conflict") === "1") {
      setError("One or more selected seats were just booked. Please choose again.");
    }

    params.then(({ id }) =>
      getEvent(Number(id))
        .then(setEvent)
        .catch((err) => setError(err.message))
    );
  }, [params, searchParams]);

  function toggleSeat(seat: Seat) {
    setSelectedIds((current) =>
      current.includes(seat.id)
        ? current.filter((id) => id !== seat.id)
        : [...current, seat.id]
    );
  }

  function continueBooking() {
    if (!event || selectedIds.length === 0) return;

    sessionStorage.setItem(
      "bookingDraft",
      JSON.stringify({
        eventId: event.id,
        seatIds: selectedIds,
        seatLabels: event.seats
          ?.filter((seat) => selectedIds.includes(seat.id))
          .map((seat) => seat.label) || [],
      })
    );

    router.push("/booking");
  }

  if (error) return <div className="container section"><p className="error">{error}</p></div>;
  if (!event) return <div className="container section"><p>Loading seats...</p></div>;

  return (
    <div className="container section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SELECT SEATS</p>
          <h1>{event.name}</h1>
          <p>{event.venue} • {new Date(event.event_date).toLocaleString()}</p>
        </div>
      </div>

      <div className="booking-layout">
        <SeatMap
          seats={event.seats || []}
          selectedIds={selectedIds}
          onToggle={toggleSeat}
        />

        <aside className="selection-card">
          <h2>Your selection</h2>

          {selectedIds.length === 0 ? (
            <p className="muted">Select one or more available seats.</p>
          ) : (
            <>
              <div className="selected-list">
                {event.seats
                  ?.filter((seat) => selectedIds.includes(seat.id))
                  .map((seat) => (
                    <div key={seat.id}>
                      <span>{seat.label} · ₹{seat.price}</span>
                      <button onClick={() => toggleSeat(seat)}>Remove</button>
                    </div>
                  ))}
              </div>

              <div className="selection-total">
                <span>{selectedIds.length} seats</span>
                <strong>₹{event.seats
                  ?.filter((seat) => selectedIds.includes(seat.id))
                  .reduce((total, seat) => total + seat.price, 0)}</strong>
              </div>

              <button
                className="button primary full"
                onClick={continueBooking}
              >
                Continue
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
