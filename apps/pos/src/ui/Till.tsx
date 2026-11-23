// Open Till (opening cash) and Close Till (expected cash, counted cash, difference), as in pos.html.
import { useState } from "react";
import { View } from "react-native";
import { expectedCash, money, newId, openShift, shiftSales, type Ctx } from "../lib/pos";
import { useStore } from "../lib/store";
import { C, R } from "../lib/theme";
import { Btn, Pad, T } from "./kit";
import { Sheet } from "./Pickers";

export function TillDialog({ x, onDone }: { x: Ctx; onDone: (msg?: string) => void }) {
  const { write, cashier, device } = useStore();
  const sh = openShift(x), [v, setV] = useState("");
  const key = (k: string) => setV(s => k === "c" ? "" : k === "b" ? s.slice(0, -1) : s.length > 9 ? s : s === "0" ? k : s + k);
  const cur = (n: number) => money(x.S, n);
  const now = () => new Date().toISOString();
  const open = () => { write("shifts", newId("sh"), { deviceId: device!.id, branchId: device!.branchId, cashier: cashier?.name || device!.name, openingCash: +(+v || 0).toFixed(2), openedAt: now() }, "set"); onDone("Till opened"); };
  const close = () => {
    const sales = shiftSales(x, sh!), exp = +expectedCash(x, sh!).toFixed(2), counted = v === "" ? exp : +(+v).toFixed(2);
    write("shifts", sh!.id, { closedAt: now(), orders: sales.filter(o => o.status === "closed").length, sales: +sales.reduce((a, o) => a + (+o.total || 0), 0).toFixed(2), expectedCash: exp, countedCash: counted, difference: +(counted - exp).toFixed(2) });
    onDone(Math.abs(counted - exp) < 0.01 ? "Till closed · drawer balanced" : "Till closed · difference " + cur(counted - exp));
  };
  const sales = sh ? shiftSales(x, sh) : [];
  return (
    <Sheet title={sh ? "Close Till" : "Open Till"} width={640} onClose={() => onDone()} footer={<>
      <View style={{ flex: 1 }} />
      <Btn label="Cancel" height={48} onPress={() => onDone()} />
      <Btn kind="primary" height={48} label={sh ? "Close Till" : "Open Till"} onPress={sh ? close : open} />
    </>}>
      <View style={{ flexDirection: "row", gap: 24 }}>
        <View style={{ flex: 1, gap: 12 }}>
          {sh ? <>
            <T color={C.mut} size={14}>Opened by {sh.cashier || "—"} at {new Date(sh.openedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</T>
            {[["Orders", String(sales.filter(o => o.status === "closed").length)], ["Net sales", cur(sales.reduce((a, o) => a + (+o.total || 0) - (+o.tax || 0), 0))], ["Opening cash", cur(+sh.openingCash || 0)], ["Expected cash in drawer", cur(expectedCash(x, sh))]].map(([l, r]) =>
              <View key={l} style={{ flexDirection: "row", justifyContent: "space-between" }}><T color={C.mut}>{l}</T><T w="s">{r}</T></View>)}
            <T color={C.mut} size={14} style={{ marginTop: 8 }}>Count the cash in the drawer</T>
          </> : <T color={C.mut} size={14}>Enter Till Amount</T>}
          <View style={{ height: 56, borderRadius: R.sm, borderWidth: 1, borderColor: C.brand, alignItems: "center", justifyContent: "center" }}><T w="s" size={26}>{v === "" ? (sh ? cur(expectedCash(x, sh)) : cur(0)) : cur(+v)}</T></View>
        </View>
        <View style={{ alignItems: "center", gap: 8 }}><Pad onKey={key} size={68} /><Btn kind="ghost" label="." height={36} onPress={() => setV(s => (s.includes(".") ? s : (s || "0") + "."))} /></View>
      </View>
    </Sheet>
  );
}
