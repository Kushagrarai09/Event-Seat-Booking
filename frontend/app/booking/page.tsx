"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking, getEvent } from "../../lib/api";
import { Event } from "../../lib/types";

type Draft = {
  eventId: number;
  seatIds: number[];
  seatLabels: string[];
};

export default function BookingPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("bookingDraft");

    if (!stored) {
      router.push("/events");
      return;
    }

    const parsed: Draft = JSON.parse(stored);
    setDraft(parsed);

    getEvent(parsed.eventId)
      .then(setEvent)
      .catch((err) => setError(err.message));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;

    setSubmitting(true);
    setError("");

    try {
      const booking = await createBooking(draft.eventId, {
        name,
        email,
        seat_ids: draft.seatIds,
      });

      sessionStorage.setItem("lastBooking", JSON.stringify({
        booking,
        event,
      }));
      sessionStorage.removeItem("bookingDraft");

      router.push("/booking/success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Booking failed. Please refresh the seats."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft || !event) {
    return <div className="container section"><p>Loading booking...</p></div>;
  }

  return (
    <div className="container section narrow">
      <p className="eyebrow">CHECKOUT</p>
      <h1>Complete your booking</h1>

      <div className="checkout-card">
        <h2>{event.name}</h2>
        <p>{event.venue}</p>
        <p>{new Date(event.event_date).toLocaleString()}</p>

        <div className="checkout-seats">
          {draft.seatLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="selection-total">
          <span>{draft.seatIds.length} seats</span>
          <strong>₹{draft.seatIds.length * 800}</strong>
        </div>
      </div>

      <form className="form-card" onSubmit={submit}>
        <label>
          Full name
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kushagra Rai"
          />
        </label>

        <label>
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        {error && (
          <div className="error-box">
            <strong>Booking failed</strong>
            <p>{error}</p>
            <p>Please return to the seat map and select again.</p>
          </div>
        )}

        <button className="button primary full" disabled={submitting}>
          {submitting ? "Confirming..." : "Confirm Booking"}
        </button>
      </form>
    </div>
  );
}
