// Delivery: pick the driver (they accept in the Driver app), dispatch, and Drivers · Today with the cash each one still owes (Receive Cash).
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { bizDate, isAdminUser, live, money, userPerms, type Ctx } from "../lib/pos";
import type { Row } from "../lib/db";
import { useStore } from "../lib/store";
import { C, R } from "../lib/theme";
import { Btn, Pill, T } from "./kit";
import { Sheet } from "./Pickers";

export const DRV_ST: Record<string, string> = { assigned: "waiting for the driver", accepted: "accepted", declined: "declined", picked: "on the way", delivered: "delivered" };
// drivers: this store's employees whose role has "Use Driver App" (or the job title Driver); if none, everyone working here
export function driverList(x: Ctx) {
  const here = x.S.users.filter(u => live(u) && u.active !== false && !isAdminUser(u) && (!(u.branchIds || []).length || u.branchIds.includes(x.device.branchId)));
  const d = here.filter(u => userPerms(x.S, u).includes("drv_app") || /driver|delivery|rider/i.test(u.jobTitle || "")); return (d.length ? d : here).sort((a, b) => String(a.name).localeCompare(b.name));
}
const owes = (o: Row) => o.type === "delivery" && o.driverId && o.status === "closed" && (o.payment?.type || o.payment?.method) === "cash" && !o.driverSettledAt;

export function DriverPick({ x, o, onDone }: { x: Ctx; o: Row; onDone: (msg?: string) => void }) {
  const { write } = useStore(), l = driverList(x);
  const set = (u: Row | null) => { const now = new Date().toISOString();
    write("orders", o.id, { driverId: u ? u.id : null, driverName: u ? u.name : null, driverStatus: u ? "assigned" : null, driverAssignedAt: u ? now : null, driverAcceptedAt: null, updatedAt: now });
    onDone(u ? `Sent to ${u.name} · waiting for them to accept` : "Driver removed"); };
  return (
    <Sheet title="Driver" width={620} onClose={() => onDone()} footer={o.driverId ? <><View style={{ flex: 1 }} /><Btn label="Remove Driver" height={48} onPress={() => set(null)} /></> : undefined}>
      {!l.length ? <T color={C.mut}>No employees at this store yet. Add drivers in the back office: Employee Management → Employees, with the job title Driver.</T> :
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{l.map(u => { const on = o.driverId === u.id; return (
          <Pressable key={u.id} accessibilityRole="button" onPress={() => set(u)} style={{ width: 170, height: 72, borderRadius: R.md, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brand50 : "#fff", padding: 12, justifyContent: "center" }}>
            <T w="s">{u.name}</T>{u.jobTitle ? <T size={12} color={C.mut}>{u.jobTitle}</T> : null}</Pressable>); })}</View>}
    </Sheet>
  );
}

export function DriversDialog({ x, onOpen, onClose }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void }) {
  const { write, cashier, device } = useStore(), [ask, setAsk] = useState<string | null>(null);
  const day = bizDate(x), mine = x.S.orders.filter(o => o.branchId === x.device.branchId && o.type === "delivery" && bizDate(x, o.createdAt) === day && !["void", "declined"].includes(o.status));
  const by: Record<string, { name: string; l: Row[] }> = {}; mine.filter(o => o.driverId).forEach(o => { (by[o.driverId] ||= { name: o.driverName, l: [] }).l.push(o); });
  driverList(x).forEach(u => { if (!by[u.id]) by[u.id] = { name: u.name, l: [] }; });
  const none = mine.filter(o => !o.driverId && o.status !== "closed"), tot = (l: Row[]) => l.reduce((s, o) => s + (+o.total || 0), 0);
  const receive = (id: string) => { const l = x.S.orders.filter(o => o.driverId === id && o.branchId === x.device.branchId && owes(o)), now = new Date().toISOString();
    l.forEach(o => write("orders", o.id, { driverSettledAt: now, driverSettledBy: cashier?.name || device!.name, updatedAt: now })); setAsk(null); };
  const line = (o: Row) => (
    <Pressable key={o.id} onPress={() => onOpen(o)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line2 }}>
      <T w="s" style={{ width: 70 }}>{o.no || o.ref || "—"}</T><T style={{ flex: 1 }} numberOfLines={1}>{o.customerName || "—"}</T>
      <Pill text={o.status === "closed" ? (o.driverSettledAt ? "Cash received" : "Delivered") : DRV_ST[o.driverStatus] || (o.dispatchedAt ? "Dispatched" : "Preparing")} tone={o.status === "closed" ? "ok" : "brand"} />
      <T w="m" style={{ width: 90, textAlign: "right" }}>{money(x.S, o.total)}</T></Pressable>);
  return (
    <Sheet title="Drivers · Today" width={820} onClose={onClose}>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        {[["Delivery orders", String(mine.length)], ["Total", money(x.S, tot(mine))], ["Without a driver", String(none.length)]].map(([l, v]) => <View key={l} style={{ flex: 1, padding: 12, borderRadius: R.md, backgroundColor: C.bg }}><T size={13} color={C.mut}>{l}</T><T w="s" size={18}>{v}</T></View>)}
      </View>
      <ScrollView style={{ maxHeight: 460 }}>
        {Object.entries(by).sort((a, b) => b[1].l.length - a[1].l.length || String(a[1].name).localeCompare(b[1].name)).map(([id, d]) => { const owe = d.l.filter(owes), amt = tot(owe);
          return (
            <View key={id} style={{ borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <T w="s" style={{ flex: 1 }}>{d.name} <T size={13} color={C.mut}>· {d.l.length} order{d.l.length === 1 ? "" : "s"} · {money(x.S, tot(d.l))}</T></T>
                {owe.length ? (ask === id ? <><T size={13}>Receive {money(x.S, amt)}?</T><Btn height={36} label="No" onPress={() => setAsk(null)} /><Btn kind="primary" height={36} label="Receive" onPress={() => receive(id)} /></>
                  : <Btn kind="soft" height={36} label={"Receive Cash · " + money(x.S, amt)} onPress={() => setAsk(id)} />) : null}
              </View>
              {d.l.map(line)}
            </View>); })}
        {none.length ? <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 12 }}><T w="s">Waiting for a driver</T>{none.map(line)}</View> : null}
      </ScrollView>
    </Sheet>
  );
}
