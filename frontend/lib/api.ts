import { Booking, Event } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "eventBookingAccessToken";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type AuthUser = { id: number; name: string; email: string; role: "user" | "admin" };
export type AuthResponse = { access_token: string; token_type: string; user: AuthUser };

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveAuth(response: AuthResponse): void {
  window.localStorage.setItem(TOKEN_KEY, response.access_token);
  window.localStorage.setItem("eventBookingUser", JSON.stringify(response.user));
}

export function clearAuth(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem("eventBookingUser");
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem("eventBookingUser");
    return value ? JSON.parse(value) as AuthUser : null;
  } catch { return null; }
}

async function request<T>(path: string, options?: RequestInit, authenticated = false): Promise<T> {
  const token = authenticated ? getAccessToken() : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.detail || "Something went wrong.");
  return data as T;
}

export function register(payload: { name: string; email: string; password: string }) {
  return request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
}
export function login(payload: { email: string; password: string }) {
  return request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
}
export function getMe() { return request<AuthUser>("/api/auth/me", undefined, true); }
export function getEvents() { return request<Event[]>("/api/events"); }
export function getEvent(id: number) { return request<Event>(`/api/events/${id}`); }
export function holdSeats(eventId: number, seatIds: number[]) {
  return request<{ event_id: number; seat_ids: number[]; expires_at: string; hold_minutes: number }>(`/api/events/${eventId}/holds`, { method: "POST", body: JSON.stringify({ seat_ids: seatIds }) }, true);
}
export function releaseHolds(eventId: number, seatIds: number[]) {
  return request<void>(`/api/events/${eventId}/holds`, { method: "DELETE", body: JSON.stringify({ seat_ids: seatIds }) }, true);
}
export function createBooking(eventId: number, payload: { name: string; email: string; seat_ids: number[] }) {
  return request<Booking>(`/api/events/${eventId}/bookings`, { method: "POST", body: JSON.stringify(payload) }, true);
}
export function cancelBooking(bookingId: number) {
  return request<void>(`/api/bookings/${bookingId}`, { method: "DELETE" }, true);
}
export function cancelAdminBooking(bookingId: number) { return request<void>(`/api/admin/bookings/${bookingId}`, { method: "DELETE" }, true); }
export function cancelAdminEvent(eventId: number) { return request<void>(`/api/admin/events/${eventId}`, { method: "DELETE" }, true); }
export function createEvent(payload: { name: string; category: string; venue: string; event_date: string; description?: string; rows: number; columns: number }) {
  return request<Event>("/api/events", { method: "POST", body: JSON.stringify(payload) }, true);
}
export function getAdminSummary(eventId: number) {
  return request<{ total_seats: number; booked_seats: number; available_seats: number; blocked_seats: number }>(`/api/admin/events/${eventId}/summary`, undefined, true);
}
export function getAdminBookings(eventId: number) { return request<Booking[]>(`/api/admin/events/${eventId}/bookings`, undefined, true); }
export function updateSeatBlock(eventId: number, seatId: number, blocked: boolean) {
  return request(`/api/admin/events/${eventId}/seats/${seatId}`, { method: "PATCH", body: JSON.stringify({ blocked }) }, true);
}
