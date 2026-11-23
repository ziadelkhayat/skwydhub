// Tables (pos.html openTables): the store's tables by section (Manage → Store → Sections & Tables), free or occupied
// with the open order's amount and time. A free table starts a dine-in order on it; an occupied one opens its order.
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useStore } from "../lib/store";
import { orderFields, totals } from "../lib/pos";
import { Btn } from "./kit";
import { money, type Ctx } from "../lib/pos";
import type { Row } from "../lib/db";
import { C, R } from "../lib/theme";
import { T } from "./kit";
import { Full, Head } from "./Boards";
import { Icon } from "./Icon";

export const tblParts = (n: any) => String(n || "").split("+").map(x => x.trim()).filter(Boolean);   // merged tables are saved as "3+4"
export const tblLbl = (n: any) => { const l = tblParts(n); if (!l.length) return String(n || ""); return l.every(x => /^\d+$/.test(x)) ? (l.length > 1 ? "Tables " : "Table ") + l.join(" + ") : l.join(" + "); };

export function TablesDialog({ x, onFree, onOpen, onClose }: { x: Ctx; onFree: (name: string) => void; onOpen: (o: Row) => void; onClose: () => void }) {
  const { write } = useStore(), [tm, setTm] = useState<{ mode: "move" | "merge"; from?: string } | null>(null), [msg, setMsg] = useState(""), [confirm, setConfirm] = useState<string | null>(null);
  const cfg = ((x.S.settings.find(s => s.id === "tables") || {}) as any)[x.device.branchId] || [];
  const open = x.S.orders.filter(o => o.branchId === x.device.branchId && ["active", "pending"].includes(o.status) && o.type === "dinein" && String(o.table || "").trim());
  const known = new Set(cfg.map((t: any) => String(t.name).trim()));
  const all: { name: string; section?: string }[] = [...cfg.filter((t: any) => String(t?.name || "").trim()).map((t: any) => ({ ...t, name: String(t.name).trim() })),
    ...[...new Set(open.flatMap(o => tblParts(o.table)))].filter(k => !known.has(k)).map(k => ({ name: k, section: "Other" }))];
  const orders = (k: string) => open.filter(o => tblParts(o.table).includes(k)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const secs = [...new Set(all.map(t => t.section || ""))];
  // Change Table: an occupied table moves to a free one. Merge Tables: the first table's orders join the second's order, and the first becomes free.
  const pick = (k: string) => {
    const busy = orders(k).length; setMsg("");
    if (!tm!.from) { if (!busy) return setMsg("Pick a table with an open order"); return setTm({ ...tm!, from: k }); }
    if (k === tm!.from) return setTm({ mode: tm!.mode });
    if (tm!.mode === "move") { if (busy) return setMsg("Pick a free table"); return setConfirm(k); }
    if (!busy) return setMsg("Pick a table with an open order");
    const dst = orders(k)[0]; if (!orders(tm!.from).some(o => o.id !== dst.id)) return setMsg("These tables are already on one order");
    setConfirm(k);
  };
  const run = (k: string) => { const from = tm!.from!, now = new Date().toISOString();
    if (tm!.mode === "move") orders(from).forEach(o => write("orders", o.id, { table: tblParts(o.table).map(y => (y === from ? k : y)).join("+"), updatedAt: now }));
    else { const dst = orders(k)[0], srcs = orders(from).filter(o => o.id !== dst.id), items = [...(dst.items || []), ...srcs.flatMap(o => o.items || [])];
      const y: Ctx = { ...x, otype: "dinein" }, t = totals(y, items, +dst.discount ? (dst.discountType === "amt" ? { type: "amt", value: +dst.discount } : { type: "pct", value: +dst.discountPct || 0 }) : null, (dst.charges || []).map((c: any) => c.id), Object.fromEntries((dst.charges || []).filter((c: any) => c.type === "open").map((c: any) => [c.id, +c.amount])));
      const f: any = orderFields(y, items, t, { table: String(dst.table || k), guests: [dst, ...srcs].reduce((a, o) => a + (+o.guests || 0), 0), receiptNotes: dst.receiptNotes, notes: dst.notes }); delete f.customerName; delete f.phone; delete f.address;
      write("orders", dst.id, { ...f, updatedAt: now });
      srcs.forEach(o => write("orders", o.id, { status: "declined", voidReason: "Merged into " + (dst.no || dst.ref), doneAt: now, updatedAt: now })); }
    setMsg(tm!.mode === "move" ? `${tblLbl(from)} moved to ${tblLbl(k)}` : `${tblLbl(from)} merged into ${tblLbl(k)}`); setTm(null); setConfirm(null); };
  const mins = (t: string) => Math.max(0, Math.round((Date.now() - +new Date(t)) / 60000)), dur = (m: number) => m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min";
  const [sel, setSel] = useState(""), [sec, setSec] = useState(""), selOs = sel ? orders(sel) : [], selOwn = selOs.filter(o => tblParts(o.table)[0] === sel), so = selOwn[0] || selOs[0];
  const busyN = all.filter(t => orders(t.name).length).length;
  // as before: a free table starts an order on it, an occupied one opens its order; holding a table shows its details on the right
  const tap = (k: string) => { if (tm) return pick(k); const os = orders(k), own = os.filter(o => tblParts(o.table)[0] === k); if (!os.length) return onFree(k); onOpen(own[0] || os[0]); };
  const hold = (k: string) => { if (tm) return; if (orders(k).length) setSel(k); };
  const shown = all.filter(t => !sec || (t.section || "") === sec);
  return (
    <Full><Head title={!tm ? "Tables" : tm.mode === "move" ? (tm.from ? `Move ${tblLbl(tm.from)} to a free table` : "Pick the table to move") : (tm.from ? `Merge ${tblLbl(tm.from)} into another occupied table` : "Pick the first table to merge")} onClose={onClose}>
      <T size={13} color={C.mut}>{busyN} of {all.length} occupied</T>
      <Btn kind={tm?.mode === "move" ? "primary" : "outline"} height={44} label={tm?.mode === "move" ? "Cancel Move" : "Change Table"} onPress={() => { setMsg(""); setConfirm(null); setTm(tm?.mode === "move" ? null : { mode: "move" }); }} />
      <Btn kind={tm?.mode === "merge" ? "primary" : "outline"} height={44} label={tm?.mode === "merge" ? "Cancel Merge" : "Merge Tables"} onPress={() => { setMsg(""); setConfirm(null); setTm(tm?.mode === "merge" ? null : { mode: "merge" }); }} /></Head>
      {msg || confirm ? <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 14, marginTop: 12, padding: 12, borderRadius: R.md, backgroundColor: confirm ? C.brand50 : "#fff", borderWidth: 1, borderColor: confirm ? C.brand : C.line }}>
        <T w="m" style={{ flex: 1 }}>{confirm ? (tm!.mode === "move" ? `Move ${tblLbl(tm!.from)} to ${tblLbl(confirm)}?` : `Merge ${tblLbl(tm!.from)} into ${tblLbl(confirm)}? Its items move to ${tblLbl(confirm)} and ${tblLbl(tm!.from)} becomes free.`) : msg}</T>
        {confirm ? <><Btn label="Cancel" height={42} onPress={() => setConfirm(null)} /><Btn kind="primary" height={42} label={tm!.mode === "move" ? "Move" : "Merge"} onPress={() => run(confirm)} /></> : null}</View> : null}
      <View style={{ flex: 1, flexDirection: "row", padding: 14, gap: 14 }}>
        {/* the floor */}
        <View style={{ flex: 1 }}>
          {secs.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
            {["", ...secs].map(k => { const l = all.filter(t => !k || (t.section || "") === k); return <Btn key={k || "all"} kind={sec === k ? "primary" : "outline"} height={40} label={`${k || "All"} (${l.filter(t => orders(t.name).length).length}/${l.length})`} onPress={() => setSec(k)} />; })}</ScrollView> : null}
          {!all.length ? <T color={C.mut}>No tables set up for this store yet. Add them in the back office under Manage → Stores → the store → Sections & Tables.</T> :
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: 10 }}>{shown.map(t => { const os = orders(t.name), own = os.filter(o => tblParts(o.table)[0] === t.name), m = os[0] ? mins(os[0].createdAt) : 0;
            const busy = os.length > 0, merged = busy && !own.length, long = busy && m >= 60, on = sel === t.name || tm?.from === t.name;
            const bg = !busy ? "#fff" : long ? C.badBg : merged ? "#F4F3FF" : C.warnBg, bd = on ? C.brand : !busy ? C.line : long ? C.bad : merged ? "#7A5AF8" : C.warn;
            return (
              <Pressable key={t.name} accessibilityRole="button" accessibilityLabel={tblLbl(t.name) + (busy ? ", occupied" : ", free")} onPress={() => tap(t.name)} onLongPress={() => hold(t.name)} delayLongPress={400}
                style={{ width: 150, height: 118, borderRadius: R.lg, borderWidth: on ? 3 : 1.5, borderColor: bd, backgroundColor: bg, padding: 12, justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><T w="s" size={17}>{tblLbl(t.name)}</T>{busy && +(own[0] || os[0]).guests ? <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><Icon name="user" size={14} color={C.ink2} /><T size={12} color={C.ink2}>{+(own[0] || os[0]).guests}</T></View> : null}</View>
                {!busy ? <T size={13} color={C.ok}>Free</T> : merged ? <T size={12} color="#5925DC">Merged with {tblLbl(tblParts(os[0].table)[0])}</T> : <>
                  <T w="s">{money(x.S, own.reduce((a, o) => a + (+o.total || 0), 0))}</T>
                  <T size={12} color={long ? C.bad : C.ink2}>#{own[0].no || "—"}{own.length > 1 ? ` +${own.length - 1}` : ""} · {dur(m)}</T>
                  {tblParts(own[0].table).length > 1 ? <T size={11} color="#5925DC">With {tblParts(own[0].table).filter(y => y !== t.name).map(y => tblLbl(y)).join(", ")}</T> : null}</>}
              </Pressable>); })}</ScrollView>}
          <View style={{ flexDirection: "row", gap: 16, paddingTop: 8 }}>{([["#fff", C.line, "Free"], [C.warnBg, C.warn, "Occupied"], ["#F4F3FF", "#7A5AF8", "Merged"], [C.badBg, C.bad, "Over 1 hour"]] as const).map(([b, c, l]) =>
            <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: b, borderWidth: 1.5, borderColor: c }} /><T size={12} color={C.ink2}>{l}</T></View>)}</View>
        </View>
        {/* the chosen table */}
        <View style={{ width: 340, backgroundColor: "#fff", borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
          {!so ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 6 }}><T w="s">Hold a table to see it here</T><T size={13} color={C.mut} style={{ textAlign: "center" }}>Tap a free table to start a dine-in order, or an occupied one to open its order.</T></View> : <>
            <View style={{ padding: 16, borderBottomWidth: 1, borderColor: C.line, gap: 4 }}>
              <T w="s" size={19}>{tblLbl(so.table)}</T>
              <T size={13} color={C.mut}>Order #{so.no || so.ref || "—"} · opened {new Date(so.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {dur(mins(so.createdAt))}</T>
              <T size={13} color={C.mut}>{[+so.guests ? so.guests + " guests" : "", so.cashier || so.agent || ""].filter(Boolean).join(" · ")}</T></View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }} showsVerticalScrollIndicator={false}>
              {(so.items || []).filter((i: any) => !i.voided).map((i: any, k: number) => <View key={k} style={{ flexDirection: "row", gap: 8 }}><T w="s" style={{ width: 30 }}>{+i.qty}×</T>
                <View style={{ flex: 1 }}><T>{i.name}</T>{(i.options || []).map((o: any, j: number) => <T key={j} size={12} color={C.mut}>• {o.name}</T>)}</View><T w="m">{money(x.S, (+i.price || 0) * (+i.qty || 1) - (+i.disc || 0))}</T></View>)}
              {selOwn.length > 1 ? <T size={12} color={C.mut}>+ {selOwn.length - 1} more order{selOwn.length > 2 ? "s" : ""} on this table</T> : null}
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderColor: C.line, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T w="s" size={17}>Total</T><T w="b" size={17}>{money(x.S, selOwn.reduce((a, o) => a + (+o.total || 0), 0) || +so.total || 0)}</T></View>
              <Btn kind="primary" height={48} label="Open In Register" onPress={() => onOpen(so)} />
              <View style={{ flexDirection: "row", gap: 8 }}><Btn height={44} style={{ flex: 1 }} label="Change Table" onPress={() => { setMsg(""); setTm({ mode: "move", from: tblParts(so.table)[0] }); }} />
                <Btn height={44} style={{ flex: 1 }} label="Merge" onPress={() => { setMsg(""); setTm({ mode: "merge", from: tblParts(so.table)[0] }); }} /></View>
            </View></>}
        </View>
      </View>
    </Full>
  );
}
