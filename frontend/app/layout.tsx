"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./globals.css";
import { AuthUser, clearAuth, getStoredUser } from "../lib/api";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    setUser(getStoredUser());
    const sync = () => setUser(getStoredUser());
    window.addEventListener("storage", sync);
    window.addEventListener("event-auth-changed", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("event-auth-changed", sync); };
  }, []);
  function logout() { clearAuth(); setUser(null); window.dispatchEvent(new Event("event-auth-changed")); window.location.assign("/"); }
  return (
    <html lang="en">
      <head><title>Eventify - Event Seat Booking</title><meta name="description" content="Event booking with concurrency-safe seat reservations" /></head>
      <body>
        <header className="navbar">
          <Link href="/" className="brand">EVENTIFY</Link>
          <nav>
            <Link href="/events">Events</Link>
            {user && <Link href="/my-bookings">My Bookings</Link>}
            {user?.role === "admin" && <Link href="/admin">Admin</Link>}
            {!user ? <Link href="/login">Login</Link> : <button type="button" className="button secondary" onClick={logout}>Log out</button>}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
