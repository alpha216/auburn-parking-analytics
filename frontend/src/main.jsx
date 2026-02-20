import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App.jsx";
import HomePage from "./pages/HomePage.jsx";
import ParkingStat from "./pages/ParkingStat.jsx";
import Navbar from "./components/Navbar.jsx";

function Layout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/heatmap" element={<App />} />
        <Route
          path="/parking-stat"
          element={
            <Layout>
              <ParkingStat />
            </Layout>
          }
        />
      </Routes>
      <Analytics />
    </BrowserRouter>
  </StrictMode>,
);
