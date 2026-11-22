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
export const fmtDateTime = (v?: string | null) => { if (!v) return "—"; const d = new Date(v); return isNaN(+d) ? "—" : fmtDate(v) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase(); };
export const sym = () => { const c = coSet(); return String(c.currencySymbol || "").trim() || c.currency || "USD"; };
