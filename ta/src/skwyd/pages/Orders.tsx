import { FilterSelect, inSel, selList } from "@/components/tremor/data-table/FilterSelect";
// Orders: the same tabs, search, columns and order panel as the current portal (index.html viewOrders / ordQuery), in TailAdmin layout.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { FilterIcon } from "@/icons";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/tremor/Drawer";
import { ChoiceButton } from "../ui/Choice";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RangeInput } from "../ui/DateInput";
import { useCol } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDate, money, openWin } from "@/lib/util";
import { useEffect, useState } from "react";
import { EmptyState } from "../ui/EmptyState";
import { DataTable, type DTColumn } from "@/components/tremor/data-table/DataTable";
import { downloadCsv } from "@/components/tremor/data-table/textOf";
import { SegTabs } from "../ui/SegTabs";

const ORD_TABS: [string, string][] = [["all", "All"], ["today", "Today"], ["draft", "Draft"], ["pending", "Pending"], ["active", "Active"], ["dispatched", "Dispatched"], ["ahead", "Ahead"], ["online", "API"]];
export const ORD_ST: Record<string, string> = { review: "Call Center Review", draft: "Draft", pending: "Pending", active: "Active", closed: "Done", declined: "Declined", void: "Void", returned: "Returned", refund: "Refund" };
export const ST_COLOR: Record<string, any> = { closed: "success", active: "primary", pending: "warning", review: "warning", draft: "gray", declined: "error", void: "error", returned: "error", refund: "error" };
export const TYPE_LBL: Record<string, string> = { dinein: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery", fast: "In Store", other: "Other" };
export const CHL: Record<string, string> = { pos: "POS", callcenter: "Call Center", online: "Web Ordering", web: "Web Ordering", marketplace: "Marketplace" };
const PER = 50;
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
  if (F.branch) q = q.in("branch_id", F.branch.split(",")); if (F.brand) q = q.in("brand_id", F.brand.split(","));
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
  // every filter, its label and its choices (the side panel and the chips use the same list)
  const opts: Record<string, [string, [string, string][]]> = {
    status: ["Status", [["pending", "Pending"], ["open", "Active"], ["declined", "Declined"], ["closed", "Done"], ["returns", "Returned"], ["voids", "Void"], ["draft", "Draft"]]],
    type: ["Order type", [["dinein", "In Store"], ["pickup", "Pick Up"], ["delivery", "Delivery"]]],
    ahead: ["Ahead", [["yes", "Yes"], ["no", "No"]]],
    source: ["Source", sources.filter(x => !x.deleted).map(x => [String(x.name), String(x.name)])],
    channel: ["Sales channel", Object.entries(CHL).filter(([k]) => k !== "web")],
    pay: ["Payment type", [...new Set([...pms.filter(x => !x.deleted).map(x => String(x.name)), "Cash", "Card", "Other"])].map(x => [x, x])],
    device: ["Device", devices.filter(x => !x.deleted).map(x => [String(x.id), String(x.name)])],
  };
  const nameIn = (list: any[], ids: string) => selList(ids).map(id => list.find(x => x.id === id)?.name || "—").join(", ");
  const chips: { k: string; l: string; v: string; keys: string[] }[] = [
    ...(F.from ? [{ k: "date", l: "Business date", v: fmtDate(F.from) + (F.to && F.to !== F.from ? " – " + fmtDate(F.to) : ""), keys: ["from", "to"] }] : []),
    ...(F.brand ? [{ k: "brand", l: "Brand", v: nameIn(brands, F.brand), keys: ["brand"] }] : []),
    ...(F.branch ? [{ k: "branch", l: "Store", v: nameIn(branches, F.branch), keys: ["branch"] }] : []),
    ...Object.entries(opts).filter(([k]) => F[k]).map(([k, [l, o]]) => ({ k, l, v: o.find(x => x[0] === F[k])?.[1] || F[k], keys: [k] })),
    ...([["ref", "Reference"], ["num", "Number"], ["cust", "Customer"], ["rnotes", "Receipt notes"], ["knotes", "Kitchen notes"]] as const).filter(([k]) => String(F[k] || "").trim()).map(([k, l]) => ({ k, l, v: F[k], keys: [k] })),
  ];
  const nF = chips.length;

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

  const sub = "block text-xs text-gray-500 dark:text-gray-400";
  const store = (o: any) => branches.find(b => b.id === o.branchId)?.name || "—";
  const cols: DTColumn<any>[] = [
    { id: "ref", title: "Reference", value: o => ordRef(o), cell: o => <span className="font-medium text-gray-900 dark:text-gray-50">{ordRef(o)}</span>, hideable: false },
    { id: "chk", title: "Check Number", value: o => chkNo(o) },
    { id: "no", title: "Order", value: o => +o.no || 0, cell: o => o.no || "—" },
    { id: "store", title: "Store", value: store, cell: o => <>{store(o)}{brands.length > 1 && <span className={sub}>{brands.find(b => b.id === o.brandId)?.name || "—"}</span>}</> },
    { id: "cust", title: "Customer", value: o => o.customerName || "", cell: o => <><span className="block font-medium text-gray-900 dark:text-gray-50">{o.customerName || "—"}</span>{o.phone && <span className={sub}>{tel(o.phone)}</span>}</> },
    { id: "status", title: "Status", value: o => ORD_ST[o.status] || o.status, cell: o => <Badge variant="light" color={ST_COLOR[o.status] || "gray"}>{ORD_ST[o.status] || o.status}</Badge> },
    { id: "type", title: "Order Type", value: o => TYPE_LBL[o.type] || o.type || "", cell: o => <>{TYPE_LBL[o.type] || o.type || "—"}{o.type === "dinein" && o.table && <span className={sub}>{/^\d+$/.test(String(o.table).trim()) ? "Table " + String(o.table).trim() : o.table}</span>}</> },
    { id: "source", title: "Order Source", value: o => srcOf(o) || "", cell: o => srcOf(o) || "—" },
    { id: "bdate", title: "Business Date", value: o => o.createdAt, cell: o => fmtDate(o.createdAt) },
    { id: "opened", title: "Opened At", value: o => o.createdAt, cell: o => <>{fmtDate(o.createdAt)}<span className={sub}>{new Date(o.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span></> },
    { id: "pay", title: "Payment Type", value: o => o.payment?.method || "", cell: o => o.payment?.method || "—" },
    { id: "total", title: "Total", num: true, value: o => +o.total || 0, cell: o => <span className="font-medium text-gray-900 dark:text-gray-50">{money(o.total)}</span> },
  ];

  // Tremor dashboard template "Details" page: filter bar + data table + pagination (rows are paged on the server)
  return (
    <>
      <PageBreadcrumb pageTitle="Orders" />
      <SegTabs className="mb-4 flex-wrap self-start overflow-visible" value={tab} onChange={v => { setTab(v); setPage(1); }} items={ORD_TABS} />
      {/* the filters in use, each removable; all of them are set in the Filters side panel */}
      {chips.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {chips.map(c => <span key={c.k} className="flex items-center gap-1 rounded-md bg-gray-100 py-1 ps-2.5 pe-1 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">{c.l}: <b className="font-semibold">{c.v}</b>
          <button type="button" aria-label={"Remove " + c.l + " filter"} className="rounded px-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800" onClick={() => { setF(f => { const n = { ...f }; c.keys.forEach(k => delete n[k]); return n; }); setPage(1); }}>×</button></span>)}
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setF({}); setPage(1); }}>Clear all</Button>
      </div>}
      {err ? <p className="py-6 text-sm text-red-600">Couldn't load orders: {err}</p> : (
        <DataTable<any>
          data={rows}
          columns={cols}
          getRowId={o => o.id}
          server={{ page, total: Math.max(count, (page - 1) * PER + rows.length), onPage: setPage, search: q, onSearch: v => { setQ(v); setPage(1); } }}
          searchPlaceholder="Search reference, customer, phone..."
          toolbar={<Button variant={nF ? "secondary" : "outline"} className="h-[30px] py-1" onClick={() => setFOpen(true)}><FilterIcon className="size-4" />Filters{nF ? <Badge variant="solid" color="primary" className="ms-1">{nF}</Badge> : null}</Button>}
          onRowClick={o => openWin("/order?id=" + o.id)}
          rowActions={[{ label: "Open", onSelect: o => openWin("/order?id=" + o.id) }]}
          onExport={list => downloadCsv("Orders", cols.map(c => c.title), list.map(o => cols.map(c => String(c.value?.(o) ?? ""))))}
          empty={<EmptyState text={loading ? "Loading orders…" : q ? "No orders match these filters." : tab === "today" ? "You don't have orders today" : "You don't have orders here"} />}
          pageSize={PER}
        />
      )}
      <FilterPanel open={fOpen} F={F} opts={opts} brands={brands} branches={branches} onApply={f => { setF(f); setPage(1); setFOpen(false); }} onClose={() => setFOpen(false)} />
    </>
  );
}

const H = ({ t }: { t: string }) => <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t}</h3>;
// Filters: a Tremor side panel with every filter, grouped (When, Where, Order, Source and payment, Find); "Show orders" applies them.
function FilterPanel({ open, F, opts, brands, branches, onApply, onClose }: { open: boolean; F: Record<string, string>; opts: Record<string, [string, [string, string][]]>; brands: any[]; branches: any[];
  onApply: (f: Record<string, string>) => void; onClose: () => void }) {
  const [d, setD] = useState<Record<string, string>>({ ...F });
  useEffect(() => { if (open) setD({ ...F }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: string) => setD(x => { const n = { ...x }; if (v) n[k] = v; else delete n[k]; return n; });
  const chooser = (k: string) => { const [l, o] = opts[k]; if (!o.length) return null;
    return <div key={k} className="space-y-2"><p className="text-sm font-medium text-gray-900 dark:text-gray-50">{l}</p>
      <div className="flex flex-wrap gap-1.5">{o.map(([v, t]) => <ChoiceButton key={v} on={d[k] === v} onClick={() => set(k, d[k] === v ? "" : v)} className="min-h-8 py-1 text-sm">{t}</ChoiceButton>)}</div></div>; };
  const txt = (k: string, l: string, ph?: string) => <Field key={k}><FieldLabel>{l}</FieldLabel><Input placeholder={ph || ""} value={d[k] || ""} onChange={e => set(k, e.target.value)} /></Field>;
  return (
    <Drawer open={open} onOpenChange={o => !o && onClose()}>
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader><DrawerTitle>Filters</DrawerTitle></DrawerHeader>
        <DrawerBody className="-mx-6 space-y-7 overflow-y-auto px-6">
          <section className="space-y-3"><H t="When" /><div><p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-50">Business date</p><RangeInput from={d.from || ""} to={d.to || ""} onChange={(a, b) => setD(x => { const n = { ...x }; if (a) { n.from = a; n.to = b || a; } else { delete n.from; delete n.to; } return n; })} /></div></section>
          <section className="space-y-3"><H t="Where" />
            <div className="flex flex-wrap gap-2">
              <FilterSelect multiple title="Brand" value={d.brand || ""} onChange={v => setD(x => { const n = { ...x }; if (v) n.brand = v; else delete n.brand; const st = selList(n.branch || "").filter(id => inSel(v, branches.find(b => b.id === id)?.brandId)).join(","); if (st) n.branch = st; else delete n.branch; return n; })} all="All Brands" options={brands.filter(b => !b.deleted).map(b => ({ value: String(b.id), label: String(b.name) }))} />
              <FilterSelect multiple title="Store" value={d.branch || ""} onChange={v => set("branch", v)} all="All Stores" options={branches.filter(b => !b.deleted && inSel(d.brand || "", b.brandId)).map(b => ({ value: String(b.id), label: String(b.name) }))} />
            </div>{chooser("device")}</section>
          <section className="space-y-4"><H t="Order" />{chooser("status")}{chooser("type")}{chooser("ahead")}</section>
          <section className="space-y-4"><H t="Source and payment" />{chooser("source")}{chooser("channel")}{chooser("pay")}</section>
          <section className="space-y-3"><H t="Find" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{txt("ref", "Reference", "e.g. 100045")}{txt("num", "Number", "Order number")}{txt("cust", "Customer", "Name or phone")}{txt("rnotes", "Receipt notes")}{txt("knotes", "Kitchen notes")}</div></section>
        </DrawerBody>
        <DrawerFooter className="-mx-6 -mb-2 gap-2 border-t border-gray-200 px-6 pt-4 dark:border-gray-800">
          <Button variant="ghost" className="sm:me-auto" onClick={() => setD({})}>Reset all</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onApply(d)}>Show orders</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
