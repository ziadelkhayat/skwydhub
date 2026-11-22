// Inventory Reports: Inventory Levels (one store or warehouse, All / Low Level), Inventory History (rpc skwyd_inv_history) and Purchasing
// (purchases received by item and supplier). Same data, filters and exports as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ArrowLeftIcon, DownloadIcon, RegenerateIcon, SearchIcon } from "@/icons";
import { type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDateTime, money } from "@/lib/util";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { live, useS, type S } from "../crud/CrudPage";
import { RangeInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { BOX, SEL, TD, TH } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { addDays, csv, today } from "./em";

const n2 = (v: any) => (+v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const fx = (v: any) => (+v || 0).toLocaleString("en-US", { maximumFractionDigits: 5 });
const unitCost = (items: Row[]) => { const of = (id: string) => items.find(i => i.id === id);
  const unit = (it: any, d = 0): number => !it ? 0 : (+it.cost || ((it.ingredients || []).length && d < 4 ? rec(it.ingredients, d + 1) : 0));
  const rec = (l: any[], d = 0): number => (l || []).reduce((s, x) => { const a = x?.action === "remove" ? "remove" : x?.action === "replace" ? "replace" : "add"; const it = of(a === "replace" ? x.withId : x.itemId); return s + (a === "remove" || !it ? 0 : (+x.qty || 0) / (+it.factor || 1) * unit(it, d)); }, 0);
  return unit; };
function locsOf(s: S, brand: string) {
  const locBrand = (id: string) => s.branches.find(b => b.id === id)?.brandId || s.warehouses.find(w => w.id === id)?.brandId || "";
  const has = (id: string) => !brand || !locBrand(id) || locBrand(id) === brand;
  const locs: [string, string][] = [...s.branches.filter(b => live(b) && b.active !== false && (!brand || b.brandId === brand)).map(b => [b.id, b.name] as [string, string]), ...s.warehouses.filter(w => live(w) && has(w.id)).map(w => [w.id, w.name + (w.reference ? ` (${w.reference})` : "")] as [string, string])];
  const name = (id?: string) => s.branches.find(b => b.id === id)?.name || s.warehouses.find(w => w.id === id)?.name || "—";
  return { locs, name, has };
}
const Head = ({ title, back, children }: { title: string; back: () => void; children?: React.ReactNode }) => <>
  <PageBreadcrumb pageTitle={title} />
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={back}><ArrowLeftIcon className="size-5" />Inventory Reports</Button><div className="flex flex-wrap gap-3">{children}</div></div></>;
const BrandSel = ({ s, v, set }: { s: S; v: string; set: (x: string) => void }) => true ? <select aria-label="Brand" className={SEL + " sm:w-40"} value={v} onChange={e => set(e.target.value)}><option value="">All Brands</option>{s.brands.filter(live).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select> : null;

export function InvLevelsPage() {
  const s = useS(["inv_items", "inv_categories", "branches", "warehouses", "brands"]), nav = useNavigate();
  const [brand, setBrand] = useState(""), [loc0, setLoc] = useState(""), [cat, setCat] = useState(""), [q, setQ] = useState(""), [low, setLow] = useState("all"), [stock, setStock] = useState<Record<string, Record<string, number>> | null>(null), [tick, setTick] = useState(0);
  useEffect(() => { setStock(null); sb.rpc("skwyd_stock_all").then(({ data }) => { const m: any = {}; (data || []).forEach((r: any) => (m[r.location_id] ||= {})[r.item_id] = +r.qty); setStock(m); }); }, [tick]);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const { locs } = locsOf(s, brand), loc = locs.some(([id]) => id === loc0) ? loc0 : locs[0]?.[0] || "", uc = unitCost(s.inv_items), qq = q.trim().toLowerCase();
  const catNames = (() => { const m = s.inv_categories.filter(live).map(c => c.name); s.inv_items.forEach(i => { if (i.category && !m.includes(i.category)) m.push(i.category); }); return m.sort((a, b) => a.localeCompare(b)); })();
  const rows = s.inv_items.filter(live).filter(i => (!cat || i.category === cat) && (!qq || (i.name + " " + (i.sku || "") + " " + (i.barcode || "")).toLowerCase().includes(qq)))
    .sort((a, b) => (a.sku || "").localeCompare(b.sku || "", undefined, { numeric: true }) || a.name.localeCompare(b.name))
    .map(it => { const qn = loc ? stock?.[loc]?.[it.id] : undefined, cost = +uc(it) || 0, min = +it.minLevel || 0, st = qn === undefined ? "none" : qn <= 0 ? "out" : min > 0 && qn < min ? "low" : "ok"; return { it, qn, cost, value: (+(qn ?? 0) || 0) * cost, st }; })
    .filter(r => low === "all" || r.st === "low" || r.st === "out");
  return (
    <>
      <Head title="Inventory Levels" back={() => nav("/inventory-reports")}>
        <Button variant="outline" onClick={() => csv("inventory-levels.csv", [["Name", "SKU", "Barcode", "Storage Unit", "Quantity", "Cost Per Unit", "Total Cost"], ...rows.map(r => [r.it.name, r.it.sku || "", r.it.barcode || "", r.it.storageUnit || "", r.qn ?? 0, r.cost, +r.value.toFixed(5)])])}><DownloadIcon className="size-5" />Export</Button>
        <Button variant="outline" onClick={() => setTick(t => t + 1)}><RegenerateIcon className="size-5" />Refresh</Button></Head>
      <div className={BOX}>
        <div className="flex flex-col gap-3 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <SegTabs value={low} onChange={setLow} items={[["all", "All"], ["low", "Low Level"]]} />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><BrandSel s={s} v={brand} set={setBrand} />
            <select aria-label="Store or warehouse" className={SEL + " sm:w-48"} value={loc} onChange={e => setLoc(e.target.value)}>{locs.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
            <select aria-label="Category" className={SEL + " sm:w-44"} value={cat} onChange={e => setCat(e.target.value)}><option value="">All categories</option>{catNames.map(n => <option key={n}>{n}</option>)}</select>
            <InputGroup className="h-11 sm:w-52"><InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon><InputGroupInput placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} /></InputGroup></div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {!locs.length ? <EmptyState text="Add a store or a warehouse first." /> : !stock ? <EmptyState text="Loading stock…" /> : !rows.length ? <EmptyState text={low === "low" ? "Nothing is at a low level." : "No items."} />
            : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>{["Name", "SKU", "Barcode", "Storage Unit"].map(h => <th key={h} className={TH}>{h}</th>)}{["Quantity", "Cost Per Unit", "Total Cost"].map(h => <th key={h} className={TH + " text-end"}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">{rows.map(r => <tr key={r.it.id}><td className={TD + " font-medium text-gray-800 dark:text-white/90"}>{r.it.name}</td><td className={TD}>{r.it.sku || "—"}</td><td className={TD}>{r.it.barcode || "—"}</td><td className={TD}>{r.it.storageUnit || "—"}</td>
                <td className={TD + " text-end" + (r.st === "low" || r.st === "out" ? " font-semibold text-red-500" : "")}>{r.qn === undefined ? "0" : fx(r.qn)}</td><td className={TD + " text-end"}>{money(r.cost)}</td><td className={TD + " text-end"}>{money(r.value)}</td></tr>)}</tbody></table>}
        </div>
      </div>
    </>);
}

// a movement's kind, read from its note and reference
const moveType = (r: any) => { const n = (r.note || "") + " " + (r.batch || "");
  if (/Consumption from order/i.test(n)) return "Sale"; if (/voided|Return/i.test(n)) return "Return"; if (/Waste/i.test(n)) return "Waste"; if (/Purchase/i.test(n)) return "Purchase"; if (/Transfer/i.test(n)) return "Transfer"; if (/production/i.test(n)) return "Production"; if (/adjust/i.test(n)) return "Adjustment"; return "Count"; };
export function InvHistoryPage() {
  const s = useS(["inv_items", "branches", "warehouses", "brands"]), nav = useNavigate();
  const [from, setFrom] = useState(addDays(today(), -6)), [to, setTo] = useState(today()), [brand, setBrand] = useState(""), [loc, setLoc] = useState(""), [item, setItem] = useState(""), [type, setType] = useState("");
  const [rows, setRows] = useState<any[] | null>(null), [err, setErr] = useState("");
  useEffect(() => { let off = false; setRows(null); setErr("");
    sb.rpc("skwyd_inv_history", { p_from: from + "T00:00:00", p_to: to + "T23:59:59.999", p_loc: loc || null, p_item: item || null }).then(({ data, error }) => { if (off) return;
      if (error) { setErr(/skwyd_inv_history/.test(error.message || "") ? "Inventory history needs a database update first." : "Couldn't load the history: " + error.message); setRows([]); } else setRows(data || []); });
    return () => { off = true; }; }, [from, to, loc, item]);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const { locs, name, has } = locsOf(s, brand), itemOf = (id: string) => s.inv_items.find(i => i.id === id);
  const list = (rows || []).filter(r => (!type || moveType(r) === type) && has(r.branch_id));
  return (
    <>
      <Head title="Inventory History" back={() => nav("/inventory-reports")}>
        <Button variant="outline" onClick={() => csv("inventory-history.csv", [["Date", "Location", "Item", "Type", "Change", "Quantity after", "Unit", "Reference", "Note", "By"], ...list.map(r => { const it = itemOf(r.item_id) || {} as any; return [fmtDateTime(r.counted_at), name(r.branch_id), it.name, moveType(r), r.delta, r.qty, it.storageUnit, r.batch, r.note, r.counted_by]; })])}><DownloadIcon className="size-5" />Export</Button></Head>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Every stock movement: sales, returns, purchases, transfers, production, adjustments and counts.</p>
      <div className={BOX}>
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:flex-wrap sm:px-6">
          <div className="sm:w-60"><RangeInput from={from} to={to} onChange={(a, b) => { if (a) { setFrom(a); setTo(b || a); } }} /></div><BrandSel s={s} v={brand} set={x => { setBrand(x); setLoc(""); }} />
          <select aria-label="Location" className={SEL + " sm:w-44"} value={loc} onChange={e => setLoc(e.target.value)}><option value="">All locations</option>{locs.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
          <select aria-label="Item" className={SEL + " sm:w-48"} value={item} onChange={e => setItem(e.target.value)}><option value="">All items</option>{s.inv_items.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
          <select aria-label="Type" className={SEL + " sm:w-40"} value={type} onChange={e => setType(e.target.value)}><option value="">All types</option>{["Sale", "Return", "Waste", "Purchase", "Transfer", "Production", "Adjustment", "Count"].map(t => <option key={t}>{t}</option>)}</select>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {err ? <EmptyState text={err} /> : !rows ? <EmptyState text="Loading…" /> : !list.length ? <EmptyState text="No stock movements in these dates." />
            : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>{["Date", "Location", "Item", "Type"].map(h => <th key={h} className={TH}>{h}</th>)}<th className={TH + " text-end"}>Change</th><th className={TH + " text-end"}>Quantity After</th>{["Reference", "Note", "By"].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">{list.map((r, i) => { const it = itemOf(r.item_id) || {} as any, d = +r.delta || 0; return <tr key={i}>
                <td className={TD}>{fmtDateTime(r.counted_at)}</td><td className={TD}>{name(r.branch_id)}</td><td className={TD + " font-medium text-gray-800 dark:text-white/90"}>{it.name || "(deleted item)"}</td><td className={TD}>{moveType(r)}</td>
                <td className={TD + " text-end font-semibold " + (d < 0 ? "text-red-500" : d > 0 ? "text-green-600" : "")}>{d > 0 ? "+" : ""}{n2(d)} {it.storageUnit || ""}</td><td className={TD + " text-end"}>{n2(r.qty)}</td><td className={TD + " font-mono text-xs"}>{r.batch || ""}</td><td className={TD}>{r.note || ""}</td><td className={TD}>{r.counted_by || ""}</td></tr>; })}</tbody></table>}
        </div>
      </div>
    </>);
}

export function PurchasingReportPage() {
  const s = useS(["inv_docs", "inv_items", "suppliers", "branches", "warehouses", "brands"]), nav = useNavigate();
  const [from, setFrom] = useState(addDays(today(), -29)), [to, setTo] = useState(today()), [brand, setBrand] = useState(""), [loc, setLoc] = useState("");
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const { locs, has } = locsOf(s, brand), itemOf = (id: string) => s.inv_items.find(i => i.id === id);
  const docs = s.inv_docs.filter(d => live(d) && d.kind === "purchase" && d.status === "closed" && (!loc || d.locationId === loc) && (!brand || (d.brandId ? d.brandId === brand : has(d.locationId))))
    .filter(d => { const day = String(d.receivedAt || d.submittedAt || d.createdAt || "").slice(0, 10); return day >= from && day <= to; });
  const m: Record<string, any> = {}; docs.forEach(d => (d.items || []).forEach((l: any) => { const k = l.itemId + "|" + (d.supplierId || ""); const r = m[k] ||= { itemId: l.itemId, sup: d.supplierId, qty: 0, total: 0 }; r.qty += +l.qty || 0; r.total += (+l.qty || 0) * (+l.cost || +(itemOf(l.itemId)?.cost) || 0); }));
  const rows = Object.values(m).sort((a: any, b: any) => b.total - a.total) as any[], total = rows.reduce((a, r) => a + r.total, 0), sup = (id: string) => s.suppliers.find(x => x.id === id)?.name || "—";
  return (
    <>
      <Head title="Purchasing" back={() => nav("/inventory-reports")}>
        <Button variant="outline" onClick={() => csv("purchasing.csv", [["Item", "Supplier", "Quantity", "Unit", "Average cost", "Total cost"], ...rows.map(r => { const it = itemOf(r.itemId) || {} as any; return [it.name, sup(r.sup), r.qty, it.storageUnit, r.qty ? +(r.total / r.qty).toFixed(5) : 0, +r.total.toFixed(5)]; })])}><DownloadIcon className="size-5" />Export</Button></Head>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">What was received from suppliers (closed purchasing), with quantities and cost.</p>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">{[["Purchases received", String(docs.length)], ["Total cost", money(total)], ["Items", String(new Set(rows.map(r => r.itemId)).size)], ["Suppliers", String(new Set(docs.map(d => d.supplierId)).size)]].map(([l, v]) =>
        <div key={l} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"><span className="text-sm text-gray-500">{l}</span><h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">{v}</h4></div>)}</div>
      <div className={BOX}>
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:flex-wrap sm:px-6"><div className="sm:w-60"><RangeInput from={from} to={to} onChange={(a, b) => { if (a) { setFrom(a); setTo(b || a); } }} /></div>
          <BrandSel s={s} v={brand} set={x => { setBrand(x); setLoc(""); }} /><select aria-label="Location" className={SEL + " sm:w-44"} value={loc} onChange={e => setLoc(e.target.value)}><option value="">All locations</option>{locs.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></div>
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {!rows.length ? <EmptyState text="No purchases received in these dates." /> : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr><th className={TH}>Item</th><th className={TH}>Supplier</th>{["Quantity", "Average Cost", "Total Cost"].map(h => <th key={h} className={TH + " text-end"}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">{rows.map(r => { const it = itemOf(r.itemId) || {} as any; return <tr key={r.itemId + r.sup}><td className={TD + " font-medium text-gray-800 dark:text-white/90"}>{it.name || "(deleted item)"}</td><td className={TD}>{sup(r.sup)}</td>
              <td className={TD + " text-end"}>{n2(r.qty)} {it.storageUnit || ""}</td><td className={TD + " text-end"}>{money(r.qty ? r.total / r.qty : 0)}</td><td className={TD + " text-end"}>{money(r.total)}</td></tr>; })}</tbody>
            <tfoot className="border-t border-gray-200 dark:border-white/10"><tr><td className={TD + " font-semibold text-gray-800 dark:text-white/90"} colSpan={4}>Total</td><td className={TD + " text-end font-semibold text-gray-800 dark:text-white/90"}>{money(total)}</td></tr></tfoot></table>}
        </div>
      </div>
    </>);
}
