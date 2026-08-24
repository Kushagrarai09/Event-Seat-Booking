import { Booking, Event } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data.detail || "Something went wrong.");
  }

  return data;
}

export function getEvents() {
  return request<Event[]>("/api/events");
}

export function getEvent(id: number) {
  return request<Event>(`/api/events/${id}`);
}

export function createBooking(
  eventId: number,
  payload: { name: string; email: string; seat_ids: number[] }
) {
  return request<Booking>(`/api/events/${eventId}/bookings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function cancelBooking(bookingId: number, email: string) {
  return request<void>(
    `/api/bookings/${bookingId}?email=${encodeURIComponent(email)}`,
    { method: "DELETE" }
  );
}

export function cancelAdminBooking(bookingId: number) {
  return request<void>(`/api/admin/bookings/${bookingId}`, { method: "DELETE" });
}

export function cancelAdminEvent(eventId: number) {
  return request<void>(`/api/admin/events/${eventId}`, { method: "DELETE" });
}

export function createEvent(payload: {
  name: string;
  category: string;
  venue: string;
  event_date: string;
  description?: string;
  rows: number;
  columns: number;
}) {
  return request<Event>("/api/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAdminSummary(eventId: number) {
  return request<{
    total_seats: number;
    booked_seats: number;
    available_seats: number;
    blocked_seats: number;
  }>(`/api/admin/events/${eventId}/summary`);
}

export function getAdminBookings(eventId: number) {
  return request<Booking[]>(`/api/admin/events/${eventId}/bookings`);
}

export function updateSeatBlock(
  eventId: number,
  seatId: number,
  blocked: boolean
) {
  return request(`/api/admin/events/${eventId}/seats/${seatId}`, {
    method: "PATCH",
    body: JSON.stringify({ blocked }),
  });
}
