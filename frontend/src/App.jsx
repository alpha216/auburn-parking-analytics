import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import HomePage from "./pages/HomePage.jsx";
import Heatmap from "./pages/Heatmap.jsx";
import ParkingStat from "./pages/ParkingStat.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/heatmap" element={<Heatmap />} />
        <Route path="/parkingstat" element={<ParkingStat />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
