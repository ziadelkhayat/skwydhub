// Skwyd Hub admin (admin.skwydhub.com): the data every page shares, from rpc slick_pa_overview, and small helpers
// (the same lists and rules as hub.html: countries with dialing code and currency, business categories, modules, plan states).
import { sb } from "@/lib/supabase";
import { WORLD } from "@/lib/world";
import { createContext, useContext } from "react";

export const rpc = async <T = any>(fn: string, args?: Record<string, any>): Promise<T> => { const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(error.message); return data as T; };
export type Overview = { companies: any[]; settings: any; products: any[] };
export type Admin = { data: Overview; view: any; me: { email: string }; reload: () => Promise<void>; signOut: () => Promise<void> };
export const AdminCtx = createContext<Admin>(null as any);
export const useAdmin = () => useContext(AdminCtx);

export const money = (v: any, cur = "") => (cur ? cur + " " : "") + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dmy = (d: any) => { if (!d) return "—"; const x = new Date(d); return String(x.getDate()).padStart(2, "0") + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + x.getFullYear(); };
export const isoDay = (d: any) => { if (!d) return ""; const x = new Date(d); return new Date(+x - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const endOf = (iso: string) => iso ? iso + "T23:59:59" : null;
export const initials = (n: any) => String(n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

// countries (Lebanon first; Lebanon and Syria price in US dollars by default)
export const COUNTRIES: [string, string, string][] = (() => { const L = WORLD.map(([n, d, c]) => [n, d, n === "Lebanon" || n === "Syria" ? "USD" : c] as [string, string, string]).sort((a, b) => a[0].localeCompare(b[0]));
  const i = L.findIndex(x => x[0] === "Lebanon"); if (i > 0) L.unshift(...L.splice(i, 1)); return L; })();
export const CURRENCIES: [string, string][] = (() => { let codes = [...new Set(WORLD.map(c => c[2]).filter(Boolean))]; try { codes = [...new Set([...codes, ...(Intl as any).supportedValuesOf("currency")])]; } catch { /* old browser */ }
  let dn: Intl.DisplayNames | null = null; try { dn = new Intl.DisplayNames(["en"], { type: "currency" }); } catch { /* old browser */ }
  return codes.map(k => [k, `${(dn && dn.of(k)) || k} (${k})`] as [string, string]).sort((a, b) => a[1].localeCompare(b[1])); })();
export const CATEGORIES: [string, string[]][] = [["F&B", ["Food QSR", "Casual Dining", "Fine Dining", "Cafe", "Bakery & Pastry", "Cloud Kitchen", "Bar & Lounge", "Catering", "Food Truck"]], ["Retail", ["Grocery", "Butcher", "Supermarket", "Other retail"]], ["Services", ["Salon & Spa", "Laundry", "Other services"]]];
export const MODULES: [string, string][] = [["inventory", "Inventory"], ["marketing", "Marketing"], ["online_ordering", "Online Ordering"], ["marketplace", "Marketplace"], ["call_center", "Call Center"]];
export const STATE_LABEL: Record<string, string> = { trial: "Trial", active: "Active", grace: "Grace Period", locked: "Locked", none: "No Plan" };
export const STATE_COLOR: Record<string, "primary" | "success" | "warning" | "error" | "light"> = { trial: "primary", active: "success", grace: "warning", locked: "error", none: "light" };
const dialOf = (n: string) => (COUNTRIES.find(c => c[0] === n) || ["", ""])[1];
// "+96170123456" → Lebanon, "70123456" (the longest matching dialing code)
export const splitPhone = (v: any) => { const d = String(v || "").replace(/[^\d+]/g, ""); if (!d.startsWith("+")) return { country: "Lebanon", num: d };
  const c = [...COUNTRIES].sort((a, b) => b[1].length - a[1].length).find(x => d.startsWith(x[1])); return c ? { country: c[0], num: d.slice(c[1].length) } : { country: "Lebanon", num: d }; };
export const fullPhone = (country: string, num: string) => { num = String(num || "").replace(/\D/g, "").replace(/^0+/, ""); return num ? dialOf(country) + num : ""; };

// an invoice, printed by the same page as the portal (invoice-doc.js at the site's root)
let docP: Promise<void> | null = null;
export const showInvoice = async (inv: any, settings: any, c: any) => {
  if (!(window as any).skwydInvoice) await (docP ||= new Promise((res, rej) => { const s = document.createElement("script"); s.src = "/invoice-doc.js?v=1"; s.onload = () => res(); s.onerror = () => { docP = null; rej(new Error("The invoice page couldn't load.")); }; document.head.appendChild(s); }));
  (window as any).skwydInvoice(inv, settings || {}, { name: c?.name ?? inv.company, accountNo: c?.account_no ?? inv.accountNo, email: c?.email, phone: c?.phone, country: c?.country });
};
