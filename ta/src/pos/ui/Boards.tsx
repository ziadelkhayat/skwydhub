"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// Full screens on the register, from Tremor:
// - Pickup & Delivery: columns of order cards as on the call center board (Pending, Active, Declined, Done)
// - Orders: every order as a Tremor table with tabs, a search and a date range picker; a row opens the order in the cart
import { Badge } from "@/components/tremor/Badge";
import { Button } from "@/components/tremor/Button";
import { Card } from "@/components/tremor/Card";
import { DateRangePicker } from "@/components/tremor/DatePicker";
import { Input } from "@/components/tremor/Input";
import { cx } from "@/components/tremor/utils";
import { useEffect, useState, type ReactNode } from "react";
import { fetchOrders, type Row } from "../lib/db";
import { bizDate, money, type Ctx } from "../lib/pos";
import { useStore } from "../lib/store";
import { DriverPick } from "./Drivers";
import { Icon } from "./Icon";
import { notify } from "./notify";
import { Chip, Keyboard, Panel } from "./Touch";

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
// the header of a full screen (touch size): a big back button, the title, and the screen's own buttons
export function Head({ title, onClose, children, back = "" }: { title: string; onClose: () => void; children?: ReactNode; back?: string }) {
  return <header className="flex h-[84px] shrink-0 items-center gap-3 bg-white px-4 shadow-[0_1px_2px_rgb(16_24_40/0.06),0_4px_12px_rgb(16_24_40/0.05)] dark:bg-gray-950 [&>button]:h-14 [&>button]:rounded-[14px] [&>button]:px-5 [&>button]:text-[17px]">
    {back ? <Button variant="secondary" className="gap-1.5" onClick={onClose}><Icon name="back" className="size-5" />{back}</Button>
      : <Button variant="secondary" aria-label="Close" className="w-14 !px-0" onClick={onClose}><Icon name="x" className="size-6" /></Button>}
    <h1 className="flex-1 truncate ps-1 text-2xl font-semibold text-gray-900 dark:text-gray-50">{title}</h1>{children}</header>;
}
export const Full = ({ children }: { children: ReactNode }) => <div className="fixed inset-0 z-20 flex flex-col bg-gray-50 portal:bg-[var(--portal-canvas)] dark:bg-gray-950 dark:portal:bg-gray-950">{children}</div>;

// Functions: a page of big tiles in groups
export type FnItem = { icon: string; label: string; onClick: () => void; bad?: boolean };
export function FnPage({ title, who, groups, onClose, area }: { title: string; who: string; groups: { title: string; items: FnItem[] }[]; onClose: () => void; area: { cartW: string } }) {
  // opens in the menu's place like Discount: the cart stays on the left
  return <Panel area={area} title={title} sub={who} onClose={onClose} className="space-y-6">{groups.map((g, i) => <section key={i}>
      {g.title ? <h2 className="mb-3 ps-1 text-sm font-semibold uppercase tracking-wide text-gray-500">{g.title}</h2> : null}
      <div className="grid grid-cols-3 gap-3">{g.items.map(it => <button key={it.label} type="button" onClick={it.onClick}
        className="flex h-[120px] flex-col items-center justify-center gap-3 rounded-[18px] bg-gray-50 text-[17px] font-medium text-gray-900 ring-[1.5px] ring-inset ring-gray-200 active:bg-blue-50 dark:bg-gray-900 dark:text-gray-50 dark:ring-gray-800">
        <span className={it.bad ? "flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10" : "flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"}><Icon name={it.icon} className="size-7" /></span>
        <span className={it.bad ? "text-red-600 dark:text-red-500" : ""}>{it.label}</span></button>)}</div></section>)}</Panel>;
}

const TYPE_IC: Record<string, string> = { dinein: "table", pickup: "bag", takeaway: "bag", delivery: "scooter" };
const Ln = ({ ic, l, v, sub }: { ic: string; l: string; v: string; sub?: string }) => <div className="flex gap-2.5" aria-label={l}>
  <Icon name={ic} className="mt-0.5 size-5 shrink-0 text-gray-400" /><div className="min-w-0"><p className="truncate text-[15px] text-gray-900 dark:text-gray-50">{v}</p>{sub ? <p className="truncate text-sm text-gray-500">{sub}</p> : null}</div></div>;
function Tile({ o, onOpen, onDriver, onDispatch }: { o: Row; onOpen: () => void; onDriver?: () => void; onDispatch?: () => void }) {
  const st = stOf(o), src = String(o.source || "").trim(), ch = CH[o.channel] || "POS", mod = o.updatedAt && o.updatedAt !== o.createdAt && tm(o.updatedAt) !== tm(o.createdAt) ? "Modified " + tm(o.updatedAt) : undefined;
  const who = ["pos", "callcenter"].includes(o.channel || "pos") && o.agent ? String(o.agent).replace(/\s*\(auto\)\s*$/i, "") : "";
  return <Card className="space-y-2.5 rounded-2xl p-4">
    <button type="button" onClick={onOpen} className="block w-full space-y-2 text-left" aria-label={"Order " + (o.ref || ordRef(o))}>
      <div className="flex items-center gap-2"><span className="text-lg font-semibold text-gray-900 dark:text-gray-50">{o.ref || ordRef(o)}</span><Badge variant={st.tone}>{st.label}</Badge></div>
      <Ln ic={TYPE_IC[o.type] || "bag"} l="Order type" v={TYPE[o.type] || o.type} />
      <Ln ic="user" l="Customer" v={o.customerName || "Guest"} sub={o.phone || undefined} />
      <Ln ic="device" l="Sales channel" v={ch} sub={src && src.toLowerCase() !== ch.toLowerCase() ? src : undefined} />
      {who ? <Ln ic="headset" l="Created by" v={who} /> : null}
      <Ln ic="clock" l="Created" v={tm(o.createdAt)} sub={mod} />
    </button>
    {/* a delivery being prepared: pick its driver, then dispatch it */}
    {onDriver ? <div className="space-y-2 pt-1"><Button variant="secondary" className="h-14 w-full truncate rounded-[14px] text-[16px]" onClick={onDriver}>{o.driverName ? "Driver: " + o.driverName : "Assign Driver"}</Button><Button className="h-14 w-full rounded-[14px] text-[16px]" disabled={!o.driverName} onClick={onDispatch}>Dispatch</Button></div> : null}
  </Card>;
}

export function PDBoard({ x: x0, onOpen, onClose }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void; onNew?: () => void }) {
  const { write, S } = useStore(), x: Ctx = { ...x0, S }, [pick, setPick] = useState<Row | null>(null);
  const dispatch = (o: Row) => { const now = new Date().toISOString(); write("orders", o.id, { dispatchedAt: now, updatedAt: now }); notify("Order " + ordRef(o) + " dispatched" + (o.driverName ? " with " + o.driverName : ""), "success"); };
  const l = today(x).filter(o => ["pickup", "takeaway", "delivery"].includes(o.type)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const COLS: [string, string, (o: Row) => boolean][] = [["pending", "Pending", o => o.status === "pending" || o.editRequest?.status === "pending"],
    ["active", "Preparing", o => o.status === "active" && o.editRequest?.status !== "pending" && !o.dispatchedAt],
    ["dispatched", "Dispatched", o => o.status === "active" && o.editRequest?.status !== "pending" && !!o.dispatchedAt], ["closed", "Done", o => o.status === "closed"], ["declined", "Declined", o => o.status === "declined"]];
  return <Full><Head title="Pickup & Delivery" onClose={onClose}></Head>
    <div className="grid flex-1 grid-cols-5 gap-3 overflow-hidden p-3">
      {COLS.map(([k, t, f]) => { const col = l.filter(f); return <section key={k} className="flex min-h-0 flex-col rounded-[20px] bg-gray-100 p-3 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{t}</h2><Badge variant={col.length && (k === "active" || k === "dispatched") ? "default" : "neutral"}>{col.length}</Badge></div>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {col.length ? col.map(o => { const d = o.type === "delivery" && o.status === "active" && !o.dispatchedAt;
            return <Tile key={o.id} o={o} onOpen={() => onOpen(o)} onDriver={d ? () => setPick(o) : undefined} onDispatch={d ? () => dispatch(o) : undefined} />; })
            : <p className="py-6 text-center text-xs text-gray-500">You don't have {t.toLowerCase()} orders</p>}
        </div></section>; })}
    </div>{pick ? <DriverPick x={x} o={x.S.orders.find(z => z.id === pick.id) || pick} onDone={m => { setPick(null); if (m) notify(m); }} /> : null}</Full>;
}

const isoD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toD = (s: string) => new Date(s + "T12:00:00");
// a full screen, or the menu's place on the register when area is given
const Box = ({ area, children }: { area?: { cartW: string }; children: ReactNode }) => area ? <div className="fixed inset-y-0 right-0 z-20 flex flex-col bg-gray-50 portal:bg-[var(--portal-canvas)] dark:bg-gray-950 dark:portal:bg-gray-950" style={{ left: area.cartW }}>{children}</div> : <Full>{children}</Full>;
// area: opens in the menu's place on the register (the cart stays on the left), with a Back button
export function OrdersList({ x: x0, onOpen, onClose, area }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void; area?: { cartW: string } }) {
  const { S: liveS } = useStore(), x: Ctx = { ...x0, S: liveS };
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
  const [srch, setSrch] = useState(false);
  const n = (k: string) => all.filter(TABS.find(z => z[0] === k)![2]).length;
  const DOT: Record<string, string> = { default: "bg-blue-600", success: "bg-emerald-500", error: "bg-red-500", warning: "bg-amber-500", neutral: "bg-gray-400" };
  return <Box area={area}><Head title="Orders" back="" onClose={onClose}>
      <DateRangePicker className="w-64 [&>button]:h-14 [&>button]:rounded-[14px] [&>button]:text-[16px]" placeholder="All dates" toDate={new Date()} value={rng ? { from: toD(rng.from), to: toD(rng.to) } : undefined}
        onChange={r => setRng(r?.from ? { from: isoD(r.from), to: isoD(r.to || r.from) } : null)} />
      {rng ? <Button variant="ghost" onClick={() => setRng(null)}>All dates</Button> : null}</Head>
    {/* the status buttons, or the search in their place */}
    <div className="flex shrink-0 gap-2.5 px-4 pt-4">
      {srch ? <><Input type="search" autoFocus inputMode="none" value={q} onChange={e => setQ(e.target.value)} placeholder="Search reference, number, check, customer, table" aria-label="Search orders" className="flex-1 [&>input]:h-[52px] [&>input]:text-[17px]" />
        <Chip onClick={() => { setQ(""); setSrch(false); }}><Icon name="x" className="size-5" />Close</Chip></>
      : <><Chip onClick={() => setSrch(true)} className="w-[52px] justify-center px-0"><span className="sr-only">Search orders</span><Icon name="search" className="size-6" /></Chip>
        <div className="flex min-w-0 flex-1 gap-1.5">{TABS.map(([k, t]) => <Chip key={k} on={tab === k} n={n(k) || undefined} onClick={() => setTab(k)} className="h-[52px] min-w-0 flex-1 justify-center gap-1 px-1 text-[15px]">{t}</Chip>)}</div></>}
    </div>
    {srch ? <div className="shrink-0 px-4 pt-3"><Keyboard onKey={k => setQ(v => k === "\b" ? v.slice(0, -1) : k === "\n" ? v : v + k)} /></div> : null}
    <div className="flex min-h-0 flex-1 gap-4 p-4">
      {/* the orders as big rows; a tap opens the order in the cart */}
      <div className={cx("grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto pb-2", area ? "grid-cols-1" : "grid-cols-2")}>
        {list.length ? list.map(y => { const st = stOf(y);
          return <button key={y.id} type="button" onClick={() => onOpen(y)} aria-label={"Open order " + ordRef(y)}
            className={cx("flex min-h-[84px] w-full items-center gap-4 rounded-2xl px-5 py-3 text-left shadow-[0_1px_2px_rgb(16_24_40/0.05),0_4px_12px_rgb(16_24_40/0.05)]", "bg-white active:bg-blue-50 dark:bg-gray-900")}>
            <span className="min-w-0 flex-1"><span className="block text-lg font-semibold text-gray-900 dark:text-gray-50">#{ordRef(y)}{y.ref ? <span className="ms-2 text-sm font-normal text-gray-500">{y.ref}</span> : null}</span>
              <span className="block truncate text-[15px] text-gray-500">{[y.customerName || (y.table ? "Table " + y.table : "Walk-in"), TYPE[y.type] || y.type, CH[y.channel] || "POS"].join(" · ")}</span></span>
            <span className="flex shrink-0 items-center gap-2 text-[15px] font-medium text-gray-700 dark:text-gray-300"><span className={cx("size-2.5 rounded-full", DOT[st.tone])} />{st.label}</span>
            <span className="w-24 shrink-0 text-right"><span className="block text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-50">{money(x.S, y.total)}</span><span className="block text-sm text-gray-500">{tm(y.createdAt)}</span></span>
          </button>; })
          : <p className="py-10 text-center text-gray-500">{loading ? "Loading orders…" : !all.length ? "No orders for these dates." : "No orders here."}</p>}
        {more ? <div className="col-span-full flex justify-center p-2"><Button variant="secondary" className="h-14 rounded-[14px] px-6 text-[17px]" isLoading={loading} loadingText="Loading…" onClick={() => load(far.length)}>Load older orders</Button></div> : null}
      </div>
    </div></Box>;
}
