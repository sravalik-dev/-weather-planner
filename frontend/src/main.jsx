import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css";
import "./styles/AppTheme.css";
import "./styles/TravelTheme.css";
import App from "./App.jsx";
// Loaded last on purpose: colour/contrast fixes that must win over earlier CSS.
import "./styles/Readability.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);