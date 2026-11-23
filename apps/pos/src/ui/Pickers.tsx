// The windows the register opens over the sale: modifiers, variants, a number (open price, discount).
// Same rules as modpick.js: min/max per modifier, free options, repeatable options, a note on the item.
import { useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { modRule, type ModData, type ModOpt } from "../lib/pos";
import { C, F, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Pad, T } from "./kit";
import { Bubble, touched } from "./Bubble";

export function Sheet({ title, onClose, width = 680, children, footer }: { title: string; onClose: () => void; width?: number; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} onTouchStart={touched} {...({ onPointerDown: touched } as any)} style={{ flex: 1, backgroundColor: "rgba(16,24,40,0.45)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: width, maxHeight: "92%", backgroundColor: "#fff", borderRadius: R.lg, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: C.line }}>
            <T w="s" size={18} style={{ flex: 1 }} numberOfLines={1}>{title}</T>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={20} /></Pressable>
          </View>
          <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>{children}</ScrollView>
          {footer ? <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderColor: C.line }}>{footer}</View> : null}
        </Pressable>
      </Pressable>
      <Bubble win />
    </Modal>
  );
}

export type Picked = { options: { id: string; modifierId: string; name: string; price: number }[]; unitPrice: number; mods: string; note: string };
// edit: a cart line being changed (its options start picked, its note is filled in, and the button says Save)
export function ModPicker({ name, basePrice, data, money, onDone, edit }: { name: string; basePrice: number; data: ModData; money: (n: number) => string; onDone: (r: Picked | null) => void; edit?: { options: { id: string; modifierId?: string }[]; note?: string } }) {
  const links = data.links.map(l => ({ ...l, opts: data.options.filter(o => o.modifierId === l.modifierId) }));
  const [sel, setSel] = useState<Record<string, number>[]>(() => links.map(l => { const m: Record<string, number> = {};
    if (edit) { edit.options.forEach(o => { if (l.opts.some(y => y.id === o.id) && (!o.modifierId || o.modifierId === l.modifierId)) m[o.id] = (m[o.id] || 0) + 1; }); return m; }
    (l.defaults || []).forEach(id => { if (l.opts.some(o => o.id === id)) m[id] = 1; }); return m; }));
  const [note, setNote] = useState(edit?.note || ""), [err, setErr] = useState("");
  const cnt = (gi: number) => Object.values(sel[gi]).reduce((a, n) => a + n, 0);
  const units = (gi: number) => links[gi].opts.flatMap(o => Array(sel[gi][o.id] || 0).fill(o) as ModOpt[]);
  const price = () => { let t = basePrice; links.forEach((l, gi) => { let free = +(l.free || 0); units(gi).forEach(o => { if (free > 0) free--; else t += o.price; }); }); return t; };
  const tap = (gi: number, o: ModOpt, d = 1) => {
    const l = links[gi], mx = +(l.max || 0), n = (sel[gi][o.id] || 0);
    setSel(s => s.map((m, j) => {
      if (j !== gi) return m;
      if (mx === 1) return n ? {} : { [o.id]: 1 };                                   // one choice: tapping another swaps it
      if (!l.multi) { if (n) { const { [o.id]: _, ...rest } = m; return rest; } return mx && cnt(gi) >= mx ? m : { ...m, [o.id]: 1 }; }
      const v = n + d; if (d > 0 && mx && cnt(gi) >= mx) return m;
      if (v <= 0) { const { [o.id]: _, ...rest } = m; return rest; } return { ...m, [o.id]: v };
    }));
    setErr("");
  };
  const ok = () => {
    const bad = links.findIndex((l, gi) => cnt(gi) < +(l.min || 0));
    if (bad >= 0) return setErr(`${data.groups[links[bad].modifierId]?.name || "Options"}: ${modRule(links[bad]).toLowerCase()}`);
    const chosen: Picked["options"] = []; links.forEach((l, gi) => { let free = +(l.free || 0); units(gi).forEach(o => { const c = free > 0 ? 0 : o.price; if (free > 0) free--; chosen.push({ id: o.id, modifierId: l.modifierId, name: o.name, price: c }); }); });
    const tally: { name: string; n: number }[] = []; chosen.forEach(o => { const t = tally.find(y => y.name === o.name); if (t) t.n++; else tally.push({ name: o.name, n: 1 }); });
    onDone({ options: chosen, unitPrice: +price().toFixed(2), mods: tally.map(t => (t.n > 1 ? t.n + "× " : "") + t.name).join(", "), note: note.trim() });
  };
  return (
    <Sheet title={name} onClose={() => onDone(null)} footer={<>
      <T size={13} color={C.bad} style={{ flex: 1 }}>{err}</T>
      <Btn label="Cancel" height={48} onPress={() => onDone(null)} />
      <Btn kind="primary" height={48} label={edit ? "Save · " + money(price()) : "Add · " + money(price())} onPress={ok} />
    </>}>
      {links.map((l, gi) => (
        <View key={l.modifierId} style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <T w="s" size={15}>{data.groups[l.modifierId]?.name || "Options"}</T>
            <T size={12} color={+(l.min || 0) ? C.bad : C.mut}>{modRule(l)}</T>
            {+(l.free || 0) ? <T size={12} color={C.mut}>{l.free} free</T> : null}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {l.opts.map(o => { const n = sel[gi][o.id] || 0, mx = +(l.max || 0), full = mx > 1 && cnt(gi) >= mx && !n, dis = o.oos || full;
              return (
                <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={o.name + (n ? ", " + n + " picked" : "")} disabled={dis && !n} onPress={() => tap(gi, o)}
                  style={{ width: 140, height: 96, borderRadius: R.md, borderWidth: n ? 2 : 1, borderColor: n ? C.brand : C.line, backgroundColor: n ? C.brand50 : "#fff", padding: 10, justifyContent: "space-between", opacity: dis && !n ? 0.45 : 1 }}>
                  <T w={n ? "s" : "m"} size={14} numberOfLines={2} color={n ? C.brand600 : C.ink} style={{ paddingRight: n ? 22 : 0 }}>{o.name}</T>
                  <T size={12} color={o.oos ? C.warn : C.mut}>{o.oos ? "Out of stock" : o.price ? "+" + money(o.price) : ""}</T>
                  {n ? <View style={{ position: "absolute", top: 6, right: 6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }}><T w="s" size={12} color="#fff">{l.multi && mx !== 1 ? n : "✓"}</T></View> : null}
                  {n && l.multi && mx !== 1 ? <Pressable accessibilityLabel={"One less " + o.name} onPress={() => tap(gi, o, -1)} style={{ position: "absolute", right: 6, bottom: 6, width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: C.field, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="minus" size={14} /></Pressable> : null}
                </Pressable>); })}
          </View>
        </View>))}
      <T w="s" size={15} style={{ marginBottom: 8 }}>Item note</T>
      <TextInput value={note} onChangeText={setNote} multiline placeholder="No onions, extra spicy…" placeholderTextColor={C.mut2}
        style={{ minHeight: 64, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, padding: 10, fontFamily: F.r, fontSize: 15, color: C.ink, textAlignVertical: "top" }} />
    </Sheet>
  );
}

export function VariantPicker({ name, setName, list, money, onDone }: { name: string; setName?: string; list: { name: string; price: number; id: string; oos?: boolean }[]; money: (n: number) => string; onDone: (id: string | null) => void }) {
  return (
    <Sheet title={name} onClose={() => onDone(null)} width={620}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 10 }}><T w="s" size={15}>{setName || "Choose a variant"}</T><T size={12} color={C.mut}>Choose 1</T></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {list.map(v => <Pressable key={v.id} accessibilityRole="button" disabled={v.oos} onPress={() => onDone(v.id)}
          style={({ pressed }) => ({ width: 170, height: 96, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brand50 : "#fff", padding: 14, justifyContent: "space-between", opacity: v.oos ? 0.45 : 1 })}>
          <T w="s" size={15}>{v.name}</T><T w="m" size={14} color={v.oos ? C.warn : C.brand}>{v.oos ? "Out of stock" : money(v.price)}</T></Pressable>)}
      </View>
    </Sheet>
  );
}

// a number typed on the pad: open price, discount, opening cash…
export function NumberAsk({ title, initial = "", money, onDone }: { title: string; initial?: string; money?: (n: number) => string; onDone: (v: number | null) => void }) {
  const [v, setV] = useState(initial);
  const key = (k: string) => setV(s => k === "c" ? "" : k === "b" ? s.slice(0, -1) : s.length > 9 ? s : s === "0" ? k : s + k);
  return (
    <Sheet title={title} onClose={() => onDone(null)} width={380} footer={<>
      <Btn label="Cancel" height={48} style={{ flex: 1 }} onPress={() => onDone(null)} />
      <Btn kind="primary" height={48} style={{ flex: 1 }} label="OK" disabled={v === "" || isNaN(+v)} onPress={() => onDone(+v)} />
    </>}>
      <View style={{ alignItems: "center", gap: 14 }}>
        <View style={{ alignSelf: "stretch", height: 56, borderRadius: R.sm, borderWidth: 1, borderColor: C.brand, alignItems: "center", justifyContent: "center" }}><T w="s" size={26}>{v === "" ? " " : money && !v.endsWith(".") ? money(+v) : v}</T></View>
        <Pad onKey={key} size={76} onDot={() => setV(s => (s.includes(".") ? s : (s || "0") + "."))} />
      </View>
    </Sheet>
  );
}

// long press on a cart line: its note (printed on the kitchen ticket) and its discount, as a % (follows the quantity) or an amount
export function LineExtras({ name, unit, qty, note, disc, discPct, money, canPct, canAmt, onDone }: { name: string; unit: number; qty: number; note?: string; disc?: number; discPct?: number; money: (n: number) => string; canPct: boolean; canAmt: boolean;
  onDone: (r: { note: string; disc?: number; discPct?: number } | null) => void }) {
  const [n, setN] = useState(note || ""), [kind, setKind] = useState<"pct" | "amt">(disc && !discPct && canAmt ? "amt" : canPct ? "pct" : "amt"), [v, setV] = useState(discPct ? String(discPct) : disc ? String(disc) : "");
  const full = unit * qty, x = Math.max(0, +v.replace(",", ".") || 0), d = kind === "pct" ? full * Math.min(100, x) / 100 : Math.min(x, full), allowed = kind === "pct" ? canPct : canAmt;
  const save = () => { if (x > 0 && !allowed) return; onDone(x > 0 ? (kind === "pct" ? { note: n.trim(), discPct: Math.min(100, x), disc: +d.toFixed(2) } : { note: n.trim(), disc: +d.toFixed(2) }) : { note: n.trim() }); };
  return (
    <Sheet title={qty + " × " + name} onClose={() => onDone(null)} footer={<><View style={{ flex: 1 }} /><Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Save" onPress={save} /></>}>
      <T w="s" size={15} style={{ marginBottom: 8 }}>Item note</T>
      <TextInput value={n} onChangeText={setN} multiline placeholder="No onions, extra spicy…" placeholderTextColor={C.mut2} accessibilityLabel="Item note"
        style={{ minHeight: 64, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, padding: 10, fontFamily: F.r, fontSize: 15, color: C.ink, textAlignVertical: "top", marginBottom: 18 }} />
      <T w="s" size={15} style={{ marginBottom: 8 }}>Item discount</T>
      {!canPct && !canAmt ? <T color={C.mut}>Your role doesn't allow discounts.</T> : <>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          {canPct ? <Btn kind={kind === "pct" ? "primary" : "outline"} height={44} style={{ width: 90 }} label="%" onPress={() => setKind("pct")} /> : null}
          {canAmt ? <Btn kind={kind === "amt" ? "primary" : "outline"} height={44} style={{ width: 110 }} label="Amount" onPress={() => setKind("amt")} /> : null}
          <TextInput value={v} onChangeText={setV} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.mut2} accessibilityLabel="Item discount"
            style={{ flex: 1, height: 44, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 16, color: C.ink }} /></View>
        <T size={13} color={C.mut}>{d > 0 ? `${money(full)} − ${money(d)} = ${money(full - d)}` : `Line total ${money(full)}`}</T></>}
    </Sheet>
  );
}
