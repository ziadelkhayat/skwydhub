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
import { Sheet } from "./Pickers";

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
  const mins = (t: string) => Math.max(0, Math.round((Date.now() - +new Date(t)) / 60000));
  return (
    <Sheet title={!tm ? "Tables" : tm.mode === "move" ? (tm.from ? `Move ${tblLbl(tm.from)} to a free table` : "Pick the table to move") : (tm.from ? `Merge ${tblLbl(tm.from)} into another occupied table` : "Pick the first table to merge")} width={980} onClose={onClose}
      footer={confirm ? <><T w="m" style={{ flex: 1 }}>{tm!.mode === "move" ? `Move ${tblLbl(tm!.from)} to ${tblLbl(confirm)}?` : `Merge ${tblLbl(tm!.from)} into ${tblLbl(confirm)}? Its items move to ${tblLbl(confirm)} and ${tblLbl(tm!.from)} becomes free.`}</T>
          <Btn label="Cancel" height={44} onPress={() => setConfirm(null)} /><Btn kind="primary" height={44} label={tm!.mode === "move" ? "Move" : "Merge"} onPress={() => run(confirm)} /></>
        : <><T size={13} color={msg ? C.ink : C.mut} style={{ flex: 1 }}>{msg}</T>
          <Btn kind={tm?.mode === "move" ? "primary" : "outline"} height={44} label={tm?.mode === "move" ? "Cancel" : "Change Table"} onPress={() => { setMsg(""); setTm(tm?.mode === "move" ? null : { mode: "move" }); }} />
          <Btn kind={tm?.mode === "merge" ? "primary" : "outline"} height={44} label={tm?.mode === "merge" ? "Cancel" : "Merge Tables"} onPress={() => { setMsg(""); setTm(tm?.mode === "merge" ? null : { mode: "merge" }); }} /></>}>
      {!all.length ? <T color={C.mut}>No tables set up for this store yet. Add them in the back office under Manage → Stores → the store → Sections & Tables.</T> :
        <ScrollView style={{ maxHeight: 560 }}>{secs.map(sc => { const l = all.filter(t => (t.section || "") === sc); return (
          <View key={sc} style={{ marginBottom: 16 }}>
            {secs.length > 1 || sc ? <T w="s" style={{ marginBottom: 8 }}>{sc || "Tables"} <T size={13} color={C.mut}>· {l.filter(t => orders(t.name).length).length}/{l.length} occupied</T></T> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{l.map(t => { const os = orders(t.name), own = os.filter(o => tblParts(o.table)[0] === t.name), m = own[0] ? mins(own[0].createdAt) : 0;
              const busy = os.length > 0, bg = !busy ? "#fff" : m >= 60 ? C.badBg : C.warnBg, bd = !busy ? C.line : m >= 60 ? C.bad : C.warn;
              return (
                <Pressable key={t.name} accessibilityRole="button" accessibilityLabel={tblLbl(t.name) + (busy ? ", occupied" : ", free")} onPress={() => (tm ? pick(t.name) : own[0] ? onOpen(own[0]) : os[0] ? onOpen(os[0]) : onFree(t.name))}
                  style={{ width: 130, height: 104, borderRadius: R.md, borderWidth: tm?.from === t.name ? 3 : 1, borderColor: tm?.from === t.name ? C.brand : bd, backgroundColor: bg, padding: 10, justifyContent: "space-between" }}>
                  <T w="s" size={16}>{tblLbl(t.name)}</T>
                  {!busy ? <T size={13} color={C.mut}>Free</T> : !own.length ? <T size={12} color={C.mut}>Merged with {tblLbl(tblParts(os[0].table)[0])}</T> : <>
                    <T w="s" color={C.ink}>{money(x.S, own.reduce((s, o) => s + (+o.total || 0), 0))}</T>
                    <T size={12} color={C.mut}>{+own[0].guests ? own[0].guests + " guests · " : ""}#{own[0].no || "—"}{own.length > 1 ? ` +${own.length - 1}` : ""} · {m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min"}</T></>}
                </Pressable>); })}</View>
          </View>); })}</ScrollView>}
    </Sheet>
  );
}
