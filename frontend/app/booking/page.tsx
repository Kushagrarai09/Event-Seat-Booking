"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, createBooking, getAccessToken, getEvent } from "../../lib/api";
import { Event } from "../../lib/types";

type Draft = { eventId: number; seatIds: number[]; seatLabels: string[]; holdExpiresAt?: string };

export default function BookingPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!getAccessToken()) { router.replace("/login"); return; }
    const stored = sessionStorage.getItem("bookingDraft");
    if (!stored) { router.replace("/events"); return; }
    try {
      const parsed = JSON.parse(stored) as Draft;
      if (!parsed.eventId || !Array.isArray(parsed.seatIds) || parsed.seatIds.length === 0 || !parsed.holdExpiresAt) throw new Error("Invalid booking draft");
      setDraft(parsed);
      const updateRemaining = () => setRemaining(Math.max(0, Math.ceil((new Date(parsed.holdExpiresAt!).getTime() - Date.now()) / 1000)));
      updateRemaining(); const timer = window.setInterval(updateRemaining, 1000);
      getEvent(parsed.eventId).then(setEvent).catch(err => setError(err.message));
      return () => window.clearInterval(timer);
    } catch { sessionStorage.removeItem("bookingDraft"); router.replace("/events"); }
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!draft || remaining <= 0) { setError("Your seat hold has expired. Please select seats again."); return; }
    setSubmitting(true); setError("");
    try {
      const booking = await createBooking(draft.eventId, { name, email, seat_ids: draft.seatIds });
      sessionStorage.setItem("lastBooking", JSON.stringify({ booking, event }));
      sessionStorage.removeItem("bookingDraft"); router.push("/booking/success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) { sessionStorage.removeItem("bookingDraft"); router.replace(`/events/${draft.eventId}/seats?conflict=1`); return; }
      setError(err instanceof Error ? err.message : "Booking failed. Please try again.");
    } finally { setSubmitting(false); }
  }

  if (!draft || !event) return <div className="container section"><p>Loading booking...</p>{error && <p className="error">{error}</p>}</div>;
  return <div className="container section narrow">
    <p className="eyebrow">CHECKOUT</p><h1>Complete your booking</h1>
    <div className="checkout-card"><h2>{event.name}</h2><p>{event.venue}</p><p>{new Date(event.event_date).toLocaleString()}</p>
      <div className="checkout-seats">{draft.seatLabels.map(label => <span key={label}>{label}</span>)}</div>
      <div className="selection-total"><span>{draft.seatIds.length} seats</span><strong>₹{event.seats?.filter(seat => draft.seatIds.includes(seat.id)).reduce((total, seat) => total + seat.price, 0)}</strong></div>
      <p className={remaining <= 30 ? "error" : "muted"}>Seat hold expires in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
    </div>
    <form className="form-card" onSubmit={submit}>
      <label>Full name<input required minLength={2} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>
      <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
      {error && <div className="error-box"><strong>Booking failed</strong><p>{error}</p></div>}
      <button className="button primary full" disabled={submitting || remaining <= 0}>{submitting ? "Confirming..." : remaining <= 0 ? "Hold expired" : "Confirm Booking"}</button>
    </form>
  </div>;
}
