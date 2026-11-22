// Inventory transactions: Purchase Orders, Purchasing, Transfer Orders, Transfers, Production, Inventory Count, Spot Check, Quantity Adjustment,
// Cost Adjustment and Count Sheets. Same documents (inventory_docs), steps, rules and database calls (skwyd_close_inv_doc, skwyd_doc_action,
// stock_counts) as the current portal, in TailAdmin layout. Route: /<kind route>, a document: /<kind route>?id=… (?id=new for a new draft).
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, ChevronDownIcon, DownloadIcon, FilterIcon, PlusIcon, SearchIcon, UploadIcon } from "@/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useAuth } from "@/lib/auth";
import { newId, put, refresh, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDateTime, money, sym } from "@/lib/util";
import { cn } from "@/utils";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { DateInput, RangeInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, L, SEL, TD, TH, TR } from "../ui/kit";
import { PickDialog } from "../ui/PickDialog";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";
import { addDays, csv, dmy, today, who } from "./em";

type K = { kind: string; title: string; plural: string; intro: string; loc?: 1; flow?: 1; po?: 1; count?: 1 };
export const DOC_KINDS: Record<string, K> = {
  "quantity-adjustments": { kind: "quantity", title: "Quantity Adjustment", plural: "Quantity Adjustment", loc: 1, intro: "Deduct waste, expired or damaged stock, or add stock found. Submitting updates the stock level of each item at the chosen store or warehouse." },
  "cost-adjustments": { kind: "cost", title: "Cost Adjustment", plural: "Cost Adjustment", loc: 1, intro: "Adjust your inventory value here by creating a cost adjustment transaction with the new cost of your inventory items." },
  "inventory-count": { kind: "spot", count: 1, title: "Inventory Count", plural: "Inventory Count", loc: 1, intro: "Count the stock of a store or warehouse. Submitting sets the stock level of each counted item there to the counted quantity." },
  "spot-check": { kind: "spot", title: "Inventory Spot Check", plural: "Inventory Spot Check", loc: 1, intro: "The spot check captures the count of items made by the audit team. It does not change the stock levels and is only used as a reference." },
  "po": { kind: "purchase", po: 1, title: "Purchase Order", plural: "Purchase Orders", loc: 1, flow: 1, intro: "Order stock from a supplier. Submit it for approval; once approved, create the purchasing from it to receive the goods when they arrive." },
  "purchase-orders": { kind: "purchase", title: "Purchasing", plural: "Purchasing", loc: 1, flow: 1, intro: "Order stock from a supplier. Submit it when it's sent, then receive it when the goods arrive: receiving adds the quantities that actually arrived to the store or warehouse and updates item costs." },
  "transfer-orders": { kind: "torder", title: "Transfer Order", plural: "Transfer Orders", loc: 1, flow: 1, intro: "A store asks a warehouse (or another store) for stock. The sender fulfils it by creating a transfer with the same items, which they can adjust before sending." },
  "transfers": { kind: "transfer", title: "Transfer", plural: "Transfers", loc: 1, flow: 1, intro: "Move stock between stores and warehouses. Sending takes it out of the source; receiving adds what actually arrived at the destination." },
  "production": { kind: "production", title: "Production", plural: "Production", loc: 1, intro: "Make produced items (sauces, prepped proteins, noodles…) from their ingredients. Submitting adds the produced quantity to the chosen store or warehouse and takes out the ingredients used, based on each item's ingredient list." },
  "count-sheets": { kind: "sheet", title: "Inventory Count Sheet", plural: "Count Sheet", intro: "A count sheet is a saved list of items. Pick it in Inventory Count, adjustments or spot checks to load just those items." },
};
const QA_DEF = ["Waste", "Expired", "Other"], GONE = new Set(["Customer changed mind", "Wrong item entered", "Item not available", "Kitchen mistake", "Quality complaint", "Wrong order delivered", "Late delivery", "Damaged", "Theft", "Staff meal", "Sample", "Found stock"]);
const docOf = (K: K) => (d: Row) => d.kind === K.kind && (K.kind !== "purchase" || (d.reason === "po") === !!K.po) && (K.kind !== "spot" || (d.reason === "count") === !!K.count);
const n2 = (v: any) => (+v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const fmtCost = (n: number) => money(n).replace(/(\.\d{2})$/, "$1");
const refOf = (d?: Row) => !d || !d.ref ? d?.ref || "" : d.kind === "purchase" ? String(d.ref).replace(/^P[OR]-/, d.reason === "po" ? "PO-" : "PR-") : String(d.ref);
const stTxt = (d: Row) => d.status === "closed" ? "Closed" : d.status === "pending" ? "Pending" : d.status === "rejected" ? "Declined" : "Draft";
const St = ({ d }: { d: Row }) => <Badge variant="light" color={d.status === "closed" ? "success" : d.status === "pending" ? "warning" : d.status === "rejected" ? "error" : "light"}>{stTxt(d)}</Badge>;
const nameUnit = (it: any) => { const m = /\(([^()]*)\)\s*$/.exec(it?.name || ""), u = m && /^\s*[\d.,]*\s*([a-zA-Z]+)\s*$/.exec(m[1]); return u ? u[1] : ""; };
const storUnit = (it: any) => it?.storageUnit || nameUnit(it) || "unit";
const ingUnit = (it: any) => it?.ingredientUnit || it?.storageUnit || nameUnit(it) || "unit";

/** recipe costs: an ingredient line costs qty ÷ factor × the item's unit cost; a produced item with no cost is valued at its ingredients */
function costing(items: Row[]) {
  const of = (id: string) => items.find(i => i.id === id);
  const unit = (it: any, depth = 0): number => !it ? 0 : (+it.cost || ((it.ingredients || []).length && depth < 4 ? recipe(it.ingredients, depth + 1) : 0));
  const ing = (it: any, qty: number, depth = 0) => !it ? 0 : (+qty || 0) / (+it.factor || 1) * unit(it, depth);
  const act = (l: any) => l?.action === "remove" || l?.action === "replace" ? l.action : "add";
  const recipe = (list: any[], depth = 0): number => (list || []).reduce((s, l) => s + (act(l) === "remove" ? 0 : ing(of(act(l) === "replace" ? l.withId : l.itemId), l.qty, depth)), 0);
  return { of, recipe };
}

export default function InvDocsPage() {
  const { pathname } = useLocation(), route = pathname.replace(/^\//, ""), K = DOC_KINDS[route];
  const [sp] = useSearchParams(), id = sp.get("id");
  const s = useS(["inv_docs", "inv_items", "inv_categories", "suppliers", "warehouses", "branches", "brands", "settings"]);
  if (!K) return null;
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  if (id) return <DocPage key={route + id} route={route} K={K} s={s} id={id} view={sp.get("view") || ""} />;
  return <DocList key={route} route={route} K={K} s={s} />;
}

function useLoc(s: S) {
  const locs: [string, string][] = [...s.branches.filter(b => live(b) && b.active !== false).map(b => [b.id, b.name] as [string, string]), ...s.warehouses.filter(live).map(w => [w.id, w.name + (w.reference ? ` (${w.reference})` : "")] as [string, string])];
  const locName = (id?: string) => s.branches.find(b => b.id === id)?.name || s.warehouses.find(w => w.id === id)?.name || "—";
  const locBrand = (id: string) => s.branches.find(b => b.id === id)?.brandId || s.warehouses.find(w => w.id === id)?.brandId || "";
  return { locs, locName, locBrand };
}

/* ---------------- lists ---------------- */
/* Filter on the inventory transaction lists, the fields each page has as in the portal: reference, business date, status, brand,
   places, supplier, reason, creator, submitter */
const docFltFields = (K: K): [string, string, string][] => { const f: [string, string, string][] = [["ref", "Reference", "text"], ["date", "Business Date", "range"]];
  if (K.kind === "spot" && !K.count) return [["brand", "Brand", "brand"], ["loc", "Store", "loc"], ["date", "Business Date", "range"]];
  if (K.kind === "sheet") return [];
  f.push(["status", "Status", "status"], ["brand", "Brand", "brand"]);
  if (K.kind === "purchase") f.push(["loc", "Destination", "loc"], ["sup", "Supplier", "sup"]);
  else if (K.kind === "torder") f.push(["dest", "Warehouse", "loc"], ["loc", "Destination", "loc"]);
  else f.push(["loc", "Store", "loc"]);
  if (K.kind === "quantity") f.push(["reason", "Reason", "reason"]);
  f.push(["by", "Creator", "by"]); if (!(K.kind === "spot" && K.count) && K.kind !== "cost") f.push(["sub", "Submitter", "sub"]);
  return f; };
const docDay = (d: Row) => String(d.businessDate || d.createdAt || "").slice(0, 10);
function docFltOk(s: S, K: K, f: Record<string, string>) {
  const { locBrand } = locBOf(s), has = (b: string, id?: string) => !b || !id || !locBrand(id) || locBrand(id) === b;
  return (d: Row) => (!f.ref || String(d.ref || "").toLowerCase().includes(f.ref.toLowerCase())) && (!f.from || docDay(d) >= f.from) && (!f.to || docDay(d) <= f.to)
    && (!f.status || d.status === f.status) && (!f.brand || (d.brandId ? d.brandId === f.brand : has(f.brand, d.locationId) && has(f.brand, d.destId)))
    && (!f.loc || (K.kind === "torder" ? d.locationId === f.loc : (d.locationId === f.loc || (K.kind === "transfer" && d.destId === f.loc))))
    && (!f.dest || d.destId === f.dest) && (!f.sup || d.supplierId === f.sup) && (!f.reason || d.reason === f.reason) && (!f.by || d.createdBy === f.by) && (!f.sub || d.submittedBy === f.sub); }
const locBOf = (s: S) => ({ locBrand: (id: string) => s.branches.find(b => b.id === id)?.brandId || s.warehouses.find(w => w.id === id)?.brandId || "" });
function DocFilterDialog({ K, s, f0, onClose, onApply }: { K: K; s: S; f0: Record<string, string>; onClose: () => void; onApply: (f: Record<string, string>) => void }) {
  const [f, setF] = useState<Record<string, string>>({ ...f0 }), { locBrand } = locBOf(s), set = (k: string, v: string) => setF(o => ({ ...o, [k]: v }));
  const docs = s.inv_docs.filter(d => docOf(K)(d) && live(d)), people = (k: string) => [...new Set(docs.map(d => d[k]).filter(Boolean))].sort().map(x => [x, x] as [string, string]);
  const st: [string, string][] = K.flow ? [["draft", "Draft"], ["pending", "Pending"], ["closed", "Closed"], ["rejected", "Declined"]] : [["draft", "Draft"], ["closed", "Closed"]];
  const has = (id: string) => !f.brand || !locBrand(id) || locBrand(id) === f.brand;
  const locs: [string, string][] = [...s.branches.filter(b => live(b) && b.active !== false && (!f.brand || b.brandId === f.brand)).map(b => [b.id, b.name] as [string, string]), ...s.warehouses.filter(w => live(w) && has(w.id)).map(w => [w.id, w.name] as [string, string])];
  const qa = (() => { const a: any = s.settings.find(x => x.id === "app") || {}; return a.qtyReasons == null ? QA_DEF : String(a.qtyReasons).split("\n").map((x: string) => x.trim()).filter((x: string) => x && !GONE.has(x)); })();
  const opts = (t: string): [string, string][] => t === "status" ? st : t === "brand" ? s.brands.filter(live).map(b => [b.id, b.name]) : t === "loc" ? locs : t === "sup" ? s.suppliers.filter(live).map(x => [x.id, x.name]) : t === "reason" ? qa.map((r: string) => [r, r]) : people(t === "by" ? "createdBy" : "submittedBy");
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-full p-6 sm:max-w-xl"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">Filter</DialogTitle></DialogHeader>
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{docFltFields(K).map(([k, l, t]) => t === "text" ? <F key={k} l={l}><Input className="h-11" value={f[k] || ""} onChange={e => set(k, e.target.value)} /></F>
      : t === "range" ? <F key={k} l={l} full><RangeInput from={f.from || ""} to={f.to || ""} onChange={(a, b) => setF(o => ({ ...o, from: a, to: b }))} /></F>
      : <F key={k} l={l}><select className={SEL} value={f[k] || ""} onChange={e => { const v = e.target.value; setF(o => { const n = { ...o, [k]: v }; if (k === "brand") ["loc", "dest"].forEach(x => { if (n[x] && v && locBrand(n[x]) && locBrand(n[x]) !== v) delete n[x]; }); return n; }); }}>
          <option value="">Any</option>{opts(t).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></F>)}</div>
    <div className="mt-6 flex gap-3"><Button variant="outline" onClick={() => onApply({})}>Reset</Button><Button className="ms-auto" onClick={() => onApply(Object.fromEntries(Object.entries(f).filter(([, v]) => v && String(v).trim())))}>Apply</Button></div>
  </DialogContent></Dialog>;
}
// Export: a business date range of up to 31 days, then the documents (one row each) or their items (one row per line)
function DocExportDialog({ route, K, s, lvl, onClose }: { route: string; K: K; s: S; lvl: "docs" | "items"; onClose: () => void }) {
  const [from, setFrom] = useState(addDays(today(), -6)), [to, setTo] = useState(today()), [err, setErr] = useState(""), { locName } = useLoc(s);
  const go = () => { if (!from || !to) return setErr("Pick both dates."); if (to < from) return setErr("The end date is before the start date.");
    if ((+new Date(to) - +new Date(from)) / 86400000 > 30) return setErr("The date range must be within 31 days.");
    const docs = s.inv_docs.filter(d => docOf(K)(d) && live(d) && docDay(d) >= from && docDay(d) <= to), sup = (id: string) => s.suppliers.find(x => x.id === id)?.name || "";
    if (lvl === "docs") csv(route + ".csv", [["Reference", "Name", "Store", "Destination", "Supplier", "Reason", "Status", "Business Date", "Number of Items", "Creator", "Submitter", "Created"],
      ...docs.map(d => [d.status === "draft" ? "" : refOf(d), d.name, locName(d.locationId), d.destId ? locName(d.destId) : "", d.supplierId ? sup(d.supplierId) : "", d.reason, stTxt(d), d.status === "draft" ? "" : dmy(d.businessDate || ""), (d.items || []).length, d.createdBy, d.submittedBy, fmtDateTime(d.createdAt)])]);
    else { const out: any[][] = [["Reference", "Name", "Store", "Reason", "Type", "Status", "Business Date", "Item", "SKU", "Quantity", "Cost", "Created"]];
      docs.forEach(d => (d.items || []).forEach((l: any) => { const it: any = s.inv_items.find(i => i.id === l.itemId) || {}; out.push([refOf(d), d.name, locName(d.locationId), d.reason, d.direction, stTxt(d), d.businessDate ? dmy(d.businessDate) : "", it.name, it.sku, l.qty, l.cost, fmtDateTime(d.createdAt)]); }));
      csv(route + "-items.csv", out); }
    onClose(); };
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-full p-6 sm:max-w-md"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">Export {lvl === "items" ? K.plural + " Items" : K.plural}</DialogTitle></DialogHeader>
    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please ensure that the selected date range is within 31 days for exporting.</p>
    <div className="mt-4"><F l="Business Date" req><RangeInput from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} /></F></div>
    {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={go}>Export</Button></div></DialogContent></Dialog>;
}
function DocList({ route, K, s }: { route: string; K: K; s: S }) {
  const nav = useNavigate(), { locName } = useLoc(s);
  const [tab, setTab] = useState("all"), [q, setQ] = useState(""), [nw, setNw] = useState(false), [f, setF] = useState<Record<string, string>>({}), [fOpen, setFOpen] = useState(false), [ex, setEx] = useState<"" | "docs" | "items">("");
  const all0 = s.inv_docs.filter(d => docOf(K)(d) && live(d)), fOk = docFltOk(s, K, f), all = all0.filter(fOk), qq = q.trim().toLowerCase(), nF = Object.values(f).filter(Boolean).length;
  const match = (d: Row) => !qq || (refOf(d) + " " + (d.name || "") + " " + locName(d.locationId) + " " + locName(d.destId) + " " + (s.suppliers.find(x => x.id === d.supplierId)?.name || "")).toLowerCase().includes(qq);
  const supName = (id: string) => s.suppliers.find(x => x.id === id)?.name || "—";
  const fmtD = (v?: string) => v ? dmy(v) : "—";
  type R = { d: Row; v?: string; cells: React.ReactNode[] };
  let tabs: [string, string][] = [], head: string[] = [], rows: R[] = [];
  if (K.kind === "production") {
    tabs = [["all", "All"], ["production", "Production"], ["consumption", "Consumption"], ["waste", "Waste"]]; head = ["Reference", "Destination", "Type", "Status", "Business Date", "Created"];
    const rf = (d: Row, p: string) => d.status === "draft" || !d.ref ? "—" : String(d.ref).replace(/^[A-Z]+-/, p + "-"), out: (R & { at: string; o: number })[] = [];
    all.filter(match).forEach(d => { const c = d.status === "closed", bd = c ? fmtD(d.businessDate) : "—";
      if (tab === "all" || tab === "production") out.push({ d, at: d.createdAt, o: 1, cells: [rf(d, "PRD"), locName(d.locationId), "Production", c ? "Closed" : "Draft", bd, fmtDateTime(d.createdAt)] });
      if (c && (tab === "all" || tab === "consumption")) out.push({ d, v: "pc", at: d.submittedAt || d.createdAt, o: 0, cells: [rf(d, "PC"), locName(d.locationId), "Consumption From Production", "Closed", bd, fmtDateTime(d.submittedAt || d.createdAt)] });
      if (c && (+d.waste > 0 || (d.items || []).some((l: any) => +l.waste > 0)) && (tab === "all" || tab === "waste")) out.push({ d, v: "pw", at: d.submittedAt || d.createdAt, o: -1, cells: [rf(d, "PW"), locName(d.locationId), "Waste From Production", "Closed", bd, fmtDateTime(d.submittedAt || d.createdAt)] }); });
    rows = out.sort((a, b) => String(b.at).localeCompare(String(a.at)) || a.o - b.o);
  } else if (K.kind === "transfer") {
    tabs = [["all", "All"], ["sending", "Sending"], ["receiving", "Receiving"], ["return", "Transfer Return"]]; head = ["Reference", "Source", "Destination", "TO Reference", "Type", "Status", "Business Date", "Receiving Due Date", "Created"];
    const rf = (d: Row, p: string) => d.status === "draft" || !d.ref ? "—" : String(d.ref).replace(/^TRS?R?-/, p + "-"), out: (R & { at: string; r: number })[] = [];
    const toRef = (d: Row) => { const t = d.linkedId && s.inv_docs.find(x => x.id === d.linkedId && x.kind === "torder"); return t ? t.ref || "—" : "—"; };
    all.filter(match).forEach(d => { const ret = d.reason === "return", due = d.deliveryAt ? fmtD(String(d.deliveryAt).slice(0, 10)) : "—";
      if (tab === "all" || (tab === "sending" && !ret) || (tab === "return" && ret)) out.push({ d, at: d.submittedAt || d.createdAt, r: 1, cells: [rf(d, ret ? "TRT" : "TRS"), locName(d.locationId), locName(d.destId), toRef(d), ret ? "Transfer Return" : "Transfer Sending",
        d.status === "draft" ? "Draft" : !ret || d.status === "closed" ? "Closed" : d.status === "rejected" ? "Declined" : "Pending", d.status === "draft" ? "—" : fmtD(d.submittedAt || d.businessDate), due, fmtDateTime(d.createdAt)] });
      if (d.status !== "draft" && !ret && (tab === "all" || tab === "receiving")) out.push({ d, at: d.submittedAt || d.createdAt, r: 0, cells: [rf(d, "TRR"), locName(d.locationId), locName(d.destId), toRef(d), "Transfer Receiving",
        d.status === "closed" ? "Closed" : d.status === "rejected" ? "Declined" : "Pending", d.status === "closed" ? fmtD(d.receivedAt || d.businessDate) : "—", due, fmtDateTime(d.createdAt)] }); });
    rows = out.sort((a, b) => String(b.at).localeCompare(String(a.at)) || a.r - b.r);
  } else {
    tabs = K.kind === "sheet" ? [] : K.flow ? [["all", "All"], ["draft", "Draft"], ["pending", "Pending"], ["closed", "Closed"], ["rejected", "Declined"]] : [["all", "All"], ["draft", "Draft"], ["closed", "Closed"]];
    const poRef = (d: Row) => { const p = d.linkedId && s.inv_docs.find(x => x.id === d.linkedId && x.reason === "po"); return p ? refOf(p) : "—"; };
    const cols: [string, (d: Row) => React.ReactNode][] = K.kind === "sheet" ? [["Reference", d => d.ref || "…"], ["Name", d => <b className="font-medium text-gray-800 dark:text-white/90">{d.name || "—"}</b>], ["Created At", d => fmtDateTime(d.createdAt)]]
      : K.flow ? [["Reference", d => d.status === "draft" || !d.ref ? "—" : refOf(d)],
        ...(K.kind === "purchase" ? [["Supplier", (d: Row) => supName(d.supplierId)], ["Destination", (d: Row) => locName(d.locationId)], ...(K.po ? [] : [["PO Reference", poRef]])] as any : K.kind === "torder" ? [["Source", (d: Row) => locName(d.destId)], ["Destination", (d: Row) => locName(d.locationId)]] : [["Source", (d: Row) => locName(d.locationId)], ["Destination", (d: Row) => locName(d.destId)]]),
        ["Status", d => <St d={d} />], ...(K.kind === "purchase" ? [["Total", (d: Row) => money((d.items || []).reduce((t: number, l: any) => t + (+l.qty || 0) * (+l.cost || 0), 0))]] as any : []),
        ["Business Date", d => d.status === "draft" ? "—" : fmtD(d.businessDate)], ["Created", d => fmtDateTime(d.createdAt)]]
      : [["Reference", d => d.status === "draft" || !d.ref ? "—" : d.ref], ...(K.loc ? [["Destination", (d: Row) => locName(d.locationId)]] as any : []), ...(K.kind === "quantity" ? [["Reason", (d: Row) => (d.reason || "—") + (d.direction === "add" ? " (added)" : "")]] as any : []),
        ...(K.kind === "cost" ? [["Items", (d: Row) => { const n = (d.items || []).map((l: any) => s.inv_items.find(i => i.id === l.itemId)?.name).filter(Boolean); return n.length ? n.slice(0, 2).join(", ") + (n.length > 2 ? ` +${n.length - 2} more` : "") : "—"; }]] as any : []),
        ["Status", d => <St d={d} />], ["Business Date", d => d.status === "draft" ? "—" : fmtD(d.businessDate)], ["Created", d => fmtDateTime(d.createdAt)]];
    head = cols.map(c => c[0]);
    rows = all.filter(d => (tab === "all" || d.status === tab) && match(d)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(d => ({ d, cells: cols.map(c => c[1](d)) }));
  }
  const title = K.kind === "production" ? "Inventory Production" : K.kind === "transfer" ? "Inventory Transfers" : K.plural;
  return (
    <>
      <PageBreadcrumb pageTitle={title} />
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{K.intro}</p>
      <div className={BOX}>
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          {tabs.length ? <SegTabs value={tab} onChange={setTab} items={tabs} /> : <span />}
          <div className="flex flex-col gap-3 sm:flex-row"><InputGroup className="h-11 sm:w-60"><InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon><InputGroupInput placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} /></InputGroup>
            {docFltFields(K).length > 0 && <Button variant="outline" onClick={() => setFOpen(true)}><FilterIcon className="size-5" />Filter{nF ? <Badge variant="solid" color="primary" className="ms-1">{nF}</Badge> : null}</Button>}
            <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" />}><DownloadIcon className="size-5" />Export<ChevronDownIcon className="size-4" /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-2"><DropdownMenuItem onClick={() => setEx("docs")}>Export {K.plural}</DropdownMenuItem>{K.kind !== "sheet" && <DropdownMenuItem onClick={() => setEx("items")}>Export {K.plural} Items</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
            <Button onClick={() => K.kind === "cost" ? nav(`/${route}?id=new`) : setNw(true)}><PlusIcon className="size-5" />New {K.title}</Button></div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {!rows.length ? <EmptyState text={all0.length ? "Nothing matches." : `No ${K.plural.toLowerCase()} yet.`} />
            : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>{head.map(h => <th key={h} className={TH + (h === "Total" ? " text-end" : "")}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">{rows.map((r, i) => <tr key={r.d.id + (r.v || "") + i} className={TR} onClick={() => nav(`/${route}?id=${r.d.id}${r.v ? "&view=" + r.v : ""}`)}>
                {r.cells.map((c, j) => <td key={j} className={TD + (head[j] === "Total" ? " text-end" : "")}>{c}</td>)}</tr>)}</tbody></table>}
        </div>
      </div>
      {nw && <NewDialog route={route} K={K} s={s} onClose={() => setNw(false)} />}
      {fOpen && <DocFilterDialog K={K} s={s} f0={f} onClose={() => setFOpen(false)} onApply={v => { setF(v); setFOpen(false); }} />}
      {ex && <DocExportDialog route={route} K={K} s={s} lvl={ex} onClose={() => setEx("")} />}
    </>
  );
}

/** New transaction: a small dialog asks the essentials, then the draft opens (it is saved with Save Draft) */
function NewDialog({ route, K, s, onClose }: { route: string; K: K; s: S; onClose: () => void }) {
  const nav = useNavigate(), { locs, locBrand } = useLoc(s);
  const bl = s.brands.filter(b => live(b) && b.active !== false), PUR = K.kind === "purchase" && !K.po;
  const [v, setV] = useState<Record<string, string>>({ brand: bl.length === 1 ? bl[0].id : "", sup: "", loc: "", dest: "", ttype: "", due: "", name: "", notes: "", reason: "", del: today() }), [err, setErr] = useState("");
  const set = (k: string, x: string) => setV(p => ({ ...p, [k]: x }));
  const qa = (() => { const a: any = s.settings.find(x => x.id === "app") || {}; return a.qtyReasons == null ? QA_DEF : String(a.qtyReasons).split("\n").map((x: string) => x.trim()).filter((x: string) => x && !GONE.has(x)); })();
  // a store passes the brand; warehouses with no brand serve every brand; a warehouse only serves the stores of its brand
  const okLoc = (id: string, other: string) => (!v.brand || !locBrand(id) || locBrand(id) === v.brand) && id !== other && (!other || !locBrand(other) || !locBrand(id) || locBrand(other) === locBrand(id));
  const sel = (k: string, l: string, opts: [string, string][], other = "") => <F l={l} req><select className={SEL} value={v[k]} onChange={e => set(k, e.target.value)}><option value="">Choose…</option>{opts.filter(([id]) => k === "sup" || okLoc(id, other)).map(([id, t]) => <option key={id} value={id}>{t}</option>)}</select></F>;
  const sups: [string, string][] = s.suppliers.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(x => [x.id, x.name]);
  const fields: React.ReactNode[] = [];
  if (K.loc && !PUR) fields.push(<F key="b" l="Brand"><select className={SEL} value={v.brand} onChange={e => setV(p => ({ ...p, brand: e.target.value, loc: "", dest: "" }))}><option value="">All Brands</option>{bl.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></F>);
  if (K.kind === "purchase") fields.push(...(K.po ? [<div key="l">{sel("loc", "Destination", locs)}</div>, <div key="s">{sel("sup", "Supplier", sups)}</div>] : [<div key="s">{sel("sup", "Supplier", sups)}</div>, <div key="l">{sel("loc", "Destination", locs)}</div>]));
  else if (K.kind === "transfer") fields.push(<F key="t" l="Type" req><select className={SEL} value={v.ttype} onChange={e => set("ttype", e.target.value)}><option value="">Transfer</option><option value="return">Transfer Return</option></select></F>,
    <div key="l">{sel("loc", "Source", locs, v.dest)}</div>, <div key="d">{sel("dest", "Destination", locs, v.loc)}</div>, <F key="due" l="Receiving Due Date"><DateInput value={v.due} onChange={x => set("due", x)} /></F>);
  else if (K.kind === "torder") fields.push(<div key="d">{sel("dest", "Source", locs, v.loc)}</div>, <div key="l">{sel("loc", "Destination", locs, v.dest)}</div>);
  else if (K.kind === "sheet") fields.push(<F key="n" l="Name" req><Input className="h-11" value={v.name} onChange={e => set("name", e.target.value)} /></F>);
  else if (K.loc) fields.push(<div key="l">{sel("loc", "Destination", locs)}</div>);
  if (K.po) fields.push(<F key="dd" l="Delivery Date"><DateInput value={v.del} onChange={x => set("del", x)} /></F>);
  if (K.po || (K.kind === "spot" && !K.count)) fields.push(<F key="no" l="Notes"><Textarea rows={3} value={v.notes} onChange={e => set("notes", e.target.value)} /></F>);
  if (K.kind === "quantity") fields.push(<F key="r" l="Reason" req><select className={SEL} value={v.reason} onChange={e => set("reason", e.target.value)}><option value="">Choose…</option>{qa.map(r => <option key={r}>{r}</option>)}</select></F>);
  function go() {
    const need = [K.kind === "purchase" && "sup", K.loc && "loc", (K.kind === "transfer" || K.kind === "torder") && "dest", K.kind === "sheet" && "name", K.kind === "quantity" && "reason"].filter(Boolean) as string[];
    if (need.some(k => !v[k].trim())) return setErr("Fill in every field marked *.");
    if (v.dest && v.dest === v.loc) return setErr("Source and destination must be different.");
    sessionStorage.setItem("skwyd-newdoc", JSON.stringify({ route, supplierId: v.sup || undefined, locationId: v.loc || undefined, destId: v.dest || undefined, name: v.name.trim() || undefined, reason: K.kind === "transfer" ? v.ttype : v.reason || undefined,
      notes: v.notes.trim() || undefined, deliveryAt: K.po && v.del ? new Date(v.del + "T00:00:00").toISOString() : K.kind === "transfer" && v.due ? v.due + "T12:00:00" : undefined }));
    onClose(); nav(`/${route}?id=new`);
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-6 sm:max-w-md sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white/90">New {PUR ? "Purchase" : K.title}</DialogTitle></DialogHeader>
        <div className="mt-6 space-y-5">{fields}{err && <p className="text-sm text-red-500">{err}</p>}</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={go}>Save</Button></div>
      </DialogContent>
    </Dialog>);
}

/* ---------------- a document ---------------- */
function DocPage({ route, K, s, id, view }: { route: string; K: K; s: S; id: string; view: string }) {
  const nav = useNavigate(), { staff } = useAuth(), { locs, locName } = useLoc(s), C = costing(s.inv_items);
  const by = who(staff), itemOf = (i: string) => s.inv_items.find(x => x.id === i);
  const [d, setD] = useState<any>(() => {
    if (id !== "new") { const x = s.inv_docs.find(y => y.id === id); return x ? JSON.parse(JSON.stringify({ ...x, items: Array.isArray(x.items) ? x.items : [] })) : null; }
    const pre = (() => { try { const p = JSON.parse(sessionStorage.getItem("skwyd-newdoc") || "{}"); return p.route === route ? p : {}; } catch { return {}; } })(); sessionStorage.removeItem("skwyd-newdoc");
    const { route: _r, ...rest } = pre; const clean = Object.fromEntries(Object.entries(rest).filter(([, x]) => x !== undefined));
    return { id: null, kind: K.kind, status: "draft", items: [], businessDate: today(), direction: "deduct", reason: K.kind === "quantity" ? "Waste" : K.po ? "po" : K.count ? "count" : "", locationId: "", name: "", notes: "", createdBy: by, createdAt: new Date().toISOString(),
      destId: K.kind === "torder" ? s.warehouses.filter(live)[0]?.id || "" : undefined, ...clean, ...(K.kind === "transfer" && pre.reason === "" ? { reason: "" } : {}) };
  });
  const [stock, setStock] = useState<Record<string, Record<string, number>> | null>(null), [recv, setRecv] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [dlg, setDlg] = useState<any>(null);
  const loadStock = async () => { const { data, error } = await sb.rpc("skwyd_stock_all"); if (error) { toast("Couldn't load stock levels", "error"); setStock({}); return; } const m: any = {}; (data || []).forEach((r: any) => (m[r.location_id] ||= {})[r.item_id] = +r.qty); setStock(m); };
  useEffect(() => { if (K.loc || K.kind === "cost") loadStock(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // the saved row brings the server's reference and the consumption once submitted
  const saved = d?.id && s.inv_docs.find(x => x.id === d.id);
  useEffect(() => { if (saved && d && !busy && ((saved.ref && !d.ref) || (Array.isArray(saved.consumed) && saved.consumed.length && !(d.consumed || []).length))) setD((o: any) => ({ ...o, ref: o.ref || saved.ref, consumed: saved.consumed?.length ? saved.consumed : o.consumed })); }, [saved?.ref, saved?.consumed?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <><PageBreadcrumb pageTitle={K.title} /><EmptyState text="This document isn't there anymore."><Button variant="outline" onClick={() => nav("/" + route)}>Back</Button></EmptyState></>;
  const ro = d.status !== "draft", loc = d.locationId, stockOf = (l: string, item: string) => stock?.[l]?.[item];
  const isRecv = !!K.flow && d.status === "pending" && K.kind !== "torder";
  const rv = recv || (isRecv ? d.items.map((l: any) => ({ qty: l.qty ?? "", cost: l.cost ?? itemOf(l.itemId)?.cost ?? "" })) : null);
  const up = (p: any) => setD((o: any) => ({ ...o, ...p })), setLine = (ix: number, p: any) => setD((o: any) => ({ ...o, items: o.items.map((l: any, j: number) => j === ix ? { ...l, ...p } : l) }));
  const supName = (sid: string) => s.suppliers.find(x => x.id === sid)?.name || "—";
  const pv = K.kind === "production" && ro ? view : "";

  async function saveDoc(silent = false) {
    if (K.kind === "sheet" && !d.name) { setErr("Give the count sheet a name."); return null; }
    const items = d.items.map((l: any) => { const it = itemOf(l.itemId) || {} as any, o: any = { itemId: l.itemId };
      if (K.kind === "quantity") { o.qty = l.qty === "" || l.qty == null ? null : +l.qty; o.cost = +it.cost || 0; }
      if (K.kind === "cost") { o.cost = l.cost === "" || l.cost == null ? null : +l.cost; o.old = it.cost ?? null; }
      if (K.kind === "production") { o.qty = l.qty === "" || l.qty == null ? null : +l.qty; o.cost = +C.recipe(it.ingredients).toFixed(5); }
      if (K.kind === "spot") { o.qty = l.qty === "" || l.qty == null ? null : +l.qty; const st = stockOf(d.locationId, l.itemId); o.sys = st === undefined ? null : st; if (K.count) o.cost = +it.cost || 0; }
      if (K.flow) { o.qty = l.qty === "" || l.qty == null ? null : +l.qty; if (K.kind === "purchase") o.cost = l.cost === "" || l.cost == null ? (+it.cost || 0) : +l.cost; }
      return o; });
    const data: any = { kind: d.kind, name: d.name || null, ...(K.kind === "purchase" ? { additionalCost: +d.additionalCost || 0 } : {}), ...(K.po || K.kind === "transfer" ? { deliveryAt: d.deliveryAt || null } : {}),
      locationId: d.locationId || null, reason: d.reason || null, direction: d.direction || "deduct", businessDate: d.businessDate || null, items, notes: d.notes || null };
    if (K.flow) { data.supplierId = d.supplierId || null; data.destId = d.destId || null; }
    const did = d.id || newId("idoc"); if (!d.id) { data.status = "draft"; data.createdBy = by; }
    try { await put("inv_docs", did, data); setD((o: any) => ({ ...o, ...data, id: did, items })); if (!d.id) nav(`/${route}?id=${did}`, { replace: true }); if (!silent) toast(K.kind === "sheet" ? "Count sheet saved" : "Draft saved"); return did; }
    catch (e: any) { setErr("Couldn't save: " + (e.message || e)); return null; }
  }
  async function submit() {
    if (K.loc && !d.locationId) return setErr("Choose a store or warehouse.");
    const bad = d.items.filter((l: any) => K.kind === "cost" ? (l.cost === "" || l.cost == null) : (l.qty === "" || l.qty == null || (K.kind !== "spot" && !(+l.qty > 0))));
    if (bad.length) return setErr(K.kind === "cost" ? `Enter a new cost for every item (${bad.length} missing), or remove those rows.` : `Every quantity must be more than 0 (${bad.length} item${bad.length === 1 ? "" : "s"}). Enter it or remove the row.`);
    if (K.kind === "production") { const none = d.items.filter((l: any) => !(itemOf(l.itemId)?.ingredients || []).length).map((l: any) => itemOf(l.itemId)?.name); if (none.length) return setErr(`Add ingredients first for: ${none.join(", ")} (Inventory → Items → open the item).`); }
    if (!(await askYes("Are you sure you want to submit this?", "Submit"))) return;
    const did = await saveDoc(true); if (!did) return;
    setBusy(true); setErr("");
    if (K.count) { // an inventory count: the counted quantities become the stock levels there
      const now = new Date().toISOString();
      const { error } = await sb.from("stock_counts").insert(d.items.map((l: any) => ({ branch_id: d.locationId, item_id: l.itemId, qty: +l.qty, counted_at: now, counted_by: by, batch: did, note: d.ref || null })));
      if (error) { setBusy(false); return setErr("Couldn't submit: " + error.message); }
      try { await put("inv_docs", did, { status: "closed", submittedAt: now, submittedBy: by }); } catch { /* the list refreshes */ }
      let ref = d.ref; try { const { data: r } = await sb.from("inventory_docs").select("ref").eq("id", did).single(); if ((r as any)?.ref) ref = (r as any).ref; } catch { /* keep */ }
      setBusy(false); up({ status: "closed", submittedAt: now, submittedBy: by, ref }); toast(`${ref || "Inventory count"} submitted`); loadStock(); return;
    }
    const { data, error } = await sb.rpc("skwyd_close_inv_doc", { p_id: did, p_by: by }); setBusy(false);
    if (error) return setErr("Couldn't submit: " + error.message + (/permission|policy/i.test(error.message) ? " (only owners and admins can change item costs)" : ""));
    up({ status: "closed", submittedAt: new Date().toISOString(), submittedBy: by, ref: (data as any)?.ref || d.ref }); toast(`${(data as any)?.ref || "Document"} submitted`); refresh("inv_docs"); refresh("inv_items"); loadStock();
  }
  async function flow(action: string) {
    setErr("");
    if (action === "recvnow") { // Purchasing: a draft is received in one step at the quantities and costs entered
      if (!d.locationId || !d.supplierId) return setErr("Choose the supplier and the store (Edit).");
      if (d.items.some((l: any) => !(+l.qty > 0))) return setErr("Every quantity must be more than 0. Enter it or remove the row.");
      if (!(await askYes("Are you sure you want to receive these items?", "Receive"))) return;
      const did = await saveDoc(true); if (!did) return; setBusy(true);
      const lines = d.items.map((l: any) => ({ itemId: l.itemId, qty: +l.qty || 0, cost: +(l.cost ?? itemOf(l.itemId)?.cost ?? 0) || 0, ordered: +l.qty || 0 }));
      let r = await sb.rpc("skwyd_doc_action", { p_id: did, p_action: "submit", p_by: by, p_lines: null });
      if (!r.error) r = await sb.rpc("skwyd_doc_action", { p_id: did, p_action: "receive", p_by: by, p_lines: lines });
      setBusy(false); if (r.error) return setErr("Couldn't receive: " + r.error.message);
      up({ status: "closed", items: lines, submittedAt: new Date().toISOString(), submittedBy: by, receivedAt: new Date().toISOString(), receivedBy: by }); setRecv(null); toast("Items received"); refresh("inv_docs"); refresh("inv_items"); return loadStock();
    }
    if (action === "submit") {
      if (!d.locationId || (K.kind === "purchase" && !d.supplierId) || (K.kind !== "purchase" && !d.destId)) return setErr(K.kind === "purchase" ? "Choose the supplier and where it's delivered." : "Choose where it comes from and where it goes.");
      if (d.items.some((l: any) => !(+l.qty > 0))) return setErr("Every quantity must be more than 0. Enter it or remove the row.");
      if (!(await askYes(K.kind === "transfer" ? "Are you sure you want to send this?" : "Are you sure you want to submit this?", K.kind === "transfer" ? "Send" : "Submit"))) return;
      if (!(await saveDoc(true))) return;
    }
    if (action === "reject" && !(await askYes("Are you sure you want to decline this?", "Decline", true))) return;
    if (action === "fulfil" && !(await askYes("Are you sure you want to accept this?", "Accept"))) return;
    if (action === "approve") { // purchase order approved: a purchasing draft with the same supplier, place and items
      if (!(await askYes("Are you sure you want to approve this?", "Approve"))) return;
      setBusy(true); const pid = newId("idoc"), now = new Date().toISOString();
      try { await put("inv_docs", pid, { kind: "purchase", status: "draft", locationId: d.locationId, supplierId: d.supplierId || null, businessDate: today(), direction: "deduct", reason: null, notes: null, linkedId: d.id, createdBy: by,
          items: d.items.map((l: any) => ({ itemId: l.itemId, qty: +l.qty || 0, cost: l.cost ?? (+(itemOf(l.itemId)?.cost) || 0) })) });
        await put("inv_docs", d.id, { status: "closed", linkedId: pid, receivedBy: by, receivedAt: now }); up({ status: "closed", linkedId: pid, receivedBy: by, receivedAt: now }); toast("Approved. The purchasing is created as a draft."); }
      catch (e: any) { setErr("Couldn't approve: " + (e.message || e)); }
      return setBusy(false);
    }
    let lines: any = null;
    if (action === "receive") { lines = d.items.map((l: any, ix: number) => ({ itemId: l.itemId, qty: +rv![ix].qty || 0, ...(K.kind === "purchase" ? { cost: +rv![ix].cost || 0 } : {}), ordered: +l.qty || 0 }));
      if (!(await askYes("Are you sure you want to receive these items?", "Receive"))) return; }
    setBusy(true);
    const { data, error } = await sb.rpc("skwyd_doc_action", { p_id: d.id, p_action: action, p_by: by, p_lines: lines }); setBusy(false);
    if (error) return setErr("Couldn't do that: " + error.message);
    const now = new Date().toISOString();
    if (action === "submit") { up({ status: "pending", submittedAt: now, submittedBy: by }); toast(K.kind === "transfer" ? "Transfer sent" : "Submitted"); }
    if (action === "receive") { up({ status: "closed", items: lines, receivedAt: now, receivedBy: by }); setRecv(null); toast("Received"); }
    if (action === "reject") { up({ status: "rejected" }); toast("Declined"); }
    if (action === "fulfil") { up({ status: "closed", linkedId: (data as any)?.transfer, receivedBy: by, receivedAt: now }); toast("Transfer created as a draft. Check it and press Send."); try { await put("inv_docs", d.id, { linkedId: (data as any)?.transfer }); } catch { /* shown on reload */ } }
    refresh("inv_docs"); refresh("inv_items"); loadStock();
  }
  async function del() { if (!d.id || !(await askYes(`Delete ${d.ref || "this draft"}?`, "Delete", true))) return; try { await put("inv_docs", d.id, { deleted: true }); toast("Deleted"); nav("/" + route); } catch { toast("Couldn't delete", "error"); } }
  function addItems(ids: string[]) { const have = new Set(d.items.map((l: any) => l.itemId)), add: any[] = [];
    ids.forEach(i => { const it = itemOf(i); if (!have.has(i) && it && (K.kind !== "production" || (it.ingredients || []).length)) { add.push({ itemId: i, qty: K.kind === "sheet" ? 0 : "", cost: K.kind === "cost" ? (it.cost ?? "") : undefined }); have.add(i); } });
    up({ items: [...d.items, ...add] }); return add.length; }
  function importCsv() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".csv,text/csv";
    inp.onchange = async () => { const f = inp.files?.[0]; if (!f) return; const text = await f.text(), lines = text.split(/\r?\n/).filter(Boolean); if (!lines.length) return;
      const split = (l: string) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map(x => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()).slice(0, -1);
      const hd = split(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, "")), col = (...ks: string[]) => hd.findIndex(h => ks.includes(h));
      const cSku = col("inventoryitemsku", "sku"), cName = col("inventoryitemname", "name", "item"), cQty = col("storagequantity", "quantity", "qty", "countedquantity", "counted"), cCost = col("cost", "unitcost", "newcost", "totalcost");
      const items = [...d.items], miss: string[] = []; let n = 0; const lv = s.inv_items.filter(live);
      for (const l of lines.slice(1)) { const r = split(l), sku = cSku >= 0 ? r[cSku] : "", nm = cName >= 0 ? r[cName] : "";
        const it = (sku && lv.find(i => String(i.sku || "").toLowerCase() === sku.toLowerCase())) || (nm && lv.find(i => String(i.name || "").toLowerCase() === nm.toLowerCase()));
        if (!it || (K.kind === "production" && !(it.ingredients || []).length)) { miss.push(sku || nm || "?"); continue; }
        let x = items.find(y => y.itemId === it.id); if (!x) { x = { itemId: it.id, qty: K.kind === "sheet" ? 0 : "" }; if (K.kind === "cost") x.cost = it.cost ?? ""; items.push(x); }
        const q = cQty >= 0 ? r[cQty] : "", c = cCost >= 0 ? r[cCost] : ""; if (q !== "" && !isNaN(+q)) x.qty = +q; if (c !== "" && !isNaN(+c) && (K.kind === "cost" || K.kind === "purchase")) x.cost = +c; n++; }
      up({ items }); if (n) toast(`${n} item${n === 1 ? "" : "s"} imported`); if (miss.length) toast(`Not found or not allowed here: ${miss.slice(0, 5).join(", ")}${miss.length > 5 ? ` and ${miss.length - 5} more` : ""}`, "error"); else if (!n) toast("No items found in the file. Use the columns SKU (or Name) and Quantity.", "error"); };
    inp.click();
  }
  function print() {
    const w = window.open("", "_blank", "width=820,height=900"); if (!w) return toast("Allow pop-ups to print", "error");
    const e = (x: any) => String(x ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const rows = d.items.map((l: any) => { const it = itemOf(l.itemId) || {} as any; return `<tr><td>${e(it.name)}</td><td>${e(it.sku)}</td><td>${e(storUnit(it))}</td>${K.kind === "sheet" ? `<td>____ ${e(ingUnit(it))}</td>` : K.kind === "cost" ? `<td>${e(l.cost)}</td>` : `<td>${e(l.qty)}</td>`}</tr>`; }).join("");
    w.document.write(`<!doctype html><title>${e(d.ref || d.name || K.title)}</title><style>body{font:13px/1.4 Outfit,Arial,sans-serif;padding:24px;color:#1d2939}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d0d5dd;padding:8px;text-align:left}th{background:#f2f4f7}</style>
      <h2>${e(K.title)} ${e(refOf(d))}${d.name ? " — " + e(d.name) : ""}</h2><p>${K.loc ? "Location: " + e(locName(d.locationId)) + " · " : ""}${d.reason && d.reason !== "po" && d.reason !== "count" ? "Reason: " + e(d.reason) + " · " : ""}${d.businessDate ? "Date: " + e(dmy(d.businessDate)) : ""}</p>
      <table><thead><tr><th>Name</th><th>SKU</th><th>Unit</th><th>${K.kind === "sheet" || K.kind === "spot" ? "Counted" : K.kind === "cost" ? "New cost" : "Quantity"}</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
  }

  // header
  const title = (() => { const r = refOf(d), px = ({ pc: "PC", pw: "PW" } as any)[pv] || (K.kind === "production" ? "PRD" : ""); return r ? (px ? r.replace(/^[A-Z]+-/, px + "-") : r) : pv === "pc" ? "Consumption From Production" : pv === "pw" ? "Waste From Production" : "New " + K.title.toLowerCase(); })();
  const prodCost = () => ro && (d.consumed || []).length ? d.consumed.reduce((t: number, c: any) => t + (+c.qty || 0) * (+c.cost || 0), 0) : d.items.reduce((t: number, l: any) => t + (+l.qty || 0) * (ro && l.cost != null ? +l.cost : C.recipe(itemOf(l.itemId)?.ingredients)), 0);
  const B = busy;
  const flowBtns = !K.flow ? null : d.status === "draft" ? (K.kind === "purchase" && !K.po ? <Button disabled={B || !d.items.length} onClick={() => flow("recvnow")}>{B ? "Working…" : "Receive Items"}</Button> : <Button disabled={B || !d.items.length} onClick={() => flow("submit")}>{B ? "Working…" : K.kind === "transfer" ? "Send Items" : "Submit For Review"}</Button>)
    : d.status !== "pending" ? null : K.po ? <><Button variant="destructive" disabled={B} onClick={() => flow("reject")}>Decline</Button><Button disabled={B} onClick={() => flow("approve")}>{B ? "Working…" : "Approve"}</Button></>
    : K.kind === "torder" ? <><Button variant="destructive" disabled={B} onClick={() => flow("reject")}>Decline</Button><Button disabled={B} onClick={() => flow("fulfil")}>Accept</Button></>
    : <>{K.kind === "purchase" && <Button variant="destructive" disabled={B} onClick={() => flow("reject")}>Decline</Button>}<Button disabled={B} onClick={() => flow("receive")}>{B ? "Working…" : "Receive Items"}</Button></>;
  // the document's summary
  const lnk = (r: string, lid: string) => <button type="button" className="text-brand-500 hover:underline" onClick={() => nav(`/${r}?id=${lid}`)}>{refOf(s.inv_docs.find(x => x.id === lid)) || "Open"}</button>;
  const info: [string, React.ReactNode][] = K.flow ? [
    ...(K.kind === "purchase" ? [["Supplier", supName(d.supplierId)]] as any : []),
    ...(K.kind === "torder" ? [["Source", locName(d.destId)], ["Destination", locName(d.locationId)]] : [[K.kind === "purchase" ? "Destination" : "Source", locName(d.locationId)], ...(K.kind !== "purchase" ? [["Destination", locName(d.destId)]] : [])]),
    ["Business Date", d.status === "draft" ? "—" : dmy(d.businessDate)], ["Creator", d.createdBy || "—"], ["Created At", fmtDateTime(d.createdAt)],
    ...(K.po ? [["Delivery Date", d.deliveryAt ? fmtDateTime(d.deliveryAt) : "—"]] as any : []),
    ...(K.kind === "transfer" ? [["Type", d.reason === "return" ? "Transfer Return" : "Transfer"], ["Receiving Due Date", d.deliveryAt ? dmy(String(d.deliveryAt).slice(0, 10)) : "—"]] as any : []),
    ...(K.kind === "purchase" && +d.additionalCost ? [["Additional Cost", money(+d.additionalCost)]] as any : []),
    ...(K.kind === "purchase" ? [[K.po ? "Purchase Order Total Cost" : "Total Cost", money(d.items.reduce((a: number, l: any) => a + (+l.qty || 0) * (+(l.cost ?? itemOf(l.itemId)?.cost) || 0), 0) + (+d.additionalCost || 0))]] as any : []),
    [K.kind === "transfer" ? "Sent by" : "Submitted by", d.submittedBy || "—"], [K.kind === "transfer" ? "Sent At" : "Submitted At", fmtDateTime(d.submittedAt)],
    [K.kind === "torder" ? "Fulfilled by" : "Received by", d.receivedBy || "—"], [K.kind === "torder" ? "Fulfilled At" : "Received At", fmtDateTime(d.receivedAt)], ["Number of Items", d.items.length],
    ...(d.linkedId ? [[K.kind === "purchase" ? (K.po ? "Purchasing" : "Purchase Order") : K.kind === "torder" ? "Transfer" : "Transfer Order", lnk(K.kind === "purchase" ? (K.po ? "purchase-orders" : "po") : K.kind === "torder" ? "transfers" : "transfer-orders", d.linkedId)]] as any : []),
    ...(d.notes ? [["Notes", d.notes]] as any : [])]
    : [...(K.kind === "sheet" ? [["Name", d.name || "—"], ["Reference", d.ref || "—"]] as any : []), ...(K.loc ? [["Destination", locName(loc)]] as any : []),
      ...(K.kind === "quantity" ? [["Reason", (d.reason || "—") + (d.direction === "add" ? " (added)" : " (deducted)")]] as any : []),
      ...(K.kind !== "sheet" ? [["Business Date", ro ? dmy(d.businessDate) : "—"], ["Creator", d.createdBy || "—"], ...(ro ? [["Submitter", d.submittedBy || "—"], ["Submitted At", fmtDateTime(d.submittedAt)]] : [])] as any : []),
      ["Created At", fmtDateTime(d.createdAt)], ...(K.kind === "production" && pv !== "pw" ? [["Total Cost", fmtCost(prodCost())]] as any : []),
      ["Number of Items", pv === "pc" ? (d.consumed || []).length : pv === "pw" ? d.items.filter((l: any) => +l.waste > 0).length : d.items.length], ...(d.notes ? [["Notes", d.notes]] as any : [])];
  // where a flow document is: draft → submitted → done
  const steps = K.flow ? (() => { const st = d.status || "draft", bad = ["declined", "rejected", "void"].includes(st), at = bad ? 1 : st === "draft" ? 0 : st === "pending" ? 1 : 2;
    return [["Draft", "Being prepared"], [K.kind === "purchase" ? "Submitted" : "Sent", bad ? "Declined" : "Waiting for approval"], [K.kind === "purchase" ? "Received" : "Done", "In stock"]].map(([t, sub], i) => ({ t, sub: i === at ? sub : i < at ? "Done" : "", st: i < at || (i === at && st === "closed") ? "done" : i === at ? (bad ? "bad" : "now") : "" })); })() : null;

  // the items table
  const sCell = (lid: string, item: string) => stock === null ? "…" : stockOf(lid, item) === undefined ? <span className="text-gray-400">Not counted</span> : n2(stockOf(lid, item));
  const qv = (v: any, it?: any) => v === "" || v == null ? <span className="text-gray-400">—</span> : n2(v) + (it ? " " + storUnit(it) : "");
  const head: string[] = K.flow ? (K.kind === "purchase" && d.status === "draft" ? ["Name", "SKU", "Available Quantity", "Cost Per Unit", "Quantity", "Total Cost"]
      : ["Name", "SKU", ...(d.status === "draft" ? ["Available Quantity"] : []), d.status === "draft" ? "Quantity" : K.kind === "purchase" ? "Ordered" : K.kind === "torder" ? "Requested" : "Sent", ...(isRecv || (d.status === "closed" && K.kind !== "torder") ? ["Received"] : []), ...(K.kind === "purchase" ? ["Unit Cost", "Total Cost"] : [])])
    : K.kind === "production" ? ["Name", "SKU", "Quantity", "Unit Cost", "Total Cost"] : K.kind === "quantity" ? ["Name", "SKU", ...(ro ? [] : ["Current Qty"]), d.direction === "add" ? "Added Qty" : "Deducted Qty", ...(ro ? [] : ["New Qty"]), "Unit Cost", "Total Cost"]
    : K.kind === "cost" ? ["Name", "SKU", ro ? "Original Cost" : "Current Cost", "New Cost"] : K.count && ro ? ["Name", "SKU", "Entered Qty", "Original Qty", "Variance Qty", "Variance %", "Variance Cost"]
    : K.kind === "spot" && !K.count ? ["Name", "SKU", "Quantity"] : K.kind === "spot" ? ["Name", "SKU", "System Qty", "Counted Qty", "Variance"] : ["Name", "SKU", "Storage UOM", "Ingredients UOM"];
  const cells = (l: any, ix: number): React.ReactNode[] => { const it = itemOf(l.itemId) || { name: "(deleted item)", sku: "" } as any, cur = K.loc ? stockOf(loc, l.itemId) : undefined;
    if (K.flow) { const draft = d.status === "draft", c = isRecv ? rv![ix].cost : (l.cost ?? it.cost), q = isRecv ? rv![ix].qty : l.qty;
      const src = draft ? [sCell(K.kind === "torder" ? d.destId : d.locationId, l.itemId)] : [];
      if (K.kind === "purchase" && draft) return [...src, money(+(l.cost ?? it.cost ?? 0)), qv(l.qty, it), money((+l.qty || 0) * (+(l.cost ?? it.cost ?? 0)))];
      return [...src, qv(l.qty, it), ...(isRecv ? [qv(rv![ix].qty, it)] : d.status === "closed" && K.kind !== "torder" ? [n2(l.qty)] : []), ...(K.kind === "purchase" ? [money(+c || 0), money((+q || 0) * (+c || 0))] : [])]; }
    if (K.kind === "quantity") { const cost = ro && l.cost != null ? +l.cost : +it.cost || 0, q = +l.qty || 0; return [...(ro ? [] : [sCell(loc, l.itemId)]), qv(l.qty, it), ...(ro ? [] : [stock === null ? "…" : n2(Math.max(0, (cur || 0) + (d.direction === "add" ? q : -q)))]), cost ? money(cost) : "—", cost ? money(cost * q) : "—"]; }
    if (K.kind === "production") { const uc = ro && l.cost != null ? +l.cost : C.recipe(it.ingredients); return [<>{!ro && !(it.ingredients || []).length && <Badge className="me-2" variant="light" color="error">No ingredients</Badge>}{qv(l.qty, it)}</>, fmtCost(uc), fmtCost(uc * (+l.qty || 0))]; }
    if (K.kind === "cost") return [ro ? (l.old != null ? money(l.old) : "—") : (+it.cost ? money(it.cost) : "—"), l.cost === "" || l.cost == null ? <span className="text-gray-400">—</span> : money(l.cost)];
    if (K.count && ro) { const sys = l.sys, c = +l.qty || 0, v = sys == null ? null : c - +sys, uc = l.cost != null ? +l.cost : +it.cost || 0;
      return [n2(c), sys == null ? "—" : n2(sys), <span className={v != null && v < 0 ? "font-semibold text-red-500" : ""}>{v == null ? "—" : (v > 0 ? "+" : "") + n2(v)}</span>, v == null || !+sys ? "—" : (v > 0 ? "+" : "") + (v / +sys * 100).toFixed(1) + "%", v == null || !uc ? "—" : money(v * uc)]; }
    if (K.kind === "spot" && !K.count) return [qv(l.qty, it)];
    if (K.kind === "spot") { const sys = ro ? l.sys : cur, c = l.qty, v = c === "" || c == null || sys == null ? null : +c - +sys;
      return [!ro && stock === null ? "…" : sys == null ? <span className="text-gray-400">Not counted</span> : n2(sys), qv(l.qty, it), <span className={v != null && v < 0 ? "font-semibold text-red-500" : ""}>{v == null ? "—" : (v > 0 ? "+" : "") + n2(v)}</span>]; }
    return [storUnit(it), ingUnit(it)]; };
  const editable = !ro || isRecv;
  const openRow = (ix: number) => { if (!editable || K.kind === "sheet") return; setDlg({ kind: "qty", ix }); };
  // what a production batch takes out of stock (preview while drafting, actual once submitted)
  const usage = (() => { if (K.kind !== "production") return [];
    if (ro) return (d.consumed || []).map((c: any) => ({ itemId: c.itemId, qty: +c.qty, cost: +c.cost }));
    const m: Record<string, number> = {}; d.items.forEach((l: any) => (itemOf(l.itemId)?.ingredients || []).forEach((g: any) => { const sub = itemOf(g.itemId); if (sub) m[sub.id] = (m[sub.id] || 0) + (+g.qty || 0) * (+l.qty || 0) / (+sub.factor || 1); }));
    return Object.entries(m).map(([i, q]) => ({ itemId: i, qty: q, cost: +(itemOf(i)?.cost || 0) })); })();
  const Usage = ({ page }: { page?: boolean }) => (
    <div className={BOX + (page ? "" : " mt-6")}>
      <div className="flex items-center gap-2 px-5 py-4 sm:px-6"><h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{page ? "Items" : ro ? "Consumption From Production" : "Ingredients That Will Be Used"}</h3><span className="text-sm text-gray-500">{page ? usage.length : ro ? "Taken out of stock when this was submitted." : "Updates as you type quantities."}</span></div>
      {!usage.length ? <p className="border-t border-gray-100 px-6 py-5 text-sm text-gray-500 dark:border-white/5">{ro ? "Nothing was consumed." : "Enter quantities, and make sure each produced item has ingredients (open it under Inventory → Items)."}</p>
        : <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5"><table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr><th className={TH}>Name</th><th className={TH}>SKU</th><th className={TH + " text-end"}>Quantity</th>{!ro && <th className={TH + " text-end"}>In Stock</th>}<th className={TH + " text-end"}>Unit Cost</th><th className={TH + " text-end"}>Total Cost</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">{usage.sort((a: any, b: any) => (itemOf(a.itemId)?.name || "").localeCompare(itemOf(b.itemId)?.name || "")).map((x: any) => { const it = itemOf(x.itemId) || {} as any, cur = stockOf(loc, x.itemId), short = !ro && cur !== undefined && cur < x.qty;
            return <tr key={x.itemId}><td className={TD + " font-medium text-gray-800 dark:text-white/90"}>{it.name || "(deleted item)"}</td><td className={TD}>{it.sku || ""}</td><td className={TD + " text-end"}>{n2(x.qty)} {it.storageUnit || ""}</td>
              {!ro && <td className={TD + " text-end" + (short ? " font-semibold text-red-500" : "")}>{cur === undefined ? <span className="text-gray-400">Not counted</span> : n2(cur)}</td>}<td className={TD + " text-end"}>{fmtCost(x.cost)}</td><td className={TD + " text-end"}>{fmtCost(x.qty * x.cost)}</td></tr>; })}</tbody>
          <tfoot className="border-t border-gray-200 dark:border-white/10"><tr><td className={TD + " font-semibold text-gray-800 dark:text-white/90"} colSpan={ro ? 4 : 5}>Total</td><td className={TD + " text-end font-semibold text-gray-800 dark:text-white/90"}>{fmtCost(usage.reduce((t: number, x: any) => t + x.qty * x.cost, 0))}</td></tr></tfoot></table></div>}
    </div>);
  const avail = s.inv_items.filter(i => live(i) && !d.items.some((l: any) => l.itemId === i.id) && (K.kind !== "production" || (i.ingredients || []).length)).sort((a, b) => a.name.localeCompare(b.name));
  const sheets = s.inv_docs.filter(x => x.kind === "sheet" && live(x) && x.id !== d.id);
  const total = K.kind === "quantity" ? d.items.reduce((t: number, l: any) => t + (+l.qty || 0) * (ro && l.cost != null ? +l.cost : +(itemOf(l.itemId)?.cost || 0)), 0) : null;
  return (
    <>
      <PageBreadcrumb pageTitle={title} />
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 lg:flex-row lg:items-center dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-1 items-center gap-3"><Button variant="outline" size="icon" aria-label="Back" onClick={() => nav("/" + route)}><ArrowLeftIcon className="size-5" /></Button>
          <div><span className="block text-xs text-gray-500">Inventory · {K.title}</span><h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3></div>{K.kind !== "sheet" && <St d={d} />}</div>
        {(d.items.length > 0 || d.id) && <div className="flex flex-wrap gap-3">
          {d.id && <Button variant="outline" onClick={print}>Print</Button>}
          {d.id && !ro && <Button variant="outline" className="text-red-500" onClick={del}>Delete Permanently</Button>}
          {!ro && K.kind !== "cost" && <Button variant="outline" onClick={() => setDlg({ kind: "head" })}>Edit</Button>}
          {!ro && <Button variant={K.kind === "sheet" ? "default" : "outline"} disabled={B} onClick={() => saveDoc()}>{K.kind === "sheet" ? "Save" : "Save Draft"}</Button>}
          {!ro && K.kind !== "sheet" && !K.flow && <Button disabled={B || !d.items.length} onClick={submit}>{B ? "Working…" : K.count || K.kind === "spot" ? "Submit Count" : K.kind === "production" ? "Produce Items" : "Submit"}</Button>}
          {flowBtns}</div>}
      </div>
      {err && <p className="mb-6 rounded-xl border border-red-500 bg-red-50 p-4 text-sm text-gray-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-white/80">{err}</p>}
      {steps && <div className="mb-6 grid grid-cols-3 gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">{steps.map((x, i) => (
        <div key={i} className="flex items-center gap-3"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold", x.st === "done" ? "bg-green-500 text-white" : x.st === "now" ? "bg-brand-500 text-white" : x.st === "bad" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400 dark:bg-white/5")}>{x.st === "done" ? "✓" : i + 1}</span>
          <span><b className="block text-sm font-medium text-gray-800 dark:text-white/90">{x.t}</b><small className="text-xs text-gray-500">{x.sub}</small></span></div>))}</div>}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-3 lg:grid-cols-4 lg:p-6 dark:border-gray-800 dark:bg-white/3">{info.map(([l, v]) => <L key={l} l={l}>{v}</L>)}</div>
      {pv === "pc" ? <Usage page /> : pv === "pw" ? <div className={BOX}><h3 className="px-5 py-4 text-lg font-semibold text-gray-800 sm:px-6 dark:text-white/90">Items</h3>
        {(() => { const w = d.items.filter((l: any) => +l.waste > 0); return !w.length ? <p className="border-t border-gray-100 px-6 py-5 text-sm text-gray-500 dark:border-white/5">Nothing was wasted.</p>
          : <table className="min-w-full border-t border-gray-100 dark:border-white/5"><thead className="border-b border-gray-100 dark:border-white/5"><tr><th className={TH}>Name</th><th className={TH}>SKU</th><th className={TH + " text-end"}>Deducted Quantity</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">{w.map((l: any) => { const it = itemOf(l.itemId) || {} as any; return <tr key={l.itemId}><td className={TD}>{it.name || "(deleted item)"}</td><td className={TD}>{it.sku || ""}</td><td className={TD + " text-end"}>{n2(+l.waste)} {storUnit(it)}</td></tr>; })}</tbody></table>; })()}</div>
      : <>
        <div className={BOX}>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2"><h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Items</h3><span className="text-sm text-gray-500">{d.items.length}</span></div>
            {!ro && <div className="flex flex-wrap gap-3">
              {K.kind !== "sheet" && d.items.length > 0 && <Button size="sm" variant="outline" onClick={() => setDlg({ kind: "all" })}>{K.kind === "purchase" ? "Edit Quantities & Cost" : K.kind === "cost" ? "Edit Costs" : "Edit Quantities"}</Button>}
              {K.kind === "spot" && sheets.length > 0 && <select aria-label="Load a count sheet" className={SEL + " h-9 w-48"} value="" onChange={e => { const sh = sheets.find(x => x.id === e.target.value); if (sh) { const n = addItems((sh.items || []).map((l: any) => l.itemId)); toast(`${n} item${n === 1 ? "" : "s"} added from ${sh.name || "the count sheet"}`); } }}>
                <option value="">Load Count Sheet…</option>{sheets.map(x => <option key={x.id} value={x.id}>{x.name || x.ref}</option>)}</select>}
              {K.kind !== "sheet" && <Button size="sm" variant="outline" onClick={importCsv}><UploadIcon className="size-4" />Import Items</Button>}
              <Button size="sm" onClick={() => setDlg({ kind: "add" })}><PlusIcon className="size-4" />Add Items</Button></div>}
          </div>
          <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
            {!d.items.length ? <EmptyState text="No items yet. Add items above." />
              : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>{head.map((h, i) => <th key={h} className={TH + (i > 1 && !/UOM/.test(h) ? " text-end" : "")}>{h}</th>)}{!ro && <th className={TH} />}</tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">{d.items.map((l: any, ix: number) => { const it = itemOf(l.itemId) || { name: "(deleted item)", sku: "" } as any; return (
                  <tr key={l.itemId + ix} onClick={() => openRow(ix)} className={editable && K.kind !== "sheet" ? TR : ""}>
                    <td className={TD + " font-medium text-gray-800 dark:text-white/90"}>{it.name}</td><td className={TD}>{it.sku || ""}</td>
                    {cells(l, ix).map((c, j) => <td key={j} className={TD + (K.kind === "sheet" ? "" : " text-end")}>{c}</td>)}
                    {!ro && <td className={TD + " text-end"}><button type="button" aria-label={"Remove " + it.name} onClick={e => { e.stopPropagation(); up({ items: d.items.filter((_: any, j: number) => j !== ix) }); }} className="text-gray-400 hover:text-red-500">×</button></td>}</tr>); })}</tbody>
                {total != null && <tfoot className="border-t border-gray-200 dark:border-white/10"><tr><td className={TD + " font-semibold text-gray-800 dark:text-white/90"} colSpan={head.length - 1}>Total</td><td className={TD + " text-end font-semibold text-gray-800 dark:text-white/90"}>{money(total)}</td>{!ro && <td />}</tr></tfoot>}</table>}
          </div>
        </div>
        {K.kind === "production" && d.items.length > 0 && !ro && <Usage />}
      </>}
      {dlg?.kind === "add" && <PickDialog title="Add Items" opts={avail.map(i => [i.id, i.name, i.sku || ""])} value={[]} onClose={() => setDlg(null)} onSave={ids => { const n = addItems(ids); if (n) toast(`${n} item${n === 1 ? "" : "s"} added`); }} />}
      {dlg?.kind === "head" && <HeadDialog d={d} K={K} s={s} locs={locs} onClose={() => setDlg(null)} onSave={p => { up(p); setDlg(null); }} />}
      {(dlg?.kind === "qty" || dlg?.kind === "all") && <QtyDialog K={K} rows={dlg.kind === "all" ? d.items.map((_: any, i: number) => i) : [dlg.ix]} d={d} rv={isRecv ? rv : null} itemOf={itemOf} onClose={() => setDlg(null)}
        onDelete={dlg.kind === "qty" && !ro ? () => { up({ items: d.items.filter((_: any, j: number) => j !== dlg.ix) }); setDlg(null); } : undefined}
        onSave={vals => { if (isRecv) setRecv(rv!.map((r: any, i: number) => vals[i] ? { ...r, ...vals[i] } : r)); else Object.entries(vals).forEach(([i, p]) => setLine(+i, p)); setDlg(null); }} />}
    </>
  );
}

/** the header fields of a draft (Edit) */
function HeadDialog({ d, K, s, locs, onClose, onSave }: { d: any; K: K; s: S; locs: [string, string][]; onClose: () => void; onSave: (p: any) => void }) {
  const [v, setV] = useState<any>({ name: d.name || "", supplierId: d.supplierId || "", locationId: d.locationId || "", destId: d.destId || "", reason: d.reason || "", direction: d.direction || "deduct", businessDate: d.businessDate || "", additionalCost: +d.additionalCost ? String(d.additionalCost) : "", notes: d.notes || "", del: d.deliveryAt ? String(d.deliveryAt).slice(0, 10) : "" });
  const set = (k: string, x: any) => setV((p: any) => ({ ...p, [k]: x })), [err, setErr] = useState("");
  const qa = (() => { const a: any = s.settings.find(x => x.id === "app") || {}; return a.qtyReasons == null ? QA_DEF : String(a.qtyReasons).split("\n").map((x: string) => x.trim()).filter(Boolean); })();
  const selL = (k: string, l: string, opts: [string, string][]) => <F l={l} req><select className={SEL} value={v[k]} onChange={e => set(k, e.target.value)}><option value="">Choose…</option>{opts.map(([id, t]) => <option key={id} value={id}>{t}</option>)}</select></F>;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white/90">Edit {K.title}</DialogTitle></DialogHeader>
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {K.kind === "sheet" && <F l="Name" req><Input className="h-11" placeholder="e.g. Store Count Sheet" value={v.name} onChange={e => set("name", e.target.value)} /></F>}
          {K.kind === "purchase" && selL("supplierId", "Supplier", s.suppliers.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(x => [x.id, x.name]))}
          {K.loc && selL("locationId", K.kind === "transfer" ? "Source" : "Destination", locs)}
          {(K.kind === "transfer" || K.kind === "torder") && selL("destId", K.kind === "torder" ? "Source" : "Destination", locs.filter(([x]) => x !== v.locationId))}
          {K.kind === "quantity" && <><F l="Reason"><Input className="h-11" list="qaR" value={v.reason} onChange={e => set("reason", e.target.value)} /><datalist id="qaR">{qa.map(r => <option key={r} value={r} />)}</datalist></F>
            <F l="Type"><select className={SEL} value={v.direction} onChange={e => set("direction", e.target.value)}><option value="deduct">Deduct from stock</option><option value="add">Add to stock</option></select></F></>}
          {K.kind !== "sheet" && <F l="Business Date"><DateInput value={v.businessDate} onChange={x => set("businessDate", x)} /></F>}
          {K.kind === "purchase" && <F l={`Additional Cost (${sym()})`}><Input className="h-11" type="number" min="0" step="any" value={v.additionalCost} onChange={e => set("additionalCost", e.target.value)} /></F>}
          {K.po && <F l="Delivery Date"><DateInput value={v.del} onChange={x => set("del", x)} /></F>}
          <F l="Notes" full><Textarea rows={3} value={v.notes} onChange={e => set("notes", e.target.value)} /></F>
          {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { if (K.kind === "sheet" && !v.name.trim()) return setErr("Give the count sheet a name."); if (v.destId && v.destId === v.locationId) return setErr("Source and destination must be different.");
            const { del, ...p } = v; onSave({ ...p, name: p.name.trim(), reason: K.kind === "quantity" ? p.reason.trim() : d.reason, notes: p.notes.trim(), additionalCost: +p.additionalCost || 0, ...(K.po ? { deliveryAt: del ? new Date(del + "T00:00:00").toISOString() : null } : {}) }); }}>Save</Button></div>
      </DialogContent>
    </Dialog>);
}

/** quantities (in the storage unit plus the ingredient unit when the item has one) and costs of one or all lines */
function QtyDialog({ K, rows, d, rv, itemOf, onClose, onSave, onDelete }: { K: K; rows: number[]; d: any; rv: any[] | null; itemOf: (i: string) => Row | undefined; onClose: () => void; onSave: (v: Record<number, any>) => void; onDelete?: () => void }) {
  const q = K.kind !== "cost", c = K.kind === "cost" || K.kind === "purchase", src = (ix: number) => rv ? rv[ix] : d.items[ix];
  const two = (it: any) => K.kind !== "purchase" && !((+it?.factor || 1) === 1 && storUnit(it) === ingUnit(it));
  const [v, setV] = useState<Record<number, { s: string; i: string; c: string }>>(() => Object.fromEntries(rows.map(ix => { const l = src(ix), it = itemOf(d.items[ix].itemId), n = +l.qty || 0, fac = +(it as any)?.factor || 1, t = two(it);
    return [ix, { s: l.qty === "" || l.qty == null ? "" : String(t ? Math.floor(n + 1e-9) : n), i: t && n ? String(+((n - Math.floor(n + 1e-9)) * fac).toFixed(4) || "") : "", c: String(l.cost ?? (it as any)?.cost ?? "") }]; })));
  const [err, setErr] = useState(""), zeroOk = !!rv || K.kind === "spot";
  function save() {
    const out: Record<number, any> = {};
    for (const ix of rows) { const it = itemOf(d.items[ix].itemId), x = v[ix], fac = two(it) ? +(it as any)?.factor || 1 : 1;
      if (q) { if (x.s.trim() === "" && x.i.trim() === "") return setErr("Enter the quantity."); if ([x.s, x.i].some(y => y.trim() !== "" && (isNaN(+y) || +y < 0))) return setErr("Quantities can't be negative.");
        const qty = +((+x.s || 0) + (+x.i || 0) / fac).toFixed(6); if (!(qty > 0) && !zeroOk) return setErr("The quantity must be more than 0."); out[ix] = { qty: String(qty) }; }
      if (c) { if (x.c.trim() === "" || isNaN(+x.c) || +x.c < 0) return setErr("Fill in every field marked *."); out[ix] = { ...(out[ix] || {}), cost: x.c }; } }
    onSave(out);
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto p-6 sm:max-w-lg sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white/90">{K.kind === "cost" ? "Update Items Costs" : "Update Items Quantities"}</DialogTitle></DialogHeader>
        <form className="mt-5 space-y-4" onSubmit={e => { e.preventDefault(); save(); }}>
          {rows.map((ix, k) => { const it: any = itemOf(d.items[ix].itemId) || {}, t = two(it), x = v[ix], setX = (p: any) => setV(o => ({ ...o, [ix]: { ...o[ix], ...p } }));
            return <div key={ix} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><b className="mb-3 block text-sm font-medium text-gray-800 dark:text-white/90">{it.name || "Item"}{it.sku && <span className="ms-1 text-gray-400">({it.sku})</span>}</b>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {q && <F l={`Quantity (${storUnit(it)})`} req><Input className="h-11" autoFocus={k === 0} type="number" min="0" step="any" inputMode="decimal" value={x.s} onChange={e => setX({ s: e.target.value })} /></F>}
                {q && t && <F l={`Quantity (${ingUnit(it)})`} help={`1 ${storUnit(it)} = ${n2(+it.factor || 1)} ${ingUnit(it)}`}><Input className="h-11" type="number" min="0" step="any" inputMode="decimal" value={x.i} onChange={e => setX({ i: e.target.value })} /></F>}
                {c && <F l={K.kind === "cost" ? "New Cost" : "Cost"} req><Input className="h-11" type="number" min="0" step="any" inputMode="decimal" value={x.c} onChange={e => setX({ c: e.target.value })} /></F>}</div></div>; })}
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">{onDelete && <Button type="button" variant="destructive" className="sm:me-auto" onClick={onDelete}>Delete</Button>}
            <Button type="button" variant="outline" onClick={onClose}>Close</Button><Button type="submit">Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>);
}
