// Full screens on the register (inside the 16:10 frame on the web):
// - Pickup & Delivery: columns of order tiles as on the call center board (Pending, Preparing, Dispatched, Done)
// - Orders: every order of the business day as a list, with the chosen order's details beside it
import { useState } from "react";
import { Sheet } from "./Pickers";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import type { Row } from "../lib/db";
import { bizDate, money, type Ctx } from "../lib/pos";
import { C, F, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Pill, T } from "./kit";
import { ordRef } from "./Orders";

const TYPE: Record<string, string> = { dinein: "Dine-in", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery" };
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
function Tile({ o, x, onOpen }: { o: Row; x: Ctx; onOpen: () => void }) {
  const st = stOf(o), Row2 = ({ l, v, sub }: { l: string; v: string; sub?: string }) => <View style={{ flexDirection: "row", gap: 8 }} accessibilityLabel={l}><View style={{ width: 18, alignItems: "center", paddingTop: 1 }}><Icon name={({ Customer: "user", Type: "scooter", Channel: "device", Created: "clock" } as Record<string, string>)[l] || "note"} size={16} color={C.mut} /></View><View style={{ flex: 1 }}><T size={13} numberOfLines={1}>{v}</T>{sub ? <T size={12} color={C.mut} numberOfLines={1}>{sub}</T> : null}</View></View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={"Order " + ordRef(o)} onPress={onOpen} style={({ pressed }) => ({ backgroundColor: pressed ? C.brand50 : "#fff", borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: 12, gap: 6 })}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><T w="s" size={16}>{ordRef(o)}</T><Pill text={st.label} tone={st.tone} /></View>
    <Row2 l="Customer" v={o.customerName || "Guest"} sub={o.phone || undefined} />
    <Row2 l="Type" v={TYPE[o.type] || o.type} sub={o.type === "delivery" ? (o.driverName ? "Driver: " + o.driverName : "No driver yet") : undefined} />
    <Row2 l="Channel" v={CH[o.channel] || "POS"} />
    <Row2 l="Created" v={tm(o.createdAt)} />
    <View style={{ borderTopWidth: 1, borderColor: C.line2, paddingTop: 6, alignItems: "flex-end" }}><T w="s">{money(x.S, o.total)}</T></View>
  </Pressable>;
}

export function PDBoard({ x, onOpen, onClose, onNew, onDrivers }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void; onNew?: () => void; onDrivers?: () => void }) {
  const mine = today(x).filter(o => ["pickup", "takeaway", "delivery"].includes(o.type)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const l = mine;
  const COLS: [string, string, (o: Row) => boolean][] = [["pending", "Pending", o => o.status === "pending" || o.editRequest?.status === "pending"],
    ["active", "Active", o => o.status === "active" && o.editRequest?.status !== "pending"],   // preparing or dispatched: the card says which
    ["declined", "Declined", o => o.status === "declined"], ["closed", "Done", o => o.status === "closed"]];
  return <Full><Head title="Pickup & Delivery" onClose={onClose}>
    {onDrivers ? <Btn height={44} label="Drivers" onPress={onDrivers} /> : null}{onNew ? <Btn kind="primary" height={44} label="+ New Order" onPress={onNew} /> : null}</Head>
    <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 12, gap: 10 }}>
      {COLS.map(([k, t, f]) => { const col = l.filter(f); return <View key={k} style={{ flex: 1, minWidth: 190, backgroundColor: "#F2F4F7", borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 10 }}><T w="s">{t}</T>
          <View style={{ minWidth: 26, height: 22, borderRadius: 11, backgroundColor: col.length ? C.brand : C.line, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 }}><T w="s" size={12} color={col.length ? "#fff" : C.ink2}>{col.length}</T></View></View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
          {col.length ? col.map(o => <Tile key={o.id} o={o} x={x} onOpen={() => onOpen(o)} />) : <T size={13} color={C.mut} style={{ textAlign: "center", paddingVertical: 20 }}>No {t.toLowerCase()} orders</T>}
        </ScrollView></View>; })}
    </ScrollView></Full>;
}

export function OrdersList({ x, onOpen, onClose }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void }) {
  // the business days the tablet has orders for (the last 3 days are kept on it), newest first; open orders show whatever their day
  const mineAll = x.S.orders.filter(o => o.branchId === x.device.branchId && !o.deleted), todayD = bizDate(x);
  // the business day shown: today by default; ‹ › step a day, the date opens the days that have orders
  const [day, setDay] = useState(todayD), [pick, setPick] = useState(false);
  const days = [...new Set([todayD, ...mineAll.map(o => bizDate(x, o.createdAt))])].sort().reverse();
  const shift = (n: number) => { const d = new Date(day + "T12:00:00"); d.setDate(d.getDate() + n); const v = d.toISOString().slice(0, 10); if (v <= todayD) setDay(v); };
  const dmy = (d: string) => d === todayD ? "Today" : d.split("-").reverse().join("-");
  const all = mineAll.filter(o => ["pending", "active"].includes(o.status) || bizDate(x, o.createdAt) === day).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  // the same tabs as the back office Orders page
  const API = ["online", "web", "marketplace", "api"], sched = (o: any) => !!o.scheduledAt && ["draft", "pending", "active"].includes(o.status);
  const TABS: [string, string, (o: Row) => boolean][] = [["all", "All", () => true], ["today", "Today", o => bizDate(x, o.createdAt) === todayD], ["draft", "Draft", o => o.status === "draft"], ["pending", "Pending", o => o.status === "pending" || o.editRequest?.status === "pending"],
    ["active", "Active", o => o.status === "active"], ["dispatched", "Dispatched", o => o.status === "active" && !!(o as any).dispatchedAt], ["ahead", "Ahead", sched], ["api", "API", o => API.includes(o.channel)]];
  // as before: orders waiting to be accepted come first
  const [tab, setTab] = useState(() => mineAll.some(o => o.status === "pending" || o.editRequest?.status === "pending") ? "pending" : "all"), [q, setQ] = useState(""), s = q.trim().toLowerCase();
  const list = all.filter(TABS.find(t => t[0] === tab)![2]).filter(o => !s || [ordRef(o), o.ref, o.customerName, o.phone, o.table, o.invoiceNo].some(v => String(v || "").toLowerCase().includes(s)));
  // the whole screen is the list; tapping an order opens it in the cart
  const COLS: [string, number, "left" | "right"][] = [["Reference", 1.1, "left"], ["Order", 0.8, "left"], ["Check", 1, "left"], ["Type", 1.2, "left"], ["Customer / Table", 2, "left"], ["Items", 0.8, "left"], ["Opened", 0.9, "left"], ["Status", 1.2, "left"], ["Total", 1, "right"]];
  return <Full><Head title="Orders" onClose={onClose}>
      {/* segmented tabs, as on the back office Orders page */}
      <View style={{ flexDirection: "row", backgroundColor: "#F2F4F7", borderRadius: R.md, padding: 4, gap: 2 }}>{TABS.map(([k, t]) =>
        <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)} style={{ height: 40, paddingHorizontal: 14, borderRadius: R.sm, justifyContent: "center", backgroundColor: tab === k ? "#fff" : "transparent", borderWidth: tab === k ? 1 : 0, borderColor: C.line }}>
          <T w="m" size={15} color={tab === k ? C.ink : C.mut}>{t}</T></Pressable>)}</View></Head>
    {pick ? <Calendar day={day} today={todayD} count={d => mineAll.filter(o => bizDate(x, o.createdAt) === d).length} onPick={d => { setDay(d); setPick(false); }} onClose={() => setPick(false)} /> : null}
    <View style={{ flex: 1, margin: 14, backgroundColor: "#fff", borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, margin: 12, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: C.field, width: 380 }}>
        <Icon name="search" size={18} color={C.mut} /><TextInput value={q} onChangeText={setQ} placeholder="Search reference, number, check, customer, table" placeholderTextColor={C.mut2} accessibilityLabel="Search orders" style={{ flex: 1, fontFamily: F.r, fontSize: 15, color: C.ink, height: 44 }} /></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Btn height={44} label="‹" style={{ width: 44 }} onPress={() => shift(-1)} />
          <Btn kind="outline" height={44} label={dmy(day)} style={{ minWidth: 130 }} onPress={() => setPick(true)} />
          <Btn height={44} label="›" style={{ width: 44 }} disabled={day >= todayD} onPress={() => shift(1)} /></View>
</View>
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
        : <T color={C.mut} style={{ textAlign: "center", padding: 40 }}>{!all.length ? "No orders today yet." : "No orders here."}</T>}</ScrollView>
    </View></Full>;
}

// the business date as a month calendar: days with orders show their count; days after today can't be picked
function Calendar({ day, today, count, onPick, onClose }: { day: string; today: string; count: (d: string) => number; onPick: (d: string) => void; onClose: () => void }) {
  const [m, setM] = useState(day.slice(0, 7));   // "yyyy-mm"
  const [y, mo] = m.split("-").map(Number), first = new Date(y, mo - 1, 1), n = new Date(y, mo, 0).getDate(), lead = (first.getDay() + 6) % 7;   // weeks start on Monday
  const iso = (d: number) => `${m}-${String(d).padStart(2, "0")}`, step = (k: number) => { const t = new Date(y, mo - 1 + k, 1); setM(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`); };
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)]; while (cells.length % 7) cells.push(null);
  const W = 50;
  return <Sheet title="Business date" width={7 * W + 40} onClose={onClose} footer={<><Btn height={44} label="Today" onPress={() => onPick(today)} /><View style={{ flex: 1 }} /><Btn height={44} label="Close" onPress={onClose} /></>}>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
      <Btn height={40} label="‹" style={{ width: 44 }} onPress={() => step(-1)} />
      <T w="s" size={16} style={{ flex: 1, textAlign: "center" }}>{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</T>
      <Btn height={40} label="›" style={{ width: 44 }} disabled={m >= today.slice(0, 7)} onPress={() => step(1)} /></View>
    <View style={{ flexDirection: "row" }}>{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => <T key={d} size={12} w="m" color={C.mut} style={{ width: W, textAlign: "center", marginBottom: 6 }}>{d}</T>)}</View>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{cells.map((d, i) => { if (!d) return <View key={i} style={{ width: W, height: W }} />;
      const v = iso(d), on = v === day, fut = v > today, c = fut ? 0 : count(v);
      return <Pressable key={i} disabled={fut} accessibilityRole="button" accessibilityLabel={v} onPress={() => onPick(v)} style={({ pressed }) => ({ width: W, height: W, alignItems: "center", justifyContent: "center", borderRadius: R.md, backgroundColor: on ? C.brand : pressed ? C.brand50 : "transparent", borderWidth: v === today && !on ? 1 : 0, borderColor: C.brand, opacity: fut ? 0.35 : 1 })}>
        <T w={on || c ? "s" : "r"} size={15} color={on ? "#fff" : C.ink}>{d}</T>
        {c ? <T size={10} color={on ? "#fff" : C.brand}>{c}</T> : null}</Pressable>; })}</View>
  </Sheet>;
}
