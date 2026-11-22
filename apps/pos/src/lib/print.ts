// Receipts and kitchen tickets (pos.html receiptText / kitchenText) sent as raw ESC/POS to the printers set in
// Devices → Printers (network printers, port 9100). In the web preview there is no printer: the text is returned to show.
import RawPrinter from "../../modules/raw-printer";
import type { Data, Row } from "./db";
import { DEC, lineNet, money2 } from "./pos";

export type Printer = { id: string; name: string; kind: "receipt" | "kitchen" | "order"; conn: string; ip?: string; copies?: number; on?: boolean; cats?: string[] };
export const printers = (device: Row): Printer[] => { const s = device.settings || {}; if (Array.isArray(s.printers)) return s.printers;
  const l: Printer[] = []; if (s.receiptPrinter) l.push({ id: "p_r", name: "Receipt printer", kind: "receipt", conn: "network", ip: s.receiptPrinter, copies: 1, on: true });
  if (s.kitchenPrinter) l.push({ id: "p_k", name: "Kitchen printer", kind: "kitchen", conn: "network", ip: s.kitchenPrinter, copies: 1, on: true, cats: [] }); return l; };

const APP_DEF = { rcptInvoice: true, rcptCustomer: true, rcptTax: true, rcptSource: false, showOrderNo: true, showSubtotal: true, phoneOnPickup: true, printLang: "main", kitchenSort: "added" };
export const appSet = (S: Data, brandId?: string) => ({ ...APP_DEF, ...(S.settings.find(x => x.id === "app") || {}), ...(S.settings.find(x => x.id === "brand_" + (brandId || "")) || {}) }) as any;
const modLines = (i: any, hideFree?: boolean): string[] => {
  if (Array.isArray(i.options) && i.options.length) { const t: { name: string; n: number }[] = []; i.options.forEach((x: any) => { if (hideFree && !+x.price) return; const f = t.find(y => y.name === x.name); if (f) f.n++; else t.push({ name: x.name, n: 1 }); });
    return [...t.map(x => (x.n > 1 ? x.n + "× " : "") + x.name), ...(i.note ? ["Note: " + i.note] : [])]; }
  return String(i.mods || "").split(" · ").flatMap(p => (p.startsWith("Note: ") ? [p] : p.split(", "))).map(x => x.trim()).filter(Boolean);
};
const W = 32, ctr = (t: string) => t.slice(0, W).padStart((W + Math.min(W, t.length)) / 2), row = (a: string, b: string) => a.slice(0, W - b.length - 1).padEnd(W - b.length) + b;
const when = (t: string) => { const d = new Date(t), z = (n: number) => String(n).padStart(2, "0"); return `${z(d.getDate())}-${z(d.getMonth() + 1)}-${d.getFullYear()} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()}`; };
const inv = (n: any) => (n ? String(n).padStart(6, "0") : "");

export function receiptText(S: Data, branch: Row | null, o: Row) {
  const a = appSet(S, branch?.brandId), dec = DEC(S), co: any = S.settings.find(x => x.id === "company") || {}, sym = String(co.currencySymbol || co.currency || "USD").trim();
  const typ = o.type === "dinein" ? "In-Store" + (o.table ? " T" + o.table : "") : o.type === "pickup" || o.type === "takeaway" ? "Pickup" : "Delivery";
  const brand = (S.brands.find(b => b.id === branch?.brandId)?.name || "skwyd hub").toUpperCase(), net = (+o.total || 0) - (+o.tax || 0);
  const L: string[] = [ctr(brand), ctr(branch?.name || "")];
  String(a.receiptHeader || branch?.settings?.receiptHeader || "").split("\n").map(l => l.trim()).filter(Boolean).forEach(l => L.push(ctr(l)));
  const tax = branch?.taxNumber || co.taxNumber; if (tax) L.push(ctr("VAT No. " + tax)); if (branch?.phone) L.push(ctr("Tel " + branch.phone));
  L.push("");
  if (a.invoiceTitle && o.status !== "refund") L.push(ctr(a.invoiceTitle), "");
  if (o.status === "refund") L.push(ctr("*** REFUND ***"));
  L.push(a.showOrderNo === false ? typ : row("Order " + (o.no || "—"), typ));
  if (o.ref) L.push("Ref " + o.ref); if (a.rcptInvoice && o.invoiceNo) L.push("Check " + inv(o.invoiceNo));
  if (a.rcptSource && o.source) L.push("Source: " + o.source); if (o.type === "dinein" && +o.guests) L.push("Guests: " + o.guests);
  if (a.rcptCustomer && (o.customerName || o.phone)) L.push([o.customerName, o.type === "pickup" && a.phoneOnPickup === false ? "" : o.phone].filter(Boolean).join(" · "));
  L.push(when(o.createdAt), "-".repeat(W));
  (o.items || []).forEach((i: any) => { if (i.voided) return; L.push(row(i.qty + " x " + i.name, lineNet(i).toFixed(dec))); modLines(i, a.hideFreeMods).forEach(m => L.push(("   - " + m).slice(0, W))); if (+i.disc) L.push("  discount -" + (+i.disc).toFixed(dec)); });
  L.push("-".repeat(W));
  if (+o.discount) L.push(row(o.discountType === "amt" ? "Discount" : "Discount " + o.discountPct + "%", "-" + (+o.discount).toFixed(dec)));
  (o.charges || []).filter((c: any) => +c.amount).forEach((c: any) => L.push(row(c.name, (+c.amount).toFixed(dec))));
  if (a.showSubtotal !== false) L.push(row("Subtotal", net.toFixed(dec)));
  if (a.rcptTax) L.push(row("Tax", (+o.tax || 0).toFixed(dec)));
  L.push(row("TOTAL " + sym, (+o.total || 0).toFixed(dec)));
  const t2 = money2(S, +o.total || 0); if (t2) L.push(row("", "= " + t2));
  if (o.payment) { const p = o.payment; L.push(row((o.status === "refund" ? "Refunded (" : "Paid (") + p.method + ")", Math.abs(+p.tendered || 0).toFixed(dec))); if (+p.change) L.push(row("Change", (+p.change).toFixed(dec))); }
  if (o.receiptNotes) L.push("", ...String(o.receiptNotes).split("\n").map(l => l.trim().slice(0, W)).filter(Boolean));
  L.push("", ...String(a.receiptFooter || branch?.settings?.receiptFooter || "Thank you!").split("\n").map(l => l.trim()).filter(Boolean).map(ctr));
  return L.join("\n");
}
// kitchen ticket: big order number, type, time, then each item with its modifiers (no prices)
export function kitchenText(o: Row) {
  const typ = o.type === "dinein" ? "IN-STORE" + (o.table ? " T" + o.table : "") : o.type === "pickup" || o.type === "takeaway" ? "PICKUP" : "DELIVERY";
  const L = [ctr("KITCHEN"), ctr("ORDER #" + (o.no || "—")), ctr(typ), ...(o.ref ? [ctr(o.ref)] : []), ...(o.source && o.channel !== "pos" ? [ctr(o.source)] : []), when(o.createdAt), "=".repeat(W)];
  (o.items || []).forEach((i: any) => { L.push((i.qty + " x " + i.name).slice(0, W)); modLines(i).forEach(m => L.push(("   - " + m).slice(0, W))); });
  L.push("=".repeat(W)); if (o.notes) L.push("NOTE: " + o.notes);
  return L.join("\n");
}
// a kitchen printer can be limited to some categories: it gets only those items
export function printerHas(S: Data, pr: Printer, it: any) {
  if (!(pr.cats || []).length) return true;
  const p = S.products.find(x => x.id === it.productId), root = p && (S.products.find(x => (x.variants || []).some((v: any) => v.productId === p.id)) || p);
  return (pr.cats || []).some(cid => { const c = S.categories.find(x => x.id === cid); if (!c || !root) return false; return c.channel ? (c.productIds || []).some((id: string) => id === root.id || id === p!.id) : root.categoryId === c.id; });
}
const b64 = (bytes: number[]) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.slice(i, i + 0x8000)); return btoa(s); };
const utf8 = (t: string) => Array.from(unescape(encodeURIComponent(t))).map(c => c.charCodeAt(0));
export const escpos = (text: string, copies = 1) => { const one = [0x1b, 0x40, ...utf8(text.replace(/\r/g, "") + "\n\n\n\n"), 0x1d, 0x56, 0x42, 0x00]; const all: number[] = []; for (let k = 0; k < Math.max(1, copies); k++) all.push(...one); return b64(all); };

// send a job to every printer of its kind; returns the problems (empty = printed) or, with no native printer, the text to show
export async function printJob(S: Data, device: Row, kind: "receipt" | "kitchen", make: (pr: Printer) => string | null): Promise<{ bad: string[]; preview?: string; n: number }> {
  const list = printers(device).filter(x => x.on !== false && (x.kind === kind || (kind === "receipt" && x.kind === "order")));
  if (!list.length) return { bad: ["No printer available. Add one in the back office: Manage → Devices → this device → Printers."], n: 0 };
  const jobs = list.map(pr => [pr, make(pr)] as const).filter(([, t]) => t);
  if (!RawPrinter) return { bad: [], preview: jobs.map(([, t]) => t).join("\n\n"), n: 0 };
  const bad: string[] = [];
  for (const [pr, t] of jobs) {
    if (pr.conn !== "network") { bad.push(`${pr.name}: ${pr.conn === "bluetooth" ? "Bluetooth" : pr.conn === "usb" ? "USB" : "built-in"} printers aren't supported yet (use a network printer)`); continue; }
    if (!String(pr.ip || "").trim()) { bad.push(`${pr.name}: no IP address set`); continue; }
    const [host, port] = String(pr.ip).trim().split(":");
    try { await RawPrinter.print(host, +port || 9100, escpos(t!, pr.copies || 1), 5000); } catch { bad.push(`${pr.name} (${pr.ip}) is unreachable. Check it's on and on the same network.`); }
  }
  return { bad, n: jobs.length };
}
