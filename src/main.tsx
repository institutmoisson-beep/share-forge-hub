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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      return undefined;
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
