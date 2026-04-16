import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const manifestLink = document.createElement("link");
manifestLink.rel = "manifest";
manifestLink.href = "/manifest.webmanifest";
document.head.appendChild(manifestLink);

const themeColorMeta = document.createElement("meta");
themeColorMeta.name = "theme-color";
themeColorMeta.content = "#08101d";
document.head.appendChild(themeColorMeta);

// PWA Service Worker — only register in production, never in iframes/preview
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator && !isInIframe && !isPreviewHost) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
} else if ("serviceWorker" in navigator && (isInIframe || isPreviewHost)) {
  // Clean up any previously registered SW in preview
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);
