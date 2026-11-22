// Marketing → Promotions: list (All / Active / Inactive / Deleted, search) and the two-step form (Offer, then Schedule) with a live preview,
// same types, rules and "promotions" settings document as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { BoxIcon, DollarIcon, PlusIcon, SearchIcon, TagIcon, TruckDeliveryIcon, StarIcon } from "@/icons";
import { newId, put, type Row } from "@/lib/db";
import { fmtDate, money, sym } from "@/lib/util";
import { useState } from "react";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { DateInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, SEL, TD, TH, TR } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

const TYPES: [string, string, React.ReactNode][] = [["freedel", "Free Delivery", <TruckDeliveryIcon className="size-6" />], ["disc", "Discount", <DollarIcon className="size-6" />], ["bxgy", "Buy X Get Y", <StarIcon className="size-6" />],
  ["freeitem", "Free Item", <StarIcon className="size-6" />], ["itemdisc", "Items Discount", <TagIcon className="size-6" />], ["bundle", "Meal Bundle", <BoxIcon className="size-6" />]];
const OT: [string, string][] = [["dinein", "Dine-in"], ["pickup", "Pick Up"], ["delivery", "Delivery"]];
const DAYS: [string, string][] = [["1", "Mon"], ["2", "Tue"], ["3", "Wed"], ["4", "Thu"], ["5", "Fri"], ["6", "Sat"], ["0", "Sun"]];
const typeLbl = (k: string) => (TYPES.find(x => x[0] === k) || TYPES[1])[1];
const join = (a: string[], n = 3) => a.length > n ? a.slice(0, n).join(", ") + " +" + (a.length - n) : a.join(", ");
const off = (p: any) => p.valueType === "fixed" ? money(+p.value || 0) + " off" : (+p.value || 0) + "% off";
function summary(p: any, prods: Row[]) {
  const names = (ids: string[]) => (ids || []).map(id => prods.find(x => x.id === id)?.name).filter(Boolean) as string[];
  const min = +p.minOrder ? " on orders over " + money(+p.minOrder) : "";
  if (p.type === "freedel") return "Free delivery" + min;
  if (p.type === "disc") return off(p) + " the order" + min;
  if (p.type === "bxgy") { const g = +p.getPct >= 100 || p.getPct == null ? "free" : "at " + (+p.getPct || 0) + "% off"; return `Buy ${+p.buyQty || 1} ${join(names(p.buyIds), 2) || "item"}, get ${+p.getQty || 1} ${join(names(p.getIds), 2) || "item"} ${g}`; }
  if (p.type === "freeitem") return `Free ${(+p.freeQty || 1) > 1 ? (+p.freeQty) + " × " : ""}${join(names(p.freeIds), 2) || "item"}` + min;
  if (p.type === "itemdisc") { const n = (p.itemIds || []).length, c = (p.categoryIds || []).length; return off(p) + " " + (n ? join(names(p.itemIds), 2) : c ? c + (c === 1 ? " category" : " categories") : "selected items"); }
  if (p.type === "bundle") return (join(names(p.bundleIds), 3).replace(/, /g, " + ") || "Bundle") + " for " + money(+p.bundlePrice || 0);
  return "";
}
function status(p: any): [string, string] {
  const t = new Date().toLocaleDateString("en-CA");
  if (p.deleted) return ["Deleted", "error"]; if (p.active === false) return ["Inactive", "light"];
  if (p.start && p.start > t) return ["Scheduled", "warning"]; if (p.end && p.end < t) return ["Expired", "error"]; return ["Active", "success"];
}
const period = (p: any) => p.start || p.end ? (p.start ? fmtDate(p.start + "T00:00") : "Now") + " – " + (p.end ? fmtDate(p.end + "T00:00") : "No end") : "Always";

export default function PromotionsPage() {
  const s = useS(["settings", "products", "categories", "branches"]);
  const [tab, setTab] = useState("all"), [q, setQ] = useState(""), [form, setForm] = useState<any>(undefined);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const list: any[] = (s.settings.find(x => x.id === "promotions") as any)?.list || [];
  const save = async (l: any[]) => { try { await put("settings", "promotions", { list: l }); return true; } catch { toast("Couldn't save. Only the owner or an admin can change promotions.", "error"); return false; } };
  const qq = q.trim().toLowerCase();
  const rows = list.filter(p => (tab === "deleted" ? !!p.deleted : !p.deleted && (tab === "all" || (tab === "active") === (p.active !== false))) && (!qq || (p.name + " " + (p.nameAr || "")).toLowerCase().includes(qq))).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return (
    <>
      <PageBreadcrumb pageTitle="Promotions" />
      <div className={BOX}>
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <SegTabs value={tab} onChange={setTab} items={[["all", "All"], ["active", "Active"], ["inactive", "Inactive"], ["deleted", "Deleted"]]} />
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <InputGroup className="h-11 flex-1 sm:w-64 sm:flex-initial"><InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon>
              <InputGroupInput placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} /></InputGroup>
            <Button onClick={() => setForm(null)}><PlusIcon className="size-5" />Create Promotion</Button>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {!rows.length ? <EmptyState text={tab === "deleted" ? "No deleted promotions" : q ? "No promotions match." : "No promotions yet"} />
            : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>
              {["Name", "Type", "Offer", "Period", "Status"].map(h => <th key={h} className={TH}>{h}</th>)}{tab === "deleted" && <th className={TH} />}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">{rows.map(p => { const st = status(p); return (
                <tr key={p.id} className={p.deleted ? "" : TR} onClick={() => !p.deleted && setForm(p)}>
                  <td className={TD}><span className="font-medium text-gray-800 dark:text-white/90">{p.name}</span>{p.nameAr && <span className="ms-2 text-gray-500" dir="auto">{p.nameAr}</span>}</td>
                  <td className={TD}>{typeLbl(p.type)}</td><td className={TD}>{summary(p, s.products)}</td><td className={TD}>{period(p)}</td>
                  <td className={TD}><Badge variant="light" color={st[1] as any}>{st[0]}</Badge></td>
                  {tab === "deleted" && <td className={TD + " text-end"}><Button size="xs" variant="outline" onClick={async () => { if (await askYes("Restore this promotion?", "Restore") && await save(list.map(x => x.id === p.id ? { ...x, deleted: false } : x))) toast("Promotion restored"); }}>Restore</Button></td>}</tr>); })}</tbody></table>}
        </div>
      </div>
      {form !== undefined && <PromoForm p0={form} s={s} list={list} save={save} onClose={() => setForm(undefined)} />}
    </>
  );
}

function CheckList({ opts, value, onChange, empty }: { opts: [string, string][]; value: string[]; onChange: (v: string[]) => void; empty: string }) {
  const [q, setQ] = useState(""); const vis = opts.filter(o => !q || o[1].toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-700">
      {opts.length > 8 && <input className="h-10 w-full border-b border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:border-gray-800 dark:text-white/90" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />}
      <div className="max-h-44 overflow-y-auto p-1.5">{!opts.length ? <p className="p-2 text-sm text-gray-500">{empty}</p> : vis.map(([id, t]) => (
        <label key={id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/3">
          <Checkbox checked={value.includes(id)} onCheckedChange={c => onChange(c ? [...value, id] : value.filter(x => x !== id))} />{t}</label>))}</div>
      {value.length > 0 && <p className="border-t border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-800">{value.length} selected</p>}
    </div>);
}
const Chips = ({ opts, value, onChange }: { opts: [string, string][]; value: string[]; onChange: (v: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">{opts.map(([k, t]) => { const on = value.includes(k); return (
    <button key={k} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter(x => x !== k) : [...value, k])}
      className={"h-9 rounded-lg border px-3.5 text-sm font-medium transition-colors " + (on ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/3")}>{t}</button>); })}</div>);

function PromoForm({ p0, s, list, save, onClose }: { p0: any; s: S; list: any[]; save: (l: any[]) => Promise<boolean>; onClose: () => void }) {
  const ed = !!p0;
  const [P, setP] = useState<any>(() => JSON.parse(JSON.stringify(p0 || { type: "disc", valueType: "pct", orderTypes: OT.map(x => x[0]), days: [], branchIds: [], active: true, buyQty: 1, getQty: 1, getPct: 100, freeQty: 1 })));
  const [step, setStep] = useState(1), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setP((o: any) => ({ ...o, [k]: v }));
  const prods: [string, string][] = s.products.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(p => [p.id, p.name]);
  const cats: [string, string][] = s.categories.filter(c => live(c) && !c.channel).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map(c => [c.id, c.name]);
  const stores: [string, string][] = s.branches.filter(b => live(b) && b.active !== false).map(b => [b.id, b.name]);
  const num = (k: string, l: string, req?: boolean) => <F l={l} req={req}><Input className="h-11" type="number" min="0" step="any" value={P[k] ?? ""} onChange={e => set(k, e.target.value === "" ? null : +e.target.value)} /></F>;
  const pick = (k: string, l: string, opts: [string, string][], req?: boolean) => <F l={l} req={req} full><CheckList opts={opts} value={P[k] || []} onChange={v => set(k, v)} empty="No items yet" /></F>;
  const vt = <><F l="Discount Type" req><select className={SEL} value={P.valueType === "fixed" ? "fixed" : "pct"} onChange={e => set("valueType", e.target.value)}><option value="pct">Percentage</option><option value="fixed">Amount</option></select></F>
    {num("value", `Discount (${P.valueType === "fixed" ? sym() : "%"})`, true)}</>;
  const minO = num("minOrder", `Minimum Order (${sym()})`);
  const fields = P.type === "freedel" ? minO
    : P.type === "disc" ? <>{vt}{P.valueType !== "fixed" && num("maxDiscount", `Maximum Discount (${sym()})`)}{minO}</>
    : P.type === "bxgy" ? <>{pick("buyIds", "Buy Items", prods, true)}{num("buyQty", "Buy Quantity", true)}{num("getQty", "Get Quantity", true)}{pick("getIds", "Get Items", prods, true)}{num("getPct", "Discount On Get Items (%)", true)}</>
    : P.type === "freeitem" ? <>{pick("freeIds", "Free Items", prods, true)}{num("freeQty", "Quantity", true)}{minO}</>
    : P.type === "itemdisc" ? <>{pick("itemIds", "Items", prods)}{pick("categoryIds", "Categories", cats)}{vt}</>
    : <>{pick("bundleIds", "Bundle Items", prods, true)}{num("bundlePrice", `Bundle Price (${sym()})`, true)}</>;
  const check1 = () => {
    if (!String(P.name || "").trim()) return "Enter a name.";
    if (list.some(o => !o.deleted && o.id !== P.id && String(o.name).toLowerCase() === String(P.name).trim().toLowerCase())) return "A promotion with this name already exists.";
    if (["disc", "itemdisc"].includes(P.type)) { if (!(+P.value > 0)) return "Enter the discount."; if (P.valueType !== "fixed" && +P.value > 100) return "A percentage can't be more than 100."; }
    if (P.type === "bxgy") { if (!(P.buyIds || []).length) return "Choose the items to buy."; if (!(P.getIds || []).length) return "Choose the items to get."; if (!(+P.buyQty >= 1) || !(+P.getQty >= 1)) return "Quantities must be at least 1."; if (!(+P.getPct > 0) || +P.getPct > 100) return "The discount must be between 1 and 100."; }
    if (P.type === "freeitem") { if (!(P.freeIds || []).length) return "Choose the free items."; if (!(+P.freeQty >= 1)) return "The quantity must be at least 1."; }
    if (P.type === "itemdisc" && !(P.itemIds || []).length && !(P.categoryIds || []).length) return "Choose items or categories.";
    if (P.type === "bundle") { if ((P.bundleIds || []).length < 2) return "Choose at least two items."; if (!(+P.bundlePrice > 0)) return "Enter the bundle price."; }
    return "";
  };
  const check2 = () => !(P.orderTypes || []).length ? "Choose at least one order type." : P.start && P.end && P.end < P.start ? "The end date is before the start date." : P.type === "freedel" && !P.orderTypes.includes("delivery") ? "Free delivery needs the Delivery order type." : "";
  async function next() {
    if (step === 1) { const e = check1(); setErr(e); if (!e) setStep(2); return; }
    const e = check1() || check2(); if (e) return setErr(e);
    const data = { ...P, name: String(P.name).trim(), nameAr: String(P.nameAr || "").trim() };
    setBusy(true); const ok = await save(ed ? list.map(o => o.id === P.id ? { ...o, ...data } : o) : [...list, { ...data, id: newId("prm"), createdAt: new Date().toISOString() }]); setBusy(false);
    if (ok) { toast(ed ? "Promotion saved" : "Promotion created"); onClose(); }
  }
  const st = status({ ...P, deleted: false }), dy = (P.days || []).map((k: string) => DAYS.find(x => x[0] === k)?.[1]).filter(Boolean), br = (P.branchIds || []).map((id: string) => s.branches.find(b => b.id === id)?.name).filter(Boolean);
  const KV = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="flex justify-between gap-3 py-2 text-sm"><span className="text-gray-500 dark:text-gray-400">{k}</span><b className="text-end font-medium text-gray-800 dark:text-white/90">{children}</b></div>;
  const stepBtn = (n: number, t: string) => <button type="button" onClick={() => n === 1 ? setStep(1) : next()} className={"flex items-center gap-2 text-sm font-medium " + (step === n ? "text-brand-500" : "text-gray-500 dark:text-gray-400")}>
    <i className={"flex size-6 items-center justify-center rounded-full text-xs not-italic " + (step === n ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-white/5")}>{n}</i>{t}</button>;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] w-full overflow-y-auto p-6 sm:max-w-4xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">{ed ? "Edit" : "Create"} Promotion</DialogTitle></DialogHeader>
        <nav className="mt-4 flex items-center gap-3" aria-label="Steps">{stepBtn(1, "Offer")}<span className="text-gray-300">›</span>{stepBtn(2, "Schedule")}</nav>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="grid grid-cols-1 content-start gap-x-6 gap-y-5 sm:grid-cols-2">
            {step === 1 ? <>
              <F l="Name" req><Input className="h-11" autoFocus value={P.name || ""} onChange={e => set("name", e.target.value)} /></F>
              <F l="Name Localized"><Input className="h-11" dir="auto" value={P.nameAr || ""} onChange={e => set("nameAr", e.target.value)} /></F>
              <F l="Type" req full><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{TYPES.map(([k, t, ic]) => (
                <button key={k} type="button" onClick={() => set("type", k)} aria-pressed={P.type === k}
                  className={"flex flex-col items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors " + (P.type === k ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:text-gray-400")}>{ic}{t}</button>))}</div></F>
              {fields}
            </> : <>
              <F l="Start Date"><DateInput value={P.start || ""} onChange={v => set("start", v)} /></F><F l="End Date"><DateInput value={P.end || ""} onChange={v => set("end", v)} /></F>
              <F l="From Time"><Input className="h-11" type="time" value={P.from || ""} onChange={e => set("from", e.target.value)} /></F><F l="To Time"><Input className="h-11" type="time" value={P.to || ""} onChange={e => set("to", e.target.value)} /></F>
              <F l="Days" full help="None chosen: every day."><Chips opts={DAYS} value={P.days || []} onChange={v => set("days", v)} /></F>
              <F l="Applies On Order Types" req full><Chips opts={OT} value={P.orderTypes || []} onChange={v => set("orderTypes", v)} /></F>
              <F l="Applies On Stores" full help="None chosen: all stores."><CheckList opts={stores} value={P.branchIds || []} onChange={v => set("branchIds", v)} empty="No stores yet" /></F>
              <label className="col-span-full flex cursor-pointer items-center gap-3"><Switch checked={P.active !== false} onCheckedChange={v => set("active", !!v)} /><span className="text-sm font-medium text-gray-800 dark:text-white/90">Active</span></label>
            </>}
            {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
          </div>
          <aside className="h-fit rounded-2xl lg:sticky lg:top-0 border border-gray-200 p-4 dark:border-gray-800">
            <p className="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">Preview</p>
            <div className="mb-3 rounded-xl bg-brand-500 p-4 text-white"><span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{typeLbl(P.type)}</span>
              <b className="mt-2 block text-base">{P.name || "Promotion name"}</b><p className="mt-1 text-sm text-white/80">{summary(P, s.products)}</p></div>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              <KV k="Status"><Badge variant="light" color={st[1] as any}>{st[0]}</Badge></KV><KV k="Period">{period(P)}</KV>
              {(P.from || P.to) && <KV k="Hours">{(P.from || "00:00") + " – " + (P.to || "23:59")}</KV>}
              <KV k="Days">{dy.length && dy.length < 7 ? dy.join(", ") : "Every day"}</KV>
              <KV k="Order Types">{(P.orderTypes || []).map((k: string) => OT.find(x => x[0] === k)?.[1]).filter(Boolean).join(", ") || "—"}</KV>
              <KV k="Stores">{br.length ? join(br, 3) : "All stores"}</KV>
            </div>
          </aside>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {ed && <Button variant="destructive" className="sm:me-auto" onClick={async () => { if (await askYes("Delete this promotion?", "Delete", true) && await save(list.map(o => o.id === P.id ? { ...o, deleted: true } : o))) { toast("Promotion deleted"); onClose(); } }}>Delete</Button>}
          {step === 2 ? <Button variant="outline" onClick={() => setStep(1)}>Back</Button> : <Button variant="outline" onClick={onClose}>Cancel</Button>}
          <Button disabled={busy} onClick={next}>{step === 1 ? "Continue" : busy ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>);
}
