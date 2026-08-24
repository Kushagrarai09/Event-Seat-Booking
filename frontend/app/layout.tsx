import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eventify - Event Seat Booking",
  description: "Concurrency-safe event seat booking platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="navbar">
          <Link href="/" className="brand">EVENTIFY</Link>
          <nav>
            <Link href="/events">Events</Link>
            <Link href="/my-bookings">My Bookings</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
