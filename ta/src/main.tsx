import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts";
import { I18nProvider } from "@/i18n";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { HashRouter } from "react-router";
import { AuthProvider } from "@/lib/auth";
import App from "./App.tsx";
import { lazy, Suspense } from "react";
// admin.skwydhub.com (and dev.admin) opens the Skwyd Hub admin instead of a business's back office
const ADMIN = /^(dev\.)?admin\./.test(location.hostname) || localStorage.getItem("skwydAdmin") === "1";
const AdminApp = lazy(() => import("./skwyd/admin/AdminApp"));
import "./index.css";

// addresses from the previous portal keep working: /orders, /items/prd_x, #orders… open the same page here (#/orders, #/item?id=prd_x)
(() => {
  const URL_IN: Record<string, string> = { items: "products", products: "inv-items", employees: "users", dashboard: "", company: "account", settings: "brands", tables: "branches" };
  const DETAIL: Record<string, string> = { products: "item", users: "employee", brands: "brand", branches: "store", suppliers: "supplier", "inv-items": "inv-item", warehouses: "warehouse", "modifier-options": "option" };
  const to = (path: string, search: string) => { const [a, id] = path.replace(/^\/+|\/+$/g, "").split("/"); if (!a) return "/"; const r = a in URL_IN ? URL_IN[a] : a;
    if (id && DETAIL[r]) return "/" + DETAIL[r] + "?id=" + encodeURIComponent(decodeURIComponent(id)); return "/" + r + (search || ""); };
  const { pathname, search, hash } = location, base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  if (rest && rest !== "/" && !/\.[a-z0-9]+$/i.test(rest) && !hash.startsWith("#/")) { history.replaceState(null, "", (base || "") + "/#" + to(rest, search)); return; }
  if (/^#[a-z]/i.test(hash) && !/^#(access_token|error|type)=/.test(hash)) history.replaceState(null, "", location.pathname + location.search + "#" + to(hash.slice(1).split("?")[0], hash.includes("?") ? "?" + hash.split("?")[1] : ""));
})();

// after an update, a page left open may ask for a page file the new version replaced: load the new version once
addEventListener("vite:preloadError", e => { e.preventDefault(); if (sessionStorage.getItem("skwyd-reloaded") !== "1") { sessionStorage.setItem("skwyd-reloaded", "1"); location.reload(); } });
setTimeout(() => sessionStorage.removeItem("skwyd-reloaded"), 10000);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <HelmetProvider>
          <I18nProvider>
            <TooltipProvider>
              {ADMIN ? <Suspense fallback={null}><AdminApp /></Suspense> : <AuthProvider>
                <App />
              </AuthProvider>}
            </TooltipProvider>
          </I18nProvider>
        </HelmetProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>,
);
