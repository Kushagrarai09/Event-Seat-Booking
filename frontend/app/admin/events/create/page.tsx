"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "../../../../lib/api";

export default function CreateEventPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    category: "SPORTS",
    venue: "",
    event_date: "",
    description: "",
    rows: 8,
    columns: 10,
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(
    key: keyof typeof form,
    value: string | number
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const event = await createEvent(form);
      router.push(`/admin/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container section narrow">
      <p className="eyebrow">ADMIN</p>
      <h1>Create Event</h1>

      <form className="form-card" onSubmit={submit}>
        <label>
          Event name
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </label>

        <label>
          Category
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="MOVIE">Movie</option>
            <option value="SPORTS">Sports</option>
            <option value="CONCERT">Concert</option>
            <option value="EVENT">Event</option>
          </select>
        </label>

        <label>
          Venue
          <input
            required
            value={form.venue}
            onChange={(e) => update("venue", e.target.value)}
            placeholder="Wankhede Stadium"
          />
        </label>

        <label>
          Date and time
          <input
            required
            type="datetime-local"
            value={form.event_date}
            onChange={(e) => update("event_date", e.target.value)}
          />
        </label>

        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </label>

        <div className="two-column">
          <label>
            Rows
            <input
              type="number"
              min={1}
              max={26}
              value={form.rows}
              onChange={(e) => update("rows", Number(e.target.value))}
            />
          </label>

          <label>
            Seats per row
            <input
              type="number"
              min={1}
              max={50}
              value={form.columns}
              onChange={(e) => update("columns", Number(e.target.value))}
            />
          </label>
        </div>

        {error && <div className="error-box">{error}</div>}

        <button className="button primary full" disabled={saving}>
          {saving ? "Creating..." : "Create Event & Generate Seats"}
        </button>
      </form>
    </div>
  );
}
