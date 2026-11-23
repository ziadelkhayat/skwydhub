// Call Center board: the business day's call center and web orders in columns (Drafts, Pending, Active, Done,
// Declined), live, with the same filter (brand, store, business date, user) and order tiles as the current portal. Pressing a tile opens the order.
// New, draft, waiting and pending orders open in the order screen (CallCenterOrder); the rest open in the order panel.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CallIcon, FilterIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { useCol, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { coSet, openWin } from "@/lib/util";
import { cn } from "@/utils";
import { useEffect, useState } from "react";
import { live } from "../crud/CrudPage";
import { DateInput } from "../ui/DateInput";
import { F, SEL } from "../ui/kit";

const COLS: [string, string, string][] = [["draft", "Drafts", "Orders saved as a draft and not sent to the store yet"], ["pending", "Pending", "Orders that are not yet accepted by the store"], ["active", "Active", "Orders the store accepted: being prepared, or on the way with a driver"],
  ["closed", "Done", "Orders that are completed"], ["declined", "Declined", "Orders that have been declined from the store or the call center"]];
const SUB: Record<string, string> = { review: "Waiting for call center", draft: "Draft", pending: "Sent to store", active: "Preparing", declined: "Declined", closed: "Done", void: "Void", returned: "Returned", refund: "Refund" };
const TYPE: Record<string, string> = { dinein: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery", fast: "In Store" };
const CHL: Record<string, string> = { pos: "POS", callcenter: "Call Center", online: "Web Ordering" };
const camel = (r: any) => { const o: any = {}; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; return o; };
const tel = (p: string) => String(p || "").replace(/^\+961(\d{1,2})(\d{3})(\d{3})$/, "+961 $1 $2 $3");
const cutOf = (v?: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ""); return m ? Math.min(719, (+m[1]) * 60 + (+m[2])) : 0; };
const isoDay = (d: Date) => new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function CallCenterPage() {
  const branches = useCol("branches") || [], brands = useCol("brands") || [], sets = useCol("settings") || [], users = useCol("users") || [], roles = useCol("roles") || [], closes = useCol("day_closes") || [];
  const { staff } = useAuth();
  const [F0, setF] = useState<{ brand: string; branch: string; date: string; user: string }>({ brand: "", branch: "", date: "", user: "" }), [fOpen, setFOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]), [tick, setTick] = useState(0);
  // the business day: a store's day starts at its day start (or the company's day end); a store that ended its day early starts the next one then
  const cut = (bid?: string) => cutOf(branches.find(b => b.id === bid)?.settings?.dayStart || (sets.find(x => x.id === "company") as any)?.dayEnd);
  const bizDate = (t: any, bid?: string) => { const ms = +new Date(t); let d = isoDay(new Date(ms - cut(bid) * 60000));
    for (let i = 0; i < 3 && bid; i++) { const c = closes.find(x => x.branchId === bid && String(x.businessDate).slice(0, 10) === d); if (c && +new Date(c.closedAt) <= ms) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + 1); d = isoDay(x); } else break; } return d; };
  const day = F0.date || bizDate(new Date(), F0.branch || undefined);
  useEffect(() => { let off = false;
    (async () => { const a = new Date(day + "T00:00:00"); a.setDate(a.getDate() - 1); const b = new Date(day + "T00:00:00"); b.setDate(b.getDate() + 2);
      const { data } = await sb.from("orders").select("id,ref,no,invoice_no,status,channel,source,type,branch_id,brand_id,customer_name,phone,total,agent,driver_name,dispatched_at,void_reason,created_at,updated_at,edit_request,return_no")
        .neq("channel", "pos").gte("created_at", a.toISOString()).lt("created_at", b.toISOString()).order("created_at", { ascending: false }).limit(2000);
      if (!off) setRows((data || []).map(camel)); })();
    return () => { off = true; }; }, [day, tick]);
  useEffect(() => { const ch = sb.channel("cc-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => setTick(t => t + 1)).subscribe(); return () => { sb.removeChannel(ch); }; }, []);
  // web & API orders show here only for brands whose call center accepts them; otherwise they go straight to the store
  const route = (bid: string) => (sets.find(x => x.id === "brand_" + bid) as any)?.webOrderRoute || coSet().webOrderRoute || "branch";
  const ccWeb = (o: any) => o.channel === "callcenter" || o.status === "review" || route(o.brandId) === "callcenter";
  const byUser = (o: any, n: string) => o.agent === n || o.agent === String(n).split(/\s+/)[0];
  const list = rows.filter(o => ccWeb(o) && (!F0.brand || o.brandId === F0.brand) && bizDate(o.createdAt, o.branchId) === (F0.date || bizDate(new Date(), o.branchId)) && (!F0.branch || o.branchId === F0.branch) && (!F0.user || byUser(o, F0.user)));
  const colOf = (k: string) => list.filter(o => k === "void" ? ["void", "returned", "refund"].includes(o.status) : k === "active" ? o.status === "active" : k === "pending" ? ["pending", "review"].includes(o.status) : o.status === k);
  // users who can use the call center (their role allows it, or they manage everything); the person signed in too
  const agents = [...new Set([...users.filter(u => live(u) && u.active !== false && u.role !== "owner" && u.role !== "admin" && roles.filter(r => ((u.roleIds || []).length ? u.roleIds : u.roleId ? [u.roleId] : []).includes(r.id) && live(r)).flatMap(r => r.permissions || []).some((p: string) => p === "bo_callcenter" || p === "bo_manage")).map(u => u.name), ...(staff?.name ? [staff.name] : [])])].sort((a, b) => a.localeCompare(b));
  const nF = [F0.brand, F0.branch, F0.date && F0.date !== bizDate(new Date()) ? F0.date : "", F0.user].filter(Boolean).length;
  const bName = (id: string) => branches.find(b => b.id === id)?.name, brName = (id: string) => brands.find(b => b.id === id)?.name;
  const tm = (t: string) => { if (!t) return "—"; const d = new Date(t); const h = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); return bizDate(d) === bizDate(new Date()) ? h : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " + h; };
  return (
    <>
      <PageBreadcrumb pageTitle="Call Center" />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">Business date {day.split("-").reverse().join("-")} · {list.length} order{list.length === 1 ? "" : "s"}</p>
        <div className="flex gap-3"><Button variant="outline" onClick={() => setFOpen(true)}><FilterIcon className="size-5" />Filter{nF ? <Badge variant="solid" color="primary" className="ms-1">{nF}</Badge> : null}</Button>
          <Button onClick={() => openWin("/call-center-order")}><CallIcon className="size-5" />New Order</Button></div>
      </div>
      <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-5">
        {COLS.map(([k, t, desc]) => { const col = colOf(k); return (
          <div key={k} className="min-w-0 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/2" title={desc}>
            <div className="mb-3 flex items-center justify-between px-1"><b className="text-sm font-semibold text-gray-800 dark:text-white/90">{t}</b>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", col.length && k === "active" ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300")}>{col.length}</span></div>
            <div className="space-y-3">{!col.length ? <p className="px-1 py-6 text-center text-xs text-gray-400">You don't have {k === "draft" ? "drafts" : t.toLowerCase() + " orders"}</p> : col.map(o => <Tile key={o.id} o={o} tm={tm} bName={bName} brName={brName} onOpen={() => openWin((["draft", "review", "pending"].includes(o.status) ? "/call-center-order?id=" : "/order?id=") + o.id)} />)}</div>
          </div>); })}
      </div>
      {fOpen && <FilterDlg F0={F0} today={bizDate(new Date())} brands={brands.filter(live)} branches={branches.filter(b => live(b) && (!F0.brand || b.brandId === F0.brand))} agents={agents} onClose={() => setFOpen(false)} onApply={f => { setF(f); setFOpen(false); }} />}
    </>
  );
}

// the same icon drawings as the POS cards (apps/pos/src/ui/Icon.tsx)
const CARD_ICON: Record<string, React.ReactNode> = {
  Customer: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  Type: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M9 17h6l2-7h3M14 6h3l1 4M4 13h6l2 4" /></>,
  Channel: <><rect x="4" y="3" width="16" height="12" rx="2" /><path d="M9 21h6M12 15v6" /></>,
  User: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  Created: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  Store: <><path d="M3 9l1.5-5h15L21 9M4 9v11h16V9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" /></>,
  Pickup: <path d="M6 8h12l-1 12H7L6 8Zm3 0a3 3 0 0 1 6 0" />,
  "In Store": <><rect x="3" y="7" width="18" height="5" rx="1" /><path d="M6 12v8M18 12v8" /></>,
  "Created by": <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /><path d="M19 20a3 3 0 0 1-3 2h-3" /></>,
};
function Tile({ o, tm, bName, brName, onOpen }: { o: any; tm: (t: string) => string; bName: (id: string) => string | undefined; brName: (id: string) => string | undefined; onOpen: () => void }) {
  const disp = o.status === "active" && o.dispatchedAt, src = o.channel && !["pos", "callcenter"].includes(o.channel) && (!o.source || o.source === "Website") ? "Web" : String(o.source || "").trim(), chl = CHL[o.channel] || o.channel || "";
  const color = disp ? "info" : o.status === "closed" ? "success" : o.status === "active" ? "primary" : ["pending", "review"].includes(o.status) ? "warning" : "error";
  const R = ({ k, children, sub }: { k: string; children: React.ReactNode; sub?: React.ReactNode }) => { const d = CARD_ICON[k]; return <div className="flex gap-2.5 text-sm"><span title={k} aria-label={k} className="flex w-4 shrink-0 justify-center pt-px text-gray-400">{d ? <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg> : k}</span><span className="min-w-0 text-gray-700 dark:text-gray-300">{children}{sub && <span className="block text-xs text-gray-400">{sub}</span>}</span></div>; };
  return (
    <button type="button" onClick={onOpen} className="block w-full rounded-xl border border-gray-200 bg-white p-3 text-start shadow-theme-xs transition hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2.5 flex flex-wrap items-center gap-2"><b className="text-base font-semibold text-gray-800 dark:text-white/90">{o.ref || o.no || "—"}</b><Badge variant="light" color={color as any}>{disp ? "Dispatched" + (o.driverName ? " · " + o.driverName : "") : SUB[o.status] || o.status}</Badge></div>
      {o.status === "declined" && o.voidReason && <p className="mb-2 text-xs text-red-500">Reason: {o.voidReason}</p>}
      <div className="space-y-2">
        {o.type && <R k={o.type === "delivery" ? "Type" : o.type === "dinein" ? "In Store" : "Pickup"}>{TYPE[o.type] || o.type}</R>}
        <R k="Customer" sub={o.phone ? tel(o.phone) : undefined}>{o.customerName || "Guest"}</R>
        {(chl || src) && <R k="Channel" sub={chl && src && src.toLowerCase() !== chl.toLowerCase() ? src : undefined}>{chl || src}</R>}
        <R k="Created" sub={o.updatedAt && o.updatedAt !== o.createdAt && tm(o.updatedAt) !== tm(o.createdAt) ? "Modified " + tm(o.updatedAt) : undefined}>{tm(o.createdAt)}</R>
        {(brName(o.brandId) || bName(o.branchId)) && <R k="Store" sub={brName(o.brandId) && bName(o.branchId) ? bName(o.branchId) : undefined}>{brName(o.brandId) || bName(o.branchId)}</R>}
        {o.agent && ["pos", "callcenter"].includes(o.channel) && <R k="Created by">{String(o.agent).replace(/\s*\(auto\)\s*$/i, "")}</R>}
      </div>
      {o.editRequest && o.status === "active" && <p className="mt-1 text-xs text-gray-500">{o.editRequest.status === "pending" ? "Order edit: waiting for the store" : o.editRequest.status === "approved" ? "Order edit approved" : "Order edit rejected" + (o.editRequest.reason ? ": " + o.editRequest.reason : "")}</p>}
    </button>);
}

function FilterDlg({ F0, today, brands, branches, agents, onClose, onApply }: { F0: any; today: string; brands: Row[]; branches: Row[]; agents: string[]; onClose: () => void; onApply: (f: any) => void }) {
  const [v, setV] = useState({ ...F0, date: F0.date || today }), set = (k: string, x: string) => setV((p: any) => ({ ...p, [k]: x }));
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-6 sm:max-w-lg sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white/90">Filter</DialogTitle></DialogHeader>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <F l="Brand"><select className={SEL} value={v.brand} onChange={e => setV((p: any) => ({ ...p, brand: e.target.value, branch: "" }))}><option value="">Any</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></F>
          <F l="Store"><select className={SEL} value={v.branch} onChange={e => set("branch", e.target.value)}><option value="">Any</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></F>
          <F l="Business Date"><DateInput value={v.date} onChange={x => set("date", x)} /></F>
          <F l="User"><select className={SEL} value={v.user} onChange={e => set("user", e.target.value)}><option value="">Any</option>{agents.map(n => <option key={n}>{n}</option>)}</select></F>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" className="sm:me-auto" onClick={() => onApply({ brand: "", branch: "", date: "", user: "" })}>Reset</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onApply({ ...v, date: v.date && v.date !== today ? v.date : "" })}>Apply</Button></div>
      </DialogContent>
    </Dialog>);
}
