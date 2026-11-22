// Orders on the register (pos.html Orders board): waiting to be accepted, preparing (open), and done today.
// Tapping an order opens it in the cart: accept or decline it, add items and save, or bill it.
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { bizDate, money, type Ctx } from "../lib/pos";
import type { Row } from "../lib/db";
import { C, R } from "../lib/theme";
import { Btn, Pill, T } from "./kit";
import { Sheet } from "./Pickers";

const TYPE: Record<string, string> = { dinein: "Dine-in", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery" };
const CH: Record<string, string> = { pos: "POS", callcenter: "Call Center", online: "API", web: "API", marketplace: "API" };
export const ordRef = (o: Row) => (o.no ? "#" + o.no : o.ref || "—").replace(/^#/, "");
const COLS: [string, string, (o: Row) => boolean][] = [
  ["pending", "Pending", o => o.status === "pending" || o.editRequest?.status === "pending"],
  ["active", "Preparing", o => o.status === "active" && o.editRequest?.status !== "pending"],
  ["closed", "Done", o => o.status === "closed" || o.status === "refund"],
];

export function OrdersDialog({ x, onOpen, onClose, pd, onNew, onDrivers }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void; pd?: boolean; onNew?: () => void; onDrivers?: () => void }) {
  const today = bizDate(x);
  const mine = x.S.orders.filter(o => o.branchId === x.device.branchId && (!pd || ['pickup', 'takeaway', 'delivery'].includes(o.type)) && (o.status !== "closed" && o.status !== "refund" ? true : bizDate(x, o.createdAt) === today))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const [tab, setTab] = useState(mine.some(COLS[0][2]) ? "pending" : "active");
  const list = mine.filter(COLS.find(c => c[0] === tab)![2]);
  return (
    <Sheet title={pd ? "Pickup & Delivery" : "Orders"} width={900} onClose={onClose}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        {COLS.map(([k, l, f]) => <Btn key={k} kind={tab === k ? "primary" : "outline"} height={44} label={`${l} (${mine.filter(f).length})`} onPress={() => setTab(k)} />)}
        {pd ? <><View style={{ flex: 1 }} />{onDrivers ? <Btn height={44} label="Drivers" onPress={onDrivers} /> : null}{onNew ? <Btn kind="soft" height={44} label="New Pickup / Delivery" onPress={onNew} /> : null}</> : null}
      </View>
      {!list.length ? <T color={C.mut} style={{ paddingVertical: 30, textAlign: "center" }}>{tab === "pending" ? "Nothing waiting to be accepted." : tab === "active" ? "No open orders." : "No orders done today yet."}</T> :
        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {list.map(o => (
            <Pressable key={o.id} accessibilityRole="button" onPress={() => onOpen(o)}
              style={({ pressed }) => ({ width: 200, minHeight: 116, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brand50 : "#fff", padding: 12, gap: 6 })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><T w="s" size={16}>{ordRef(o)}</T><Pill text={CH[o.channel] || "POS"} tone={o.channel === "pos" ? "gray" : "brand"} /></View>
              <T size={13} color={C.mut}>{TYPE[o.type] || o.type}{o.type === "delivery" && o.driverName ? " · " + o.driverName : ""}{o.dispatchedAt && o.status === "active" ? " · Dispatched" : ""}{o.type === "dinein" && o.table ? " · Table " + o.table : ""}{o.customerName ? " · " + o.customerName : ""}</T>
              <T size={13} color={C.mut}>{new Date(o.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()} · {(o.items || []).length} items</T>
              <T w="s" color={C.brand}>{money(x.S, o.total)}</T>
            </Pressable>))}
        </ScrollView>}
    </Sheet>
  );
}
