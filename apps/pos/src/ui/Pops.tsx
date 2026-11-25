// Dropdowns that open right under a top button on the register: Discount (saved discounts + a % / amount pad),
// Charges (a tick per charge) and Notes (Kitchen Note or Receipt Note). A tap outside closes them.
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { TextInput } from "./Keyboard";
import { chargeList, dsCalc, dsHere, type Ctx, type Disc, type Line } from "../lib/pos";
import { C, F, R } from "../lib/theme";
import type { Held } from "./Extras";
import { Icon } from "./Icon";
import { Btn, T } from "./kit";

const shadow = { shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 };

// ax: the button's centre in the screen; top: just under the button; maxX: the screen's right edge
export function Popover({ ax, top, width, maxX, onClose, children }: { ax: number; top: number; width: number; maxX: number; onClose: () => void; children: React.ReactNode }) {
  const left = Math.max(8, Math.min(maxX - width - 8, ax - width / 2));
  return (
    <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 } as any}>
      <View style={{ position: "absolute", top: top + 2, left: ax - 7, width: 14, height: 14, backgroundColor: "#fff", borderLeftWidth: 1, borderTopWidth: 1, borderColor: C.line, transform: [{ rotate: "45deg" }], zIndex: 2 }} />
      <Pressable onPress={() => {}} style={[{ position: "absolute", top: top + 8, left, width, backgroundColor: "#fff", borderRadius: 6, borderWidth: 1, borderColor: C.line, padding: 6 }, shadow]}>{children}</Pressable>
    </Pressable>
  );
}

const Row = ({ onPress, disabled, children }: { onPress?: () => void; disabled?: boolean; children: React.ReactNode }) =>
  <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: R.sm, backgroundColor: pressed ? C.brand50 : "transparent", opacity: disabled ? 0.45 : 1 })}>{children}</Pressable>;
const Sec = ({ t }: { t: string }) => <T w="s" size={12} color={C.mut} style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, letterSpacing: 0.4 }}>{t.toUpperCase()}</T>;
const Tick = ({ on }: { on: boolean }) => <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 0 : 1.5, borderColor: C.field, backgroundColor: on ? C.brand600 : "#fff", alignItems: "center", justifyContent: "center" }}>{on ? <Icon name="check" size={14} color="#fff" sw={2.4} /> : null}</View>;
const Seg = ({ items, value, onChange }: { items: [string, string][]; value: string; onChange: (k: string) => void }) =>
  <View style={{ flexDirection: "row", borderWidth: 1, borderColor: C.field, borderRadius: R.sm, overflow: "hidden" }}>{items.map(([k, l], i) =>
    <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: value === k }} onPress={() => onChange(k)} style={{ flex: 1, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: value === k ? C.brand600 : "#fff", borderLeftWidth: i ? 1 : 0, borderColor: C.field }}>
      <T w="m" size={14} color={value === k ? "#fff" : C.ink2}>{l}</T></Pressable>)}</View>;
const typed = (k: string, s: string) => k === "b" ? s.slice(0, -1) : k === "." ? (s.includes(".") ? s : (s || "0") + ".") : s.length > 8 ? s : s === "0" ? k : s + k;

// Discount: the saved discounts on the left (one tap applies; greyed out when the order doesn't qualify), a % / amount pad on the right
export function DiscountPop({ x, cart, cur, sym, allowPct, allowAmt, init, onDone }: { x: Ctx; cart: Line[]; cur: (n: number) => string; sym: string; allowPct: boolean; allowAmt: boolean; init: Disc; onDone: (d: Disc | undefined) => void }) {
  const sets = dsHere(x), [openSet, setOpenSet] = useState<any>(null);
  const [type, setType] = useState<"pct" | "amt">(init?.type === "amt" && !init.setId ? "amt" : allowPct ? "pct" : "amt"), [v, setV] = useState(init && !init.setId && init.value ? String(init.value) : "");
  const sub = cart.reduce((a, l) => a + (+l.price || 0) * (+l.qty || 0) - (+(l.disc ?? 0) || 0), 0), pct = openSet ? openSet.type !== "fixed" : type === "pct";
  const save = !(+v > 0) ? 0 : pct ? sub * Math.min(100, +v) / 100 : Math.min(sub, +v);
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      <ScrollView style={{ flex: 1, maxHeight: 420 }}>
        <Sec t="Saved" />
        {!sets.length ? <T size={13} color={C.mut} style={{ padding: 12 }}>No saved discounts. Add them in the back office.</T> : null}
        {sets.map(d => { const c = dsCalc(x, cart, d, 0), on = openSet?.id === d.id || init?.setId === d.id, off = !d.open && !(c.amt > 0);
          return <Row key={d.id} disabled={off} onPress={() => { if (d.open) { setOpenSet(d); setV(""); } else onDone({ type: "amt", value: 0, name: d.name, setId: d.id }); }}>
            <View style={{ flex: 1 }}><T w={on ? "s" : "m"} size={14.5} color={on ? C.brand800 : C.ink} numberOfLines={1}>{d.name}</T><T size={12.5} color={C.mut} numberOfLines={1}>{d.open ? (d.type === "fixed" ? "You type the amount" : "You type the %") : c.why || ""}</T></View>
            {!d.open && c.amt > 0 ? <T w="s" size={13.5} color={C.ok}>−{cur(c.amt)}</T> : null}</Row>; })}
        {init ? <Row onPress={() => onDone(null)}><Icon name="x" size={18} color={C.bad} /><T w="m" color={C.bad}>Remove Discount</T></Row> : null}
      </ScrollView>
      <View style={{ width: 1, backgroundColor: C.line2 }} />
      <View style={{ width: 244, padding: 8, gap: 8 }}>
        {openSet ? <T w="s" size={14}>{openSet.name}</T> : allowPct && allowAmt ? <Seg items={[["pct", "%"], ["amt", "Amount"]]} value={type} onChange={k => setType(k as any)} /> : null}
        <View style={{ height: 48, borderRadius: R.sm, borderWidth: 1, borderColor: C.field, paddingHorizontal: 12, alignItems: "flex-end", justifyContent: "center" }}><T size={20}>{v === "" ? " " : pct ? v + " %" : sym + " " + v}</T></View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "b"].map(k =>
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === "b" ? "Delete" : k} onPress={() => setV(s => typed(k, s))} onLongPress={() => k === "b" && setV("")}
            style={({ pressed }) => ({ width: 72, height: 46, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brand50 : "#F9FAFB", alignItems: "center", justifyContent: "center" })}>
            <T w="m" size={17}>{k === "b" ? "⌫" : k}</T></Pressable>)}</View>
        <Btn kind="primary" height={44} label={save > 0 ? "Apply · new total " + cur(sub - save) : "Apply"} disabled={!(+v > 0) || (pct && +v > 100)}
          onPress={() => onDone(openSet ? { type: "amt", value: 0, name: openSet.name, setId: openSet.id, setVal: +v } : { type, value: +v })} />
      </View>
    </View>
  );
}

// Charges: a tick per charge with its amount; an open charge asks its amount first
export function ChargesPop({ x, cur, picked, open, onDone }: { x: Ctx; cur: (n: number) => string; picked: string[]; open: Record<string, number>; onDone: (v: { picked: string[]; open: Record<string, number> } | null) => void }) {
  const list = chargeList(x), [p, setP] = useState(picked), [o, setO] = useState(open), [ask, setAsk] = useState<string | null>(null), [v, setV] = useState("");
  if (ask) return (
    <View style={{ padding: 8, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}><T w="s" size={15} style={{ flex: 1 }}>{list.find(c => c.id === ask)?.name}</T><Pressable onPress={() => setAsk(null)}><T color={C.mut}>‹ Back</T></Pressable></View>
      <TextInput autoFocus value={v} onChangeText={setV} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={C.mut2} accessibilityLabel="Amount"
        style={{ height: 48, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 18, color: C.ink, textAlign: "right" }} />
      <Btn kind="primary" height={44} label="OK" disabled={!(+v > 0)} onPress={() => { setO(m => ({ ...m, [ask]: +v })); setP(l => [...new Set([...l, ask])]); setAsk(null); setV(""); }} />
    </View>);
  // same look as Tags: a header, one row per charge (name, amount, a tick on the right), Done across the bottom
  const tot = p.length;
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
        <T w="s" size={16} style={{ flex: 1 }}>Charges</T><T size={13} color={C.mut}>{tot ? tot + " on this order" : ""}</T>
      </View>
      {!list.length ? <T size={13} color={C.mut} style={{ padding: 12 }}>No charges for this order type. Add them in the back office under Manage → Charges.</T> :
      <ScrollView style={{ maxHeight: 380 }}>{list.map(c => { const on = p.includes(c.id);
        return <Pressable key={c.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => on ? setP(l => l.filter(y => y !== c.id)) : c.type === "open" ? (setAsk(c.id), setV(o[c.id] ? String(o[c.id]) : "")) : setP(l => [...l, c.id])}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: C.line2, backgroundColor: pressed ? C.bg2 : "#fff" })}>
          <T w="m" size={16} style={{ flex: 1 }} numberOfLines={1}>{c.name}</T>
          <T size={14} color={C.mut}>{c.type === "percent" ? c.value + "%" : c.type === "open" ? (o[c.id] ? cur(o[c.id]) : "Open amount") : cur(+c.value || 0)}</T>
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: on ? 0 : 1.5, borderColor: C.field, backgroundColor: on ? C.brand600 : "#fff", alignItems: "center", justifyContent: "center" }}>{on ? <Icon name="check" size={15} color="#fff" /> : null}</View>
        </Pressable>; })}</ScrollView>}
      <View style={{ padding: 8, paddingTop: 10 }}><Btn kind="primary" height={52} label="Done" onPress={() => onDone({ picked: p, open: o })} /></View>
    </View>
  );
}

// Notes: Kitchen Note or Receipt Note, then a box to type it
export function NotesPop({ init, onDone }: { init: { receipt: string; kitchen: string }; onDone: (v: { receipt: string; kitchen: string } | null) => void }) {
  const [which, setWhich] = useState<"kitchen" | "receipt" | null>(null), [t, setT] = useState("");
  if (which) return (
    <View style={{ padding: 8, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}><T w="s" size={15} style={{ flex: 1 }}>{which === "kitchen" ? "Kitchen Note" : "Receipt Note"}</T><Pressable onPress={() => setWhich(null)}><T color={C.mut}>‹ Back</T></Pressable></View>
      <TextInput autoFocus multiline value={t} onChangeText={setT} accessibilityLabel={which === "kitchen" ? "Kitchen note" : "Receipt note"}
        style={{ minHeight: 96, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, padding: 12, fontFamily: F.r, fontSize: 15, color: C.ink, textAlignVertical: "top" }} />
      <T size={12.5} color={C.mut}>{which === "kitchen" ? "Printed on the kitchen ticket" : "Printed on the customer's receipt"}</T>
      <View style={{ flexDirection: "row", gap: 8 }}><Btn height={44} style={{ flex: 1 }} label="Clear" onPress={() => setT("")} /><Btn kind="primary" height={44} style={{ flex: 1 }} label="Save" onPress={() => onDone({ ...init, [which]: t.trim() })} /></View>
    </View>);
  const R2 = ({ k, ic, l, help }: { k: "kitchen" | "receipt"; ic: string; l: string; help: string }) =>
    <Row onPress={() => { setWhich(k); setT(init[k] || ""); }}><View style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: C.brand50, alignItems: "center", justifyContent: "center" }}><Icon name={ic} size={18} color={C.brand600} /></View>
      <View style={{ flex: 1 }}><T w="m" size={14.5}>{l}</T><T size={12.5} color={C.mut} numberOfLines={1}>{init[k] || help}</T></View></Row>;
  return <View><R2 k="kitchen" ic="till" l="Kitchen Note" help="Printed on the kitchen ticket" /><R2 k="receipt" ic="note" l="Receipt Note" help="Printed for the customer" /></View>;
}

// Held orders (Retrieve): a list under the button; it scrolls when there are more than fit on the screen
export function HeldPop({ held, cur, label, maxH, onPick, onDelete, onClose }: { held: Held[]; cur: (n: number) => string; label: (h: Held) => string; maxH: number;
  onPick: (h: Held) => void; onDelete: (h: Held) => void; onClose: () => void }) {
  const [sure, setSure] = useState("");
  const tm = (s: string) => new Date(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
        <T w="s" size={16} style={{ flex: 1 }}>Held Orders <T size={15} color={C.mut}>{held.length}</T></T>
        <Pressable accessibilityLabel="Close" hitSlop={8} onPress={onClose} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={18} color={C.mut} /></Pressable>
      </View>
      {!held.length ? <T color={C.mut} style={{ padding: 12 }}>No held orders on this register.</T> :
      <ScrollView style={{ maxHeight: Math.max(160, maxH) }} showsVerticalScrollIndicator>
        {held.map(h => { const lines: any[] = h.data?.cart || [], n = lines.reduce((a, l) => a + (+l.qty || 0), 0);
          return (
          <View key={h.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line2 }}>
            <View style={{ width: 44, height: 44, borderRadius: R.lg, backgroundColor: C.brand50, alignItems: "center", justifyContent: "center" }}><T w="s" size={15} color={C.brand}>H{h.n}</T></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w="s" size={14.5} numberOfLines={1}>{label(h)} · {n} {n === 1 ? "item" : "items"}</T>
              <T size={12.5} color={C.mut} numberOfLines={1}>{lines.map(l => (+l.qty > 1 ? l.qty + "× " : "") + l.name).join(", ")}</T>
            </View>
            <View style={{ alignItems: "flex-end" }}><T w="s" size={14.5}>{cur(h.total)}</T><T size={12.5} color={C.mut}>{tm(h.at)}</T></View>
            {sure === h.id
              ? <Btn kind="danger" height={44} label="Delete" onPress={() => { setSure(""); onDelete(h); }} />
              : <Pressable accessibilityLabel={"Delete H" + h.n} onPress={() => setSure(h.id)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.badBg : "#fff", alignItems: "center", justifyContent: "center" })}>
                  <Icon name="trash" size={18} color={C.bad} /></Pressable>}
            <Btn kind="primary" height={44} label="Retrieve" onPress={() => onPick(h)} />
          </View>); })}
      </ScrollView>}
    </View>
  );
}
