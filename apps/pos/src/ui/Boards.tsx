// Full screens on the register (inside the 16:10 frame on the web):
// - Pickup & Delivery: columns of order tiles as on the call center board (Pending, Preparing, Dispatched, Done)
// - Orders: every order of the business day as a list, with the chosen order's details beside it
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import type { Row } from "../lib/db";
import { bizDate, money, type Ctx } from "../lib/pos";
import { C, F, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Pill, T } from "./kit";
import { ordRef } from "./Orders";

const TYPE: Record<string, string> = { dinein: "Dine-in", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery" };
const CH: Record<string, string> = { pos: "POS", callcenter: "Call Center", online: "API", web: "API", marketplace: "API" };
const tm = (t: any) => t ? new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
type St = { label: string; tone: "gray" | "ok" | "brand" | "warn" | "bad" };
export const stOf = (o: Row): St => o.editRequest?.status === "pending" ? { label: "Edit request", tone: "warn" } : o.status === "pending" ? { label: "Pending", tone: "warn" }
  : o.status === "active" ? (o.dispatchedAt ? { label: "Dispatched", tone: "brand" } : { label: "Preparing", tone: "brand" }) : o.status === "closed" ? { label: "Done", tone: "ok" }
  : o.status === "void" ? { label: "Void", tone: "bad" } : o.status === "returned" || o.status === "refund" ? { label: "Returned", tone: "bad" } : o.status === "declined" ? { label: "Declined", tone: "bad" } : { label: o.status, tone: "gray" };
const today = (x: Ctx) => { const d = bizDate(x); return x.S.orders.filter(o => o.branchId === x.device.branchId && !o.deleted && (["pending", "active"].includes(o.status) || bizDate(x, o.createdAt) === d)); };

// the header of a full screen: back, title, and the screen's own buttons
function Head({ title, onClose, children }: { title: string; onClose: () => void; children?: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, height: 68, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: C.line }}>
    <Btn height={44} label="‹ Register" onPress={onClose} /><T w="s" size={19} style={{ flex: 1 }}>{title}</T>{children}</View>;
}
const Full = ({ children }: { children: React.ReactNode }) => <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, zIndex: 20 }}>{children}</View>;

// a tile as on the call center board
function Tile({ o, x, onOpen }: { o: Row; x: Ctx; onOpen: () => void }) {
  const st = stOf(o), Row2 = ({ l, v, sub }: { l: string; v: string; sub?: string }) => <View style={{ flexDirection: "row", gap: 8 }}><T size={12} color={C.mut} style={{ width: 66 }}>{l}</T><View style={{ flex: 1 }}><T size={13} numberOfLines={1}>{v}</T>{sub ? <T size={12} color={C.mut} numberOfLines={1}>{sub}</T> : null}</View></View>;
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
  const [kind, setKind] = useState<"all" | "pickup" | "delivery">("all"), l = mine.filter(o => kind === "all" || (kind === "pickup" ? o.type !== "delivery" : o.type === "delivery"));
  const COLS: [string, string, (o: Row) => boolean][] = [["pending", "Pending", o => o.status === "pending" || o.editRequest?.status === "pending"],
    ["active", "Preparing", o => o.status === "active" && !o.dispatchedAt && o.editRequest?.status !== "pending"], ["dispatched", "Dispatched", o => o.status === "active" && !!o.dispatchedAt],
    ["closed", "Done", o => ["closed", "void", "returned", "refund", "declined"].includes(o.status)]];
  return <Full><Head title="Pickup & Delivery" onClose={onClose}>
    {(["all", "pickup", "delivery"] as const).map(k => <Btn key={k} kind={kind === k ? "primary" : "outline"} height={44} label={k === "all" ? "All" : k === "pickup" ? "Pickup" : "Delivery"} onPress={() => setKind(k)} />)}
    {onDrivers ? <Btn height={44} label="Drivers" onPress={onDrivers} /> : null}{onNew ? <Btn kind="primary" height={44} label="+ New Order" onPress={onNew} /> : null}</Head>
    <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 12 }}>
      {COLS.map(([k, t, f]) => { const col = l.filter(f); return <View key={k} style={{ width: 268, backgroundColor: "#F2F4F7", borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 10 }}><T w="s">{t}</T>
          <View style={{ minWidth: 26, height: 22, borderRadius: 11, backgroundColor: col.length ? C.brand : C.line, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 }}><T w="s" size={12} color={col.length ? "#fff" : C.ink2}>{col.length}</T></View></View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
          {col.length ? col.map(o => <Tile key={o.id} o={o} x={x} onOpen={() => onOpen(o)} />) : <T size={13} color={C.mut} style={{ textAlign: "center", paddingVertical: 20 }}>No {t.toLowerCase()} orders</T>}
        </ScrollView></View>; })}
    </ScrollView></Full>;
}

export function OrdersList({ x, onOpen, onClose }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void }) {
  const all = today(x).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const TABS: [string, string, (o: Row) => boolean][] = [["open", "Open", o => ["pending", "active"].includes(o.status)], ["done", "Done", o => o.status === "closed"], ["void", "Void & Returned", o => ["void", "returned", "refund", "declined"].includes(o.status)], ["all", "All", () => true]];
  const [tab, setTab] = useState("open"), [q, setQ] = useState(""), s = q.trim().toLowerCase();
  const list = all.filter(TABS.find(t => t[0] === tab)![2]).filter(o => !s || [ordRef(o), o.customerName, o.phone, o.table, o.invoiceNo].some(v => String(v || "").toLowerCase().includes(s)));
  const [sel, setSel] = useState<string>(list[0]?.id || ""), o = all.find(y => y.id === sel) || list[0];
  return <Full><Head title="Orders" onClose={onClose}>{TABS.map(([k, t, f]) => <Btn key={k} kind={tab === k ? "primary" : "outline"} height={44} label={`${t} (${all.filter(f).length})`} onPress={() => setTab(k)} />)}</Head>
    <View style={{ flex: 1, flexDirection: "row", padding: 14, gap: 14 }}>
      {/* the list */}
      <View style={{ width: "44%", backgroundColor: "#fff", borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, margin: 10, height: 44, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: C.field }}>
          <Icon name="search" size={18} color={C.mut} /><TextInput value={q} onChangeText={setQ} placeholder="Search number, customer, table" placeholderTextColor={C.mut2} accessibilityLabel="Search orders" style={{ flex: 1, fontFamily: F.r, fontSize: 15, color: C.ink, height: 42 }} /></View>
        <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.bg }}>
          {["Order", "Type", "Time", "Status", "Total"].map((h, k) => <T key={h} size={12} w="m" color={C.mut} style={{ flex: k === 0 ? 1.3 : 1, textAlign: k === 4 ? "right" : "left" }}>{h}</T>)}</View>
        <ScrollView showsVerticalScrollIndicator={false}>{list.length ? list.map(y => { const st = stOf(y), on = y.id === o?.id;
          return <Pressable key={y.id} accessibilityRole="button" onPress={() => setSel(y.id)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line2, backgroundColor: on ? C.brand50 : "#fff" }}>
            <View style={{ flex: 1.3 }}><T w="s">{ordRef(y)}</T><T size={12} color={C.mut} numberOfLines={1}>{y.customerName || (y.table ? "Table " + y.table : "Walk-in")}</T></View>
            <T size={13} style={{ flex: 1 }}>{TYPE[y.type] || y.type}</T><T size={13} style={{ flex: 1 }}>{tm(y.createdAt)}</T>
            <View style={{ flex: 1, alignItems: "flex-start" }}><Pill text={st.label} tone={st.tone} /></View><T w="s" size={14} style={{ flex: 1, textAlign: "right" }}>{money(x.S, y.total)}</T></Pressable>; })
          : <T color={C.mut} style={{ textAlign: "center", padding: 30 }}>No orders here.</T>}</ScrollView>
      </View>
      {/* the chosen order */}
      <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
        {!o ? <T color={C.mut} style={{ textAlign: "center", padding: 40 }}>Pick an order to see it.</T> : <Detail o={o} x={x} onOpen={() => onOpen(o)} />}
      </View>
    </View></Full>;
}

function Detail({ o, x, onOpen }: { o: Row; x: Ctx; onOpen: () => void }) {
  const st = stOf(o), m = (n: any) => money(x.S, +n || 0), pay = o.payment || null;
  const KV = ({ l, v }: { l: string; v: string }) => <View style={{ width: "50%", paddingVertical: 6 }}><T size={12} color={C.mut}>{l}</T><T w="m" size={14} numberOfLines={2}>{v}</T></View>;
  const Sum = ({ l, v, b }: { l: string; v: string; b?: boolean }) => <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}><T w={b ? "s" : "r"} size={b ? 17 : 14} color={b ? C.ink : C.ink2}>{l}</T><T w={b ? "b" : "m"} size={b ? 17 : 14}>{v}</T></View>;
  return <>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderBottomWidth: 1, borderColor: C.line }}>
      <T w="s" size={20}>Order {ordRef(o)}</T><Pill text={st.label} tone={st.tone} /><View style={{ flex: 1 }} />
      <Btn kind="primary" height={44} label={["pending", "active"].includes(o.status) ? "Open In Register" : "Open"} onPress={onOpen} /></View>
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
        <KV l="Type" v={(TYPE[o.type] || o.type) + (o.type === "dinein" && o.table ? " · Table " + o.table : "")} /><KV l="Channel" v={CH[o.channel] || "POS"} />
        <KV l="Customer" v={[o.customerName, o.phone].filter(Boolean).join(" · ") || "—"} /><KV l="Opened" v={tm(o.createdAt) + (o.cashier ? " · " + o.cashier : "")} />
        {o.type === "delivery" ? <><KV l="Address" v={String(o.address || "—").replace(/^\[[^\]]*\]\s*/, "")} /><KV l="Driver" v={o.driverName || "—"} /></> : null}
        {o.invoiceNo ? <KV l="Check Number" v={String(o.invoiceNo)} /> : null}{o.closedAt ? <KV l="Closed" v={tm(o.closedAt)} /> : null}
      </View>
      <T w="s" size={15} style={{ marginBottom: 6 }}>Items</T>
      <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: R.md, marginBottom: 14 }}>{(o.items || []).map((i: any, k: number) =>
        <View key={k} style={{ flexDirection: "row", gap: 10, padding: 10, borderBottomWidth: k < o.items.length - 1 ? 1 : 0, borderColor: C.line2, opacity: i.voided ? 0.5 : 1 }}>
          <T w="s" style={{ width: 34 }}>{+i.qty}×</T>
          <View style={{ flex: 1 }}><T w="m" style={i.voided ? { textDecorationLine: "line-through" } : undefined}>{i.name}</T>
            {(i.options || []).map((op: any, j: number) => <T key={j} size={12} color={C.mut}>• {op.name}{+op.price ? " +" + m(op.price) : ""}</T>)}
            {i.note ? <T size={12} color={C.mut} style={{ fontStyle: "italic" }}>Note: {i.note}</T> : null}{+i.disc ? <T size={12} color={C.ok}>Discount −{m(i.disc)}</T> : null}</View>
          <T w="m">{m((+i.price || 0) * (+i.qty || 1) - (+i.disc || 0))}</T></View>)}</View>
      <View style={{ borderTopWidth: 1, borderColor: C.line, paddingTop: 8 }}>
        <Sum l="Subtotal" v={m(o.subtotal)} />{+o.discount ? <Sum l="Discount" v={"−" + m(o.discount)} /> : null}
        {(o.charges || []).map((c: any) => <Sum key={c.id || c.name} l={c.name} v={m(c.amount)} />)}<Sum l="Tax" v={m(o.tax)} /><Sum l="Total" v={m(o.total)} b /></View>
      {pay ? <View style={{ marginTop: 10, padding: 10, borderRadius: R.md, backgroundColor: C.bg }}><T size={13} color={C.ink2}>Paid by {pay.method || pay.name || "—"}{pay.received ? " · received " + m(pay.received) : ""}{pay.change ? " · change " + m(pay.change) : ""}</T></View> : null}
      {o.notes ? <T size={13} color={C.mut} style={{ marginTop: 10 }}>Kitchen: {o.notes}</T> : null}{o.voidReason ? <T size={13} color={C.bad} style={{ marginTop: 6 }}>Reason: {o.voidReason}</T> : null}
    </ScrollView></>;
}
