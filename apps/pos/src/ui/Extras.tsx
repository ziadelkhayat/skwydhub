// The register's action windows: Discount, Notes, Charges, Hold / Retrieve.
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { chargeList, dsCalc, dsHere, type Ctx, type Disc, type Line } from "../lib/pos";
import { C, F, R } from "../lib/theme";
import { Btn, Pad, T } from "./kit";
import { Sheet } from "./Pickers";

export function DiscountDialog({ x, cart, cur, sym, allowPct, allowAmt, init, onDone }: { x: Ctx; cart: Line[]; cur: (n: number) => string; sym: string; allowPct: boolean; allowAmt: boolean; init: Disc; onDone: (d: Disc | undefined) => void }) {
  const sets = dsHere(x), [openSet, setOpenSet] = useState<any>(null);
  const [type, setType] = useState<"pct" | "amt">(init?.type || (allowPct ? "pct" : "amt")), [v, setV] = useState(init ? String(init.value) : "");
  const key = (k: string) => setV(s => k === "c" ? "" : k === "b" ? s.slice(0, -1) : s.length > 8 ? s : s === "0" ? k : s + k);
  return (
    <Sheet title="Discount" width={400} onClose={() => onDone(undefined)} footer={<>
      {init ? <Btn kind="danger" height={48} label="Remove" onPress={() => onDone(null)} /> : null}
      <View style={{ flex: 1 }} />
      <Btn label="Cancel" height={48} onPress={() => onDone(undefined)} />
      <Btn kind="primary" height={48} label="Apply" disabled={!(+v > 0) || (!openSet && type === "pct" && +v > 100)} onPress={() => onDone(openSet ? { type: "amt", value: 0, name: openSet.name, setId: openSet.id, setVal: +v } : { type, value: +v })} />
    </>}>
      <View style={{ alignItems: "center", gap: 12 }}>
        {sets.length > 0 && <View style={{ alignSelf: "stretch", gap: 6 }}><T size={13} color={C.ink2}>Discounts</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{sets.map(d => { const c = dsCalc(x, cart, d, 0), on = openSet?.id === d.id || init?.setId === d.id;
            return <Pressable key={d.id} onPress={() => { if (d.open) { setOpenSet(d); setV(""); } else if (c.amt > 0) onDone({ type: "amt", value: 0, name: d.name, setId: d.id }); }}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.sm, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brand50 : "#fff", opacity: !d.open && !(c.amt > 0) ? 0.5 : 1 }}>
              <T w="m" size={14}>{d.name}</T><T size={12} color={C.mut}>{d.open ? (d.type === "fixed" ? "Open amount" : "Open %") : c.why || "−" + cur(c.amt)}</T></Pressable>; })}</View></View>}
        {openSet ? <T w="s">{openSet.name} · {openSet.type === "fixed" ? "amount" : "%"}</T> : null}
        {!openSet && <View style={{ flexDirection: "row", gap: 8, alignSelf: "stretch" }}>
          {allowPct && <Btn kind={type === "pct" ? "primary" : "outline"} height={44} style={{ flex: 1 }} label="%" onPress={() => setType("pct")} />}
          {allowAmt && <Btn kind={type === "amt" ? "primary" : "outline"} height={44} style={{ flex: 1 }} label={sym} onPress={() => setType("amt")} />}
        </View>}
        <View style={{ alignSelf: "stretch", height: 56, borderRadius: R.sm, borderWidth: 1, borderColor: C.brand, alignItems: "center", justifyContent: "center" }}>
          <T w="s" size={26}>{v === "" ? " " : (openSet ? openSet.type !== "fixed" : type === "pct") ? v + " %" : cur(+v)}</T></View>
        <Pad onKey={key} size={64} onDot={() => setV(s => (s.includes(".") ? s : (s || "0") + "."))} />
      </View>
    </Sheet>
  );
}

export function NotesDialog({ init, onDone }: { init: { receipt: string; kitchen: string }; onDone: (v: { receipt: string; kitchen: string } | null) => void }) {
  const [r, setR] = useState(init.receipt), [k, setK] = useState(init.kitchen);
  const box = (label: string, help: string, v: string, set: (s: string) => void) => (
    <View style={{ gap: 6 }}><T w="s" size={15}>{label}</T><T size={13} color={C.mut}>{help}</T>
      <TextInput value={v} onChangeText={set} multiline accessibilityLabel={label} style={{ minHeight: 80, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, padding: 10, fontFamily: F.r, fontSize: 15, color: C.ink, textAlignVertical: "top" }} /></View>);
  return (
    <Sheet title="Notes" width={560} onClose={() => onDone(null)} footer={<>
      <View style={{ flex: 1 }} /><Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Save" onPress={() => onDone({ receipt: r, kitchen: k })} />
    </>}>
      <View style={{ gap: 18 }}>
        {box("Kitchen note", "Printed on the kitchen ticket.", k, setK)}
        {box("Order note", "Printed on the receipt.", r, setR)}
      </View>
    </Sheet>
  );
}

export function ChargesDialog({ x, cur, picked, open, onDone }: { x: Ctx; cur: (n: number) => string; picked: string[]; open: Record<string, number>; onDone: (v: { picked: string[]; open: Record<string, number> } | null) => void }) {
  const list = chargeList(x), [p, setP] = useState(picked), [o, setO] = useState(open), [ask, setAsk] = useState<string | null>(null), [v, setV] = useState("");
  const key = (k: string) => setV(s => k === "c" ? "" : k === "b" ? s.slice(0, -1) : s.length > 8 ? s : s === "0" ? k : s + k);
  return (
    <Sheet title="Charges" width={560} onClose={() => onDone(null)} footer={<>
      <View style={{ flex: 1 }} /><Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Apply" onPress={() => onDone({ picked: p, open: o })} />
    </>}>
      {!list.length ? <T color={C.mut}>No charges for this order type. Add them in the back office under Manage → Charges.</T> : ask ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <T w="s">{list.find(c => c.id === ask)?.name}</T>
          <View style={{ alignSelf: "stretch", height: 56, borderRadius: R.sm, borderWidth: 1, borderColor: C.brand, alignItems: "center", justifyContent: "center" }}><T w="s" size={26}>{v === "" ? " " : cur(+v)}</T></View>
          <Pad onKey={key} size={68} />
          <View style={{ flexDirection: "row", gap: 8 }}><Btn label="Back" height={44} onPress={() => setAsk(null)} /><Btn kind="primary" height={44} label="OK" disabled={!(+v > 0)} onPress={() => { setO(m => ({ ...m, [ask]: +v })); setP(l => [...new Set([...l, ask])]); setAsk(null); setV(""); }} /></View>
        </View>) : (
        <View style={{ gap: 8 }}>{list.map(c => { const on = p.includes(c.id); return (
          <Pressable key={c.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => on ? setP(l => l.filter(y => y !== c.id)) : c.type === "open" ? (setAsk(c.id), setV("")) : setP(l => [...l, c.id])}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 56, paddingHorizontal: 14, borderRadius: R.md, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brand50 : "#fff" }}>
            <T w={on ? "s" : "m"} style={{ flex: 1 }}>{c.name}</T>
            <T color={C.mut}>{c.type === "percent" ? c.value + " %" : c.type === "open" ? (o[c.id] ? cur(o[c.id]) : "Open amount") : cur(+c.value || 0)}</T>
          </Pressable>); })}</View>)}
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
            <T w="s" size={16}>H{h.n}</T><T size={13} color={C.mut}>{new Date(h.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()}</T><T w="s" color={C.brand}>{cur(h.total)}</T>
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
