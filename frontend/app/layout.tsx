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
      <head><title>SeatFlow | Discover events. Secure your seat.</title><meta name="description" content="Discover events, choose your seats, and book with confidence on SeatFlow." /></head>
      <body>
        <header className="navbar">
          <Link href="/" className="brand">SEATFLOW</Link>
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
