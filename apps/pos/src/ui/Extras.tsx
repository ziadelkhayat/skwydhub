// The register's action windows: Discount, Notes, Charges, Hold / Retrieve.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { TextInput } from "./Keyboard";
import { chargeList, dsCalc, dsHere, type Ctx, type Disc, type Line } from "../lib/pos";
import { C, F, R } from "../lib/theme";
import { Btn, Pad, T } from "./kit";
import { Sheet } from "./Pickers";

// Style 1 windows: Discount (saved discounts as cards + typed % or amount on a pad), Charges (a switch per charge), Tags (coloured chips), Notes (two notes + quick notes)
const Seg = ({ items, value, onChange }: { items: [string, string][]; value: string; onChange: (k: string) => void }) => (
  <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: R.md, padding: 4, gap: 4 }}>{items.map(([k, l]) =>
    <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: value === k }} onPress={() => onChange(k)} style={{ flex: 1, height: 40, borderRadius: R.sm, alignItems: "center", justifyContent: "center", backgroundColor: value === k ? "#fff" : "transparent", borderWidth: value === k ? 1 : 0, borderColor: C.line }}>
      <T w="m" size={15} color={value === k ? C.ink : C.mut}>{l}</T></Pressable>)}</View>);
const NumPad = ({ onKey }: { onKey: (k: string) => void }) => (
  <View style={{ width: 252, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "b"].map(k =>
    <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === "b" ? "Delete" : k === "." ? "Decimal point" : k} onPress={() => onKey(k)} onLongPress={() => k === "b" && onKey("c")}
      style={({ pressed }) => ({ width: 78, height: 58, borderRadius: R.md, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: pressed ? C.brand50 : "#F9FAFB", alignItems: "center", justifyContent: "center" })}>
      <T w="m" size={20}>{k === "b" ? "⌫" : k}</T></Pressable>)}</View>);
const typed = (k: string, s: string) => k === "c" ? "" : k === "b" ? s.slice(0, -1) : k === "." ? (s.includes(".") ? s : (s || "0") + ".") : s.length > 8 ? s : s === "0" ? k : s + k;

export function DiscountDialog({ x, cart, cur, sym, allowPct, allowAmt, init, onDone }: { x: Ctx; cart: Line[]; cur: (n: number) => string; sym: string; allowPct: boolean; allowAmt: boolean; init: Disc; onDone: (d: Disc | undefined) => void }) {
  const sets = dsHere(x), [openSet, setOpenSet] = useState<any>(null);
  const [type, setType] = useState<"pct" | "amt">(init?.type || (allowPct ? "pct" : "amt")), [v, setV] = useState(init && !init.setId ? String(init.value) : "");
  const sub = cart.reduce((a, l) => a + (+l.price || 0) * (+l.qty || 0) - (+(l.disc ?? 0) || 0), 0), pct = openSet ? openSet.type !== "fixed" : type === "pct";
  const save = !(+v > 0) ? 0 : pct ? sub * Math.min(100, +v) / 100 : Math.min(sub, +v);
  return (
    <Sheet title="Discount" width={720} onClose={() => onDone(undefined)} footer={<>
      {init ? <Btn kind="danger" height={48} label="Remove" onPress={() => onDone(null)} /> : null}
      <View style={{ flex: 1 }} />
      <Btn label="Cancel" height={48} onPress={() => onDone(undefined)} />
      <Btn kind="primary" height={48} label="Apply" disabled={!(+v > 0) || (pct && +v > 100)} onPress={() => onDone(openSet ? { type: "amt", value: 0, name: openSet.name, setId: openSet.id, setVal: +v } : { type, value: +v })} />
    </>}>
      <View style={{ flexDirection: "row", gap: 20 }}>
        <View style={{ flex: 1, gap: 10 }}>
          {sets.length > 0 ? <><T w="m" size={13} color={C.ink2}>Saved discounts</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{sets.map(d => { const c = dsCalc(x, cart, d, 0), on = openSet?.id === d.id || init?.setId === d.id, off = !d.open && !(c.amt > 0);
              return <Pressable key={d.id} disabled={off} onPress={() => { if (d.open) { setOpenSet(d); setV(""); } else onDone({ type: "amt", value: 0, name: d.name, setId: d.id }); }}
                style={{ width: "48%", padding: 12, borderRadius: R.md, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brand50 : "#fff", opacity: off ? 0.45 : 1, gap: 2 }}>
                <T w="s" size={15} numberOfLines={1}>{d.name}</T><T size={13} color={C.mut} numberOfLines={1}>{d.open ? (d.type === "fixed" ? "You type the amount" : "You type the %") : c.why || "Saves " + cur(c.amt)}</T></Pressable>; })}</View>
            <T w="m" size={13} color={C.ink2} style={{ marginTop: 6 }}>{openSet ? openSet.name : "Or type one"}</T></> : null}
          {!openSet && allowPct && allowAmt ? <Seg items={[["pct", "Percentage"], ["amt", "Amount"]]} value={type} onChange={k => setType(k as any)} /> : null}
          <View style={{ height: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.field, paddingHorizontal: 14, justifyContent: "center" }}>
            <T size={22}>{v === "" ? " " : v + (pct ? " %" : " " + sym)}</T></View>
          <T size={13} color={C.mut}>{save > 0 ? `Saves ${cur(save)} · new total ${cur(sub - save)}` : "Type the discount on the pad."}</T>
        </View>
        <NumPad onKey={k => setV(s => typed(k, s))} />
      </View>
    </Sheet>
  );
}

const QUICK = ["No onions", "Extra spicy", "Not spicy", "Sauce on the side", "No sauce", "Well done", "Rush"];
export function NotesDialog({ init, onDone }: { init: { receipt: string; kitchen: string }; onDone: (v: { receipt: string; kitchen: string } | null) => void }) {
  const [r, setR] = useState(init.receipt), [k, setK] = useState(init.kitchen);
  const box = (label: string, help: string, v: string, set: (s: string) => void) => (
    <View style={{ gap: 6 }}><T w="m" size={14} color={C.ink2}>{label} <T size={13} color={C.mut}>· {help}</T></T>
      <TextInput value={v} onChangeText={set} multiline accessibilityLabel={label} style={{ minHeight: 84, borderWidth: 1, borderColor: C.field, borderRadius: R.md, padding: 12, fontFamily: F.r, fontSize: 15, color: C.ink, textAlignVertical: "top" }} /></View>);
  return (
    <Sheet title="Notes" width={620} onClose={() => onDone(null)} footer={<>
      <View style={{ flex: 1 }} /><Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Save" onPress={() => onDone({ receipt: r, kitchen: k })} />
    </>}>
      <View style={{ gap: 10 }}>
        {box("Kitchen note", "printed on the kitchen ticket", k, setK)}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>{QUICK.map(q => { const on = k.split(/,\s*/).includes(q);
          return <Pressable key={q} accessibilityRole="button" onPress={() => setK(s => on ? s.split(/,\s*/).filter(y => y && y !== q).join(", ") : [s.trim(), q].filter(Boolean).join(", "))}
            style={{ paddingHorizontal: 12, height: 36, borderRadius: 6, borderWidth: 1, borderColor: on ? C.brand : C.field, backgroundColor: on ? C.brand50 : "#fff", justifyContent: "center" }}>
            <T w="m" size={13} color={on ? C.brand600 : C.ink2}>{on ? "✓ " : "+ "}{q}</T></Pressable>; })}</View>
        {box("Receipt note", "printed on the customer's receipt", r, setR)}
      </View>
    </Sheet>
  );
}

export function ChargesDialog({ x, cur, picked, open, onDone }: { x: Ctx; cur: (n: number) => string; picked: string[]; open: Record<string, number>; onDone: (v: { picked: string[]; open: Record<string, number> } | null) => void }) {
  const list = chargeList(x), [p, setP] = useState(picked), [o, setO] = useState(open), [ask, setAsk] = useState<string | null>(null), [v, setV] = useState("");
  const key = (k: string) => setV(s => k === "c" ? "" : k === "b" ? s.slice(0, -1) : s.length > 8 ? s : s === "0" ? k : s + k);
  return (
    <Sheet title="Charges" width={620} onClose={() => onDone(null)} footer={<>
      <View style={{ flex: 1 }} /><Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Apply" onPress={() => onDone({ picked: p, open: o })} />
    </>}>
      {!list.length ? <T color={C.mut}>No charges for this order type. Add them in the back office under Manage → Charges.</T> : ask ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <T w="s">{list.find(c => c.id === ask)?.name}</T>
          <View style={{ alignSelf: "stretch", height: 56, borderRadius: R.sm, borderWidth: 1, borderColor: C.brand, alignItems: "center", justifyContent: "center" }}><T w="s" size={26}>{v === "" ? " " : cur(+v)}</T></View>
          <Pad onKey={key} size={68} />
          <View style={{ flexDirection: "row", gap: 8 }}><Btn label="Back" height={44} onPress={() => setAsk(null)} /><Btn kind="primary" height={44} label="OK" disabled={!(+v > 0)} onPress={() => { setO(m => ({ ...m, [ask]: +v })); setP(l => [...new Set([...l, ask])]); setAsk(null); setV(""); }} /></View>
        </View>) : (
        <View>{list.map((c, i) => { const on = p.includes(c.id), amt = c.type === "percent" ? c.value + "%" : c.type === "open" ? (o[c.id] ? cur(o[c.id]) : "—") : cur(+c.value || 0);
          return (
          <Pressable key={c.id} accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={() => on ? setP(l => l.filter(y => y !== c.id)) : c.type === "open" ? (setAsk(c.id), setV("")) : setP(l => [...l, c.id])}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: "#F3F4F6" }}>
            <View style={{ width: 40, height: 40, borderRadius: R.sm, backgroundColor: C.brand50, alignItems: "center", justifyContent: "center" }}><T w="s" size={16} color={C.brand600}>{c.type === "percent" ? "%" : c.type === "open" ? "✎" : "$"}</T></View>
            <View style={{ flex: 1 }}><T w="s">{c.name}</T><T size={13} color={C.mut}>{c.type === "percent" ? c.value + "% of the order" : c.type === "open" ? "You type the amount" : "Fixed"}</T></View>
            <T w="s">{amt}</T>
            <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: on ? C.brand : "#D1D5DB", padding: 2, alignItems: on ? "flex-end" : "flex-start" }}><View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" }} /></View>
          </Pressable>); })}
          <T size={13} color={C.mut} style={{ marginTop: 8 }}>{p.length ? p.length + (p.length === 1 ? " charge on" : " charges on") : "No charges on this order"}</T></View>)}
    </Sheet>
  );
}

export type Held = { id: string; n: number; at: string; total: number; data: any };
export function RetrieveDialog({ held, cur, onDone }: { held: Held[]; cur: (n: number) => string; onDone: (h: Held | null) => void }) {
  return (
    <Sheet title="Held Orders" width={620} onClose={() => onDone(null)}>
      {!held.length ? <T color={C.mut}>No held orders on this register.</T> :
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{held.map(h => (
          <Pressable key={h.id} accessibilityRole="button" onPress={() => onDone(h)} style={({ pressed }) => ({ width: 170, height: 96, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brand50 : "#fff", padding: 12, justifyContent: "space-between" })}>
            <T w="s" size={16}>H{h.n}</T><T size={13} color={C.mut}>{new Date(h.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</T><T w="s" color={C.brand}>{cur(h.total)}</T>
          </Pressable>))}</View>}
    </Sheet>
  );
}

// a reason picked from a list (Manage → Reasons), or written
export function ReasonAsk({ title, reasons, ok = "OK", onDone }: { title: string; reasons: string[]; ok?: string; onDone: (r: string | null) => void }) {
  const [r, setR] = useState(""), [other, setOther] = useState(""), why = r === "_other" ? other.trim() : r;
  return (
    <Sheet title={title} width={560} onClose={() => onDone(null)} footer={<><View style={{ flex: 1 }} /><Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label={ok} disabled={!why} onPress={() => onDone(why)} /></>}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[...reasons, "_other"].map(x => (
        <Pressable key={x} onPress={() => setR(x)} style={{ paddingHorizontal: 14, height: 44, justifyContent: "center", borderRadius: R.sm, borderWidth: r === x ? 2 : 1, borderColor: r === x ? C.brand : C.line, backgroundColor: r === x ? C.brand50 : "#fff" }}>
          <T w="m">{x === "_other" ? "Other…" : x}</T></Pressable>))}</View>
      {r === "_other" ? <TextInput value={other} onChangeText={setOther} placeholder="Write the reason" accessibilityLabel="Reason" style={{ marginTop: 12, height: 46, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 15 }} /> : null}
    </Sheet>
  );
}
