// Reports: the five hubs (Sales, Inventory, Business, Employee, Analysis) and one report page with the same reports, columns, formulas,
// "Group By", brand / store / date filters, Export (CSV) and Print as the current portal. Route: /<hub>?r=<report>.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, BarChartIcon, DownloadIcon } from "@/icons";
import { useCol } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { money } from "@/lib/util";
import { cn } from "@/utils";
import { useEffect, useMemo, useState } from "react";
import { AreaChart } from "@/components/tremor/AreaChart";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { live } from "../crud/CrudPage";
import { RangeInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { SEL, TD, TH } from "../ui/kit";
import { csv, dmy, isoOf, today } from "./em";

export const RPT_HUB: Record<string, [string, [string, string, string][]]> = {
  "sales-reports": ["Sales Reports", [["sales", "Sales Reports", "Sales by store, item, category, order type, order source, cashier and time"], ["payments", "Payment Reports", "Payments by method, with returns taken off"]]],
  "inventory-reports": ["Inventory Reports", [["#/inv-levels", "Inventory Levels", "Stock on hand at each store"], ["#/inv-history", "Inventory History", "Every stock movement"], ["#/purchase-orders", "Purchase Orders", "Purchasing documents"], ["#/transfers", "Transfers", "Transfers between stores and warehouses"], ["#/purchasing", "Purchasing", "Purchases received by item and supplier"]]],
  "business-reports": ["Business Reports", [["taxes", "Taxes", "Tax collected per store and day"], ["days", "Business Days", "Every ended business day"], ["shifts", "Shifts", "Opened and closed shifts with cash count"], ["voids", "Voids & Returns", "Voided orders and items, and returns"]]],
  "employee-reports": ["Employee Reports", [["employees", "Employee Sales", "Sales, orders and average order per employee"], ["drivers", "Driver Deliveries", "Deliveries, totals, cash collected, delivery time and ratings per driver"]]],
  "analysis-reports": ["Analysis Reports", [["menu", "Menu Engineering", "Items by quantity sold and net sales"], ["trend", "Stores Trend", "Net sales of each store, day by day"], ["speed", "Speed Of Service", "Minutes from placing to accepting and to done"]]],
};
const DIMS: [string, string][] = [["branch", "Sales by Store"], ["product", "Sales by Item"], ["category", "Sales by Category"], ["type", "Sales by Order Type"], ["source", "Sales by Order Source"], ["channel", "Sales by Sales Channel"], ["cashier", "Sales by Cashier"], ["payment", "Sales by Payment Type"], ["customer", "Sales by Customer"]];
const GROUPS: [string, string][] = [["", "None"], ["day", "Day"], ["week", "Week"], ["month", "Month"], ["hour", "Hour of Day"], ["dow", "Day of Week"], ["branch", "Store"], ["type", "Order Type"], ["source", "Order Source"], ["category", "Category"], ["product", "Item"], ["cashier", "Cashier"]];
const COLS: [string, string, string, string][] = [
  ["gross", "Gross Sales", "Items before discount + Tax + Charges - Returns", "m"], ["grossPct", "(Gross Sales %)", "", "p"], ["netTax", "Net Sales With Tax", "Net Sales + Tax", "m"], ["tax", "Taxes", "Tax - Returned Tax", "m"],
  ["disc", "Discount Amount", "Order discounts + item discounts - returned discounts", "m"], ["grossNoTax", "Gross Sales Without Tax", "Gross Sales - Taxes", "m"], ["net", "Net Sales", "Gross Sales - Discount - Tax", "m"], ["netPct", "(Net Sales %)", "", "p"],
  ["orders", "Order Count", "Number of done orders", "n"], ["avg", "Average Order", "Net Sales / Order Count", "m"], ["guests", "Guest Count", "Total number of guests (at least one per order)", "n"], ["avgGuest", "Average per Guest", "Net Sales / Guest Count", "m"],
  ["qty", "Net Quantity", "Sold quantities - returned quantities", "n"], ["ret", "Return Amount", "Returned items + charges + taxes", "m"], ["retQty", "Return Quantity", "Quantities of returned items", "n"],
  ["void", "Void Amount", "Prices of voided items", "m"], ["voidQty", "Void Quantity", "Quantities of voided items", "n"], ["charges", "Charges", "Charges on orders in the period", "m"]];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TYPE: Record<string, string> = { dinein: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery", fast: "In Store", other: "Other" };
const CH: Record<string, string> = { pos: "POS", callcenter: "Call Center", online: "Web Ordering" };
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : "";
const camel = (r: any) => { const o: any = {}; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; return o; };
const lineNet = (i: any) => Math.max(0, (+i.price || 0) * (+i.qty || 1) - (+i.disc || 0));
const isSale = (o: any) => o.status === "closed" || o.status === "returned";
const srcOf = (o: any) => ["online", "web", "marketplace", "api"].includes(o.channel) || /^(web|website)$/i.test(o.source || "") ? "API" : o.source && o.source.toUpperCase() !== "POS" ? o.source : "";   // web ordering and marketplace orders come from the API
const cutOf = (v?: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ""); return m ? Math.min(719, (+m[1]) * 60 + (+m[2])) : 0; };
const fmt = (v: any, t: string) => t === "m" ? money(v) : t === "p" ? (+v || 0).toFixed(2) + " %" : (+v || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
const invNo = (n: any) => n ? String(n).padStart(6, "0") : "";
const dtm = (d?: string) => d ? dmy(isoOf(new Date(d))) + " " + new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";

type Built = { title: string; head: [string, string?, number?][]; rows: (string | number)[][]; foot?: (string | number)[]; kpis?: [string, string][]; T?: any; series?: { labels: string[]; values: number[] } };

export default function ReportsPage() {
  const { pathname } = useLocation(), hubKey = pathname.replace(/^\//, ""), hub = RPT_HUB[hubKey], [sp] = useSearchParams(), r = sp.get("r") || "", nav = useNavigate();
  if (!hub) return null;
  if (!r) return (
    <>
      <PageBreadcrumb pageTitle={hub[0]} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{hub[1].map(([k, t, d]) => (
        <Link key={k} to={k.startsWith("#") ? k.slice(1) : `/${hubKey}?r=${k}`} className="group flex gap-4 rounded-lg border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm dark:border-gray-800 dark:bg-[#090E1A]">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-500 dark:bg-blue-500/15"><BarChartIcon className="size-6" /></span>
          <span><b className="block font-semibold text-gray-800 group-hover:text-blue-500 dark:text-gray-50">{t}</b><span className="text-sm text-gray-500 dark:text-gray-400">{d}</span></span></Link>))}</div>
    </>);
  return <Report key={hubKey + r} hubKey={hubKey} rk={r} back={() => nav("/" + hubKey)} />;
}

function Report({ hubKey, rk, back }: { hubKey: string; rk: string; back: () => void }) {
  const branches = useCol("branches") || [], brands = useCol("brands") || [], sets = useCol("settings") || [], products = useCol("products") || [], cats = useCol("categories") || [], devices = useCol("devices") || [], closes = useCol("day_closes") || [];
  const [from, setFrom] = useState(today().slice(0, 8) + "01"), [to, setTo] = useState(today()), [brand, setBrand] = useState(""), [branch, setBranch] = useState(""), [dim, setDim] = useState("branch"), [group, setGroup] = useState("");
  const [rows, setRows] = useState<any[] | null>(null), [prev, setPrev] = useState<any[] | null>(null), [err, setErr] = useState(""), [loading, setLoading] = useState(false);
  const bName = (id?: string) => branches.find(b => b.id === id)?.name || "—";
  const chName = (c: string) => CH[c] || ((sets.find(x => x.id === "sales_channels") as any)?.list || []).find((x: any) => (x.code || x.kind) === c)?.name || (String(c || "").startsWith("int_") ? "API" : cap(c || ""));
  // the business day of each store (its day start, or the company's day end), as in the portal
  const cut = (bid?: string) => { if (bid) return cutOf(branches.find(b => b.id === bid)?.settings?.dayStart || (sets.find(x => x.id === "company") as any)?.dayEnd);
    const c: Record<number, number> = {}; branches.filter(b => live(b) && b.active !== false).forEach(b => { const x = cut(b.id); c[x] = (c[x] || 0) + 1; }); const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return top ? +top[0] : cutOf((sets.find(x => x.id === "company") as any)?.dayEnd); };
  const bizDate = (t: any, bid?: string) => { const ms = +new Date(t); let d = isoOf(new Date(ms - cut(bid) * 60000));
    for (let i = 0; i < 3 && bid; i++) { const c = closes.find(x => x.branchId === bid && String(x.businessDate).slice(0, 10) === d); if (c && +new Date(c.closedAt) <= ms) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + 1); d = isoOf(x); } else break; } return d; };
  const ready = branches.length > 0 || brands.length > 0;
  async function fetchAll(table: string, sel: string, col: string, f: string, t: string) {
    const c = cut(branch || undefined), t0 = new Date(f + "T00:00:00"), t1 = new Date(t + "T00:00:00"); t1.setDate(t1.getDate() + 1); t0.setMinutes(c); t1.setMinutes(c);
    const out: any[] = [];
    for (let p = 0; p < 50; p++) { let q: any = sb.from(table).select(sel).gte(col, t0.toISOString()).lt(col, t1.toISOString()).order(col, { ascending: true }).range(p * 1000, p * 1000 + 999);
      if (branch) q = q.eq("branch_id", branch); else if (brand) { const ids = branches.filter(b => b.brandId === brand).map(b => b.id); q = q.in("branch_id", ids.length ? ids : ["-"]); }
      const { data, error } = await q; if (error) throw error; out.push(...data); if (data.length < 1000) break; }
    return out.map(camel);
  }
  useEffect(() => { if (!ready) return; let off = false; setLoading(true); setErr(""); setRows(null);
    (async () => { try {
      const OSEL = "id,no,invoice_no,return_no,status,type,source,channel,branch_id,customer_name,phone,items,discount,tax,total,charges_total,payment,agent,handled_by,guests,voided_items,returned_items,refund_total,void_reason,voided_by,return_reason,returned_by,created_at,accepted_at,done_at,refund_of,driver_id,driver_name,driver_status,driver_assigned_at,picked_at,delivered_at,rating_driver,rating_order";
      let r: any[] = [], p: any[] | null = null;
      if (["sales", "payments", "taxes", "voids", "menu", "trend", "speed", "employees", "drivers"].includes(rk)) {
        r = await fetchAll("orders", OSEL, "created_at", from, to);
        // the same length of time just before, so the totals can say how they compare
        if (rk === "sales") { try { const len = Math.round((+new Date(to + "T12:00:00") - +new Date(from + "T12:00:00")) / 864e5) + 1, d = (a: string, n: number) => { const x = new Date(a + "T12:00:00"); x.setDate(x.getDate() + n); return isoOf(x); };
          p = await fetchAll("orders", OSEL, "created_at", d(from, -len), d(from, -1)); } catch { p = null; } } }
      else if (rk === "days") r = await fetchAll("day_closes", "*", "closed_at", from, to);
      else if (rk === "shifts") r = await fetchAll("shifts", "*", "opened_at", from, to);
      if (!off) { setRows(r); setPrev(p); }
    } catch (e: any) { if (!off) setErr(e.message || "Couldn't load the report"); } finally { if (!off) setLoading(false); } })();
    return () => { off = true; }; }, [rk, from, to, branch, brand, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const build = (R: any[]): Built => {
    const day = (o: any) => bizDate(o.createdAt, o.branchId);
    const catOf = (i: any) => { const p = products.find(x => x.id === i.productId); return (p && cats.find(c => c.id === p.categoryId)?.name) || "Uncategorized"; };
    const cashierOf = (o: any) => o.handledBy || o.agent || "—", payOf = (o: any) => o.payment?.method || "—";
    const key = (o: any, k: string, line: any) => { const d = day(o);
      switch (k) { case "branch": return bName(o.branchId); case "type": return TYPE[o.type] || cap(o.type || "—"); case "source": return srcOf(o) || "—"; case "channel": return o.channel ? chName(o.channel) : "—";
        case "cashier": return cashierOf(o); case "payment": return payOf(o); case "customer": return o.customerName || o.phone || "Walk-in"; case "product": return line ? line.name || "—" : "—"; case "category": return line ? catOf(line) : "—";
        case "day": return d; case "week": { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return "Week of " + isoOf(x); } case "month": return d.slice(0, 7);
        case "hour": return String(new Date(o.createdAt).getHours()).padStart(2, "0") + ":00"; case "dow": return DOW[new Date(d + "T12:00:00").getDay()]; default: return ""; } };
    // one order → one or more slices (one per item line for item / category reports)
    const slices = (o: any, byLine: boolean) => {
      const items = Array.isArray(o.items) ? o.items : [], refund = o.status === "refund", tot = +o.total || 0, tax = +o.tax || 0, chg = refund ? 0 : +o.chargesTotal || 0;
      const disc = (+o.discount || 0) + (refund ? 0 : items.reduce((a: number, i: any) => a + (+i.disc || 0), 0)), qty = items.reduce((a: number, i: any) => a + (+i.qty || 0), 0) * (refund ? -1 : 1);
      const base: any = { orders: isSale(o) ? 1 : 0, guests: isSale(o) ? Math.max(1, +o.guests || 1) : 0, ret: refund ? -tot : 0, retQty: refund ? -qty : 0, charges: chg };
      const voids = [...(o.status === "void" ? items : []), ...(Array.isArray(o.voidedItems) ? o.voidedItems : [])];
      base.void = voids.reduce((a: number, i: any) => a + (+i.price || 0) * (+i.qty || 1), 0); base.voidQty = voids.reduce((a: number, i: any) => a + (+i.qty || 1), 0);
      const zero = { gross: 0, tax: 0, disc: 0, total: 0, qty: 0, orders: 0, guests: 0, ret: 0, retQty: 0, charges: 0 };
      if (byLine && voids.length && !(isSale(o) || refund)) return voids.map((i: any) => ({ line: i, ...zero, void: (+i.price || 0) * (+i.qty || 1), voidQty: +i.qty || 1 }));
      if (!(isSale(o) || refund)) return [{ line: null, ...zero, void: base.void, voidQty: base.voidQty }];
      if (!byLine || !items.length) return [{ line: null, gross: tot + disc, tax, disc, total: tot, qty, ...base }];
      const sum = items.reduce((a: number, i: any) => a + lineNet(i), 0) || 1, k = refund ? -1 : 1;
      return items.map((i: any, n: number) => { const w = lineNet(i) / sum, t = (tot - chg) * w, dd = (+i.disc || 0) * (refund ? 0 : 1) + (+o.discount || 0) * w;
        return { line: i, gross: t + dd, tax: tax * w, disc: dd, total: t, qty: (+i.qty || 0) * k, orders: n === 0 ? base.orders : 0, guests: n === 0 ? base.guests : 0, ret: refund ? -t : 0, retQty: refund ? (+i.qty || 0) : 0, charges: 0, void: n === 0 ? base.void : 0, voidQty: n === 0 ? base.voidQty : 0 }; });
    };
    const agg = (dm: string, gr: string) => { const byLine = ["product", "category"].includes(dm) || ["product", "category"].includes(gr), map = new Map<string, any>();
      for (const o of R) for (const s of slices(o, byLine)) { const a = key(o, dm, s.line), b = gr ? key(o, gr, s.line) : "", k = a + "\u0001" + b;
        let x = map.get(k); if (!x) { x = { a, b, gross: 0, tax: 0, disc: 0, total: 0, qty: 0, orders: 0, guests: 0, ret: 0, retQty: 0, void: 0, voidQty: 0, charges: 0 }; map.set(k, x); }
        for (const f of ["gross", "tax", "disc", "total", "qty", "orders", "guests", "ret", "retQty", "void", "voidQty", "charges"]) x[f] += (s as any)[f] || 0; }
      const list = [...map.values()].filter(x => x.gross || x.orders || x.ret || x.void || x.qty), G = list.reduce((a, x) => a + x.gross, 0), N = list.reduce((a, x) => a + (x.total - x.tax), 0);
      list.forEach(x => { x.net = x.total - x.tax; x.netTax = x.total; x.grossNoTax = x.gross - x.tax; x.avg = x.orders ? x.net / x.orders : 0; x.avgGuest = x.guests ? x.net / x.guests : 0; x.grossPct = G ? x.gross / G * 100 : 0; x.netPct = N ? x.net / N * 100 : 0; });
      const ord = ["day", "week", "month", "hour"].includes(dm) ? (x: any, y: any) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b) : dm === "dow" ? (x: any, y: any) => DOW.indexOf(x.a) - DOW.indexOf(y.a) : (x: any, y: any) => y.net - x.net || x.b.localeCompare(y.b);
      list.sort(ord);
      const h12 = (v: string) => /^\d\d:00$/.test(v) ? ((+v.slice(0, 2) % 12) || 12) + " " + (+v.slice(0, 2) < 12 ? "AM" : "PM") : v;
      if (dm === "hour" || gr === "hour") list.forEach(x => { if (dm === "hour") x.a = h12(x.a); if (gr === "hour") x.b = h12(x.b); });
      return list; };
    const sum = (l: any[], f: (x: any) => number) => l.reduce((a, x) => a + f(x), 0);
    if (rk === "sales") {
      const dl = ({ branch: "Store", product: "Item", category: "Category", type: "Order Type", source: "Order Source", channel: "Sales Channel", cashier: "Cashier", payment: "Payment Type", customer: "Customer" } as any)[dim], gl = GROUPS.find(g => g[0] === group)?.[1], list = agg(dim, group);
      const cols = COLS.filter(c => !(["product", "category"].includes(dim) && ["charges", "guests", "avgGuest"].includes(c[0])));
      const ref = (a: string) => branches.find(b => b.name === a)?.code || "—";
      const T: any = list.reduce((x, r) => { for (const c of cols) x[c[0]] = (x[c[0]] || 0) + (+r[c[0]] || 0); return x; }, {});
      T.avg = T.orders ? T.net / T.orders : 0; T.avgGuest = T.guests ? T.net / T.guests : 0; T.grossPct = list.length ? 100 : 0; T.netPct = list.length ? 100 : 0;
      const byDay: Record<string, number> = {}; R.filter(isSale).forEach(o => { const d = day(o); byDay[d] = (byDay[d] || 0) + (+o.total || 0); });
      const days: string[] = []; for (let d = from; d <= to && days.length < 92; d = (() => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + 1); return isoOf(x); })()) days.push(d);
      return { title: DIMS.find(d => d[0] === dim)?.[1] || "Sales", head: [[dl], ...(dim === "branch" ? [["Store Reference"]] : []) as any, ...(group ? [[gl]] : []), ...cols.map(c => [c[1], c[2], 1] as any)],
        rows: list.map(r => [r.a, ...(dim === "branch" ? [ref(r.a)] : []), ...(group ? [r.b] : []), ...cols.map(c => fmt(r[c[0]], c[3]))]),
        foot: ["Total", ...(dim === "branch" ? [""] : []), ...(group ? [""] : []), ...cols.map(c => fmt(T[c[0]], c[3]))],
        kpis: [["Gross sales", fmt(T.gross, "m")], ["Net sales", fmt(T.net, "m")], ["Orders", fmt(T.orders, "n")], ["Average order", fmt(T.avg, "m")], ["Discounts", fmt(T.disc, "m")]], T,
        series: days.length > 1 ? { labels: days.map(d => dmy(d)), values: days.map(d => +(byDay[d] || 0).toFixed(2)) } : undefined };
    }
    if (rk === "payments") { const m = new Map<string, any>(); R.filter(o => isSale(o) || o.status === "refund").forEach(o => { const k = payOf(o) + "\u0001" + bName(o.branchId); const x = m.get(k) || { p: payOf(o), b: bName(o.branchId), n: 0, amt: 0, ret: 0 };
        if (o.status === "refund") x.ret += -(+o.total || 0); else { x.n++; x.amt += +o.total || 0; } m.set(k, x); });
      const l = [...m.values()].sort((a, b) => b.amt - a.amt);
      return { title: "Payment Reports", head: [["Payment Type"], ["Store"], ["Payments Count", "", 1], ["Amount", "", 1], ["Returned Amount", "", 1], ["Net Amount", "", 1]], rows: l.map(x => [x.p, x.b, x.n, money(x.amt), money(x.ret), money(x.amt - x.ret)]),
        foot: ["Total", "", sum(l, x => x.n), money(sum(l, x => x.amt)), money(sum(l, x => x.ret)), money(sum(l, x => x.amt - x.ret))] }; }
    if (rk === "taxes") { const m = new Map<string, any>(); R.filter(o => isSale(o) || o.status === "refund").forEach(o => { const k = day(o) + "\u0001" + bName(o.branchId); const x = m.get(k) || { d: day(o), b: bName(o.branchId), tax: 0, net: 0 }; x.tax += +o.tax || 0; x.net += (+o.total || 0) - (+o.tax || 0); m.set(k, x); });
      const l = [...m.values()].sort((a, b) => a.d.localeCompare(b.d) || a.b.localeCompare(b.b));
      return { title: "Taxes", head: [["Business Date"], ["Store"], ["Taxable Sales", "", 1], ["Tax Amount", "", 1]], rows: l.map(x => [dmy(x.d), x.b, money(x.net), money(x.tax)]), foot: ["Total", "", money(sum(l, x => x.net)), money(sum(l, x => x.tax))] }; }
    if (rk === "days") { const l = R.slice().sort((a, b) => String(b.businessDate).localeCompare(String(a.businessDate)));
      return { title: "Business Days", head: [["Store"], ["Business Date"], ["Ended At"], ["Ended By"], ["Orders", "", 1], ["Sales", "", 1]], rows: l.map(x => [bName(x.branchId), dmy(x.businessDate), dtm(x.closedAt), x.closedBy || "—", +x.orders || 0, money(+x.sales || 0)]),
        foot: ["Total", "", "", "", sum(l, x => +x.orders || 0), money(sum(l, x => +x.sales || 0))] }; }
    if (rk === "shifts") { const l = R.slice().sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt)));
      return { title: "Shifts", head: [["Store"], ["Device"], ["Cashier"], ["Opened At"], ["Closed At"], ["Orders", "", 1], ["Sales", "", 1], ["Opening Cash", "", 1], ["Expected Cash", "", 1], ["Counted Cash", "", 1], ["Difference", "", 1]],
        rows: l.map(x => [bName(x.branchId), devices.find(d => d.id === x.deviceId)?.name || "—", x.cashier || "—", dtm(x.openedAt), x.closedAt ? dtm(x.closedAt) : "Open", +x.orders || 0, money(+x.sales || 0), money(+x.openingCash || 0), x.closedAt ? money(+x.expectedCash || 0) : "—", x.closedAt ? money(+x.countedCash || 0) : "—", x.closedAt ? money(+x.difference || 0) : "—"]) }; }
    if (rk === "voids") { const l: any[][] = [];
      R.forEach(o => { const ref = o.status === "refund" && !o.invoiceNo ? "RET-" + String(o.returnNo || "").padStart(6, "0") : o.invoiceNo ? invNo(o.invoiceNo) : String(o.no || "—");
        if (o.status === "void") (o.items || []).forEach((i: any) => l.push([dtm(o.createdAt), bName(o.branchId), ref, "Void order", i.name, +i.qty || 1, money((+i.price || 0) * (+i.qty || 1)), o.voidReason || "—", o.voidedBy || "—"]));
        (o.voidedItems || []).forEach((i: any) => l.push([dtm(i.voidedAt || o.createdAt), bName(o.branchId), ref, "Void item", i.name, +i.qty || 1, money((+i.price || 0) * (+i.qty || 1)), i.reason || "—", i.voidedBy || "—"]));
        if (o.status === "refund") (o.items || []).forEach((i: any) => l.push([dtm(o.createdAt), bName(o.branchId), ref, "Return", i.name, +i.qty || 1, money(lineNet(i)), o.returnReason || "—", o.returnedBy || o.agent || "—"])); });
      return { title: "Voids & Returns", head: [["Time"], ["Store"], ["Reference"], ["Kind"], ["Item"], ["Quantity", "", 1], ["Amount", "", 1], ["Reason"], ["By"]], rows: l }; }
    if (rk === "menu") { const l = agg("product", ""), Q = sum(l, x => x.qty) || 1;
      return { title: "Menu Engineering", head: [["Item"], ["Category"], ["Quantity Sold", "", 1], ["Popularity %", "", 1], ["Net Sales", "", 1], ["Average Price", "", 1]],
        rows: l.filter(x => x.qty > 0).map(x => { const p = products.find(y => y.name === x.a); return [x.a, p ? cats.find(c => c.id === p.categoryId)?.name || "—" : "—", fmt(x.qty, "n"), (x.qty / Q * 100).toFixed(2) + " %", money(x.net), money(x.qty ? x.net / x.qty : 0)]; }) }; }
    if (rk === "trend") { const days = [...new Set(R.filter(isSale).map(day))].sort(), brs = [...new Set(R.map(o => bName(o.branchId)))].sort();
      const v = (b: string, d: string) => R.filter(o => (isSale(o) || o.status === "refund") && bName(o.branchId) === b && day(o) === d).reduce((a, o) => a + (+o.total || 0) - (+o.tax || 0), 0);
      return { title: "Stores Trend", head: [["Business Date"], ...brs.map(b => [b, "", 1] as any), ["Total", "", 1]], rows: days.map(d => [dmy(d), ...brs.map(b => money(v(b, d))), money(brs.reduce((a, b) => a + v(b, d), 0))]) }; }
    if (rk === "speed") { const m = new Map<string, any>(); R.filter(isSale).forEach(o => { const k = bName(o.branchId); const x = m.get(k) || { b: k, n: 0, acc: 0, na: 0, done: 0, nd: 0 }; x.n++;
        if (o.acceptedAt) { x.acc += (+new Date(o.acceptedAt) - +new Date(o.createdAt)) / 60000; x.na++; } if (o.doneAt) { x.done += (+new Date(o.doneAt) - +new Date(o.createdAt)) / 60000; x.nd++; } m.set(k, x); });
      return { title: "Speed Of Service", head: [["Store"], ["Orders", "", 1], ["Avg. Minutes to Accept", "", 1], ["Avg. Minutes to Done", "", 1]], rows: [...m.values()].map(x => [x.b, x.n, x.na ? (x.acc / x.na).toFixed(1) : "—", x.nd ? (x.done / x.nd).toFixed(1) : "—"]) }; }
    if (rk === "employees") { const m = new Map<string, any>(); R.filter(o => isSale(o) || o.status === "refund").forEach(o => { const k = cashierOf(o); const x = m.get(k) || { e: k, br: new Set(), n: 0, net: 0, tot: 0, ret: 0, disc: 0 };
        x.br.add(bName(o.branchId)); if (o.status === "refund") x.ret += -(+o.total || 0); else { x.n++; x.disc += +o.discount || 0; } x.tot += +o.total || 0; x.net += (+o.total || 0) - (+o.tax || 0); m.set(k, x); });
      const l = [...m.values()].sort((a, b) => b.net - a.net), n = sum(l, x => x.n);
      return { title: "Employee Sales", head: [["Employee"], ["Stores"], ["Orders", "", 1], ["Net Sales", "", 1], ["Net Sales With Tax", "", 1], ["Average Order", "", 1], ["Discounts", "", 1], ["Returns", "", 1]],
        rows: l.map(x => [x.e, [...x.br].join(", "), x.n, money(x.net), money(x.tot), money(x.n ? x.net / x.n : 0), money(x.disc), money(x.ret)]),
        foot: ["Total", "", n, money(sum(l, x => x.net)), money(sum(l, x => x.tot)), money(n ? sum(l, x => x.net) / n : 0), money(sum(l, x => x.disc)), money(sum(l, x => x.ret))] }; }
    if (rk === "drivers") { const m = new Map<string, any>(); R.filter(o => o.type === "delivery" && o.driverName && isSale(o)).forEach(o => { const k = o.driverName; const x = m.get(k) || { d: k, n: 0, tot: 0, cash: 0, mins: 0, nm: 0, rd: 0, nrd: 0, ro: 0, nro: 0 };
        x.n++; x.tot += +o.total || 0; if (o.deliveredAt || o.driverStatus === "delivered") x.cash += +o.total || 0;
        if (o.pickedAt && o.deliveredAt) { x.mins += (+new Date(o.deliveredAt) - +new Date(o.pickedAt)) / 60000; x.nm++; } if (+o.ratingDriver) { x.rd += +o.ratingDriver; x.nrd++; } if (+o.ratingOrder) { x.ro += +o.ratingOrder; x.nro++; } m.set(k, x); });
      const l = [...m.values()].sort((a, b) => b.n - a.n), avg = (s: number, n: number) => n ? (s / n).toFixed(1) : "—";
      return { title: "Driver Deliveries", head: [["Driver"], ["Deliveries", "", 1], ["Orders Total", "", 1], ["Collected In The App", "", 1], ["Avg. Minutes On The Way", "", 1], ["Driver Rating", "", 1], ["Order Rating", "", 1], ["Ratings", "", 1]],
        rows: l.map(x => [x.d, x.n, money(x.tot), money(x.cash), avg(x.mins, x.nm), avg(x.rd, x.nrd), avg(x.ro, x.nro), x.nrd]),
        foot: ["Total", sum(l, x => x.n), money(sum(l, x => x.tot)), money(sum(l, x => x.cash)), avg(sum(l, x => x.mins), sum(l, x => x.nm)), avg(sum(l, x => x.rd), sum(l, x => x.nrd)), avg(sum(l, x => x.ro), sum(l, x => x.nro)), sum(l, x => x.nrd)] }; }
    return { title: "Report", head: [], rows: [] };
  };
  const B = useMemo(() => rows ? build(rows) : null, [rows, dim, group, branches, closes, products]); // eslint-disable-line react-hooks/exhaustive-deps
  const P = useMemo(() => rk === "sales" && prev ? build(prev).T : null, [prev, dim, group]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = RPT_HUB[hubKey][1].find(x => x[0] === rk)?.[1] || "Report", nDays = Math.round((+new Date(to + "T12:00:00") - +new Date(from + "T12:00:00")) / 864e5) + 1;
  const delta = (l: string) => { if (!P || !B?.T) return null; const k = ({ "Gross sales": "gross", "Net sales": "net", "Orders": "orders", "Average order": "avg", "Discounts": "disc" } as any)[l]; if (!k) return null;
    const a = +B.T[k] || 0, b = +P[k] || 0; if (!b) return <span className="text-xs text-gray-400">{a ? "New this period" : "—"}</span>;
    const pc = (a - b) / Math.abs(b) * 100, up = pc >= 0, good = k === "disc" ? !up : up;
    return <span title={`Compared with the ${nDays} days before`} className={cn("text-xs font-medium", Math.abs(pc) < .05 ? "text-gray-400" : good ? "text-green-600" : "text-red-500")}>{Math.abs(pc) < .05 ? "— Same" : (up ? "▲ " : "▼ ") + Math.abs(pc).toFixed(1) + "%"}</span>; };
  const strip = (v: any) => String(v ?? "");
  const exportCsv = () => B && csv(`skwyd-${B.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${from}-to-${to}.csv`, [B.head.map(h => h[0]), ...B.rows.map(r => r.map(strip)), ...(B.foot ? [B.foot.map(strip)] : [])]);
  const print = () => { if (!B) return; const w = window.open("", "_blank"); if (!w) return; const e = (x: any) => String(x ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    w.document.write(`<!doctype html><title>${e(B.title)}</title><style>body{font:12px Inter,system-ui,sans-serif;margin:24px;color:#1d2939}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #eaecf0;padding:6px 8px;text-align:left}.n{text-align:right}h2{margin:0 0 4px}</style><h2>${e(B.title)}</h2><p>${dmy(from)} – ${dmy(to)} · ${e(branch ? branches.find(b => b.id === branch)?.name : brand ? (brands.find(b => b.id === brand)?.name || "") + " · All Stores" : "All Stores")}</p>
      <table><thead><tr>${B.head.map(h => `<th class="${h[2] ? "n" : ""}">${e(h[0])}</th>`).join("")}</tr></thead><tbody>${B.rows.map(r => `<tr>${r.map((c, i) => `<td class="${B.head[i]?.[2] ? "n" : ""}">${e(c)}</td>`).join("")}</tr>`).join("")}${B.foot && B.rows.length ? `<tr>${B.foot.map((c, i) => `<td class="${B.head[i]?.[2] ? "n" : ""}"><b>${e(c)}</b></td>`).join("")}</tr>` : ""}</tbody></table><script>print()<\/script>`); w.document.close(); };
  return (
    <>
      <PageBreadcrumb pageTitle={rk === "sales" ? DIMS.find(d => d[0] === dim)?.[1] || name : name} />
      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 xl:flex-row xl:items-center dark:border-gray-800 dark:bg-[#090E1A]">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button variant="outline" size="icon-lg" aria-label="Back" onClick={back}><ArrowLeftIcon className="size-5" /></Button>
          {rk === "sales" && <select aria-label="Report" className={SEL + " sm:w-52"} value={dim} onChange={e => { setDim(e.target.value); if (group === e.target.value) setGroup(""); }}>{DIMS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>}
          {rk === "sales" && <select aria-label="Group By" className={SEL + " sm:w-44"} value={group} onChange={e => setGroup(e.target.value)}>{GROUPS.filter(g => g[0] !== dim).map(([v, t]) => <option key={v} value={v}>Group By: {t}</option>)}</select>}
          {<select aria-label="Brand" className={SEL + " sm:w-40"} value={brand} onChange={e => { setBrand(e.target.value); if (branch && e.target.value && branches.find(b => b.id === branch)?.brandId !== e.target.value) setBranch(""); }}><option value="">All Brands</option>{brands.filter(live).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
          <select aria-label="Store" className={SEL + " sm:w-40"} value={branch} onChange={e => setBranch(e.target.value)}><option value="">All Stores</option>{branches.filter(b => live(b) && b.active !== false && (!brand || b.brandId === brand)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <div className="sm:w-60"><RangeInput from={from} to={to} onChange={(a, b) => { if (a) { setFrom(a); setTo(b || a); } }} /></div>
        </div>
        <div className="flex gap-3">{loading && <span className="self-center text-sm text-gray-500">Loading…</span>}<Button variant="outline" disabled={!B} onClick={exportCsv}><DownloadIcon className="size-5" />Export</Button><Button variant="outline" disabled={!B} onClick={print}>Print</Button></div>
      </div>
      {err ? <p className="rounded-lg border border-red-500 bg-red-50 p-4 text-sm text-gray-700 dark:bg-red-500/10 dark:text-white/80">Couldn't load the report: {err}</p>
        : !B ? <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-[#090E1A]">Loading report…</p>
        : <>
          {B.kpis && B.rows.length > 0 && <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">{B.kpis.map(([l, v]) => <div key={l} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#090E1A]">
            <span className="text-sm text-gray-500 dark:text-gray-400">{l}</span><h4 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">{v}</h4>{delta(l)}</div>)}</div>}
          {B.series && B.rows.length > 0 && <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-900 dark:bg-[#090E1A]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Sales By Day</h3><p className="mt-1 text-sm text-gray-500">{B.series.labels[0]} – {B.series.labels[B.series.labels.length - 1]}{prev ? ` · compared with the ${nDays} days before` : ""}</p>
            <AreaChart className="mt-4 h-64" data={B.series!.labels.map((l: string, i: number) => ({ day: l, Sales: B.series!.values[i] }))} index="day" categories={["Sales"]} colors={["blue"]} valueFormatter={v => money(v)} showLegend={false} yAxisWidth={56} /></div>}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#090E1A]">
            <div className="custom-scrollbar max-w-full overflow-x-auto">
              {!B.rows.length ? <EmptyState text="No data to display" />
                : <table className="min-w-full"><thead className="border-b border-gray-200 dark:border-gray-800"><tr>{B.head.map(([l, tip, num]) => <th key={l} title={tip || undefined} className={TH + (num ? " text-end" : "")}>{l}{tip ? <span className="ms-1 text-gray-400">ⓘ</span> : null}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">{B.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={TD + (B.head[j]?.[2] ? " text-end" : j === 0 ? " font-medium text-gray-900 dark:text-gray-50" : "")}>{c}</td>)}</tr>)}</tbody>
                  {B.foot && <tfoot className="border-t border-gray-200 dark:border-white/10"><tr>{B.foot.map((c, j) => <td key={j} className={TD + " font-semibold text-gray-900 dark:text-gray-50" + (B.head[j]?.[2] ? " text-end" : "")}>{c}</td>)}</tr></tfoot>}</table>}
            </div>
          </div>
        </>}
    </>
  );
}
