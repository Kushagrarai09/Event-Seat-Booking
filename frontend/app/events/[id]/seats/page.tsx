"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SeatMap from "../../../../components/SeatMap";
import { ApiError, getAccessToken, getEvent, getStoredUser, holdSeats } from "../../../../lib/api";
import { Event, Seat } from "../../../../lib/types";

export default function SeatSelectionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (searchParams.get("conflict") === "1") setError("A seat is no longer available. Review the updated seat map.");
    params.then(({ id }) => getEvent(Number(id)).then(setEvent).catch(err => setError(err.message)));
  }, [params, searchParams]);
  function toggleSeat(seat: Seat) { setSelectedIds(current => current.includes(seat.id) ? current.filter(id => id !== seat.id) : [...current, seat.id]); }
  async function continueBooking() {
    if (!event || selectedIds.length === 0) return;
    if (!getAccessToken()) { router.push(`/login?next=${encodeURIComponent(`/events/${event.id}/seats`)}`); return; }
    setBusy(true); setError("");
    try {
      const result = await holdSeats(event.id, selectedIds);
      const selectedSeats = event.seats?.filter(seat => selectedIds.includes(seat.id)) || [];
      sessionStorage.setItem("bookingDraft", JSON.stringify({ eventId: event.id, seatIds: selectedIds, seatLabels: selectedSeats.map(seat => seat.label), holdExpiresAt: result.expires_at }));
      router.push("/booking");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) router.push("/login");
      else setError(err instanceof Error ? err.message : "Unable to hold seats.");
      getEvent(event.id).then(setEvent).catch(() => undefined);
    } finally { setBusy(false); }
  }
  if (error && !event) return <div className="container section"><p className="error">{error}</p></div>;
  if (!event) return <div className="container section"><p>Loading seats...</p></div>;
  return <div className="container section">
    <div className="page-heading"><div><p className="eyebrow">SELECT SEATS</p><h1>{event.name}</h1><p>{event.venue} • {new Date(event.event_date).toLocaleString()}</p></div></div>
    {error && <div className="error-box">{error}</div>}
    <div className="booking-layout"><SeatMap seats={event.seats || []} selectedIds={selectedIds} onToggle={toggleSeat} />
      <aside className="selection-card"><h2>Your selection</h2>
        {selectedIds.length === 0 ? <p className="muted">Select available seats. A hold lasts five minutes.</p> : <>
          <div className="selected-list">{event.seats?.filter(seat => selectedIds.includes(seat.id)).map(seat => <div key={seat.id}><span>{seat.label} · ₹{seat.price}</span><button type="button" onClick={() => toggleSeat(seat)}>Remove</button></div>)}</div>
          <div className="selection-total"><span>{selectedIds.length} seats</span><strong>₹{event.seats?.filter(seat => selectedIds.includes(seat.id)).reduce((total, seat) => total + seat.price, 0)}</strong></div>
          <button className="button primary full" disabled={busy} onClick={continueBooking}>{busy ? "Reserving seats..." : "Hold seats & continue"}</button>
          {!getStoredUser() && <p className="muted">Sign in is required to hold seats.</p>}
        </>}
      </aside>
    </div>
  </div>;
}
