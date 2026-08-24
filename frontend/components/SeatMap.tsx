"use client";

import { Seat } from "../lib/types";

type Props = {
  seats: Seat[];
  selectedIds: number[];
  onToggle: (seat: Seat) => void;
};

export default function SeatMap({
  seats,
  selectedIds,
  onToggle,
}: Props) {
  const rows = Array.from(
    new Set(seats.map((seat) => seat.row_label))
  );

  return (
    <div className="seat-map">
      <div className="stage">STAGE / SCREEN / FIELD</div>

      {rows.map((row) => (
        <div className="seat-row" key={row}>
          <span className="row-label">{row}</span>

          {seats
            .filter((seat) => seat.row_label === row)
            .map((seat) => {
              const selected = selectedIds.includes(seat.id);
              const unavailable = seat.is_booked || seat.is_blocked;

              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => onToggle(seat)}
                  className={[
                    "seat",
                    seat.is_booked ? "booked" : "",
                    seat.is_blocked ? "blocked" : "",
                    selected ? "selected" : "",
                  ].join(" ")}
                  title={
                    seat.is_booked
                      ? `Booked - ${seat.label}`
                      : seat.is_blocked
                      ? `Blocked - ${seat.label}`
                      : selected
                      ? `Selected - ${seat.label} - ₹${seat.price}`
                      : `Available - ${seat.label} - ₹${seat.price}`
                  }
                  aria-label={`${seat.label}, ${seat.is_booked ? "booked" : seat.is_blocked ? "blocked" : selected ? "selected" : "available"}, ₹${seat.price}`}
                >
                  {seat.seat_number}
                </button>
              );
            })}
        </div>
      ))}

      <div className="legend">
        <span><i className="legend-dot available" /> Available</span>
        <span><i className="legend-dot selected-dot" /> Selected</span>
        <span><i className="legend-dot booked-dot" /> Booked</span>
        <span><i className="legend-dot blocked-dot" /> Blocked</span>
      </div>
    </div>
  );
}
