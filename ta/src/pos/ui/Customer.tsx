"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// Pickup and delivery: the customer (looked up by phone), the order source, and the delivery address (saved ones or a new one). From Tremor.
import { Button } from "@/components/tremor/Button";
import { Callout } from "@/components/tremor/Callout";
import { Input } from "@/components/tremor/Input";
import { Label } from "@/components/tremor/Label";
import { RadioCardGroup, RadioCardItem } from "@/components/tremor/RadioCardGroup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/tremor/Select";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { useEffect, useId, useState } from "react";
import { addrJoin, addrParts, custMissing, normPhone, phoneVariants, posSources, type Addr, type Cust, type OType } from "../lib/pos";
import { useStore } from "../lib/store";
import { Icon } from "./Icon";
import { Sheet } from "./Pickers";

const Field = ({ label, value, onChange, tel }: { label: string; value: string; onChange: (v: string) => void; tel?: boolean }) => { const id = useId();
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={e => onChange(e.target.value)} type={tel ? "tel" : "text"} /></div>; };

// country codes for the phone (Lebanon first); the phone is saved with its code, e.g. +96171123456
const CC: [string, string][] = [["+961", "Lebanon"], ["+971", "UAE"], ["+966", "Saudi Arabia"], ["+965", "Kuwait"], ["+974", "Qatar"], ["+973", "Bahrain"], ["+968", "Oman"], ["+962", "Jordan"], ["+20", "Egypt"], ["+963", "Syria"], ["+964", "Iraq"], ["+90", "Türkiye"], ["+33", "France"], ["+44", "UK"], ["+49", "Germany"], ["+1", "US / Canada"], ["+61", "Australia"]];
const splitPhone = (p: string) => { const v = String(p || "").replace(/\s/g, ""); const k = CC.map(c => c[0]).sort((a, b) => b.length - a.length).find(c => v.startsWith(c)); return k ? { cc: k, n: v.slice(k.length) } : { cc: "+961", n: v.replace(/^\+/, "") }; };
function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [cc, setCc] = useState(splitPhone(value).cc), n = splitPhone(value).n;
  const local = (v: string) => { const d = v.replace(/[^\d+]/g, ""); if (d.startsWith("+")) return onChange(d); onChange(d ? cc + d.replace(/^0+/, "") : ""); };
  return (
    <div className="space-y-1.5"><Label htmlFor="cust-phone">Phone number *</Label>
      <div className="flex gap-2">
        <Select value={cc} onValueChange={k => { setCc(k); if (n) onChange(k + n.replace(/^0+/, "")); }}>
          <SelectTrigger className="w-32" aria-label="Country code"><SelectValue /></SelectTrigger>
          <SelectContent>{CC.map(([k, name]) => <SelectItem key={k} value={k}>{k} {name}</SelectItem>)}</SelectContent>
        </Select>
        <Input id="cust-phone" type="tel" value={n} onChange={e => local(e.target.value)} placeholder="71 123 456" className="flex-1" />
      </div>
    </div>);
}

export function CustomerDialog({ type, types, init, onDone }: { type: OType; types: OType[]; init: Cust; onDone: (r: { type: OType; cust: Cust } | null) => void }) {
  const { S, sb } = useStore();
  const [t, setT] = useState<OType>(type);   // In Store: just the customer's name and phone
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
  const src = posSources(S), del = t === "delivery";
  const go = () => { const m = t === "dinein" ? (c.phone && c.phone.replace(/\D/g, "").length < 6 ? "Enter a valid phone number" : "") : custMissing(t, c, src.length > 0); if (m) return setErr(m); onDone({ type: t, cust: { ...c, phone: normPhone(c.phone) || c.phone } }); };
  const addrVal = newAddr ? "_new" : String(saved.findIndex(a => addrJoin(addrParts(a)) === addrJoin(c.addr)));
  return (
    <Sheet title="Customer Details" width={del ? 1000 : 540} onClose={() => onDone(null)} footer={<>
      <span className="flex-1 text-sm text-red-600 dark:text-red-500">{err}</span>
      <Button variant="secondary" className="h-11 min-w-28" onClick={() => onDone(null)}>Cancel</Button><Button className="h-11 min-w-36" onClick={go}>Continue</Button></>}>
      <div className={del ? "grid grid-cols-2 gap-6" : ""}>
        <div className="space-y-4">
          {t !== "dinein" && <Tabs value={t} onValueChange={k => setT(k as OType)}><TabsList variant="solid" className="w-full">{types.filter(k => k !== "dinein").map(k => <TabsTrigger key={k} value={k} className="flex-1">{k === "delivery" ? "Delivery" : "Pickup"}</TabsTrigger>)}</TabsList></Tabs>}
          {src.length > 0 && t !== "dinein" && <div className="space-y-1.5"><Label>Order source *</Label>
            <RadioCardGroup value={c.source || ""} onValueChange={s => set("source", s)} className="grid-cols-3">{src.map(s => <RadioCardItem key={s} value={s} className="py-2.5 text-sm font-medium">{s}</RadioCardItem>)}</RadioCardGroup></div>}
          <PhoneField value={c.phone} onChange={v => set("phone", v)} />
          <Field label="Customer name *" value={c.name} onChange={v => set("name", v)} />
          {who ? <Callout variant={who.black ? "error" : who.isNew ? "neutral" : "success"} title={who.isNew ? "New customer" : c.name || who.name}>
            {who.isNew ? "Enter their name" + (del ? " and address" : "") : (who.black ? "Blacklisted customer" : "Returning customer") + (who.notes ? " · " + who.notes : "")}</Callout> : null}
        </div>
        {del ? <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50">Delivery address</h3>
          <RadioCardGroup value={addrVal} onValueChange={v => { if (v === "_new") { setNewAddr(true); set("addr", {}); } else { setNewAddr(false); set("addr", addrParts(saved[+v])); } }}>
            {saved.map((a, i) => { const p = addrParts(a); return <RadioCardItem key={i} value={String(i)}><span className="block font-semibold text-gray-900 dark:text-gray-50">{p.label || "Address " + (i + 1)}</span>
              <span className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{addrJoin({ ...p, label: "" } as Addr)}</span></RadioCardItem>; })}
            <RadioCardItem value="_new"><span className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-500"><Icon name="plus" className="size-4" />New address</span></RadioCardItem>
          </RadioCardGroup>
          {newAddr || !saved.length ? <div className="grid grid-cols-2 gap-3">
            <Field label="Address type" value={c.addr.label || ""} onChange={v => setA("label", v)} />
            <Field label="Area / street *" value={c.addr.street || ""} onChange={v => setA("street", v)} />
            <Field label="Building name / no. *" value={c.addr.building || ""} onChange={v => setA("building", v)} />
            <Field label="Floor / Apartment *" value={c.addr.floor || ""} onChange={v => setA("floor", v)} />
            <Field label="Door / name on intercom" value={c.addr.door || ""} onChange={v => setA("door", v)} />
            <Field label="Instructions" value={c.addr.extra || ""} onChange={v => setA("extra", v)} />
          </div> : null}
        </div> : null}
      </div>
    </Sheet>);
}
