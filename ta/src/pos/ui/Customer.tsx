"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// Pickup and delivery: the customer (looked up by phone), the order source, and the delivery address (saved ones or a new one). From Tremor.
import { Button } from "@/components/tremor/Button";
import { Input } from "@/components/tremor/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tremor/Popover";
import { cx } from "@/components/tremor/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/tremor/Select";
import { useEffect, useId, useRef, useState } from "react";
import { addrJoin, addrParts, custMissing, money, normPhone, phoneVariants, posSources, type Addr, type Cust, type OType } from "../lib/pos";
import { useStore } from "../lib/store";
import { Icon } from "./Icon";
import { notify } from "./notify";
import { Sheet } from "./Pickers";
import { Main, Panel, Seg } from "./Touch";

const Field = ({ label, value, onChange, tel }: { label: string; value: string; onChange: (v: string) => void; tel?: boolean }) => { const id = useId();
  // the label is the placeholder inside the field
  return <Input id={id} aria-label={label} placeholder={label} value={value} onChange={e => onChange(e.target.value)} type={tel ? "tel" : "text"} />; };

const fmtD = (t: string) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`; };
// country codes for the phone (Lebanon first); the phone is saved with its code, e.g. +96171123456
const CC: [string, string][] = [["+961", "Lebanon"], ["+971", "UAE"], ["+966", "Saudi Arabia"], ["+965", "Kuwait"], ["+974", "Qatar"], ["+973", "Bahrain"], ["+968", "Oman"], ["+962", "Jordan"], ["+20", "Egypt"], ["+963", "Syria"], ["+964", "Iraq"], ["+90", "Türkiye"], ["+33", "France"], ["+44", "UK"], ["+49", "Germany"], ["+1", "US / Canada"], ["+61", "Australia"]];
const splitPhone = (p: string) => { const v = String(p || "").replace(/\s/g, ""); const k = CC.map(c => c[0]).sort((a, b) => b.length - a.length).find(c => v.startsWith(c)); return k ? { cc: k, n: v.slice(k.length) } : { cc: "+961", n: v.replace(/^\+/, "") }; };
function PhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [cc, setCc] = useState(splitPhone(value).cc), n = splitPhone(value).n;
  const local = (v: string) => { const d = v.replace(/[^\d+]/g, ""); if (d.startsWith("+")) return onChange(d); onChange(d ? cc + d.replace(/^0+/, "") : ""); };
  return (
    <div>
      <div className="flex gap-2">
        <Select value={cc} onValueChange={k => { setCc(k); if (n) onChange(k + n.replace(/^0+/, "")); }}>
          <SelectTrigger className="w-48 shrink-0 !text-[17px]" aria-label="Country code"><SelectValue /></SelectTrigger>
          <SelectContent>{CC.map(([k, name]) => <SelectItem key={k} value={k}>{k} {name}</SelectItem>)}</SelectContent>
        </Select>
        <Input id="cust-phone" type="tel" value={n} onChange={e => local(e.target.value)} placeholder="Phone number *" aria-label="Phone number" className="flex-1" />
      </div>
    </div>);
}

export function CustomerDialog({ type, types, init, onDone, area, back }: { type: OType; types: OType[]; init: Cust; onDone: (r: { type: OType; cust: Cust } | null) => void; area?: { cartW: string }; back?: string }) {
  const { S, sb } = useStore();
  const [t, setT] = useState<OType>(type);   // In Store: just the customer's name and phone
  const [c, setC] = useState<Cust>(init), [saved, setSaved] = useState<string[]>([]), [who, setWho] = useState<null | { name: string; notes: string; black: boolean; isNew?: boolean }>(null), [err, setErr] = useState("");
  const [newAddr, setNewAddr] = useState(false), [custId, setCustId] = useState(""), [raw, setRaw] = useState<any[]>([]), [editIdx, setEditIdx] = useState(-1), [sureDel, setSureDel] = useState(-1), [addrOpen, setAddrOpen] = useState(false), [ins, setIns] = useState<null | { n: number; spent: number; last: string; fav: string[]; voids: number }>(null);
  const set = (k: keyof Cust, v: any) => { setC(o => ({ ...o, [k]: v })); setErr(""); };
  const setA = (k: keyof Addr, v: string) => setC(o => ({ ...o, addr: { ...o.addr, [k]: v } }));
  // a returning customer: their name, notes and saved addresses (the first one is picked if none is yet)
  const filled = useRef("");   // the name a found phone number filled in: it goes when the number changes
  useEffect(() => { if (filled.current && c.name === filled.current) { filled.current = ""; setC(o => ({ ...o, name: "" })); } }, [c.phone]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const ph = normPhone(c.phone); if (ph.length < 8 || !sb) { setWho(null); setSaved([]); setIns(null); return; }
    let off = false; const tm = setTimeout(async () => {
      const { data } = await sb.from("customers").select("id,name,phone,addresses,blacklisted,notes,tags").in("phone", phoneVariants(ph)).limit(1); if (off) return;
      setEditIdx(-1); setIns(null);
      const d = data?.[0]; if (!d) { setWho({ name: "", notes: "", black: false, isNew: true }); setSaved([]); setNewAddr(true); return; }
      const all = (d.addresses || []).filter((a: any) => a?.address); setCustId(d.id); setRaw(all);
      const sv = all.map((a: any) => a.address) as string[];
      setWho({ name: d.name || "", notes: d.notes || "", black: !!d.blacklisted }); setSaved(sv); setNewAddr(true); setEditIdx(sv.length && !addrJoin(c.addr) ? 0 : -1);   // the first saved address shows in the fields
      // insights: their orders (done ones count), what they spend and order most
      const { data: os } = await sb.from("orders").select("id,total,status,created_at,items,type").in("phone", phoneVariants(ph)).order("created_at", { ascending: false }).limit(200); if (off) return;
      const done = (os || []).filter((o: any) => o.status === "closed"), cnt: Record<string, number> = {};
      done.forEach((o: any) => (o.items || []).forEach((i: any) => { cnt[i.name] = (cnt[i.name] || 0) + (+i.qty || 1); }));
      setIns({ n: done.length, spent: done.reduce((a: number, o: any) => a + (+o.total || 0), 0), last: (os || [])[0]?.created_at || "", fav: Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k), voids: (os || []).filter((o: any) => ["void", "declined"].includes(o.status)).length });
      filled.current = d.name || ""; setC(o => ({ ...o, name: d.name || o.name,   // a saved customer: their saved name replaces what was typed
        addr: addrJoin(o.addr) || !sv.length ? o.addr : addrParts(sv[0]) }));
    }, 400); return () => { off = true; clearTimeout(tm); }; }, [c.phone, sb]);
  // the customer's saved addresses changed (edit / delete): saved on the customer at once
  const saveAddrs = async (list: any[], msg: string) => { if (!sb || !custId) return; const { error } = await sb.from("customers").update({ addresses: list }).eq("id", custId);
    if (error) return notify("Couldn't save the address: " + error.message); setRaw(list); setSaved(list.map(a => a.address)); notify(msg); };
  const src = posSources(S), del = t === "delivery";
  const go = () => { const m = t === "dinein" ? (c.phone && c.phone.replace(/\D/g, "").length < 6 ? "Enter a valid phone number" : "") : custMissing(t, c, src.length > 0); if (m) return setErr(m);
    if (editIdx >= 0 && addrJoin(c.addr) !== saved[editIdx]) saveAddrs(raw.map((r, j) => (j === editIdx ? { ...r, address: addrJoin(c.addr) } : r)), "Address saved");
    onDone({ type: t, cust: { ...c, phone: normPhone(c.phone) || c.phone } }); };
  // Save stays greyed until the required fields are filled
  const need = t === "dinein" ? !(c.phone.replace(/\D/g, "").length >= 6 && c.name.trim()) : !!custMissing(t, c, src.length > 0);
  const addrVal = newAddr ? "_new" : String(saved.findIndex(a => addrJoin(addrParts(a)) === addrJoin(c.addr)));
  const body = (
    <>
      {err && area ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{err}</p> : null}
      <div className={del || area ? "grid grid-cols-2 gap-6" : ""}>
        <div className="space-y-3">
          {src.length > 0 && t !== "dinein" && <div>
            <Select value={c.source || ""} onValueChange={s => set("source", s)}><SelectTrigger><SelectValue placeholder="Order source *" /></SelectTrigger>
              <SelectContent>{src.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>}
          <PhoneField value={c.phone} onChange={v => set("phone", v)} />
          <Field label="Customer name *" value={c.name} onChange={v => set("name", v)} />
          {del ? <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Delivery address</h3>
          {/* the customer's saved addresses in a dropdown: tap one to use it; Edit changes it, the bin deletes it (a second tap confirms); or a new address */}
          {saved.length ? <Popover open={addrOpen} onOpenChange={setAddrOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-2 text-left dark:border-gray-800 dark:bg-gray-950">
                {newAddr && editIdx < 0 ? <span className="flex flex-1 items-center gap-2 text-[17px] font-medium text-blue-600 dark:text-blue-500"><Icon name="plus" className="size-5" />New address</span>
                  : (() => { const i = editIdx >= 0 ? editIdx : +addrVal, p = addrParts(saved[i] || ""); return <span className="min-w-0 flex-1"><span className="block text-[16px] font-semibold text-gray-900 dark:text-gray-50">{p.label || "Address " + (i + 1)}</span><span className="block truncate text-[14px] text-gray-500">{addrJoin({ ...p, label: "" } as Addr)}</span></span>; })()}
                <Icon name="down" className="size-5 shrink-0 text-gray-500" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={6} className="w-[var(--radix-popover-trigger-width)] space-y-1.5 p-2">
              {saved.map((a, i) => { const p = addrParts(a), on = editIdx === i || (!newAddr && addrVal === String(i));
                return <div key={i} className={cx("flex items-center gap-1.5 rounded-xl p-1", on ? "bg-blue-50 dark:bg-blue-500/10" : "")}>
                  <button type="button" className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left" onClick={() => { setNewAddr(true); setEditIdx(i); set("addr", addrParts(saved[i])); setAddrOpen(false); }}>
                    <span className="block text-[16px] font-semibold text-gray-900 dark:text-gray-50">{p.label || "Address " + (i + 1)}</span>
                    <span className="block truncate text-[14px] text-gray-500">{addrJoin({ ...p, label: "" } as Addr)}</span></button>
                  <Button variant="secondary" aria-label={sureDel === i ? "Tap again to delete this address" : "Delete address"} className={cx("h-12 rounded-xl text-red-600 dark:text-red-500", sureDel === i ? "px-4 text-[16px] font-semibold" : "w-12 p-0")}
                    onClick={() => { if (sureDel === i) { setSureDel(-1); saveAddrs(raw.filter((_, j) => j !== i), "Address deleted"); } else { setSureDel(i); setTimeout(() => setSureDel(-1), 3000); } }}>{sureDel === i ? "Delete?" : <Icon name="trash" className="size-5" />}</Button>
                </div>; })}
              <button type="button" onClick={() => { setNewAddr(true); setEditIdx(-1); set("addr", {}); setAddrOpen(false); }} className="flex h-12 w-full items-center gap-2 rounded-xl px-3 text-[17px] font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-500"><Icon name="plus" className="size-5" />New address</button>
            </PopoverContent>
          </Popover> : null}
          {newAddr || !saved.length ? <div className="grid grid-cols-2 gap-2.5">
            <Field label="Address type" value={c.addr.label || ""} onChange={v => setA("label", v)} />
            <Field label="Area / street *" value={c.addr.street || ""} onChange={v => setA("street", v)} />
            <Field label="Building name / no. *" value={c.addr.building || ""} onChange={v => setA("building", v)} />
            <Field label="Floor / Apartment *" value={c.addr.floor || ""} onChange={v => setA("floor", v)} />
            <Field label="Door / name on intercom" value={c.addr.door || ""} onChange={v => setA("door", v)} />
            <Field label="Instructions" value={c.addr.extra || ""} onChange={v => setA("extra", v)} />
          </div> : null}
        </div> : null}
        </div>
        {/* the right side: what we know about the customer, then the delivery addresses under it */}
        <div className="space-y-5">
          {t !== "dinein" && <Seg value={t} onChange={k => setT(k)} items={types.filter(k => k !== "dinein").map(k => [k, k === "delivery" ? "Delivery" : "Pickup"] as [OType, string])} />}
          {who ? <div className={cx("rounded-2xl p-4", who.black ? "bg-red-50 dark:bg-red-500/10" : who.isNew ? "bg-gray-50 dark:bg-gray-900" : "bg-blue-50 dark:bg-blue-500/10")}>
            <div className="flex items-center gap-3"><span className={cx("flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white", who.black ? "bg-red-600" : "bg-blue-600")}>{((c.name || who.name || "?").trim()[0] || "?").toUpperCase()}</span>
              <div className="min-w-0"><p className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">{who.isNew ? "New customer" : c.name || who.name || "Customer"}</p>
                <p className={cx("text-[15px]", who.black ? "font-semibold text-red-700 dark:text-red-400" : "text-gray-600 dark:text-gray-400")}>{who.isNew ? "Enter their name" + (del ? " and address" : "") : who.black ? "Blacklisted customer" : "Returning customer"}</p></div></div>
            {who.notes ? <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[15px] text-gray-800 dark:bg-gray-950/50 dark:text-gray-200">{who.notes}</p> : null}
            {ins && !who.isNew ? <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[["Orders", String(ins.n)], ["Spent", money(S, ins.spent)], ["Average", ins.n ? money(S, ins.spent / ins.n) : "—"]].map(([l, v]) => <div key={l} className="rounded-xl bg-white/70 py-2.5 dark:bg-gray-950/50"><p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-50">{v}</p><p className="text-sm text-gray-500">{l}</p></div>)}</div> : null}
            {ins && !who.isNew ? <div className="mt-3 space-y-1 text-[15px] text-gray-700 dark:text-gray-300">
              {ins.last ? <p>Last order: {fmtD(ins.last)}</p> : null}
              {ins.fav.length ? <p>Usually orders: {ins.fav.join(", ")}</p> : null}
              {ins.voids ? <p className="text-red-700 dark:text-red-400">{ins.voids} void or declined {ins.voids === 1 ? "order" : "orders"}</p> : null}</div> : null}
          </div> : null}
        </div>
      </div>
    </>);
  // on the register it opens in the menu's place like Discount (the cart stays on the left)
  return area
    ? <Panel area={area} back={back} title="Customer Details" onClose={() => onDone(null)} action={<Main disabled={need} onClick={go}>Save</Main>}>{body}</Panel>
    : <Sheet title="Customer Details" width={del ? 1000 : 540} onClose={() => onDone(null)} footer={<>
      <span className="flex-1 text-sm text-red-600 dark:text-red-500">{err}</span>
      <Button variant="secondary" className="h-11 min-w-28" onClick={() => onDone(null)}>Cancel</Button><Button className="h-11 min-w-36" onClick={go}>Continue</Button></>}>{body}</Sheet>;
}
