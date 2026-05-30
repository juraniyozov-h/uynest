import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// @ts-ignore: allow side-effect CSS import when no declaration file is present
import "./index.css";
import "./i18n";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
