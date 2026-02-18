import { useState, useRef, useEffect } from "react";

export default function Header({
  lots,
  selectedLots,
  toggleLot,
  dayRange,
  setDayRange,
  cellSize,
  setCellSize,
  startHour,
  endHour,
  setStartHour,
  setEndHour,
  dateRange,
}) {
  return (
    <header className="header">
      <h1 className="header__title">Auburn Parking Analytics</h1>
      <div className="header__controls">
        <LotSelector
          lots={lots}
          selectedLots={selectedLots}
          toggleLot={toggleLot}
        />
        <SimpleDropdown
          icon="📅"
          label={dayRange === "all" ? "All" : dayRange.toUpperCase()}
          options={[
            { value: "all", label: "All" },
            { value: "120d", label: "120D" },
            { value: "90d", label: "90D" },
            { value: "30d", label: "30D" },
            { value: "7d", label: "7D" },
          ]}
          value={dayRange}
          onChange={setDayRange}
        />
        <SimpleDropdown
          icon="⊞"
          label={cellSize}
          options={[
            { value: "5M", label: "5M" },
            { value: "15M", label: "15M" },
            { value: "30M", label: "30M" },
            { value: "1H", label: "1H" },
          ]}
          value={cellSize}
          onChange={setCellSize}
        />
        <TimeRangeSelector
          startHour={startHour}
          endHour={endHour}
          setStartHour={setStartHour}
          setEndHour={setEndHour}
        />
        {dateRange && (
          <span className="range-info">
            {dateRange.from} — {dateRange.to}
          </span>
        )}
      </div>
    </header>
  );
}

/* ---- Lot Selector (checkbox dropdown) ---- */
function LotSelector({ lots, selectedLots, toggleLot }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useClickOutside(ref, () => setOpen(false));

  const count = selectedLots.length;
  const label =
    count === lots.length
      ? "All Lots"
      : `${count} Lot${count !== 1 ? "s" : ""}`;

  return (
    <div className="control" ref={ref}>
      <button
        className={`control__button ${open ? "control__button--active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="control__icon">🅿</span>
        {label}
        <span
          className={`control__chevron ${open ? "control__chevron--open" : ""}`}
        >
        <svg xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 18 18" width="18" height="18">
          <path fill="currentColor" d="M3.92 7.83 9 12.29l5.08-4.46-1-1.13L9 10.29l-4.09-3.6-.99 1.14Z">
          </path></svg>
        </span>
      </button>
      {open && (
        <div className="dropdown">
          {lots.map((lot) => (
            <div
              key={lot}
              className="dropdown__item"
              onClick={() => toggleLot(lot)}
            >
              <div
                className={`dropdown__checkbox ${selectedLots.includes(lot) ? "dropdown__checkbox--checked" : ""}`}
              />
              {lot.replace(/_/g, " ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Simple Dropdown ---- */
function SimpleDropdown({ icon, label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="control" ref={ref}>
      <button
        className={`control__button ${open ? "control__button--active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="control__icon">{icon}</span>
        {label}
        <span
          className={`control__chevron ${open ? "control__chevron--open" : ""}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 18 18" width="18" height="18">
          <path fill="currentColor" d="M3.92 7.83 9 12.29l5.08-4.46-1-1.13L9 10.29l-4.09-3.6-.99 1.14Z">
          </path></svg>
        </span>
      </button>
      {open && (
        <div className="dropdown">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`dropdown__item ${opt.value === value ? "dropdown__item--selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Time Range Selector ---- */
function TimeRangeSelector({ startHour, endHour, setStartHour, setEndHour }) {
  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div
      className="control"
      style={{ display: "flex", gap: 4, alignItems: "center" }}
    >
      <span
        className="control__icon"
        style={{ fontSize: 14, color: "var(--text-secondary)", marginRight: 4 }}
      >
        🕐
      </span>
      <select
        className="control__button"
        value={startHour}
        onChange={(e) => setStartHour(Number(e.target.value))}
        style={{ appearance: "auto", paddingRight: 4 }}
      >
        {hours
          .filter((h) => h < endHour)
          .map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
      </select>
      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>–</span>
      <select
        className="control__button"
        value={endHour}
        onChange={(e) => setEndHour(Number(e.target.value))}
        style={{ appearance: "auto", paddingRight: 4 }}
      >
        {hours
          .filter((h) => h > startHour)
          .map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
      </select>
    </div>
  );
}

/* ---- Click-outside hook ---- */
function useClickOutside(ref, fn) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) fn();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, fn]);
}
