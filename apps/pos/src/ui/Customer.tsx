// Pickup and delivery: the customer (looked up by phone), the order source, and the delivery address (saved ones or a new one).
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { TextInput } from "./Keyboard";
import { addrJoin, addrParts, custMissing, normPhone, phoneVariants, posSources, type Addr, type Cust, type OType } from "../lib/pos";
import { useStore } from "../lib/store";
import { C, F, R } from "../lib/theme";
import { Btn, T } from "./kit";
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

export function CustomerDialog({ type, types, init, onDone }: { type: OType; types: OType[]; init: Cust; onDone: (r: { type: OType; cust: Cust } | null) => void }) {
  const { S, sb } = useStore();
  const [t, setT] = useState<OType>(type);   // dine-in: just the customer's name and phone
  const [c, setC] = useState<Cust>(init), [saved, setSaved] = useState<string[]>([]), [hint, setHint] = useState(""), [err, setErr] = useState("");
  const set = (k: keyof Cust, v: any) => { setC(o => ({ ...o, [k]: v })); setErr(""); };
  const setA = (k: keyof Addr, v: string) => setC(o => ({ ...o, addr: { ...o.addr, [k]: v } }));
  // a returning customer: their name, notes and saved addresses
  useEffect(() => { const ph = normPhone(c.phone); if (ph.length < 8 || !sb) { setHint(""); setSaved([]); return; }
    let off = false; const tm = setTimeout(async () => {
      const { data } = await sb.from("customers").select("id,name,phone,addresses,blacklisted,notes,tags").in("phone", phoneVariants(ph)).limit(1); if (off) return;
      const d = data?.[0]; if (!d) { setHint("New customer · enter their name"); setSaved([]); return; }
      setHint((d.blacklisted ? "⚠ Blacklisted customer. " : "Returning customer. ") + (d.notes || "")); setSaved((d.addresses || []).map((a: any) => a.address).filter(Boolean));
      setC(o => (o.name.trim() ? o : { ...o, name: d.name || "" }));
    }, 400); return () => { off = true; clearTimeout(tm); }; }, [c.phone, sb]);
  const go = () => { const m = t === "dinein" ? (c.phone && c.phone.replace(/\D/g, "").length < 6 ? "Enter a valid phone number" : "") : custMissing(t, c, src.length > 0); if (m) return setErr(m); onDone({ type: t, cust: { ...c, phone: normPhone(c.phone) || c.phone } }); };
  const src = posSources(S);
  return (
    <Sheet title="Customer Details" width={t === "delivery" ? 700 : 460} onClose={() => onDone(null)} footer={<>
      <T size={13} color={C.bad} style={{ flex: 1 }}>{err}</T>
      <Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Continue" onPress={go} />
    </>}>
      <View style={{ gap: 14 }}>
        {t !== "dinein" && <View style={{ flexDirection: "row", gap: 8 }}>
          {types.filter(k => k !== "dinein").map(k => <Btn key={k} kind={t === k ? "primary" : "outline"} height={44} style={{ flex: 1 }} label={k === "delivery" ? "Delivery" : "Pickup"} onPress={() => setT(k)} />)}
        </View>}
        {src.length > 0 && t !== "dinein" && <View style={{ gap: 6 }}><T size={13} color={C.ink2}>Order source *</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{src.map(s => <Btn key={s} kind={c.source === s ? "soft" : "outline"} height={40} label={s} style={c.source === s ? { borderColor: C.brand } : undefined} onPress={() => set("source", s)} />)}</View></View>}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
          <PhoneField value={c.phone} onChange={v => set("phone", v)} />
          <Field label="Customer name *" value={c.name} onChange={v => set("name", v)} />
        </View>
        {hint ? <T size={13} color={hint.startsWith("⚠") ? C.bad : C.mut}>{hint}</T> : null}
        {t === "delivery" && <>
          {saved.length > 0 && <View style={{ gap: 6 }}><T size={13} color={C.ink2}>Saved addresses</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{saved.map((a, i) => { const on = addrJoin(addrParts(a)) === addrJoin(c.addr); return (
              <Pressable key={i} accessibilityRole="button" onPress={() => set("addr", addrParts(a))} style={{ maxWidth: 340, borderRadius: R.md, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brand50 : "#fff", padding: 10 }}>
                <T size={13} numberOfLines={2}>{a}</T></Pressable>); })}</View></View>}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
            <Field half label="Address type" value={c.addr.label || ""} onChange={v => setA("label", v)} />
            <Field half label="Area / street *" value={c.addr.street || ""} onChange={v => setA("street", v)} />
            <Field half label="Building name / no. *" value={c.addr.building || ""} onChange={v => setA("building", v)} />
            <Field half label="Floor / Apartment no. *" value={c.addr.floor || ""} onChange={v => setA("floor", v)} />
            <Field half label="Door details / Name on intercom" value={c.addr.door || ""} onChange={v => setA("door", v)} />
            <Field half label="Instructions" value={c.addr.extra || ""} onChange={v => setA("extra", v)} />
          </View></>}
      </View>
    </Sheet>
  );
}
