// Pickup and delivery: the customer (looked up by phone), the order source, and the delivery address (saved ones or a new one).
import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
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

export function CustomerDialog({ type, types, init, onDone }: { type: OType; types: OType[]; init: Cust; onDone: (r: { type: OType; cust: Cust } | null) => void }) {
  const { S, sb } = useStore();
  const [t, setT] = useState<OType>(type === "dinein" ? (types.find(k => k !== "dinein") || "takeaway") : type);
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
  const go = () => { const m = custMissing(t, c, src.length > 0); if (m) return setErr(m); onDone({ type: t, cust: { ...c, phone: normPhone(c.phone) || c.phone } }); };
  const src = posSources(S);
  return (
    <Sheet title="Customer Details" width={760} onClose={() => onDone(null)} footer={<>
      <T size={13} color={C.bad} style={{ flex: 1 }}>{err}</T>
      <Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Continue" onPress={go} />
    </>}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {types.filter(k => k !== "dinein").map(k => <Btn key={k} kind={t === k ? "primary" : "outline"} height={44} style={{ flex: 1 }} label={k === "delivery" ? "Delivery" : "Pickup"} onPress={() => setT(k)} />)}
        </View>
        {src.length > 0 && <View style={{ gap: 6 }}><T size={13} color={C.ink2}>Order source *</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{src.map(s => <Btn key={s} kind={c.source === s ? "soft" : "outline"} height={40} label={s} style={c.source === s ? { borderColor: C.brand } : undefined} onPress={() => set("source", s)} />)}</View></View>}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
          <Field half label="Phone number *" kb="phone-pad" value={c.phone} onChange={v => set("phone", v)} />
          <Field half label="Customer name *" value={c.name} onChange={v => set("name", v)} />
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
