"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// Full screens on the register, from Tremor:
// - Pickup & Delivery: columns of order cards as on the call center board (Pending, Active, Declined, Done)
// - Orders: every order as a Tremor table with tabs, a search and a date range picker; a row opens the order in the cart
import { Badge } from "@/components/tremor/Badge";
import { Button } from "@/components/tremor/Button";
import { Card } from "@/components/tremor/Card";
import { DateRangePicker } from "@/components/tremor/DatePicker";
import { Input } from "@/components/tremor/Input";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/tremor/Table";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { useEffect, useState, type ReactNode } from "react";
import { fetchOrders, type Row } from "../lib/db";
import { bizDate, money, type Ctx } from "../lib/pos";
import { useStore } from "../lib/store";
import { DriverPick } from "./Drivers";
import { Icon } from "./Icon";
import { notify } from "./notify";

export const TYPE: Record<string, string> = { dinein: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery" };
export const CH: Record<string, string> = { pos: "POS", callcenter: "Call Center", online: "API", web: "API", marketplace: "API" };
export const ordRef = (o: Row) => (o.no ? "#" + o.no : o.ref || "—").replace(/^#/, "");
export const tm = (t: any) => t ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";
type Tone = "default" | "neutral" | "success" | "error" | "warning";
export const stOf = (o: Row): { label: string; tone: Tone } => o.editRequest?.status === "pending" ? { label: "Edit request", tone: "warning" } : o.status === "pending" ? { label: "Pending", tone: "warning" }
  : o.status === "active" ? (o.dispatchedAt ? { label: "Dispatched" + (o.driverName ? " · " + o.driverName : ""), tone: "default" } : { label: "Preparing", tone: "default" }) : o.status === "closed" ? { label: "Done", tone: "success" }
  : o.status === "void" ? { label: "Void", tone: "error" } : o.status === "returned" || o.status === "refund" ? { label: "Returned", tone: "error" } : o.status === "declined" ? { label: "Declined", tone: "error" } : { label: o.status, tone: "neutral" };
const today = (x: Ctx) => { const d = bizDate(x); return x.S.orders.filter(o => o.branchId === x.device.branchId && !o.deleted && (["pending", "active"].includes(o.status) || bizDate(x, o.createdAt) === d)); };

// the header of a full screen: back, title, and the screen's own buttons
export function Head({ title, onClose, children, back = "Register" }: { title: string; onClose: () => void; children?: ReactNode; back?: string }) {
  return <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
    <Button variant="secondary" className="h-11 gap-1" onClick={onClose}><Icon name="back" className="size-4" />{back}</Button>
    <h1 className="flex-1 truncate text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h1>{children}</header>;
}
export const Full = ({ children }: { children: ReactNode }) => <div className="fixed inset-0 z-20 flex flex-col bg-gray-50 dark:bg-gray-950">{children}</div>;

const TYPE_IC: Record<string, string> = { dinein: "table", pickup: "bag", takeaway: "bag", delivery: "scooter" };
function Tile({ o, onOpen, onDriver, onDispatch }: { o: Row; onOpen: () => void; onDriver?: () => void; onDispatch?: () => void }) {
  const st = stOf(o), src = String(o.source || "").trim(), ch = CH[o.channel] || "POS", mod = o.updatedAt && o.updatedAt !== o.createdAt && tm(o.updatedAt) !== tm(o.createdAt) ? "Modified " + tm(o.updatedAt) : undefined;
  const who = ["pos", "callcenter"].includes(o.channel || "pos") && o.agent ? String(o.agent).replace(/\s*\(auto\)\s*$/i, "") : "";
  const Ln = ({ ic, l, v, sub }: { ic: string; l: string; v: string; sub?: string }) => <div className="flex gap-2.5" aria-label={l}>
    <Icon name={ic} className="mt-0.5 size-4 shrink-0 text-gray-400" /><div className="min-w-0"><p className="truncate text-sm text-gray-900 dark:text-gray-50">{v}</p>{sub ? <p className="truncate text-xs text-gray-500">{sub}</p> : null}</div></div>;
  return <Card className="space-y-2 p-3">
    <button type="button" onClick={onOpen} className="block w-full space-y-2 text-left" aria-label={"Order " + (o.ref || ordRef(o))}>
      <div className="flex items-center gap-2"><span className="font-semibold text-gray-900 dark:text-gray-50">{o.ref || ordRef(o)}</span><Badge variant={st.tone}>{st.label}</Badge></div>
      <Ln ic={TYPE_IC[o.type] || "bag"} l="Order type" v={TYPE[o.type] || o.type} />
      <Ln ic="user" l="Customer" v={o.customerName || "Guest"} sub={o.phone || undefined} />
      <Ln ic="device" l="Sales channel" v={ch} sub={src && src.toLowerCase() !== ch.toLowerCase() ? src : undefined} />
      {who ? <Ln ic="headset" l="Created by" v={who} /> : null}
      <Ln ic="clock" l="Created" v={tm(o.createdAt)} sub={mod} />
    </button>
    {/* a delivery being prepared: pick its driver, then dispatch it */}
    {onDriver ? <div className="flex gap-2 pt-1"><Button variant="secondary" className="flex-1 truncate" onClick={onDriver}>{o.driverName || "Assign Driver"}</Button><Button className="flex-1" onClick={onDispatch}>Dispatch</Button></div> : null}
  </Card>;
}

export function PDBoard({ x, onOpen, onClose, onNew, onDrivers }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void; onNew?: () => void; onDrivers?: () => void }) {
  const { write } = useStore(), [pick, setPick] = useState<Row | null>(null);
  const dispatch = (o: Row) => { const now = new Date().toISOString(); write("orders", o.id, { dispatchedAt: now, updatedAt: now }); notify("Order " + ordRef(o) + " dispatched" + (o.driverName ? " with " + o.driverName : ""), "success"); };
  const l = today(x).filter(o => ["pickup", "takeaway", "delivery"].includes(o.type)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const COLS: [string, string, (o: Row) => boolean][] = [["pending", "Pending", o => o.status === "pending" || o.editRequest?.status === "pending"],
    ["active", "Active", o => o.status === "active" && o.editRequest?.status !== "pending"], ["declined", "Declined", o => o.status === "declined"], ["closed", "Done", o => o.status === "closed"]];
  return <Full><Head title="Pickup & Delivery" onClose={onClose}>
    {onDrivers ? <Button variant="secondary" className="h-11" onClick={onDrivers}>Drivers</Button> : null}{onNew ? <Button className="h-11 gap-1" onClick={onNew}><Icon name="plus" className="size-4" />New Order</Button> : null}</Head>
    <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden p-3">
      {COLS.map(([k, t, f]) => { const col = l.filter(f); return <section key={k} className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-gray-100 p-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{t}</h2><Badge variant={col.length && k === "active" ? "default" : "neutral"}>{col.length}</Badge></div>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {col.length ? col.map(o => { const d = o.type === "delivery" && o.status === "active" && !o.dispatchedAt;
            return <Tile key={o.id} o={o} onOpen={() => onOpen(o)} onDriver={d ? () => setPick(o) : undefined} onDispatch={d ? () => dispatch(o) : undefined} />; })
            : <p className="py-6 text-center text-xs text-gray-500">You don't have {t.toLowerCase()} orders</p>}
        </div></section>; })}
    </div>{pick ? <DriverPick x={x} o={x.S.orders.find(z => z.id === pick.id) || pick} onDone={m => { setPick(null); if (m) notify(m); }} /> : null}</Full>;
}

const isoD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toD = (s: string) => new Date(s + "T12:00:00");
export function OrdersList({ x, onOpen, onClose }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void }) {
  const mineAll = x.S.orders.filter(o => o.branchId === x.device.branchId && !o.deleted), todayD = bizDate(x);
  // every order by default; the date range picker picks one business day or a from–to range. The tablet keeps the last week, older orders come from the server 200 at a time
  const { sb } = useStore();
  const [rng, setRng] = useState<{ from: string; to: string } | null>(null);
  const [far, setFar] = useState<Row[]>([]), [more, setMore] = useState(false), [loading, setLoading] = useState(false);
  const keep = (() => { const d = toD(todayD); d.setDate(d.getDate() - 6); return isoD(d); })();
  const needFar = !rng || rng.from < keep;
  const load = async (off: number) => { if (!sb || !needFar) return; setLoading(true);
    try { const r = await fetchOrders(sb, x.device.branchId, rng?.from || null, rng?.to || null, off); setFar(p => off ? [...p, ...r] : r); setMore(r.length === 200); } catch { setMore(false); } finally { setLoading(false); } };
  useEffect(() => { setFar([]); setMore(false); load(0); }, [rng?.from, rng?.to, !!sb]); // eslint-disable-line react-hooks/exhaustive-deps
  const ids = new Set(mineAll.map(o => o.id)), pool = [...mineAll, ...far.filter(o => o.branchId === x.device.branchId && !o.deleted && !ids.has(o.id))];
  const inRng = (o: Row) => { if (!rng) return true; const d = bizDate(x, o.createdAt); return (d >= rng.from && d <= rng.to) || (rng.to >= todayD && ["pending", "active"].includes(o.status)); };
  const all = pool.filter(inRng).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  // the same tabs as the back office Orders page
  const API = ["online", "web", "marketplace", "api"], sched = (o: any) => !!o.scheduledAt && ["draft", "pending", "active"].includes(o.status);
  const TABS: [string, string, (o: Row) => boolean][] = [["all", "All", () => true], ["today", "Today", o => bizDate(x, o.createdAt) === todayD], ["draft", "Draft", o => o.status === "draft"], ["pending", "Pending", o => o.status === "pending" || o.editRequest?.status === "pending"],
    ["active", "Active", o => o.status === "active"], ["dispatched", "Dispatched", o => o.status === "active" && !!(o as any).dispatchedAt], ["ahead", "Ahead", sched], ["api", "API", o => API.includes(o.channel)]];
  const [tab, setTab] = useState(() => mineAll.some(o => o.status === "pending" || o.editRequest?.status === "pending") ? "pending" : "all"), [q, setQ] = useState(""), s = q.trim().toLowerCase();
  const list = all.filter(TABS.find(t => t[0] === tab)![2]).filter(o => !s || [ordRef(o), o.ref, o.customerName, o.phone, o.table, o.invoiceNo].some(v => String(v || "").toLowerCase().includes(s)));
  return <Full><Head title="Orders" onClose={onClose} />
    <div className="flex min-h-0 flex-1 flex-col p-3"><Card className="flex min-h-0 flex-1 flex-col p-0">
      <div className="flex items-center gap-3 p-4 pb-0">
        <Input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search reference, number, check, customer, table" aria-label="Search orders" className="flex-1 [&>input]:h-11" />
        <DateRangePicker className="w-72" placeholder="All dates" toDate={new Date()} value={rng ? { from: toD(rng.from), to: toD(rng.to) } : undefined}
          onChange={r => setRng(r?.from ? { from: isoD(r.from), to: isoD(r.to || r.from) } : null)} />
        {rng ? <Button variant="ghost" onClick={() => setRng(null)}>All dates</Button> : null}
      </div>
      <Tabs value={tab} onValueChange={setTab} className="px-4 pt-4"><TabsList variant="solid" className="w-full">{TABS.map(([k, t]) => { const n = all.filter(TABS.find(z => z[0] === k)![2]).length;
        return <TabsTrigger key={k} value={k} className="flex-1 gap-1.5">{t}{n ? <span className="text-xs text-gray-500">{n}</span> : null}</TabsTrigger>; })}</TabsList></Tabs>
      <TableRoot className="mt-3 min-h-0 flex-1 overflow-y-auto">
        <Table>
          <TableHead><TableRow>{["Reference", "Order", "Check", "Type", "Customer / Table", "Items", "Opened", "Status"].map(h => <TableHeaderCell key={h}>{h}</TableHeaderCell>)}<TableHeaderCell className="text-right">Total</TableHeaderCell></TableRow></TableHead>
          <TableBody>{list.length ? list.map(y => { const st = stOf(y);
            return <TableRow key={y.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900" onClick={() => onOpen(y)} aria-label={"Open order " + ordRef(y)}>
              <TableCell>{y.ref || "—"}</TableCell><TableCell className="font-semibold text-gray-900 dark:text-gray-50">{ordRef(y)}</TableCell><TableCell>{y.invoiceNo || "—"}</TableCell>
              <TableCell><p className="text-gray-900 dark:text-gray-50">{TYPE[y.type] || y.type}</p><p className="text-xs">{CH[y.channel] || "POS"}</p></TableCell>
              <TableCell className="max-w-56"><p className="truncate text-gray-900 dark:text-gray-50">{y.customerName || (y.table ? "Table " + y.table : "Walk-in")}</p>
                {y.phone || (y.type === "delivery" && y.driverName) ? <p className="truncate text-xs">{[y.phone, y.type === "delivery" && y.driverName ? "Driver: " + y.driverName : ""].filter(Boolean).join(" · ")}</p> : null}</TableCell>
              <TableCell>{(y.items || []).filter((i: any) => !i.voided).reduce((a: number, i: any) => a + (+i.qty || 0), 0)}</TableCell>
              <TableCell>{tm(y.createdAt)}</TableCell><TableCell><Badge variant={st.tone}>{st.label}</Badge></TableCell>
              <TableCell className="text-right font-semibold text-gray-900 dark:text-gray-50">{money(x.S, y.total)}</TableCell></TableRow>; })
            : <TableRow><TableCell colSpan={9} className="py-10 text-center">{loading ? "Loading orders…" : !all.length ? "No orders for these dates." : "No orders here."}</TableCell></TableRow>}</TableBody>
        </Table>
        {more ? <div className="flex justify-center p-4"><Button variant="secondary" isLoading={loading} loadingText="Loading…" onClick={() => load(far.length)}>Load older orders</Button></div> : null}
      </TableRoot>
    </Card></div></Full>;
}
