// Take the payment: the amount due, the payment methods (Manage → Payment Methods), cash received with quick amounts
// and the change, then Complete Sale. Split checks and house accounts come next.
import { useEffect, useState } from "react";
import { normPhone, phoneVariants } from "../lib/pos";
import { useStore } from "../lib/store";
import { Pressable, View } from "react-native";
import { chg2, CUR2, due2, money, money2, num2, payMethods, quickTender, type Ctx, type PayMethod } from "../lib/pos";
import { C, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Pad, T } from "./kit";
import { Sheet } from "./Pickers";

export type Paid = { method: string; type: string; methodId: string; tendered: number; change: number; tendered1?: number; tendered2?: number; currency2?: string; rate2?: number; decimals2?: number; haId?: string };
export function PayDialog({ x, total, onDone, title, onSplit, phone }: { x: Ctx; total: number; onDone: (p: Paid | null) => void; title?: string; onSplit?: () => void; phone?: string }) {
  const { sb } = useStore();
  // House Account: charged to the customer's account, paid later (the customer needs it enabled in the back office)
  const pms = [...payMethods(x), ...(String(phone || "").replace(/\D/g, "").length >= 6 ? [{ id: "house", name: "House Account", type: "house" }] : [])], [pm, setPm] = useState<PayMethod>(pms[0]), [busy, setBusy] = useState(false), c2 = CUR2(x.S);
  // cash can be given in the main currency, the second one, or both: one amount per currency, one pad for the one selected
  const [cur, setCur] = useState<1 | 2>(1), [v1, setV1] = useState(""), [v2, setV2] = useState(""), [touched, setTouched] = useState(false);
  const m = (n: number) => money(x.S, n), cash = pm.type === "cash";
  const [ha, setHa] = useState<{ id: string; name: string; balance: number; limit: number | null } | null | "none" | "err" | "load">(null);
  useEffect(() => { if (pm.type !== "house" || !sb) return; setHa("load"); (async () => {
    try { const ph = normPhone(String(phone)); const { data: l, error } = await sb.from("customers").select("id,name,house_account,house_limit").in("phone", phoneVariants(ph)).is("deleted_at", null).limit(1); if (error) throw error;
      const c = l?.[0]; if (!c || !c.house_account) return setHa("none");
      const { data: tx } = await sb.from("house_account_txns").select("kind,amount").eq("customer_id", c.id);
      setHa({ id: c.id, name: c.name, balance: +(tx || []).reduce((a: number, t: any) => a + (t.kind === "payment" ? +t.amount : -t.amount), 0).toFixed(2), limit: c.house_limit == null ? null : +c.house_limit });
    } catch { setHa("err"); } })(); }, [pm.id]);
  const haOk = pm.type !== "house" || (typeof ha === "object" && !!ha && !(ha.limit != null && ha.balance - total < -ha.limit - 0.001));
  const a1 = touched ? +v1 || 0 : (v2 ? 0 : total), a2 = c2 ? +v2 || 0 : 0, paid = a1 + (c2 && a2 ? a2 / c2.rate : 0);
  const short = cash && paid < total - 0.0005 && !(c2 && a2 && a2 >= due2(x.S, Math.max(0, total - a1)) - 1e-9), change = Math.max(0, paid - total);
  const key = (k: string) => { setTouched(true); (cur === 1 ? setV1 : setV2)(s => k === "c" ? "" : k === "b" ? s.slice(0, -1) : s.length > 10 ? s : s === "0" ? k : s + k); };
  const quick = cur === 2 && c2 ? [due2(x.S, total), ...quickTender(x.S, 2)] : [total, ...quickTender(x.S, 1)];
  const done = () => { if (short) return; setBusy(true);
    onDone({ method: pm.name, type: pm.type, methodId: pm.id, tendered: +(cash ? paid : total).toFixed(2), change: +(cash ? change : 0).toFixed(2),
      ...(cash && c2 && a2 ? { tendered1: a1, tendered2: a2, currency2: c2.code, rate2: c2.rate, decimals2: c2.dec } : {}), ...(pm.type === "house" && ha && typeof ha === "object" ? { haId: ha.id } : {}) }); };
  const box = (which: 1 | 2) => { const on = cur === which, v = which === 1 ? (touched ? v1 : v2 ? "" : String(total)) : v2;
    return <Pressable onPress={() => setCur(which)} style={{ flex: 1, height: 56, borderRadius: R.sm, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.field, paddingHorizontal: 12, justifyContent: "center" }}>
      <T size={12} color={C.mut}>{which === 1 ? "Main currency" : c2!.code}</T><T w="s" size={20}>{v === "" ? "0" : which === 1 ? m(+v) : c2!.code + " " + num2(+v, c2!.dec)}</T></Pressable>; };
  return (
    <Sheet title={title || "Payment"} width={820} onClose={() => onDone(null)} footer={<>
      {onSplit ? <Btn label="Split Check" height={52} onPress={onSplit} /> : null}
      <View style={{ flex: 1 }} />
      <Btn label="Cancel" height={52} onPress={() => onDone(null)} />
      <Btn kind="primary" height={52} label="Complete Sale" disabled={busy || short || !haOk} onPress={done} />
    </>}>
      <View style={{ flexDirection: "row", gap: 24 }}>
        <View style={{ flex: 1, gap: 14 }}>
          <View><T color={C.mut} size={14}>Amount due</T><T w="b" size={34}>{m(total)}</T>{money2(x.S, total) ? <T color={C.mut}>≈ {money2(x.S, total)}</T> : null}</View>
          <View style={{ gap: 8 }}>
            {pms.map(m => { const on = m.id === pm.id; return (
              <Pressable key={m.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setPm(m); setV1(""); setV2(""); setTouched(false); }}
                style={{ height: 56, borderRadius: R.md, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brand50 : "#fff", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
                <Icon name={m.type === "cash" ? "till" : m.type === "card" ? "tag" : "more"} color={on ? C.brand : C.mut} />
                <T w={on ? "s" : "m"} color={on ? C.brand600 : C.ink}>{m.name}</T>
              </Pressable>); })}
          </View>
        </View>
        <View style={{ width: 300, gap: 12 }}>
          {cash ? <>
            <T color={C.mut} size={14}>Cash received</T>
            <View style={{ flexDirection: "row", gap: 8 }}>{box(1)}{c2 ? box(2) : null}</View>
            {c2 ? <T size={13} color={C.mut}>Due {cur === 2 ? c2.code + " " + num2(due2(x.S, total), c2.dec) + " ≈ " + m(total) : m(total) + " ≈ " + money2(x.S, total)}</T> : null}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{[...new Set(quick)].slice(0, 4).map((q, i) => <Btn key={q} height={40} style={{ flexGrow: 1, paddingHorizontal: 6 }} label={i === 0 ? "Exact" : cur === 2 ? num2(q, c2!.dec) : m(q)} textStyle={{ fontSize: 13 }}
              onPress={() => { setTouched(true); if (cur === 2) { setV2(String(q)); if (i === 0) setV1(""); } else { setV1(String(q)); if (i === 0) setV2(""); } }} />)}</View>
            <View style={{ alignItems: "center" }}><Pad onKey={key} size={60} /></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 4 }}><T w="m">{short ? "Remaining" : "Change"}</T>
              <View style={{ alignItems: "flex-end" }}><T w="b" size={20} color={short ? C.bad : change ? C.ok : C.ink}>{m(short ? total - paid : change)}</T>
                {c2 ? <T size={13} color={C.mut}>= {c2.code} {num2(short ? due2(x.S, total - paid) : chg2(x.S, change), c2.dec)}</T> : null}</View></View>
          </> : <View style={{ flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", gap: 6, borderRadius: R.md, backgroundColor: C.bg }}>
            {pm.type === "house" ? (ha === "load" || !ha ? <T color={C.mut}>Checking the house account…</T> : ha === "none" ? <><T w="s" color={C.bad}>No house account</T><T color={C.mut}>Enable it for this customer in the back office (Customers)</T></>
              : ha === "err" ? <><T w="s" color={C.bad}>Couldn't check the house account</T><T color={C.mut}>House account needs a connection</T></>
              : <><T w="s">Charge to {ha.name || "the customer"}'s house account</T><T color={C.mut}>Balance {m(ha.balance)} → {m(ha.balance - total)}{ha.limit != null ? " · limit " + m(ha.limit) : ""}</T>{!haOk ? <T w="s" color={C.bad}>Over the credit limit</T> : null}</>)
              : <><T w="s">Take the payment on the card machine</T><T color={C.mut}>then complete the sale</T></>}</View>}
        </View>
      </View>
    </Sheet>
  );
}

export function ChangeShown({ amount, title, money: m, second, onClose }: { amount: number; title: string; money: (n: number) => string; second?: string; onClose: () => void }) {
  return (
    <Sheet title={title} width={420} onClose={onClose} footer={<Btn kind="primary" height={52} style={{ flex: 1 }} label="New Order" onPress={onClose} />}>
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 12 }}><T color={C.mut}>Change</T><T w="b" size={44} color={C.ok}>{m(amount)}</T>{second ? <T size={18} color={C.mut}>= {second}</T> : null}</View>
    </Sheet>
  );
}
