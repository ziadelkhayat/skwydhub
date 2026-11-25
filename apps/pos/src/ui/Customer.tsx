// Pickup and delivery: the customer (looked up by phone), the order source, and the delivery address (saved ones or a new one).
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { TextInput } from "./Keyboard";
import { addrJoin, addrParts, custMissing, normPhone, phoneVariants, posSources, type Addr, type Cust, type OType } from "../lib/pos";
import { useStore } from "../lib/store";
import { C, F, R } from "../lib/theme";
import { Btn, T } from "./kit";
import { Icon } from "./Icon";
import { Sheet } from "./Pickers";

const Field = ({ label, value, onChange, kb, half }: { label: string; value: string; onChange: (v: string) => void; kb?: "phone-pad"; half?: boolean }) => (
  <View style={{ width: half ? "48.5%" : "100%", gap: 4 }}>
    <T size={13} color={C.ink2}>{label}</T>
    <TextInput value={value} onChangeText={onChange} keyboardType={kb} accessibilityLabel={label.replace(" *", "")}
      style={{ height: 46, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 16, color: C.ink }} />
  </View>);

// country codes for the phone (Lebanon first); the phone is saved with its code, e.g. +96171123456
const CC: [string, string][] = [["+961", "Lebanon"], ["+971", "UAE"], ["+966", "Saudi Arabia"], ["+965", "Kuwait"], ["+974", "Qatar"], ["+973", "Bahrain"], ["+968", "Oman"], ["+962", "Jordan"], ["+20", "Egypt"], ["+963", "Syria"], ["+964", "Iraq"], ["+90", "Türkiye"], ["+33", "France"], ["+44", "UK"], ["+49", "Germany"], ["+1", "US / Canada"], ["+61", "Australia"]];
const splitPhone = (p: string) => { const v = String(p || "").replace(/\s/g, ""); const k = CC.map(c => c[0]).sort((a, b) => b.length - a.length).find(c => v.startsWith(c)); return k ? { cc: k, n: v.slice(k.length) } : { cc: "+961", n: v.replace(/^\+/, "") }; };
function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [cc, setCc] = useState(splitPhone(value).cc), [open, setOpen] = useState(false), n = splitPhone(value).n;
  const local = (v: string) => { const d = v.replace(/[^\d+]/g, ""); if (d.startsWith("+")) return onChange(d); onChange(d ? cc + d.replace(/^0+/, "") : ""); };
  return (
    <View style={{ width: "100%", gap: 4 }}>
      <T size={13} color={C.ink2}>Phone number *</T>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={"Country code " + cc} onPress={() => setOpen(o => !o)}
          style={({ pressed }) => ({ height: 46, minWidth: 92, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: open ? C.brand : C.field, backgroundColor: pressed ? C.brand50 : "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 })}>
          <T w="m" size={16}>{cc}</T><T size={12} color={C.mut}>▼</T></Pressable>
        <TextInput value={n} onChangeText={local} keyboardType="phone-pad" accessibilityLabel="Phone number" placeholder="71 123 456" placeholderTextColor={C.mut2}
          style={{ flex: 1, height: 46, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 16, color: C.ink }} />
      </View>
      {open ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>{CC.map(([k, name]) => (
        <Pressable key={k} accessibilityRole="button" onPress={() => { setCc(k); setOpen(false); if (n) onChange(k + n.replace(/^0+/, "")); }}
          style={({ pressed }) => ({ height: 38, paddingHorizontal: 10, borderRadius: R.sm, borderWidth: k === cc ? 2 : 1, borderColor: k === cc ? C.brand : C.line, backgroundColor: pressed || k === cc ? C.brand50 : "#fff", flexDirection: "row", alignItems: "center", gap: 6 })}>
          <T w="s" size={14}>{k}</T><T size={13} color={C.mut}>{name}</T></Pressable>))}</View> : null}
    </View>);
}

// option A: two columns for delivery: the customer on the left (type, source, phone, name, returning-customer card), the address on the right (saved addresses as cards, or a new one)
export function CustomerDialog({ type, types, init, onDone }: { type: OType; types: OType[]; init: Cust; onDone: (r: { type: OType; cust: Cust } | null) => void }) {
  const { S, sb } = useStore();
  const [t, setT] = useState<OType>(type);   // dine-in: just the customer's name and phone
  const [c, setC] = useState<Cust>(init), [saved, setSaved] = useState<string[]>([]), [who, setWho] = useState<null | { name: string; notes: string; black: boolean; isNew?: boolean }>(null), [err, setErr] = useState("");
  const [newAddr, setNewAddr] = useState(false);
  const set = (k: keyof Cust, v: any) => { setC(o => ({ ...o, [k]: v })); setErr(""); };
  const setA = (k: keyof Addr, v: string) => setC(o => ({ ...o, addr: { ...o.addr, [k]: v } }));
  // a returning customer: their name, notes and saved addresses (the first one is picked if none is yet)
  useEffect(() => { const ph = normPhone(c.phone); if (ph.length < 8 || !sb) { setWho(null); setSaved([]); return; }
    let off = false; const tm = setTimeout(async () => {
      const { data } = await sb.from("customers").select("id,name,phone,addresses,blacklisted,notes,tags").in("phone", phoneVariants(ph)).limit(1); if (off) return;
      const d = data?.[0]; if (!d) { setWho({ name: "", notes: "", black: false, isNew: true }); setSaved([]); setNewAddr(true); return; }
      const sv = (d.addresses || []).map((a: any) => a.address).filter(Boolean) as string[];
      setWho({ name: d.name || "", notes: d.notes || "", black: !!d.blacklisted }); setSaved(sv); setNewAddr(!sv.length);
      setC(o => ({ ...o, name: o.name.trim() ? o.name : d.name || "", addr: addrJoin(o.addr) || !sv.length ? o.addr : addrParts(sv[0]) }));
    }, 400); return () => { off = true; clearTimeout(tm); }; }, [c.phone, sb]);
  const go = () => { const m = t === "dinein" ? (c.phone && c.phone.replace(/\D/g, "").length < 6 ? "Enter a valid phone number" : "") : custMissing(t, c, src.length > 0); if (m) return setErr(m); onDone({ type: t, cust: { ...c, phone: normPhone(c.phone) || c.phone } }); };
  const src = posSources(S), del = t === "delivery";
  const ini = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
  const left = (
    <View style={{ gap: 14, flex: 1 }}>
      {t !== "dinein" && <View style={{ flexDirection: "row", borderWidth: 1, borderColor: C.field, borderRadius: R.sm, overflow: "hidden" }}>
        {types.filter(k => k !== "dinein").map(k => <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: t === k }} onPress={() => setT(k)}
          style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center", backgroundColor: t === k ? C.brand : "#fff" }}><T w="m" size={15} color={t === k ? "#fff" : C.ink}>{k === "delivery" ? "Delivery" : "Pickup"}</T></Pressable>)}
      </View>}
      {src.length > 0 && t !== "dinein" && <View style={{ gap: 6 }}><T size={13} color={C.ink2}>Order source *</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{src.map(s => { const on = c.source === s; return <Pressable key={s} accessibilityRole="button" onPress={() => set("source", s)}
          style={{ height: 42, paddingHorizontal: 16, borderRadius: R.sm, borderWidth: on ? 2 : 1, borderColor: on ? C.brand500 : C.field, backgroundColor: on ? C.brand50 : "#fff", justifyContent: "center" }}><T w="m" size={14} color={on ? C.brand : C.ink}>{s}</T></Pressable>; })}</View></View>}
      <PhoneField value={c.phone} onChange={v => set("phone", v)} />
      <Field label="Customer name *" value={c.name} onChange={v => set("name", v)} />
      {who ? <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: R.sm, borderWidth: 1, borderColor: who.black ? "#FECACA" : who.isNew ? C.line : "#A7F3D0", backgroundColor: who.black ? C.badBg : who.isNew ? C.line2 : C.okBg }}>
        <View style={{ width: 44, height: 44, borderRadius: R.sm, backgroundColor: who.black ? C.bad : who.isNew ? C.mut2 : "#059669", alignItems: "center", justifyContent: "center" }}><T w="s" size={16} color="#fff">{ini(c.name || who.name)}</T></View>
        <View style={{ flex: 1 }}><T w="s" size={15} numberOfLines={1}>{who.isNew ? "New customer" : c.name || who.name}</T>
          <T size={13} color={who.black ? C.bad : C.mut} numberOfLines={2}>{who.isNew ? "Enter their name" + (del ? " and address" : "") : (who.black ? "Blacklisted customer" : "Returning customer") + (who.notes ? " · " + who.notes : "")}</T></View>
      </View> : null}
    </View>);
  const right = del ? (
    <View style={{ gap: 10, flex: 1 }}>
      <T w="s" size={15}>Delivery address</T>
      {saved.map((a, i) => { const p = addrParts(a), on = !newAddr && addrJoin(p) === addrJoin(c.addr), body = addrJoin({ ...p, label: "" } as Addr); return (
        <Pressable key={i} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { setNewAddr(false); set("addr", p); }}
          style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 12, borderRadius: R.sm, borderWidth: on ? 2 : 1, borderColor: on ? C.brand500 : C.line, backgroundColor: on ? C.brand50 : "#fff" }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 7 : 1.5, borderColor: on ? C.brand600 : C.field, backgroundColor: "#fff" }} />
          <View style={{ flex: 1 }}><T w="s" size={15}>{p.label || "Address " + (i + 1)}</T><T size={13.5} color={C.ink2} numberOfLines={2}>{body}</T></View></Pressable>); })}
      <Pressable accessibilityRole="button" onPress={() => { setNewAddr(true); set("addr", {}); }}
        style={{ height: 46, paddingHorizontal: 14, borderRadius: R.sm, borderWidth: newAddr ? 2 : 1, borderColor: newAddr ? C.brand500 : C.line, backgroundColor: newAddr ? C.brand50 : "#fff", flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="plus" size={16} color={C.brand} /><T w="m" size={14.5} color={C.brand}>New address</T></Pressable>
      {newAddr || !saved.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }}>
        <Field half label="Address type" value={c.addr.label || ""} onChange={v => setA("label", v)} />
        <Field half label="Area / street *" value={c.addr.street || ""} onChange={v => setA("street", v)} />
        <Field half label="Building name / no. *" value={c.addr.building || ""} onChange={v => setA("building", v)} />
        <Field half label="Floor / Apartment *" value={c.addr.floor || ""} onChange={v => setA("floor", v)} />
        <Field half label="Door / name on intercom" value={c.addr.door || ""} onChange={v => setA("door", v)} />
        <Field half label="Instructions" value={c.addr.extra || ""} onChange={v => setA("extra", v)} />
      </View> : null}
    </View>) : null;
  return (
    <Sheet title="Customer Details" width={del ? 1000 : 520} onClose={() => onDone(null)} footer={<>
      <T size={13} color={C.bad} style={{ flex: 1 }}>{err}</T>
      <Btn label="Cancel" height={52} style={{ minWidth: 120 }} onPress={() => onDone(null)} /><Btn kind="primary" height={52} style={{ minWidth: 150 }} label="Continue" onPress={go} />
    </>}>
      <View style={{ flexDirection: "row", gap: 24 }}>{left}{right}</View>
    </Sheet>
  );
}
