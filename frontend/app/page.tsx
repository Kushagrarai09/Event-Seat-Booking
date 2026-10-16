import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="hero">
        <div>
          <p className="eyebrow">MOVIES • SPORTS • CONCERTS • EVENTS</p>
          <h1>Discover events. Secure your seat.</h1>
          <p className="hero-text">
            From live music to match day, find your next experience and reserve your seats with confidence. SeatFlow is built around reliable seat reservations.
          </p>
          <Link className="button primary" href="/events">
            Explore Events
          </Link>
        </div>
      </section>

      <section className="container section">
        <h2>Find your kind of experience</h2>
        <div className="category-grid">
          {["Movies", "Sports", "Concerts", "Theatre"].map((category) => (
            <Link href="/events" className="category-card" key={category}>
              <span>{category === "Movies" ? "🎬" : category === "Sports" ? "🏟️" : category === "Concerts" ? "🎤" : "🎭"}</span>
              <strong>{category}</strong>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
