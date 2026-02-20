import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";

const LOTS = [
  {
    id: "stadium",
    name: "Stadium Deck",
    url: "https://api6.fopark-api.com/lot/occupancy?client_name=auburn&name=au-stdm-grg-lvl1",
    link: "https://app.au-parking.com/lots/au-stdm-grg-lvl1",
    evCoords: [
      "32.600559201904154,-85.48814522453688",
      "32.60053102304166,-85.48814664785039",
      "32.600503882656454,-85.48814530674588",
      "32.600475642272514,-85.48814396564137",
    ],
    color: {
      text: "text-blue-600",
      bg: "bg-blue-50",
      full: ["text-red-800", "bg-red-100"],
    },
    parse(data) {
      const statuses = data
        .filter((item) => this.evCoords.includes(item.coords))
        .map((item) => item.status);
      let occ = 0,
        ava = 0;
      for (const s of statuses) {
        s === 1 ? occ++ : ava++;
      }
      return { occ, ava };
    },
  },
  {
    id: "athletics",
    name: "Athletics Complex Deck",
    url: "https://api6.fopark-api.com/lot/occupancy?client_name=auburn&name=au-athletic-grg-lvl1",
    link: "https://app.au-parking.com/lots/au-athletic-grg-lvl1",
    color: {
      text: "text-green-600",
      bg: "bg-green-50",
      full: ["text-red-800", "bg-red-100"],
    },
    parse(data) {
      let txt = "";
      for (const item of data) txt += item.status;
      const slice = txt.substring(121, 125).split("");
      let occ = 0,
        ava = 0;
      for (const s of slice) {
        s === "1" ? occ++ : ava++;
      }
      return { occ, ava };
    },
  },
  {
    id: "haley",
    name: "Haley Deck",
    url: "https://api6.fopark-api.com/lot/occupancy?client_name=auburn&name=au-west2",
    link: "https://app.au-parking.com/lots/au-west2",
    evCoords: [
      "32.60308136711112,-85.50106216197128",
      "32.60305318310657,-85.50106213252354",
    ],
    color: {
      text: "text-purple-600",
      bg: "bg-purple-50",
      full: ["text-red-800", "bg-red-100"],
    },
    parse(data) {
      const statuses = data
        .filter((item) => this.evCoords.includes(item.coords))
        .map((item) => item.status);
      let occ = 0,
        ava = 0;
      for (const s of statuses) {
        s === 1 ? occ++ : ava++;
      }
      return { occ, ava };
    },
  },
];

export default function ParkingStat() {
  const [results, setResults] = useState({});
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchAll = useCallback(async () => {
    setLastUpdated(new Date().toLocaleTimeString());

    for (const lot of LOTS) {
      try {
        const res = await fetch(lot.url);
        if (!res.ok) throw new Error(res.statusText);
        const json = await res.json();
        const { occ, ava } = lot.parse(json.lot_status);
        setResults((prev) => ({
          ...prev,
          [lot.id]: { occ, ava, error: null },
        }));
      } catch (err) {
        console.error(`Error fetching ${lot.name}:`, err);
        setResults((prev) => ({
          ...prev,
          [lot.id]: { occ: 0, ava: 0, error: "Failed to load data." },
        }));
      }
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return (
    <>
      <Navbar />
      <div className="parking-stat">
        <header className="parking-stat__header">
          <h1 className="parking-stat__title">Auburn University Parking</h1>
          <p className="parking-stat__subtitle">
            Live availability of EV charging stations.
          </p>
        </header>

        <div className="parking-stat__cards">
          {LOTS.map((lot) => {
            const r = results[lot.id];
            const isFull = r && !r.error && r.ava === 0;
            return (
              <a
                key={lot.id}
                href={lot.link}
                target="_blank"
                rel="noopener noreferrer"
                className="parking-stat__card"
              >
                <h2 className="parking-stat__card-name">{lot.name}</h2>
                <div
                  className={`parking-stat__card-data ${isFull ? "parking-stat__card-data--full" : ""}`}
                  data-lot={lot.id}
                >
                  {!r ? (
                    <span className="parking-stat__dots">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  ) : r.error ? (
                    <span className="parking-stat__error">{r.error}</span>
                  ) : (
                    `${r.occ} occupied, ${r.ava} available`
                  )}
                </div>
              </a>
            );
          })}
        </div>

        <footer className="parking-stat__footer">
          Data is fetched live. Last updated: {lastUpdated}
        </footer>
      </div>
    </>
  );
}
