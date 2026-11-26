"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The POS web app (Tremor). Packaged as the Android POS with Capacitor; also opens in a browser (dev.pos.skwydhub.com).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { StoreProvider } from "./lib/store";
import { PosApp } from "./ui/PosApp";

createRoot(document.getElementById("root")!).render(<StrictMode><StoreProvider><PosApp /></StoreProvider></StrictMode>);
