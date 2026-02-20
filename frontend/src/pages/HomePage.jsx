import { Link } from "react-router-dom";

const cards = [
  {
    title: "Heatmap Dashboard",
    description:
      "Visualize parking occupancy trends across lots and time ranges.",
    to: "/heatmap",
    icon: "🔥",
    gradient: "linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)",
  },
  {
    title: "Live Parking Status",
    description: "Real-time EV charging station availability at Auburn.",
    to: "/parking-stat",
    icon: "⚡",
    gradient: "linear-gradient(135deg, #0d47a1 0%, #42a5f5 100%)",
  },
];

export default function HomePage() {
  return (
    <div className="home">
      <div className="home__hero">
        <h1 className="home__title">Auburn Parking Analytics</h1>
        <p className="home__subtitle">
          Real-time data &amp; historical trends for campus parking
        </p>
      </div>

      <nav className="home__cards">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="home__card">
            <div
              className="home__card-icon"
              style={{ background: card.gradient }}
            >
              {card.icon}
            </div>
            <div className="home__card-body">
              <h2 className="home__card-title">{card.title}</h2>
              <p className="home__card-desc">{card.description}</p>
            </div>
            <span className="home__card-arrow">→</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
