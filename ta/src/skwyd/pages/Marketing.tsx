// Marketing → Loyalty, Gift Cards and Coupons: same settings documents ("loyalty", "gift_cards", "coupons"), fields, rules and
// database calls (skwyd_gift_info, skwyd_coupon_counts) as the current portal, in TailAdmin layout.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PlusIcon, SearchIcon } from "@/icons";
import { newId, put, useCol } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDate, money, sym } from "@/lib/util";
import { useEffect, useState } from "react";
import { live } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { DateInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, L, SEL, TD, TH, TR } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

const doc = (sets: any[] | null, id: string): any => (sets || []).find(x => x.id === id) || {};
const saveDoc = async (id: string, data: any, what: string) => { try { await put("settings", id, data); return true; } catch { toast(`Couldn't save. Only the owner or an admin can change ${what}.`, "error"); return false; } };
const today = () => new Date().toLocaleDateString("en-CA");

function FormDialog({ title, onClose, onSave, onDelete, saveLbl = "Save", busy, err, children }: { title: string; onClose: () => void; onSave: () => void; onDelete?: () => void; saveLbl?: string; busy?: boolean; err?: string; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">{title}</DialogTitle></DialogHeader>
        <form className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); onSave(); }}>
          {children}
          {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
          <div className="col-span-full flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            {onDelete && <Button type="button" variant="destructive" className="sm:me-auto" onClick={onDelete}>Delete</Button>}
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : saveLbl}</Button></div>
        </form>
      </DialogContent>
    </Dialog>);
}

/* ---------------- Loyalty ---------------- */
const LY_DEF: Record<string, any> = { enabled: false, method: "points", minOrder: 1, delayMin: 60, rewardType: "pct", rewardValue: 10, maxDiscount: 0, required: 0, validityDays: 365, sms: false };

export function LoyaltyPage() {
  const sets = useCol("settings");
  const [c, setC] = useState<Record<string, any> | null>(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { if (sets && !c) { const d = doc(sets, "loyalty"), o = { ...LY_DEF }; Object.keys(LY_DEF).forEach(k => { if (d[k] !== undefined && d[k] !== null) o[k] = d[k]; }); setC(o); } }, [sets, c]);
  if (!c) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const set = (k: string, v: any) => setC(p => ({ ...p!, [k]: v })), pt = c.method === "punches", amt = c.rewardType === "amount";
  const unit = (n: number) => pt ? (n == 1 ? "punch" : "punches") : (n == 1 ? "point" : "points");
  async function save() {
    const n = (k: string) => c![k] === "" || c![k] == null ? NaN : +c![k];
    if (c!.enabled) {
      for (const [k, l] of [["minOrder", "Minimum Order Price"], ["delayMin", "Earning Delay"], ["rewardValue", "Reward Value"], ["required", pt ? "Reward Required Punches" : "Reward Required Points"], ["validityDays", "Reward Validity"]]) if (!(n(k) >= 0)) return setErr(l + " is required.");
      if (!amt && !(n("maxDiscount") >= 0)) return setErr("Maximum Discount Amount is required.");
      if (!(n("required") > 0)) return setErr("The required " + (pt ? "punches" : "points") + " must be more than 0.");
      if (!amt && n("rewardValue") > 100) return setErr("A percentage can't be more than 100.");
    }
    setErr(""); setBusy(true);
    const data = { ...doc(sets, "loyalty"), enabled: c!.enabled, method: c!.method, minOrder: +c!.minOrder || 0, delayMin: Math.round(+c!.delayMin || 0), rewardType: c!.rewardType, rewardValue: +c!.rewardValue || 0, maxDiscount: amt ? 0 : (+c!.maxDiscount || 0), required: Math.round(+c!.required || 0), validityDays: Math.round(+c!.validityDays || 0), sms: c!.sms };
    delete data.id; delete data.updatedAt; delete data.createdAt;
    if (await saveDoc("loyalty", data, "loyalty settings")) toast("Loyalty settings saved"); setBusy(false);
  }
  const num = (k: string, l: string) => <F l={l} req><Input className="h-9" type="number" min="0" step="any" value={c[k] ?? ""} onChange={e => set(k, e.target.value)} /></F>;
  const B = ({ children }: { children: React.ReactNode }) => <b className="font-semibold text-gray-900 dark:text-gray-50">({children})</b>;
  return (
    <>
      <PageBreadcrumb pageTitle="Loyalty Settings" />
      <div className="rounded-lg border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-[#090E1A]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-3"><Switch checked={!!c.enabled} onCheckedChange={v => set("enabled", !!v)} /><span className="text-base font-semibold text-gray-900 dark:text-gray-50">Enable Loyalty</span></label>
          <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save Changes"}</Button>
        </div>
        {err && <p className="mt-4 text-sm text-red-500">{err}</p>}
        {c.enabled && <>
          <div className="mt-6 space-y-2 rounded-md border border-blue-100 bg-blue-50/60 p-4 text-sm leading-6 text-gray-600 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-gray-400">
            <p>{pt ? <>When your customer spends <B>{money(+c.minOrder || 0)}</B> or more on 1 order, a punch will be added to their account after <B>{(+c.delayMin || 0) + " minutes"}</B> from closing the order. They can get at most 1 punch per day.</>
              : <>When your customer spends <B>{money(+c.minOrder || 0)}</B> or more on 1 order, they will get <B>1 point</B> for each <B>{money(1)}</B> spent. The points are added after <B>{(+c.delayMin || 0) + " minutes"}</B> from closing the order.</>}</p>
            <p>Once the customer accumulates <B>{(+c.required || 0) + " " + unit(+c.required || 0)}</B> they can receive an order discount of <B>{amt ? money(+c.rewardValue || 0) : (+c.rewardValue || 0) + " %"}</B>
              {!amt && <> up to <B>{money(+c.maxDiscount || 0)}</B></>} within <B>{(+c.validityDays || 0) + " days"}</B> from the creation date.</p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <F l="Loyalty Method" req><select className={SEL} value={c.method} onChange={e => set("method", e.target.value)}><option value="points">Points</option><option value="punches">Punches</option></select></F>
            {num("minOrder", `Minimum Order Price (${sym()})`)}{num("delayMin", "Earning Delay (Minute)")}
            <F l="Reward Type" req><select className={SEL} value={c.rewardType} onChange={e => set("rewardType", e.target.value)}><option value="pct">Discount Percentage</option><option value="amount">Discount Amount</option></select></F>
            {num("rewardValue", `Reward Value (${amt ? sym() : "%"})`)}{!amt && num("maxDiscount", `Maximum Discount Amount (${sym()})`)}
            {num("required", `Reward Required ${pt ? "Punches" : "Points"}`)}{num("validityDays", "Reward Validity (Days)")}
          </div>
          <label className="mt-6 flex cursor-pointer items-start gap-3"><Switch checked={!!c.sms} onCheckedChange={v => set("sms", !!v)} />
            <span><span className="block text-sm font-medium text-gray-900 dark:text-gray-50">Send Notifications By SMS</span><span className="text-xs text-gray-500 dark:text-gray-400">Check this to send loyalty notifications to the customer by SMS</span></span></label>
        </>}
      </div>
    </>
  );
}

/* ---------------- Gift Cards ---------------- */
export function GiftCardsPage() {
  const sets = useCol("settings"), cats = useCol("categories");
  const [tab, setTab] = useState("all"), [form, setForm] = useState<any>(undefined), [check, setCheck] = useState(false);
  if (!sets || !cats) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const list: any[] = doc(sets, "gift_cards").list || [], del = tab === "deleted";
  const save = (l: any[]) => saveDoc("gift_cards", { list: l }, "gift cards");
  const catOpts = cats.filter(c => live(c) && !c.channel).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const rows = list.filter(g => !!g.deleted === del).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return (
    <>
      <PageBreadcrumb pageTitle="Gift Cards" />
      <div className={BOX}>
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <SegTabs value={tab} onChange={setTab} items={[["all", "All"], ["deleted", "Deleted"]]} />
          <div className="flex flex-col gap-3 sm:flex-row"><Button variant="outline" onClick={() => setCheck(true)}><SearchIcon className="size-5" />Check Balance</Button>
            <Button onClick={() => setForm(null)}><PlusIcon className="size-5" />Create Gift Card</Button></div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-200 dark:border-gray-800">
          {!rows.length ? <EmptyState text={del ? "No deleted gift cards" : "Create Gift Cards which customers can buy and later use to pay for their orders. The gift card is sold as an item and the amount of selling will not be reflected in the sales reports."} />
            : <table className="min-w-full"><thead className="border-b border-gray-200 dark:border-gray-800"><tr>
              <th className={TH}>Name</th><th className={TH}>SKU</th><th className={TH}>Category</th><th className={TH}>Pricing Method</th><th className={TH + " text-end"}>Price</th>{del && <th className={TH} />}</tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">{rows.map(g => (
                <tr key={g.id} className={del ? "" : TR} onClick={() => !del && setForm(g)}>
                  <td className={TD}><span className="font-medium text-gray-900 dark:text-gray-50">{g.name}</span>{g.nameAr && <span className="ms-2 text-gray-500" dir="auto">{g.nameAr}</span>}</td>
                  <td className={TD}><span className="font-mono">{g.sku || "—"}</span></td><td className={TD}>{cats.find(c => c.id === g.categoryId)?.name || "—"}</td>
                  <td className={TD}>{g.pricing === "open" ? "Open Price" : "Fixed Price"}</td><td className={TD + " text-end"}>{g.pricing === "open" ? "—" : money(+g.price || 0)}</td>
                  {del && <td className={TD + " text-end"}><Button size="xs" variant="outline" onClick={async () => { if (await save(list.map(x => x.id === g.id ? { ...x, deleted: false } : x))) toast("Gift card restored"); }}>Restore</Button></td>}</tr>))}</tbody></table>}
        </div>
      </div>
      {form !== undefined && <GiftForm g={form} list={list} cats={catOpts} save={save} onClose={() => setForm(undefined)} />}
      {check && <GiftCheck onClose={() => setCheck(false)} />}
    </>
  );
}
function GiftForm({ g, list, cats, save, onClose }: { g: any; list: any[]; cats: any[]; save: (l: any[]) => Promise<boolean>; onClose: () => void }) {
  const nextSku = () => { let n = 0; list.forEach(x => { const m = /^GC-?(\d+)$/i.exec(x.sku || ""); if (m) n = Math.max(n, +m[1]); }); return "GC-" + String(n + 1).padStart(4, "0"); };
  const [v, setV] = useState({ name: g?.name || "", nameAr: g?.nameAr || "", categoryId: g?.categoryId || "", sku: g?.sku || nextSku(), pricing: g?.pricing === "open" ? "open" : "fixed", price: g?.price == null ? "" : String(g.price) });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), set = (k: string, x: string) => setV(p => ({ ...p, [k]: x }));
  async function go() {
    const n = v.name.trim(), sku = v.sku.trim();
    if (!n) return setErr("Name is required."); if (!v.categoryId) return setErr("Category is required."); if (!sku) return setErr("SKU is required.");
    if (v.pricing === "fixed" && (v.price === "" || +v.price <= 0)) return setErr("Price is required.");
    if (list.some(o => !o.deleted && o.id !== g?.id && String(o.sku).toLowerCase() === sku.toLowerCase())) return setErr("That SKU is already used.");
    const data = { name: n, nameAr: v.nameAr.trim(), categoryId: v.categoryId, sku, pricing: v.pricing, price: v.pricing === "fixed" ? +v.price : null };
    setBusy(true);
    const ok = await save(g ? list.map(o => o.id === g.id ? { ...o, ...data } : o) : [...list, { id: newId("gcd"), ...data, active: true, createdAt: new Date().toISOString() }]);
    setBusy(false); if (ok) { toast(g ? "Gift card saved" : "Gift card created"); onClose(); }
  }
  return (
    <FormDialog title={(g ? "Edit" : "Create") + " Gift Card"} onClose={onClose} onSave={go} busy={busy} err={err}
      onDelete={g ? async () => { if (await askYes("Delete this gift card?", "Delete", true) && await save(list.map(o => o.id === g.id ? { ...o, deleted: true } : o))) { toast("Gift card deleted"); onClose(); } } : undefined}>
      <F l="Name" req><Input className="h-9" autoFocus value={v.name} onChange={e => set("name", e.target.value)} /></F>
      <F l="Name Localized"><Input className="h-9" dir="auto" value={v.nameAr} onChange={e => set("nameAr", e.target.value)} /></F>
      <F l="Category" req><select className={SEL} value={v.categoryId} onChange={e => set("categoryId", e.target.value)}><option value="">Choose…</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
      <F l="SKU" req><div className="flex gap-3"><Input className="h-9 flex-1" value={v.sku} onChange={e => set("sku", e.target.value)} /><Button type="button" variant="outline" className="h-9" onClick={() => set("sku", nextSku())}>Generate</Button></div></F>
      <F l="Pricing Method" req><select className={SEL} value={v.pricing} onChange={e => set("pricing", e.target.value)}><option value="fixed">Fixed Price</option><option value="open">Open Price</option></select></F>
      {v.pricing === "fixed" && <F l={`Price (${sym()})`} req><Input className="h-9" type="number" min="0" step="any" value={v.price} onChange={e => set("price", e.target.value)} /></F>}
    </FormDialog>);
}
function GiftCheck({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState(""), [res, setRes] = useState<any>(null), [busy, setBusy] = useState(false);
  async function go() {
    if (!code.trim()) return toast("Enter the gift card code.", "error"); setBusy(true);
    try { const r = await sb.rpc("skwyd_gift_info", { p_code: code.trim() }); if (r.error) throw r.error; setRes(r.data || {}); } catch { toast("Couldn't check the gift card. Check the connection.", "error"); }
    setBusy(false);
  }
  return (
    <FormDialog title="Check Balance" onClose={onClose} onSave={go} saveLbl="Check" busy={busy}>
      <F l="Gift Card Code" req full><Input className="h-9" autoFocus autoComplete="off" value={code} onChange={e => setCode(e.target.value)} /></F>
      {res && (res.found
        ? <div className="col-span-full grid grid-cols-2 gap-4 rounded-md bg-gray-50 p-4 sm:grid-cols-3 dark:bg-[#090E1A]">
          <L l="Code"><span className="font-mono">{res.code}</span></L><L l="Gift Card">{res.name || "—"}</L><L l="Balance"><b>{money(+res.balance || 0)}</b></L>
          <L l="Initial Amount">{money(+res.initial || 0)}</L><L l="Sold On">{fmtDate(res.createdAt)}</L></div>
        : <p className="col-span-full text-sm text-gray-500">No gift card with this code.</p>)}
    </FormDialog>);
}

/* ---------------- Coupons ---------------- */
const cpCode = () => { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 8; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
const dsAmt = (d: any) => d.open ? (d.type === "fixed" ? "Open amount" : "Open %") : d.type === "fixed" ? money(+d.amount || 0) : (+d.amount || 0) + "%";

export function CouponsPage() {
  const sets = useCol("settings");
  const [tab, setTab] = useState("all"), [form, setForm] = useState<{ c: any; bulk: boolean } | null>(null), [counts, setCounts] = useState<Record<string, number> | null>(null);
  useEffect(() => { sb.rpc("skwyd_coupon_counts").then(r => { if (!r.error) setCounts((r.data as any) || {}); }); }, []);
  if (!sets) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const list: any[] = doc(sets, "coupons").list || [], discs: any[] = doc(sets, "discounts").list || [], del = tab === "deleted";
  const save = (l: any[]) => saveDoc("coupons", { list: l }, "coupons");
  const status = (c: any) => c.active === false ? "Inactive" : c.end && c.end < today() ? "Expired" : c.start && c.start > today() ? "Scheduled" : c.maxUses && (counts?.[c.id] || 0) >= c.maxUses ? "Used Up" : "Active";
  const color = (s: string) => s === "Active" ? "success" : s === "Expired" || s === "Used Up" ? "error" : s === "Scheduled" ? "warning" : "light";
  const rows = list.filter(c => !!c.deleted === del).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return (
    <>
      <PageBreadcrumb pageTitle="Coupons" />
      <div className={BOX}>
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <SegTabs value={tab} onChange={setTab} items={[["all", "All"], ["deleted", "Deleted"]]} />
          <div className="flex flex-col gap-3 sm:flex-row"><Button variant="outline" onClick={() => setForm({ c: null, bulk: true })}>Bulk Create</Button>
            <Button onClick={() => setForm({ c: null, bulk: false })}><PlusIcon className="size-5" />Create Coupon</Button></div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-200 dark:border-gray-800">
          {!rows.length ? <EmptyState text={del ? "No deleted coupons" : "Create coupons that your customers can use to get discounts on orders."} />
            : <table className="min-w-full"><thead className="border-b border-gray-200 dark:border-gray-800"><tr>
              {["Name", "Code", "Coupon Type", "Discount"].map(h => <th key={h} className={TH}>{h}</th>)}<th className={TH + " text-end"}>Uses</th>
              {["Start Date", "End Date", "Status"].map(h => <th key={h} className={TH}>{h}</th>)}{del && <th className={TH} />}</tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">{rows.map(c => { const st = status(c); return (
                <tr key={c.id} className={del ? "" : TR} onClick={() => !del && setForm({ c, bulk: false })}>
                  <td className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{c.name}</td><td className={TD}><span className="font-mono">{c.code}</span></td>
                  <td className={TD}>{c.type === "product" ? "Item" : "Order"}</td><td className={TD}>{discs.find(d => d.id === c.discountId)?.name || "—"}</td>
                  <td className={TD + " text-end"}>{counts ? (counts[c.id] || 0) : "…"} / {c.maxUses ?? "—"}</td><td className={TD}>{fmtDate(c.start)}</td><td className={TD}>{fmtDate(c.end)}</td>
                  <td className={TD}><Badge variant="light" color={color(st) as any}>{st}</Badge></td>
                  {del && <td className={TD + " text-end"}><Button size="xs" variant="outline" onClick={async () => { if (await save(list.map(x => x.id === c.id ? { ...x, deleted: false } : x))) toast("Coupon restored"); }}>Restore</Button></td>}</tr>); })}</tbody></table>}
        </div>
      </div>
      {form && <CouponForm c={form.c} bulk={form.bulk} list={list} discs={discs} save={save} onClose={() => setForm(null)} />}
    </>
  );
}
function CouponForm({ c, bulk, list, discs, save, onClose }: { c: any; bulk: boolean; list: any[]; discs: any[]; save: (l: any[]) => Promise<boolean>; onClose: () => void }) {
  const [v, setV] = useState<Record<string, any>>({ n: "10", name: c?.name || "", type: c?.type === "product" ? "product" : "order", code: c?.code || "", discountId: c?.discountId || "", maxUses: c?.maxUses == null ? "" : String(c.maxUses), start: c?.start || today(), end: c?.end || "", active: c?.active !== false });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), set = (k: string, x: any) => setV(p => ({ ...p, [k]: x }));
  const opts = discs.filter(d => !d.deleted && (d.qualification === v.type || d.qualification === "both"));
  async function go() {
    const n = v.name.trim(), code = bulk ? "" : v.code.trim().toUpperCase(), cnt = bulk ? Math.round(+v.n || 0) : 1;
    if (bulk && !(cnt >= 1 && cnt <= 500)) return setErr("Number Of Coupons must be between 1 and 500.");
    if (!n) return setErr("Name is required."); if (!bulk && !code) return setErr("Code is required."); if (!bulk && !/^[A-Z0-9]+$/.test(code)) return setErr("The code may only contain numbers or letters.");
    if (!v.discountId) return setErr("Discount is required."); if (!(+v.maxUses >= 1)) return setErr("Maximum Uses is required.");
    if (!v.start) return setErr("Start Date is required."); if (!v.end) return setErr("End Date is required."); if (v.end < v.start) return setErr("The end date must be after the start date.");
    const used = new Set(list.filter(o => !o.deleted && o.id !== c?.id).map(o => String(o.code).toUpperCase()));
    if (!bulk && used.has(code)) return setErr("This code is already used by another coupon.");
    const data = { name: n, type: v.type, discountId: v.discountId, maxUses: Math.round(+v.maxUses), start: v.start, end: v.end };
    let l: any[];
    if (c) l = list.map(o => o.id === c.id ? { ...o, ...data, code, active: v.active } : o);
    else { const add: any[] = []; for (let i = 0; i < cnt; i++) { let k = code; if (bulk) { do k = cpCode(); while (used.has(k)); } used.add(k); add.push({ id: newId("cpn"), ...data, code: k, active: true, createdAt: new Date(Date.now() + i).toISOString() }); } l = [...list, ...add]; }
    setBusy(true); const ok = await save(l); setBusy(false);
    if (ok) { toast(bulk ? cnt + " coupons created" : c ? "Coupon saved" : "Coupon created"); onClose(); }
  }
  return (
    <FormDialog title={bulk ? "Bulk Create Coupons" : c ? "Edit Coupon" : "Create Coupon"} saveLbl={bulk ? "Create" : "Save"} onClose={onClose} onSave={go} busy={busy} err={err}
      onDelete={c ? async () => { if (await askYes("Delete this coupon?", "Delete", true) && await save(list.map(o => o.id === c.id ? { ...o, deleted: true } : o))) { toast("Coupon deleted"); onClose(); } } : undefined}>
      {bulk && <F l="Number Of Coupons" req help="Number of Coupons to be created."><Input className="h-9" type="number" min="1" max="500" step="1" value={v.n} onChange={e => set("n", e.target.value)} /></F>}
      <F l="Name" req help="The name of the coupon, used for reporting."><Input className="h-9" autoFocus value={v.name} onChange={e => set("name", e.target.value)} /></F>
      <F l="Coupon Type" req help="Whether the coupon applies on an order level or an item level"><select className={SEL} value={v.type} onChange={e => setV(p => ({ ...p, type: e.target.value, discountId: "" }))}><option value="product">Item</option><option value="order">Order</option></select></F>
      {!bulk && <F l="Code" req help="Customers use this code. Only numbers or letters."><div className="flex gap-3"><Input className="h-9 flex-1 uppercase" value={v.code} onChange={e => set("code", e.target.value)} />
        <Button type="button" variant="outline" className="h-9" onClick={() => set("code", cpCode())}>Generate</Button></div></F>}
      <F l="Discount" req help="A discount from Marketing → Discounts that matches the coupon type"><select className={SEL} value={v.discountId} onChange={e => set("discountId", e.target.value)}><option value="">Choose…</option>{opts.map(d => <option key={d.id} value={d.id}>{d.name} ({dsAmt(d)})</option>)}</select></F>
      <F l="Maximum Uses" req help="How many times this coupon can be used."><Input className="h-9" type="number" min="1" step="1" value={v.maxUses} onChange={e => set("maxUses", e.target.value)} /></F>
      <F l="Start Date" req><DateInput value={v.start} onChange={x => set("start", x)} /></F>
      <F l="End Date" req><DateInput value={v.end} onChange={x => set("end", x)} /></F>
      {c && <label className="col-span-full flex cursor-pointer items-center gap-3"><Switch checked={v.active} onCheckedChange={x => set("active", !!x)} /><span className="text-sm font-medium text-gray-900 dark:text-gray-50">Active</span></label>}
    </FormDialog>);
}
