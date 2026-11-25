// Web Ordering → Delivery Charges: which charge each store adds when it delivers to a zone (settings "dcharges": { map: { zoneId: chargeId } }).
// Assigning also sets the zone's delivery fee to the charge, so web ordering and the POS show the same amount (same as the current portal).
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { SearchIcon } from "@/icons";
import { newId, put, type Row } from "@/lib/db";
import { money, sym } from "@/lib/util";
import { useState } from "react";
import { Link } from "react-router";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, SEL, TD, TH, TR } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

// only fixed-amount charges that apply to delivery orders alone can be a delivery charge
const dcCharges = (s: S) => s.charges.filter(c => live(c) && c.active !== false && (c.type || "fixed") === "fixed" && (c.orderTypes || []).length && c.orderTypes.every((t: string) => t === "delivery")).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

async function assign(s: S, ids: string[], chargeId: string, value?: number) {
  const c = chargeId ? { id: chargeId, value: value ?? s.charges.find(x => x.id === chargeId)?.value } : null;
  try {
    const map = { ...((s.settings.find(x => x.id === "dcharges") as any)?.map || {}) }; ids.forEach(id => { if (c) map[id] = c.id; else delete map[id]; });
    await put("settings", "dcharges", { map });
    for (const id of ids) await put("zones", id, { fee: c ? +c.value || 0 : 0 });
    return true;
  } catch { toast("Couldn't save. Only the owner or an admin can change delivery charges.", "error"); return false; }
}

export default function DeliveryChargesPage() {
  const s = useS(["zones", "branches", "charges", "settings", "brands"]);
  const [q, setQ] = useState(""), [br, setBr] = useState(""), [brand, setBrand] = useState(""), [sel, setSel] = useState<Set<string>>(new Set()), [form, setForm] = useState<string[] | null>(null);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const bName = (id?: string) => s.branches.find(b => b.id === id)?.name || "";
  const dmap: Record<string, string> = (s.settings.find(x => x.id === "dcharges") as any)?.map || {};
  const chargeOf = (z: Row) => { const id = dmap[z.id]; return id ? s.charges.find(c => c.id === id && live(c)) : null; };
  const all = s.zones.filter(z => live(z) && z.branchId && s.branches.some(b => b.id === z.branchId)).sort((a, b) => bName(a.branchId).localeCompare(bName(b.branchId)) || String(a.name).localeCompare(String(b.name)));
  const qq = q.trim().toLowerCase();
  const inB = (id: string) => !brand || s.branches.find(b => b.id === id)?.brandId === brand;
  const list = all.filter(z => (!br || z.branchId === br) && inB(z.branchId) && (!qq || (z.name + " " + bName(z.branchId) + " " + (chargeOf(z)?.name || "")).toLowerCase().includes(qq)));
  const picked = list.filter(z => sel.has(z.id)).map(z => z.id), allOn = list.length > 0 && picked.length === list.length;
  const brs = s.branches.filter(b => all.some(z => z.branchId === b.id) && inB(b.id));
  return (
    <>
      <PageBreadcrumb pageTitle="Delivery Charges" />
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Set the charge each store adds when it delivers to a delivery zone. Call center orders get it automatically when the customer's address is in the zone and the order is made by that store; web ordering uses it as the delivery fee.</p>
      <div className={BOX}>
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row"><select aria-label="Brand" className={SEL + " sm:w-48"} value={brand} onChange={e => { setBrand(e.target.value); setBr(""); setSel(new Set()); }}><option value="">All Brands</option>{s.brands.filter(b => !b.deleted).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select aria-label="Store" className={SEL + " sm:w-56"} value={br} onChange={e => { setBr(e.target.value); setSel(new Set()); }}><option value="">All Stores</option>{brs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <InputGroup className="h-9 sm:w-64"><InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon>
            <InputGroupInput placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} /></InputGroup>
        </div>
        {picked.length > 0 && <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 bg-brand-50/50 px-5 py-3 sm:px-6 dark:border-white/5 dark:bg-brand-500/5">
          <b className="text-sm text-gray-800 dark:text-white/90">{picked.length} Selected</b>
          <Button size="sm" onClick={() => setForm(picked)}>Assign Charge</Button>
          <Button size="sm" variant="outline" onClick={async () => { if (await askYes(`Unassign the charge from ${picked.length} zone${picked.length > 1 ? "s" : ""}?`, "Unassign") && await assign(s, picked, "")) { setSel(new Set()); toast("Charge unassigned"); } }}>Unassign Charge</Button></div>}
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {!list.length ? <EmptyState text={all.length ? "Nothing matches." : "No delivery zones yet. Add delivery zones to the stores first."}>{!all.length && <Link to="/delivery-zones"><Button variant="outline">Delivery Zones</Button></Link>}</EmptyState>
            : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>
              <th className={TH + " w-12"}><Checkbox aria-label="Select all" checked={allOn} onCheckedChange={c => setSel(c ? new Set(list.map(z => z.id)) : new Set())} /></th>
              <th className={TH}>From (Store)</th><th className={TH}>To (Delivery Zone)</th><th className={TH}>Charge</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">{list.map(z => { const c = chargeOf(z); return (
                <tr key={z.id} className={TR} onClick={() => setForm([z.id])}>
                  <td className={TD} onClick={e => e.stopPropagation()}><Checkbox aria-label={"Select " + z.name} checked={sel.has(z.id)} onCheckedChange={v => { const n = new Set(sel); if (v) n.add(z.id); else n.delete(z.id); setSel(n); }} /></td>
                  <td className={TD}>{bName(z.branchId)}</td><td className={TD + " font-medium text-gray-800 dark:text-white/90"}>{z.name}</td>
                  <td className={TD}>{c ? <>{c.name} <span className="text-gray-400">{money(+c.value || 0)}</span></> : "—"}</td></tr>); })}</tbody></table>}
        </div>
      </div>
      {form && <AssignDialog s={s} ids={form} bName={bName} cur={form.length === 1 ? chargeOf(s.zones.find(z => z.id === form[0])!) : null} onClose={() => setForm(null)} onDone={() => setSel(new Set())} />}
    </>
  );
}

function AssignDialog({ s, ids, bName, cur, onClose, onDone }: { s: S; ids: string[]; bName: (id?: string) => string; cur: Row | null | undefined; onClose: () => void; onDone: () => void }) {
  const one = ids.length === 1 ? s.zones.find(z => z.id === ids[0]) : null, chs = dcCharges(s);
  const [mode, setMode] = useState("pick"), [ch, setCh] = useState(cur?.id || ""), [n, setN] = useState(""), [ar, setAr] = useState(""), [val, setVal] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function go() {
    let id = "", v: number | undefined;
    if (mode === "pick") { id = ch; if (!id) return setErr("Choose a charge."); }
    else {
      if (!n.trim()) return setErr("Enter a name."); if (val === "" || +val < 0) return setErr("Enter the value.");
      if (s.charges.some(c => live(c) && String(c.name).toLowerCase() === n.trim().toLowerCase())) return setErr("A charge with this name already exists.");
      id = newId("cha");
      try { await put("charges", id, { name: n.trim(), nameAr: ar.trim(), type: "fixed", value: +val, orderTypes: ["delivery"], auto: false, brandIds: [], branchIds: [], active: true }); v = +val; } catch { return setErr("Couldn't create the charge."); }
    }
    setBusy(true); const ok = await assign(s, ids, id, v); setBusy(false);
    if (ok) { toast(ids.length > 1 ? "Charge assigned to " + ids.length + " zones" : "Charge assigned"); onDone(); onClose(); }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-6 sm:max-w-lg sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">{one ? "Assign Delivery Charge" : `Assign Charge to ${ids.length} Zones`}</DialogTitle></DialogHeader>
        {one && <p className="mt-2 text-sm text-gray-500">{bName(one.branchId)} → {one.name}</p>}
        <SegTabs className="mt-5" value={mode} onChange={setMode} items={[["pick", "Existing Charge"], ["new", "New Charge"]]} />
        <div className="mt-5 space-y-5">
          {mode === "pick" ? <F l="Charge" req help={chs.length ? undefined : "Only fixed charges for delivery orders can be delivery charges. Create one with New Charge."}>
            <select className={SEL} value={ch} onChange={e => setCh(e.target.value)}><option value="">Choose a charge</option>{chs.map(c => <option key={c.id} value={c.id}>{c.name} · {money(+c.value || 0)}</option>)}</select></F>
            : <><F l="Name" req><Input className="h-9" autoFocus placeholder="e.g. Delivery Charge Zone 1" value={n} onChange={e => setN(e.target.value)} /></F>
              <F l="Name Localized"><Input className="h-9" dir="auto" value={ar} onChange={e => setAr(e.target.value)} /></F>
              <F l={`Value (${sym()})`} req><Input className="h-9" type="number" min="0" step="any" inputMode="decimal" value={val} onChange={e => setVal(e.target.value)} /></F></>}
          {err && <p className="text-sm text-red-500">{err}</p>}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {cur && <Button variant="outline" className="sm:me-auto" onClick={async () => { if (await assign(s, ids, "")) { toast("Charge unassigned"); onClose(); } }}>Unassign</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={go}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>);
}
