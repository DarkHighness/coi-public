import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./utils/i18n";
import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global error handler to catch "MIME type" errors from script tags (capturing phase)
window.addEventListener(
  "error",
  (event) => {
    const errorMsg = event.message || "";
    if (
      typeof errorMsg === "string" &&
      errorMsg.includes("MIME type") &&
      errorMsg.includes("text/html")
    ) {
      console.error("Critical MIME type error detected. Unregistering SW and reloading...");
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
          // Force reload to clear stale cache
          window.location.reload();
        });
      }
    }
  },
  true, // Use capturing phase to catch resource loading errors
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((error) => {
        console.log("SW registration failed: ", error);
      });
  });
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
