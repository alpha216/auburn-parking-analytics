import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <Link to="/" className="navbar__logo">
          α<span className="navbar__logo-cursor">_</span>
        </Link>
        <div className="navbar__divider" />
      </div>
      <div className="navbar__links">
        <Link
          to="/heatmap"
          className={`navbar__link ${location.pathname === "/heatmap" ? "navbar__link--active" : ""}`}
        >
          Heatmap
        </Link>
        <Link
          to="/parkingstat"
          className={`navbar__link ${location.pathname === "/parkingstat" ? "navbar__link--active" : ""}`}
        >
          EV Status
        </Link>
      </div>
    </nav>
  );
}
