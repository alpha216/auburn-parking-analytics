export default function Legend() {
  return (
    <div className="legend">
      <div className="legend__null">
        <div className="legend__null-swatch" />
        No data
      </div>
      <div>
        <div className="legend__bar" />
        <div className="legend__labels">
          <span className="legend__label">0%</span>
          <span className="legend__label">25%</span>
          <span className="legend__label">50%</span>
          <span className="legend__label">75%</span>
          <span className="legend__label">100%</span>
        </div>
      </div>
    </div>
  );
}
