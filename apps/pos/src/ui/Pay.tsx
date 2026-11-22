// Take the payment: the amount due, the payment methods (Manage → Payment Methods), cash received with quick amounts
// and the change, then Complete Sale. Split checks and house accounts come next.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { money, money2, payMethods, type Ctx, type PayMethod } from "../lib/pos";
import { C, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Pad, T } from "./kit";
import { Sheet } from "./Pickers";

export type Paid = { method: string; type: string; methodId: string; tendered: number; change: number };
export function PayDialog({ x, total, onDone }: { x: Ctx; total: number; onDone: (p: Paid | null) => void }) {
  const pms = payMethods(x), [pm, setPm] = useState<PayMethod>(pms[0]), [v, setV] = useState(""), [busy, setBusy] = useState(false);
  const cur = (n: number) => money(x.S, n), cash = pm.type === "cash";
  const tendered = v === "" ? total : +v, change = Math.max(0, tendered - total);
  const key = (k: string) => setV(s => k === "c" ? "" : k === "b" ? s.slice(0, -1) : s.length > 9 ? s : s === "0" ? k : s + k);
  // quick amounts: exact, then the next round notes
  const quick = [...new Set([total, ...[5, 10, 20, 50, 100].map(n => Math.ceil(total / n) * n)])].filter(n => n >= total).slice(0, 4);
  const done = () => { if (cash && tendered < total - 0.004) return; setBusy(true); onDone({ method: pm.name, type: pm.type, methodId: pm.id, tendered: +(cash ? tendered : total).toFixed(2), change: +(cash ? change : 0).toFixed(2) }); };
  return (
    <Sheet title="Payment" width={820} onClose={() => onDone(null)} footer={<>
      <View style={{ flex: 1 }} />
      <Btn label="Cancel" height={52} onPress={() => onDone(null)} />
      <Btn kind="primary" height={52} label="Complete Sale" disabled={busy || (cash && tendered < total - 0.004)} onPress={done} />
    </>}>
      <View style={{ flexDirection: "row", gap: 24 }}>
        <View style={{ flex: 1, gap: 14 }}>
          <View><T color={C.mut} size={14}>Amount due</T><T w="b" size={34}>{cur(total)}</T>{money2(x.S, total) ? <T color={C.mut}>≈ {money2(x.S, total)}</T> : null}</View>
          <View style={{ gap: 8 }}>
            {pms.map(m => { const on = m.id === pm.id; return (
              <Pressable key={m.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setPm(m); setV(""); }}
                style={{ height: 56, borderRadius: R.md, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brand50 : "#fff", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
                <Icon name={m.type === "cash" ? "till" : m.type === "card" ? "tag" : "more"} color={on ? C.brand : C.mut} />
                <T w={on ? "s" : "m"} color={on ? C.brand600 : C.ink}>{m.name}</T>
              </Pressable>); })}
          </View>
        </View>
        <View style={{ width: 300, gap: 12 }}>
          {cash ? <>
            <T color={C.mut} size={14}>Cash received</T>
            <View style={{ height: 56, borderRadius: R.sm, borderWidth: 1, borderColor: C.brand, alignItems: "center", justifyContent: "center" }}><T w="s" size={26}>{cur(tendered)}</T></View>
            <View style={{ flexDirection: "row", gap: 8 }}>{quick.map(q => <Btn key={q} kind={tendered === q ? "soft" : "outline"} height={40} style={{ flex: 1, paddingHorizontal: 4 }} label={q.toLocaleString("en-US", { maximumFractionDigits: 2 })} textStyle={{ fontSize: 14 }} onPress={() => setV(String(q))} />)}</View>
            <View style={{ alignItems: "center" }}><Pad onKey={key} size={64} /></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 4 }}><T w="m">Change</T><T w="b" size={20} color={change ? C.ok : C.ink}>{cur(change)}</T></View>
          </> : <View style={{ flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", gap: 6, borderRadius: R.md, backgroundColor: C.bg }}>
            <T w="s">Take the payment on the card machine</T><T color={C.mut}>then complete the sale</T></View>}
        </View>
      </View>
    </Sheet>
  );
}

export function ChangeShown({ amount, title, money: m, onClose }: { amount: number; title: string; money: (n: number) => string; onClose: () => void }) {
  return (
    <Sheet title={title} width={420} onClose={onClose} footer={<Btn kind="primary" height={52} style={{ flex: 1 }} label="New Order" onPress={onClose} />}>
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 12 }}><T color={C.mut}>Change</T><T w="b" size={44} color={C.ok}>{m(amount)}</T></View>
    </Sheet>
  );
}
