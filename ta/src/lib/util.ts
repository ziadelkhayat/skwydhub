export const fmtDate = (v?: string | null) => { if (!v) return "—"; const d = new Date(v); return isNaN(+d) ? "—" : `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`; };
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
export const ls = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off */ } },
};
/** The current portal (still the full product while sections move over). */
export const OLD_PORTAL = "https://portal.skwydhub.com/";
import { peek } from "./db";
/** company settings (currency, decimals) like the current portal */
export const coSet = (): any => peek("settings").find(r => r.id === "company") || {};
export const money = (n: any) => { const c = coSet(); const dec = c.priceDecimals === 0 || c.priceDecimals === "0" ? 0 : +c.priceDecimals || 2;
  const sym = String(c.currencySymbol || "").trim() || c.currency || "USD"; const v = (+n || 0).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return /[\p{L}.]$/u.test(sym) ? sym + " " + v : sym + v; };
export const fmtDateTime = (v?: string | null) => { if (!v) return "—"; const d = new Date(v); return isNaN(+d) ? "—" : fmtDate(v) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };
export const sym = () => { const c = coSet(); return String(c.currencySymbol || "").trim() || c.currency || "USD"; };

// open a page of the portal in its own browser tab / window (detail pages: orders, customers, items…)
// opens a page of the portal in this same window (detail pages used to open a new window)
// A list and its record page count as one page (Orders ↔ an order, Items ↔ an item…).
const FAMILY: string[][] = [["/orders", "/order"], ["/customers", "/customer"], ["/products", "/item"], ["/branches", "/store"], ["/users", "/employee"], ["/brands", "/brand"],
  ["/modifiers", "/modifier"], ["/modifier-options", "/option"], ["/suppliers", "/supplier"], ["/inv-items", "/inv-item"], ["/warehouses", "/warehouse"], ["/call-center", "/call-center-order"],
  ["/inventory-reports", "/inv-levels", "/inv-history", "/purchasing"], ["/companies", "/company"]];
const familyOf = (path: string) => { const base = (path.split("?")[0] || "/").replace(/\/$/, "") || "/"; return (FAMILY.find(f => f.includes(base)) || [base])[0]; };
/** is `path` part of the page that is open now? */
export const samePage = (path: string) => familyOf(path.startsWith("/") ? path : "/" + path) === familyOf(location.hash.replace(/^#/, "") || "/");
/** go to a page: in this window when it belongs to the page that is open, otherwise in a new window (the page you are on stays open) */
export const openWin = (path: string) => { const p = path.startsWith("/") ? path : "/" + path;
  if (samePage(p)) location.hash = p; else window.open(location.pathname + location.search + "#" + p, "_blank", "noopener"); };
