// Functions → Reports (pos.html reportData / reportHtml): this shift, today on this register, or today at the whole store.
// Shown like an 80 mm receipt, and printed on the receipt printer.
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { bizDate, lineNet, openShift, type Ctx } from "../lib/pos";
import type { Row } from "../lib/db";
import { printJob } from "../lib/print";
import { useStore } from "../lib/store";
import { C } from "../lib/theme";
import { Btn, T } from "./kit";
import { Sheet } from "./Pickers";

type RP = "shift" | "device" | "branch";
const RP_L: Record<RP, string> = { shift: "This shift", device: "Today · this register", branch: "Today · whole store" };
const TYP: Record<string, string> = { dinein: "Dine-in", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery" };

function reportText(x: Ctx, rp: RP, branchName: string) {
  const S = x.S, today = bizDate(x), dev = x.device, sh = openShift(x) || [...S.shifts].filter(s => s.deviceId === dev.id).sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt)))[0];
  const inScope = (o: Row) => o.branchId === dev.branchId && (rp === "shift" ? !!sh && o.shiftId === sh.id : bizDate(x, o.createdAt) === today && (rp === "branch" || o.deviceId === dev.id));
  const all = S.orders.filter(inScope), sales = all.filter(o => o.status === "closed"), refunds = all.filter(o => o.status === "refund");
  const voids = S.orders.filter(o => o.branchId === dev.branchId && o.status === "void" && (rp === "shift" ? !!sh && o.shiftId === sh.id : bizDate(x, o.voidedAt || o.updatedAt || o.createdAt) === today && (rp === "branch" || o.deviceId === dev.id)));
  const sum = (l: Row[], f: (o: Row) => any) => +l.reduce((s, o) => s + (+f(o) || 0), 0).toFixed(2);
  const grp = (l: any[], key: (o: any) => string, val: (o: any) => number, cnt: (o: any) => number = () => 1) => { const m = new Map<string, { n: number; v: number }>(); l.forEach(o => { const k = key(o) || "—", c = m.get(k) || { n: 0, v: 0 }; c.n += cnt(o); c.v += +val(o) || 0; m.set(k, c); }); return [...m.entries()].sort((a, b) => b[1].v - a[1].v); };
  const items = sales.flatMap(o => o.items || []), catOf = (i: any) => S.categories.find(c => c.id === S.products.find(p => p.id === i.productId)?.categoryId)?.name || "Other";
  const gross = sum(sales, o => o.total), ref = -sum(refunds, o => o.total), dec = 2, W = 32;
  const row = (a: string, b: string, n?: number) => { const mid = n != null ? String(n).padStart(4) + " " : ""; return (a.slice(0, W - b.length - mid.length - 1)).padEnd(W - b.length - mid.length) + mid + b; };
  const ctr = (t: string) => t.slice(0, W).padStart((W + Math.min(W, t.length)) / 2), m = (n: number) => n.toFixed(dec);
  const sec = (h: string, rows: [string, { n: number; v: number }][]) => ["", h.toUpperCase(), "-".repeat(W), ...(rows.length ? rows.map(([k, c]) => row(k, m(c.v), c.n)) : ["Nothing yet"])];
  const head = rp === "shift" ? (sh ? `Shift ${new Date(sh.openedAt).toLocaleString("en-GB")}${sh.cashier ? " · " + sh.cashier : ""}${sh.closedAt ? " · closed" : " · open"}` : "The till hasn't been opened on this register yet.") : "Business date " + today.split("-").reverse().join("-");
  return [ctr(branchName), ctr("Report · " + RP_L[rp]), ctr(dev.name || ""), head, "Printed " + new Date().toLocaleString("en-GB"), "", "SUMMARY", "-".repeat(W),
    row("Orders", String(sales.length)), row("Gross sales", m(gross)), row("Returns", m(-ref)), row("Net sales (after returns)", m(gross - ref)), row("Tax", m(sum(sales, o => o.tax) + sum(refunds, o => o.tax))),
    row("Discounts", m(sum(sales, o => o.discount))), row("Charges", m(sum(sales, o => o.chargesTotal))), row("Average order", m(sales.length ? gross / sales.length : 0)), row("Voided orders", m(sum(voids, o => o.total)), voids.length),
    ...sec("Payments", grp([...sales, ...refunds], o => o.payment?.method, o => o.total)), ...sec("Order types", grp(sales, o => TYP[o.type] || o.type, o => o.total)),
    ...sec("Channels", grp(sales, o => (o.channel === "pos" ? "POS" : o.channel === "callcenter" ? "Call center" : "API"), o => o.total)),
    ...sec("Categories", grp(items, catOf, lineNet, i => +i.qty || 0)), ...sec("Top items", grp(items, i => i.name, lineNet, i => +i.qty || 0).sort((a, b) => b[1].n - a[1].n).slice(0, 15)),
    ...sec("Employees", grp(sales, o => o.handledBy || o.agent, o => o.total)), ...sec("Drivers", grp(sales.filter(o => o.type === "delivery" && o.driverName), o => o.driverName, o => o.total)),
    "", ctr("— End of report —")].join("\n");
}

export function ReportsDialog({ x, onClose, say }: { x: Ctx; onClose: () => void; say: (s: string) => void }) {
  const { branch, device } = useStore(), [rp, setRp] = useState<RP>("shift"), text = reportText(x, rp, branch?.name || "");
  const print = async () => { const r = await printJob(x.S, device!, "receipt", () => text); say(r.bad.length ? r.bad[0] : r.preview != null ? "No printer in the browser" : "Printed"); };
  return (
    <Sheet title="Reports" width={620} onClose={onClose} footer={<><View style={{ flex: 1 }} /><Btn label="Close" height={48} onPress={onClose} /><Btn kind="primary" height={48} label="Print" onPress={print} /></>}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>{(Object.keys(RP_L) as RP[]).map(k => <Btn key={k} kind={rp === k ? "primary" : "outline"} height={40} style={{ flex: 1, paddingHorizontal: 6 }} textStyle={{ fontSize: 13 }} label={RP_L[k]} onPress={() => setRp(k)} />)}</View>
      <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ alignItems: "center", backgroundColor: C.bg, padding: 14, borderRadius: 12 }}>
        <T style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 18 }}>{text}</T>
      </ScrollView>
    </Sheet>
  );
}
