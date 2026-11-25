// Full screens on the register (inside the 16:10 frame on the web):
// - Pickup & Delivery: columns of order tiles as on the call center board (Pending, Preparing, Dispatched, Done)
// - Orders: every order of the business day as a list, with the chosen order's details beside it
import { useEffect, useState } from "react";
import { fetchOrders } from "../lib/db";
import { useStore } from "../lib/store";
import { Sheet } from "./Pickers";
import { Pressable, ScrollView, View } from "react-native";
import { TextInput } from "./Keyboard";
import type { Row } from "../lib/db";
import { bizDate, money, type Ctx } from "../lib/pos";
import { C, F, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Pill, T } from "./kit";
import { ordRef } from "./Orders";
import { DriverPick } from "./Drivers";
import { notify } from "./Bubble";

const TYPE: Record<string, string> = { dinein: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery" };
const CH: Record<string, string> = { pos: "POS", callcenter: "Call Center", online: "API", web: "API", marketplace: "API" };
const tm = (t: any) => t ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";
type St = { label: string; tone: "gray" | "ok" | "brand" | "warn" | "bad" };
export const stOf = (o: Row): St => o.editRequest?.status === "pending" ? { label: "Edit request", tone: "warn" } : o.status === "pending" ? { label: "Pending", tone: "warn" }
  : o.status === "active" ? (o.dispatchedAt ? { label: "Dispatched" + (o.driverName ? " · " + o.driverName : ""), tone: "brand" } : { label: "Preparing", tone: "brand" }) : o.status === "closed" ? { label: "Done", tone: "ok" }
  : o.status === "void" ? { label: "Void", tone: "bad" } : o.status === "returned" || o.status === "refund" ? { label: "Returned", tone: "bad" } : o.status === "declined" ? { label: "Declined", tone: "bad" } : { label: o.status, tone: "gray" };
const today = (x: Ctx) => { const d = bizDate(x); return x.S.orders.filter(o => o.branchId === x.device.branchId && !o.deleted && (["pending", "active"].includes(o.status) || bizDate(x, o.createdAt) === d)); };

// the header of a full screen: back, title, and the screen's own buttons
export function Head({ title, onClose, children, back = "Register" }: { title: string; onClose: () => void; children?: React.ReactNode; back?: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, height: 68, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: C.line }}>
    <Btn height={44} label={"‹ " + back} onPress={onClose} /><T w="s" size={19} style={{ flex: 1 }}>{title}</T>{children}</View>;
}
export const Full = ({ children }: { children: React.ReactNode }) => <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, zIndex: 20 }}>{children}</View>;

// a tile as on the call center board
// an order card: reference and status, then one icon per line — type; customer over the phone; channel over the source;
// who took it (POS and call center orders only); created over modified
const TYPE_IC: Record<string, string> = { dinein: "table", pickup: "bag", takeaway: "bag", delivery: "scooter" };
function Tile({ o, x, onOpen, onDriver, onDispatch }: { o: Row; x: Ctx; onOpen: () => void; onDriver?: () => void; onDispatch?: () => void }) {
  const st = stOf(o);   // no brand or store on the POS: the tablet is one store
  const src = String(o.source || "").trim(), ch = CH[o.channel] || "POS", mod = o.updatedAt && o.updatedAt !== o.createdAt && tm(o.updatedAt) !== tm(o.createdAt) ? "Modified " + tm(o.updatedAt) : undefined;
  const who = ["pos", "callcenter"].includes(o.channel || "pos") && o.agent ? String(o.agent).replace(/\s*\(auto\)\s*$/i, "") : "";
  const Ln = ({ ic, l, v, sub }: { ic: string; l: string; v: string; sub?: string }) => <View style={{ flexDirection: "row", gap: 10 }} accessibilityLabel={l}>
    <View style={{ width: 18, alignItems: "center", paddingTop: 1 }}><Icon name={ic as any} size={16} color={C.mut2} /></View>
    <View style={{ flex: 1 }}><T size={14} numberOfLines={1}>{v}</T>{sub ? <T size={12} color={C.mut2} numberOfLines={1}>{sub}</T> : null}</View></View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={"Order " + (o.ref || ordRef(o))} onPress={onOpen} style={({ pressed }) => ({ backgroundColor: "#fff", borderRadius: 6, borderWidth: 1, borderColor: pressed ? "#93C5FD" : C.line, padding: 12, gap: 8, shadowColor: "#000000", shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } })}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><T w="s" size={16}>{o.ref || ordRef(o)}</T><Pill text={st.label} tone={st.tone} /></View>
    <Ln ic={TYPE_IC[o.type] || "bag"} l="Order type" v={TYPE[o.type] || o.type} />
    <Ln ic="user" l="Customer" v={o.customerName || "Guest"} sub={o.phone || undefined} />
    <Ln ic="device" l="Sales channel" v={ch} sub={src && src.toLowerCase() !== ch.toLowerCase() ? src : undefined} />
    {who ? <Ln ic="headset" l="Created by" v={who} /> : null}
    <Ln ic="clock" l="Created" v={tm(o.createdAt)} sub={mod} />
    {/* a delivery being prepared: pick its driver, then dispatch it (the sale screen has no driver button) */}
    {onDriver ? <View style={{ flexDirection: "row", gap: 8, paddingTop: 4 }}>
      <Btn height={38} style={{ flex: 1 }} label={o.driverName || "Assign Driver"} onPress={onDriver} />
      <Btn kind="primary" height={38} style={{ flex: 1 }} label="Dispatch" onPress={onDispatch} /></View> : null}
  </Pressable>;
}

export function PDBoard({ x, onOpen, onClose, onNew, onDrivers }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void; onNew?: () => void; onDrivers?: () => void }) {
  const { write } = useStore(), [pick, setPick] = useState<Row | null>(null);
  const dispatch = (o: Row) => { const now = new Date().toISOString(); write("orders", o.id, { dispatchedAt: now, updatedAt: now }); notify("Order " + ordRef(o) + " dispatched" + (o.driverName ? " with " + o.driverName : "")); };
  const mine = today(x).filter(o => ["pickup", "takeaway", "delivery"].includes(o.type)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const l = mine;
  const COLS: [string, string, (o: Row) => boolean][] = [["pending", "Pending", o => o.status === "pending" || o.editRequest?.status === "pending"],
    ["active", "Active", o => o.status === "active" && o.editRequest?.status !== "pending"],   // preparing or dispatched: the card says which
    ["declined", "Declined", o => o.status === "declined"], ["closed", "Done", o => o.status === "closed"]];
  return <Full><Head title="Pickup & Delivery" onClose={onClose}>
    {onDrivers ? <Btn height={44} label="Drivers" onPress={onDrivers} /> : null}{onNew ? <Btn kind="primary" height={44} label="+ New Order" onPress={onNew} /> : null}</Head>
    <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 12, gap: 10 }}>
      {COLS.map(([k, t, f]) => { const col = l.filter(f); return <View key={k} style={{ flex: 1, minWidth: 190, backgroundColor: "#F9FAFB", borderRadius: 6, borderWidth: 1, borderColor: C.line, padding: 12 }}>
        {/* as on the call center board: the column name, its count (blue only for Active), "You don't have … orders" when empty */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 12 }}><T w="s" size={14}>{t}</T>
          <View style={{ minWidth: 24, height: 22, borderRadius: 11, backgroundColor: col.length && k === "active" ? C.brand : "#E5E7EB", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }}><T w="m" size={12} color={col.length && k === "active" ? "#fff" : "#475467"}>{col.length}</T></View></View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
          {col.length ? col.map(o => { const d = o.type === "delivery" && o.status === "active" && !o.dispatchedAt;
            return <Tile key={o.id} o={o} x={x} onOpen={() => onOpen(o)} onDriver={d ? () => setPick(o) : undefined} onDispatch={d ? () => dispatch(o) : undefined} />; }) : <T size={12} color={C.mut2} style={{ textAlign: "center", paddingVertical: 24 }}>You don't have {t.toLowerCase()} orders</T>}
        </ScrollView></View>; })}
    </ScrollView>{pick ? <DriverPick x={x} o={x.S.orders.find(z => z.id === pick.id) || pick} onDone={m => { setPick(null); if (m) notify(m); }} /> : null}</Full>;
}

export function OrdersList({ x, onOpen, onClose }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void }) {
  // the business days the tablet has orders for (the last 3 days are kept on it), newest first; open orders show whatever their day
  const mineAll = x.S.orders.filter(o => o.branchId === x.device.branchId && !o.deleted), todayD = bizDate(x);
  // every order since the first one by default; the date filter picks one business day or a from–to range.
  // the tablet keeps the last week, older orders are read from the server 200 at a time
  const { sb } = useStore();
  const [rng, setRng] = useState<{ from: string; to: string } | null>(null), [pick, setPick] = useState(false);
  const [far, setFar] = useState<Row[]>([]), [more, setMore] = useState(false), [loading, setLoading] = useState(false);
  const keep = (() => { const d = new Date(todayD + "T12:00:00"); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
  const needFar = !rng || rng.from < keep;
  const load = async (off: number) => { if (!sb || !needFar) return; setLoading(true);
    try { const r = await fetchOrders(sb, x.device.branchId, rng?.from || null, rng?.to || null, off); setFar(p => off ? [...p, ...r] : r); setMore(r.length === 200); } catch { setMore(false); } finally { setLoading(false); } };
  useEffect(() => { setFar([]); setMore(false); load(0); }, [rng?.from, rng?.to, !!sb]); // eslint-disable-line react-hooks/exhaustive-deps
  const shift = (n: number) => { if (!rng || rng.from !== rng.to) return; const d = new Date(rng.from + "T12:00:00"); d.setDate(d.getDate() + n); const v = d.toISOString().slice(0, 10); if (v <= todayD) setRng({ from: v, to: v }); };
  const dmy = (d: string) => d.split("-").reverse().join("-");
  const dayLbl = !rng ? "All dates" : rng.from === rng.to ? (rng.from === todayD ? "Today · " : "") + dmy(rng.from) : dmy(rng.from) + " → " + dmy(rng.to);
  const ids = new Set(mineAll.map(o => o.id)), pool = [...mineAll, ...far.filter(o => o.branchId === x.device.branchId && !o.deleted && !ids.has(o.id))];
  const inRng = (o: Row) => { if (!rng) return true; const d = bizDate(x, o.createdAt); return (d >= rng.from && d <= rng.to) || (rng.to >= todayD && ["pending", "active"].includes(o.status)); };
  const all = pool.filter(inRng).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  // the same tabs as the back office Orders page
  const API = ["online", "web", "marketplace", "api"], sched = (o: any) => !!o.scheduledAt && ["draft", "pending", "active"].includes(o.status);
  const TABS: [string, string, (o: Row) => boolean][] = [["all", "All", () => true], ["today", "Today", o => bizDate(x, o.createdAt) === todayD], ["draft", "Draft", o => o.status === "draft"], ["pending", "Pending", o => o.status === "pending" || o.editRequest?.status === "pending"],
    ["active", "Active", o => o.status === "active"], ["dispatched", "Dispatched", o => o.status === "active" && !!(o as any).dispatchedAt], ["ahead", "Ahead", sched], ["api", "API", o => API.includes(o.channel)]];
  // as before: orders waiting to be accepted come first
  const [tab, setTab] = useState(() => mineAll.some(o => o.status === "pending" || o.editRequest?.status === "pending") ? "pending" : "all"), [q, setQ] = useState(""), s = q.trim().toLowerCase();
  const list = all.filter(TABS.find(t => t[0] === tab)![2]).filter(o => !s || [ordRef(o), o.ref, o.customerName, o.phone, o.table, o.invoiceNo].some(v => String(v || "").toLowerCase().includes(s)));
  // the whole screen is the list; tapping an order opens it in the cart
  const COLS: [string, number, "left" | "right"][] = [["Reference", 1.1, "left"], ["Order", 0.8, "left"], ["Check", 1, "left"], ["Type", 1.2, "left"], ["Customer / Table", 2, "left"], ["Items", 0.8, "left"], ["Opened", 0.9, "left"], ["Status", 1.2, "left"], ["Total", 1, "right"]];
  const one = !!rng && rng.from === rng.to;
  const navBtn = (lbl: string, n: number, off: boolean) => <Pressable accessibilityRole="button" accessibilityLabel={n < 0 ? "Day before" : "Day after"} disabled={off} onPress={() => shift(n)}
    style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? C.bg : "#fff" })}><T w="s" size={20} color={off ? C.mut2 : C.ink2}>{lbl}</T></Pressable>;
  return <Full><Head title="Orders" onClose={onClose} />
    {pick ? <DateFilter rng={rng} today={todayD} count={d => mineAll.filter(o => bizDate(x, o.createdAt) === d).length} onPick={r => { setRng(r); setPick(false); }} onClose={() => setPick(false)} /> : null}
    <View style={{ flex: 1, margin: 14, backgroundColor: "#fff", borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
      {/* the search with the date beside it */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 14 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: C.field }}>
          <Icon name="search" size={18} color={C.mut} /><TextInput value={q} onChangeText={setQ} placeholder="Search reference, number, check, customer, table" placeholderTextColor={C.mut2} accessibilityLabel="Search orders" style={{ flex: 1, fontFamily: F.r, fontSize: 15, color: C.ink, height: 44 }} /></View>
        {/* the date: ‹ the day › in one box; the day opens the calendar */}
        <View style={{ flexDirection: "row", alignItems: "center", height: 46, borderRadius: R.sm, borderWidth: 1, borderColor: C.field, overflow: "hidden" }}>
          {one ? navBtn("‹", -1, false) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Date filter" onPress={() => setPick(true)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 14, borderLeftWidth: one ? 1 : 0, borderRightWidth: one ? 1 : 0, borderColor: C.line, backgroundColor: pressed ? C.bg : "#fff" })}>
            <Icon name="cal" size={18} color={C.brand600} /><T w="m" size={15}>{dayLbl}</T></Pressable>
          {one ? navBtn("›", 1, rng!.to >= todayD) : null}</View>
      </View>
      {/* the tabs, as on the back office Orders page, right above the orders */}
      <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: R.md, padding: 4, gap: 2, margin: 14 }}>{TABS.map(([k, t]) => { const n = all.filter(TABS.find(z => z[0] === k)![2]).length;
        return <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)} style={{ flex: 1, height: 40, flexDirection: "row", gap: 6, borderRadius: R.sm, alignItems: "center", justifyContent: "center", backgroundColor: tab === k ? "#fff" : "transparent", borderWidth: tab === k ? 1 : 0, borderColor: C.line }}>
          <T w="m" size={15} color={tab === k ? C.ink : C.mut}>{t}</T>{n ? <T size={12} color={tab === k ? C.brand600 : C.mut2}>{n}</T> : null}</Pressable>; })}</View>
      <View style={{ flexDirection: "row", paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.bg }}>
        {COLS.map(([h, f, al]) => <T key={h} size={12} w="m" color={C.mut} style={{ flex: f, textAlign: al }}>{h}</T>)}</View>
      <ScrollView showsVerticalScrollIndicator={false}>{list.length ? list.map(y => { const st = stOf(y);
        return <Pressable key={y.id} accessibilityRole="button" accessibilityLabel={"Open order " + ordRef(y)} onPress={() => onOpen(y)}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line2, backgroundColor: pressed ? C.brand50 : "#fff" })}>
          <T size={14} color={C.ink2} style={{ flex: 1.1 }}>{y.ref || "—"}</T><T w="s" style={{ flex: 0.8 }}>{ordRef(y)}</T><T size={14} color={C.ink2} style={{ flex: 1 }}>{y.invoiceNo || "—"}</T>
          <View style={{ flex: 1.2 }}><T size={14}>{TYPE[y.type] || y.type}</T><T size={12} color={C.mut}>{CH[y.channel] || "POS"}</T></View>
          <View style={{ flex: 2 }}><T size={14} numberOfLines={1}>{y.customerName || (y.table ? "Table " + y.table : "Walk-in")}</T>{y.phone || (y.type === "delivery" && y.driverName) ? <T size={12} color={C.mut} numberOfLines={1}>{[y.phone, y.type === "delivery" && y.driverName ? "Driver: " + y.driverName : ""].filter(Boolean).join(" · ")}</T> : null}</View>
          <T size={14} style={{ flex: 0.8 }}>{(y.items || []).filter((i: any) => !i.voided).reduce((a: number, i: any) => a + (+i.qty || 0), 0)}</T>
          <T size={14} style={{ flex: 0.9 }}>{tm(y.createdAt)}</T><View style={{ flex: 1.2, alignItems: "flex-start" }}><Pill text={st.label} tone={st.tone} /></View>
          <T w="s" style={{ flex: 1, textAlign: "right" }}>{money(x.S, y.total)}</T></Pressable>; })
        : <T color={C.mut} style={{ textAlign: "center", padding: 40 }}>{loading ? "Loading orders…" : !all.length ? "No orders for these dates." : "No orders here."}</T>}
        {more ? <View style={{ alignItems: "center", padding: 16 }}><Btn height={44} label={loading ? "Loading…" : "Load older orders"} disabled={loading} onPress={() => load(far.length)} /></View> : null}</ScrollView>
    </View></Full>;
}

// the date filter: all dates, one business day, or a from–to range on a month calendar; days with orders on the tablet show their count
function DateFilter({ rng, today, count, onPick, onClose }: { rng: { from: string; to: string } | null; today: string; count: (d: string) => number; onPick: (r: { from: string; to: string } | null) => void; onClose: () => void }) {
  const [mode, setMode] = useState<"day" | "range">(rng && rng.from !== rng.to ? "range" : "day"), [a, setA] = useState<string | null>(rng?.from || null), [b, setB] = useState<string | null>(rng && rng.from !== rng.to ? rng.to : null);
  const [m, setM] = useState((rng?.from || today).slice(0, 7));   // "yyyy-mm"
  const [y, mo] = m.split("-").map(Number), first = new Date(y, mo - 1, 1), n = new Date(y, mo, 0).getDate(), lead = (first.getDay() + 6) % 7;   // weeks start on Monday
  const iso = (d: number) => `${m}-${String(d).padStart(2, "0")}`, step = (k: number) => { const t = new Date(y, mo - 1 + k, 1); setM(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`); };
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)]; while (cells.length % 7) cells.push(null);
  const tap = (v: string) => { if (mode === "day") return onPick({ from: v, to: v }); if (!a || b) { setA(v); setB(null); } else if (v < a) { setB(a); setA(v); } else setB(v); };
  const dmy = (d: string) => d.split("-").reverse().join("-"), W = 50;
  return <Sheet title="Date filter" width={7 * W + 40} onClose={onClose} footer={<><Btn height={44} label="All dates" onPress={() => onPick(null)} /><Btn height={44} label="Today" onPress={() => onPick({ from: today, to: today })} /><View style={{ flex: 1 }} />
      {mode === "range" ? <Btn kind="primary" height={44} label="Apply" disabled={!a} onPress={() => onPick({ from: a!, to: b || a! })} /> : <Btn height={44} label="Close" onPress={onClose} />}</>}>
    <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: R.md, padding: 4, gap: 2, marginBottom: 10 }}>{([["day", "Business date"], ["range", "From – To"]] as const).map(([k, t]) =>
      <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: mode === k }} onPress={() => setMode(k)} style={{ flex: 1, height: 38, borderRadius: R.sm, alignItems: "center", justifyContent: "center", backgroundColor: mode === k ? "#fff" : "transparent", borderWidth: mode === k ? 1 : 0, borderColor: C.line }}>
        <T w="m" size={14} color={mode === k ? C.ink : C.mut}>{t}</T></Pressable>)}</View>
    {mode === "range" ? <T size={13} color={C.mut} style={{ marginBottom: 8, textAlign: "center" }}>{!a ? "Tap the first day" : !b ? "From " + dmy(a) + " · tap the last day" : dmy(a) + " → " + dmy(b)}</T> : null}
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
      <Btn height={40} label="‹" style={{ width: 44 }} onPress={() => step(-1)} />
      <T w="s" size={16} style={{ flex: 1, textAlign: "center" }}>{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</T>
      <Btn height={40} label="›" style={{ width: 44 }} disabled={m >= today.slice(0, 7)} onPress={() => step(1)} /></View>
    <View style={{ flexDirection: "row" }}>{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => <T key={d} size={12} w="m" color={C.mut} style={{ width: W, textAlign: "center", marginBottom: 6 }}>{d}</T>)}</View>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{cells.map((d, i) => { if (!d) return <View key={i} style={{ width: W, height: W }} />;
      const v = iso(d), end = mode === "day" ? !!rng && rng.from === rng.to && v === rng.from : v === a || v === b, mid = mode === "range" && !!a && !!b && v > a && v < b, fut = v > today, c = fut ? 0 : count(v);
      return <Pressable key={i} disabled={fut} accessibilityRole="button" accessibilityLabel={v} onPress={() => tap(v)} style={({ pressed }) => ({ width: W, height: W, alignItems: "center", justifyContent: "center", borderRadius: mid ? 0 : R.md, backgroundColor: end ? C.brand : mid ? C.brand50 : pressed ? C.brand50 : "transparent", borderWidth: v === today && !end ? 1 : 0, borderColor: C.brand, opacity: fut ? 0.35 : 1 })}>
        <T w={end || c ? "s" : "r"} size={15} color={end ? "#fff" : C.ink}>{d}</T>
        {c ? <T size={10} color={end ? "#fff" : C.brand}>{c}</T> : null}</Pressable>; })}</View>
  </Sheet>;
}
