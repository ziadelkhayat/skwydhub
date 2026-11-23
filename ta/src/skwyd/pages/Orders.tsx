// Orders: the same tabs, search, columns and order panel as the current portal (index.html viewOrders / ordQuery), in TailAdmin layout.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { FilterIcon, SearchIcon } from "@/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RangeInput } from "../ui/DateInput";
import { useCol } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDate, money, openWin } from "@/lib/util";
import { useEffect, useState } from "react";
import { EmptyState } from "../ui/EmptyState";
import { Pager } from "../ui/Pager";
import { SegTabs } from "../ui/SegTabs";

const ORD_TABS: [string, string][] = [["all", "All"], ["today", "Today"], ["draft", "Draft"], ["pending", "Pending"], ["active", "Active"], ["dispatched", "Dispatched"], ["ahead", "Ahead"], ["online", "API"]];
export const ORD_ST: Record<string, string> = { review: "Call Center Review", draft: "Draft", pending: "Pending", active: "Active", closed: "Done", declined: "Declined", void: "Void", returned: "Returned", refund: "Refund" };
export const ST_COLOR: Record<string, any> = { closed: "success", active: "primary", pending: "warning", review: "warning", draft: "gray", declined: "error", void: "error", returned: "error", refund: "error" };
export const TYPE_LBL: Record<string, string> = { dinein: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery", fast: "In Store", other: "Other" };
export const CHL: Record<string, string> = { pos: "POS", callcenter: "Call Center", online: "Web Ordering", web: "Web Ordering", marketplace: "Marketplace" };
const PER = 50;
const SEL = "h-11 rounded-lg border border-gray-300 bg-transparent ps-3 pe-9 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";
export const camel = (r: any) => { const o: any = {}; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; if (o.tableNo != null) o.table = o.tableNo; return o; };
export const invNo = (n: any) => n ? String(n).padStart(6, "0") : "";
// every order, return included, has its own reference; a return gets a check number and an order number in sequence like a done order (older returns kept RET-)
export const ordRef = (o: any) => o.status === "draft" && !o.no ? "Draft" : o.ref || (o.status === "refund" ? retNo(o) : o.no ? String(o.no) : o.invoiceNo ? invNo(o.invoiceNo) : "—");
const retNo = (o: any) => "RET-" + String(o.returnNo || "…").padStart(6, "0");
export const chkNo = (o: any) => o.invoiceNo ? invNo(o.invoiceNo) : o.status === "refund" ? retNo(o) : "—";
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); const e = new Date(d); e.setDate(e.getDate() + 1); return [d, e]; };
// web ordering and the marketplace are sales channels; their orders always come from the API
export const srcOf = (o: any) => ["online", "web", "marketplace", "api"].includes(o.channel) || /^(web|website)$/i.test(o.source || "") ? "API" : o.source && o.source.toUpperCase() !== "POS" ? o.source : "";
export const tel = (p: string) => String(p || "").replace(/^\+961(\d{1,2})(\d{3})(\d{3})$/, "+961 $1 $2 $3");

const SGRP: Record<string, string[]> = { draft: ["draft"], pending: ["pending", "review"], open: ["active"], closed: ["closed"], declined: ["declined"], voids: ["void"], returns: ["refund", "returned"] };
function applyF(q: any, F: Record<string, string>) {
  const cl = (v?: string) => String(v || "").trim().replace(/[,()*%\\]/g, " ").trim();
  if (F.from) { const a = new Date(F.from + "T00:00:00"), b = new Date((F.to || F.from) + "T00:00:00"); b.setDate(b.getDate() + 1); q = q.gte("created_at", a.toISOString()).lt("created_at", b.toISOString()); }
  if (F.branch) q = q.eq("branch_id", F.branch); if (F.brand) q = q.eq("brand_id", F.brand);
  if (F.source) q = q.eq("source", F.source); if (F.channel) q = q.eq("channel", F.channel);
  if (F.type) q = F.type === "pickup" ? q.in("type", ["pickup", "takeaway"]) : q.eq("type", F.type);
  if (F.pay) q = q.ilike("payment->>method", F.pay);
  if (cl(F.ref)) q = q.ilike("ref", `%${cl(F.ref)}%`); if (/^\d+$/.test(cl(F.num))) q = q.eq("no", +cl(F.num));
  if (cl(F.cust)) q = q.or(`customer_name.ilike.*${cl(F.cust)}*,phone.ilike.*${cl(F.cust)}*`);
  if (F.ahead) q = F.ahead === "yes" ? q.not("scheduled_at", "is", null) : q.is("scheduled_at", null);
  if (cl(F.rnotes)) q = q.ilike("receipt_notes", `%${cl(F.rnotes)}%`); if (cl(F.knotes)) q = q.ilike("notes", `%${cl(F.knotes)}%`);
  if (F.device) q = q.eq("device_id", F.device); if (F.status && SGRP[F.status]) q = q.in("status", SGRP[F.status]);
  return q;
}
function tabQ(q: any, tab: string) {
  if (tab === "today") { const [a, b] = today(); return q.gte("created_at", a.toISOString()).lt("created_at", b.toISOString()); }
  if (tab === "draft") return q.eq("status", "draft"); if (tab === "pending") return q.eq("status", "pending"); if (tab === "active") return q.eq("status", "active");
  if (tab === "dispatched") return q.eq("status", "active").not("dispatched_at", "is", null);
  if (tab === "ahead") return q.not("scheduled_at", "is", null).in("status", ["draft", "pending", "active"]);
  if (tab === "callcenter") return q.eq("channel", "callcenter"); if (tab === "online") return q.in("channel", ["online", "web", "marketplace", "api"]);   // API: web ordering and marketplace orders
  return q;
}

export default function OrdersPage() {
  const branches = useCol("branches") || [], brands = useCol("brands") || [];
  const [tab, setTab] = useState("all"), [q, setQ] = useState(""), [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]), [count, setCount] = useState(0), [loading, setLoading] = useState(true), [err, setErr] = useState("");
 
  const [tick, setTick] = useState(0);
  const [F, setF] = useState<Record<string, string>>({}), [fOpen, setFOpen] = useState(false);
  const devices = useCol("devices") || [], sources = useCol("order_sources") || [], pms = useCol("payment_methods") || [];
  const nF = Object.entries(F).filter(([k, v]) => v && !["from", "to", "branch", "brand"].includes(k)).length;

  useEffect(() => {
    let off = false; setLoading(true); setErr("");
    const t = setTimeout(async () => {
      const cols = "id,ref,no,invoice_no,return_no,refund_of,channel,source,type,status,branch_id,brand_id,customer_name,phone,table_no,total,payment,agent,handled_by,created_at";
      let qq: any = sb.from("orders").select(cols, { count: "exact" });
      const s = q.trim().replace(/[,()*%\\]/g, " ").trim();
      if (s) qq = /^\d+$/.test(s) ? qq.or(`no.eq.${s},invoice_no.eq.${s},phone.ilike.*${s}*,ref.ilike.*${s}`) : qq.or(`ref.ilike.*${s}*,customer_name.ilike.*${s}*,phone.ilike.*${s}*,agent.ilike.*${s}*,source.ilike.*${s}*`);
      qq = applyF(qq, F);
      qq = tabQ(qq, tab).order("created_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
      const res = await qq; if (off) return;
      if (res.error) setErr(res.error.message); else { setRows(res.data.map(camel)); setCount(res.count || 0); }
      setLoading(false);
    }, q ? 250 : 0);
    return () => { off = true; clearTimeout(t); };
  }, [tab, q, page, tick, F]);

  useEffect(() => {   // live: new and changed orders show up by themselves
    const ch = sb.channel("v2-orders-list").on("postgres_changes" as any, { event: "*", schema: "public", table: "orders" }, () => setTick(t => t + 1)).subscribe();
    return () => { sb.removeChannel(ch); };
  }, []);

  const pages = Math.max(1, Math.ceil(count / PER));
  const th = "px-5 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-500 sm:px-6 dark:text-gray-400";
  const td = "px-5 py-4 text-sm whitespace-nowrap text-gray-700 sm:px-6 dark:text-gray-400";
  const sub = "block text-theme-xs text-gray-500 dark:text-gray-400";

  return (
    <>
      <PageBreadcrumb pageTitle="Orders" />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6">
          {/* every tab shown (they wrap on small screens), the filters on the line under them */}
          <SegTabs className="flex-wrap self-start overflow-visible" value={tab} onChange={v => { setTab(v); setPage(1); }} items={ORD_TABS} />
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <InputGroup className="h-11 flex-1 sm:w-64 sm:flex-initial">
              <InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon>
              <InputGroupInput type="text" placeholder="Search..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
            </InputGroup>
            {<select aria-label="Brand" className={SEL} value={F.brand || ""} onChange={e => { const v = e.target.value; setF({ ...F, brand: v, branch: F.branch && v && branches.find(b => b.id === F.branch)?.brandId !== v ? "" : F.branch || "" }); setPage(1); }}><option value="">All Brands</option>{brands.filter(b => !b.deleted).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
            <select aria-label="Store" className={SEL} value={F.branch || ""} onChange={e => { setF({ ...F, branch: e.target.value }); setPage(1); }}><option value="">All Stores</option>{branches.filter(b => !b.deleted && (!F.brand || b.brandId === F.brand)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <div className="sm:w-56"><RangeInput from={F.from || ""} to={F.to || ""} onChange={(a, b) => { setF({ ...F, from: a, to: b }); setPage(1); }} /></div>
            <Button variant="outline" onClick={() => setFOpen(true)}><FilterIcon className="size-5" />Filter{nF ? <Badge variant="solid" color="primary" className="ms-1">{nF}</Badge> : null}</Button>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {err ? <p className="p-6 text-sm text-red-500">Couldn't load orders: {err}</p>
            : !rows.length ? <EmptyState text={loading ? "Loading orders…" : q ? "No orders match these filters." : tab === "today" ? "You don't have orders today" : "You don't have orders here"} />
            : <table className="min-w-full">
              <thead className="border-b border-gray-100 dark:border-white/5"><tr>
                {["Reference", "Check Number", "Order", "Store", "Customer", "Status", "Order Type", "Order Source", "Business Date", "Opened At", "Payment Type"].map(h => <th key={h} className={th}>{h}</th>)}
                <th className={th + " text-end"}>Total</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map(o => { const t = new Date(o.createdAt);
                  return (
                    <tr key={o.id} onClick={() => openWin("/order?id=" + o.id)} className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/2">
                      <td className={td}><span className="font-medium text-gray-800 dark:text-white/90">{ordRef(o)}</span></td>
                      <td className={td}>{chkNo(o)}</td>
                      <td className={td}>{o.no || "—"}</td>
                      <td className={td}>{branches.find(b => b.id === o.branchId)?.name || "—"}{brands.length > 1 && <span className={sub}>{brands.find(b => b.id === o.brandId)?.name || "—"}</span>}</td>
                      <td className={td}><span className="block font-medium text-gray-800 dark:text-white/90">{o.customerName || "—"}</span>{o.phone && <span className={sub}>{tel(o.phone)}</span>}</td>
                      <td className={td}><Badge variant="light" color={ST_COLOR[o.status] || "gray"}>{ORD_ST[o.status] || o.status}</Badge></td>
                      <td className={td}>{TYPE_LBL[o.type] || o.type || "—"}{o.type === "dinein" && o.table && <span className={sub}>{/^\d+$/.test(String(o.table).trim()) ? "Table " + String(o.table).trim() : o.table}</span>}</td>
                      <td className={td}>{srcOf(o) || "—"}</td>
                      <td className={td}>{fmtDate(o.createdAt)}</td>
                      <td className={td}>{fmtDate(o.createdAt)}<span className={sub}>{t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span></td>
                      <td className={td}>{o.payment?.method || "—"}</td>
                      <td className={td + " text-end font-medium text-gray-800 dark:text-white/90"}>{money(o.total)}</td>
                    </tr>); })}
              </tbody>
            </table>}
        </div>
        {count > 0 && <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5">
          <Pager currentPage={page} totalPages={pages} onPageChange={setPage} />
          <span className="pe-6 text-sm text-gray-500 dark:text-gray-400">{(page - 1) * PER + 1}–{Math.min(count, page * PER)} of {count.toLocaleString()}</span>
        </div>}
      </div>
      {fOpen && <FilterDialog F={F} onApply={f => { setF(f); setPage(1); setFOpen(false); }} onClose={() => setFOpen(false)}
        brands={brands} devices={devices} sources={sources.filter(x => !x.deleted).map(x => x.name)} pays={[...new Set([...pms.filter(x => !x.deleted).map(x => x.name), "Cash", "Card", "Other"])]} />}
    </>
  );
}

function FilterDialog({ F, onApply, onClose, brands, devices, sources, pays }: { F: Record<string, string>; onApply: (f: Record<string, string>) => void; onClose: () => void; brands: any[]; devices: any[]; sources: string[]; pays: string[] }) {
  const [d, setD] = useState<Record<string, string>>({ ...F });
  const txt = (k: string, l: string, ph?: string) => <Field key={k}><FieldLabel className="mb-1.5 block">{l}</FieldLabel><Input className="h-11" placeholder={ph || ""} value={d[k] || ""} onChange={e => setD({ ...d, [k]: e.target.value })} /></Field>;
  const sel = (k: string, l: string, opts: [string, string][]) => <Field key={k}><FieldLabel className="mb-1.5 block">{l}</FieldLabel><select className={SEL + " w-full"} value={d[k] || ""} onChange={e => setD({ ...d, [k]: e.target.value })}><option value="">Any</option>{opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Field>;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">Filter</DialogTitle></DialogHeader>
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {txt("ref", "Reference")}{txt("num", "Number")}
          {brands.length > 1 && sel("brand", "Brand", brands.map(b => [b.id, b.name]))}
          {sel("status", "Status", [["pending", "Pending"], ["open", "Active"], ["declined", "Declined"], ["closed", "Done"], ["returns", "Returned"], ["voids", "Void"], ["draft", "Draft"]])}
          {sel("type", "Type", [["dinein", "In Store"], ["pickup", "Pick Up"], ["delivery", "Delivery"]])}
          {sel("source", "Source", sources.map(x => [x, x]))}{sel("channel", "Sales Channel", Object.entries(CHL))}
          {sel("ahead", "Ahead", [["yes", "Yes"], ["no", "No"]])}{sel("pay", "Payment Type", pays.map(x => [x, x]))}
          {txt("rnotes", "Receipt Notes")}{txt("knotes", "Kitchen Notes")}{txt("cust", "Customer", "Name or phone")}
          {sel("device", "Device", devices.filter(x => !x.deleted).map(x => [x.id, x.name]))}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" className="sm:me-auto" onClick={() => onApply({ from: F.from || "", to: F.to || "", branch: F.branch || "", brand: F.brand || "" })}>Reset</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onApply(d)}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
