import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="hero">
        <div>
          <p className="eyebrow">MOVIES • SPORTS • CONCERTS • EVENTS</p>
          <h1>Book your next experience.</h1>
          <p className="hero-text">
            Discover events, choose your seats and complete an atomic,
            concurrency-safe booking.
          </p>
          <Link className="button primary" href="/events">
            Explore Events
          </Link>
        </div>
      </section>

      <section className="container section">
        <h2>Explore by category</h2>
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
