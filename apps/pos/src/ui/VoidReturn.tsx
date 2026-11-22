// Void an open order (or some of its items) or return a done one (or some items): the reason, where the food goes,
// then a manager's PIN. A return is a new refund ticket today, so an ended day never changes. Needs the connection (stock is moved on the server).
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { afterVoid, isAdminUser, live, money, openShift, pinUser, refundOf, retLeft, userPerms, vrReasons, type Ctx } from "../lib/pos";
import type { Row } from "../lib/db";
import { appSet } from "../lib/print";
import { useStore } from "../lib/store";
import { C, F, R } from "../lib/theme";
import { Btn, Dots, Pad, T } from "./kit";
import { Sheet } from "./Pickers";

// a manager whose role allows this, or an owner/admin, types their PIN
export function Approve({ title, perm, S, onDone }: { title: string; perm: string; S: any; onDone: (u: Row | null) => void }) {
  const [pin, setPin] = useState(""), [err, setErr] = useState("");
  const press = async (k: string) => {
    const next = k === "c" ? "" : k === "b" ? pin.slice(0, -1) : pin.length < 5 ? pin + k : pin; setPin(next); setErr("");
    if (next.length < 4) return;
    const u = await pinUser(S.users.filter((x: Row) => live(x) && x.active !== false && x.pinHash), next);
    if (!u) { if (next.length === 5) { setPin(""); setErr("Wrong PIN. Try again."); } return; }
    setPin(""); if (isAdminUser(u) || userPerms(S, u).includes(perm)) onDone(u); else setErr(`${u.name}'s role can't approve this.`);
  };
  return (
    <Sheet title={title} width={400} onClose={() => onDone(null)}>
      <View style={{ alignItems: "center", gap: 14 }}>
        <T color={C.mut} style={{ textAlign: "center" }}>A manager whose role allows this, or an admin, types their PIN.</T>
        <Dots n={pin.length} /><T size={14} color={C.bad} style={{ minHeight: 20 }}>{err}</T><Pad onKey={press} size={72} />
      </View>
    </Sheet>
  );
}

export function VoidReturnDialog({ x, o, onDone }: { x: Ctx; o: Row; onDone: (msg?: string) => void }) {
  const { S, write, sb, cashier, device, branch, online } = useStore();
  const kind: "void" | "return" = o.status === "closed" ? "return" : "void", a = appSet(S, branch?.brandId), reasons = vrReasons(a);
  const max: number[] = (o.items || []).map((i: any, ix: number) => (kind === "return" ? retLeft(o, ix) : +i.qty));
  const [mode, setMode] = useState<"all" | "items">("all"), [qs, setQs] = useState<number[]>(max.map(() => 0));
  const [reason, setReason] = useState(""), [other, setOther] = useState(""), [stock, setStock] = useState<"stock" | "waste">(a.stockAction === "waste" ? "waste" : "stock"), [err, setErr] = useState(""), [appr, setAppr] = useState(false);
  const picked = mode === "all" ? max : qs, why = reason === "_other" ? other.trim() : reason;
  const go = () => {
    if (a.reasonRequired !== false && !why) return setErr("Pick a reason.");
    if (!picked.some(q => q > 0)) return setErr("Pick at least one item.");
    if (kind === "return" && !openShift(x)) return setErr("Open the till first: the refund is paid from this register.");
    if (!online) return setErr("Voids and returns need the internet connection.");
    setAppr(true);
  };
  const save = async (ok: Row) => {
    const now = new Date().toISOString(), by = cashier?.name || device!.name, st = a.stockAction === "ask" || !a.stockAction ? stock : a.stockAction;
    const idx: number[] = [], chosen = (o.items || []).map((i: any, ix: number) => { const q = picked[ix] || 0; if (q > 0) idx.push(ix); return { ...i, qty: q, ...(+i.disc ? { disc: +(i.disc * q / i.qty).toFixed(2) } : {}) }; }).filter((i: any) => i.qty > 0);
    const full = (o.items || []).every((_: any, ix: number) => (picked[ix] || 0) >= max[ix]);
    if (kind === "void") {
      write("orders", o.id, full ? { status: "void", voidReason: why, voidedAt: now, voidedBy: by, updatedAt: now, approvedBy: ok.name, stockAction: st }
        : { ...afterVoid(x, o, picked), updatedAt: now, approvedBy: ok.name, stockAction: st, voidedItems: [...(o.voidedItems || []), ...chosen.map((c: any) => ({ ...c, reason: why, stock: st, voidedAt: now, voidedBy: by, approvedBy: ok.name }))] });
    } else {
      const gross = (o.items || []).reduce((s: number, i: any) => s + (+i.price || 0) * (+i.qty || 1) - (+i.disc || 0), 0), share = gross ? (+o.total || 0) / gross : 1, dshare = gross ? 1 - Math.min(+o.discount || 0, gross) / gross : 1;
      const ret = chosen.map((c: any, k: number) => { const orig = o.items[idx[k]] || c, unit = ((+orig.price || 0) * (+orig.qty || 1) - (+orig.disc || 0)) / (+orig.qty || 1);
        return { ...c, ix: idx[k], refund: +(unit * c.qty * share).toFixed(2), reason: why, stock: st, returnedAt: now, returnedBy: by, approvedBy: ok.name }; });
      const refund = refundOf(o, picked), rgross = ret.reduce((s: number, r: any) => s + (+r.price || 0) * (+r.qty || 1) - (+r.disc || 0), 0), rdisc = +(rgross * (1 - dshare)).toFixed(2);
      write("orders", "ref_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), { channel: o.channel, source: o.source, type: o.type, status: "refund", refundOf: o.id, brandId: o.brandId || branch?.brandId || null, branchId: device!.branchId, deviceId: device!.id,
        shiftId: openShift(x)?.id || null, agent: by, customerName: o.customerName || "", phone: o.phone || "", items: ret.map(({ ix, refund: _r, returnedAt, returnedBy, approvedBy, reason: _w, stock: _s, ...it }: any) => it),
        subtotal: -(+rgross.toFixed(2)), discount: -rdisc, total: -refund, tax: -(+((+o.tax || 0) * (o.total ? refund / o.total : 0)).toFixed(2)),
        payment: { method: o.payment?.method || "Cash", type: o.payment?.type || "cash", methodId: o.payment?.methodId || null, tendered: -refund, change: 0 },
        returnReason: why, stockAction: st, approvedBy: ok.name, returnedBy: by, invoiceRef: o.invoiceNo || null, createdAt: now, updatedAt: now }, "set");
      write("orders", o.id, { updatedAt: now, returnedItems: [...(o.returnedItems || []), ...ret], refundTotal: +((+o.refundTotal || 0) + refund).toFixed(2) });
    }
    // stock: a void before the sale used the food → waste takes it out; a return → back to stock puts it back
    const mv = kind === "void" ? (st === "waste" ? "waste" : null) : (st === "stock" ? "restock" : null);
    if (mv && sb) { const r = await sb.rpc("skwyd_stock_items", { p_order: o.id, p_items: chosen, p_mode: mv }); if (r.error) console.warn("stock", r.error); }
    onDone(kind === "void" ? `Voided · approved by ${ok.name}` : `Refund ticket created · ${money(S, refundOf(o, picked))} · approved by ${ok.name}`);
  };
  if (appr) return <Approve title={kind === "void" ? "Approve void" : "Approve return"} perm={kind === "void" ? "pos_void" : "pos_return"} S={S} onDone={u => (u ? save(u) : setAppr(false))} />;
  return (
    <Sheet title={(kind === "void" ? "Void " : "Return ") + (mode === "items" ? "items" : "order")} width={640} onClose={() => onDone()} footer={<>
      <T size={13} color={C.bad} style={{ flex: 1 }}>{err}</T>
      <Btn label="Cancel" height={48} onPress={() => onDone()} /><Btn kind="danger" height={48} label={kind === "void" ? "Void" : "Return"} onPress={go} />
    </>}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn kind={mode === "all" ? "primary" : "outline"} height={44} style={{ flex: 1 }} label="Whole order" onPress={() => setMode("all")} />
          <Btn kind={mode === "items" ? "primary" : "outline"} height={44} style={{ flex: 1 }} label="Choose items" onPress={() => setMode("items")} />
        </View>
        {mode === "all" ? <T>{kind === "void" ? "The whole order will be voided and removed from sales." : `The whole order will be returned and ${money(S, refundOf(o, max))} refunded.`}</T> :
          <View style={{ gap: 6 }}>{(o.items || []).map((i: any, ix: number) => (
            <View key={ix} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderColor: C.line2 }}>
              <View style={{ flex: 1 }}><T w="m">{i.name}</T>{i.mods ? <T size={12} color={C.mut}>{i.mods}</T> : null}</View>
              <Btn height={36} label="−" disabled={!qs[ix]} onPress={() => setQs(q => q.map((v, j) => (j === ix ? Math.max(0, v - 1) : v)))} />
              <T w="s" style={{ minWidth: 28, textAlign: "center" }}>{qs[ix]}</T>
              <Btn height={36} label="+" disabled={qs[ix] >= max[ix]} onPress={() => setQs(q => q.map((v, j) => (j === ix ? Math.min(max[ix], v + 1) : v)))} />
            </View>))}
            {kind === "return" ? <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 6 }}><T w="m">Refund</T><T w="b">{money(S, refundOf(o, qs))}</T></View> : null}
          </View>}
        <View style={{ gap: 6 }}><T size={13} color={C.ink2}>Reason{a.reasonRequired !== false ? " *" : ""}</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[...reasons, "_other"].map(r => (
            <Pressable key={r} onPress={() => setReason(r)} style={{ paddingHorizontal: 14, height: 40, justifyContent: "center", borderRadius: R.sm, borderWidth: reason === r ? 2 : 1, borderColor: reason === r ? C.brand : C.line, backgroundColor: reason === r ? C.brand50 : "#fff" }}>
              <T w="m" size={14}>{r === "_other" ? "Other…" : r}</T></Pressable>))}</View>
          {reason === "_other" ? <TextInput value={other} onChangeText={setOther} placeholder="Write the reason" accessibilityLabel="Reason" style={{ height: 44, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 15 }} /> : null}
        </View>
        {a.stockAction === "ask" || !a.stockAction ? <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn kind={stock === "stock" ? "soft" : "outline"} height={44} style={{ flex: 1 }} label="Return to stock" onPress={() => setStock("stock")} />
          <Btn kind={stock === "waste" ? "soft" : "outline"} height={44} style={{ flex: 1 }} label="Waste" onPress={() => setStock("waste")} />
        </View> : <T color={C.mut}>Items go {a.stockAction === "waste" ? "to waste" : "back to stock"}.</T>}
      </View>
    </Sheet>
  );
}
