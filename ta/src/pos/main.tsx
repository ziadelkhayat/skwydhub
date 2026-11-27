"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The POS web app (Tremor). Packaged as the Android POS with Capacitor; also opens in a browser (dev.pos.skwydhub.com).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { StoreProvider } from "./lib/store";
import { PosApp } from "./ui/PosApp";

// The POS runs as an Android app on 16:10 tablets (e.g. 1280 × 800). In a browser (testing only) it shows in a 16:10 frame
// as big as the window allows; the frame is the box every full-screen window and pop-up fills (transform makes it so).
// Everything is drawn a little smaller (zoom) so more fits on the tablet.
const Z = 0.9; document.documentElement.style.zoom = String(Z);
if (!(window as any).Capacitor?.isNativePlatform?.()) {
  const fit = () => {
    const W = innerWidth / Z, H = innerHeight / Z; let w = W, h = W / 1.6; if (h > H) { h = H; w = H * 1.6; }
    Object.assign(document.body.style, { width: w + "px", height: h + "px", margin: "0", left: (W - w) / 2 + "px", top: (H - h) / 2 + "px", transform: "translateZ(0)", position: "relative" });
    document.documentElement.style.background = "#111827";
  };
  fit(); addEventListener("resize", fit);
}

createRoot(document.getElementById("root")!).render(<StrictMode><StoreProvider><PosApp /></StoreProvider></StrictMode>);
