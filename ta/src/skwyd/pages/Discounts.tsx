import { DataTable } from "@/components/tremor/data-table/DataTable";
import { Label } from "@/components/tremor/Label";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
import { SelectNative } from "@/components/tremor/SelectNative";
// Marketing → Discounts: list (All / Deleted, search), discount page (details + the five "applies on" sections) and the create / edit form,
// same rules as the current portal. Discounts live in the "discounts" settings document.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeftIcon, PencilIcon, PlusIcon } from "@/icons";
import { newId, put } from "@/lib/db";
import { money, sym, openWin } from "@/lib/util";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { EmptyState } from "../ui/EmptyState";
import { Card, F, L, SEL, TD, TH } from "../ui/kit";
import { PickDialog, type PickOpt } from "../ui/PickDialog";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

const QUAL: [string, string][] = [["order", "Order"], ["product", "Product"], ["both", "Order & Product"]];
const OT: [string, string][] = [["dinein", "In Store"], ["pickup", "Pick Up"], ["delivery", "Delivery"]];
const amtLbl = (d: any) => d.open ? (d.type === "fixed" ? "Open amount" : "Open %") : d.type === "fixed" ? money(+d.amount || 0) : (+d.amount || 0) + "%";
const tagsOf = (s: S, type: string): PickOpt[] => ((s.settings.find(x => x.id === "tags") as any)?.list || []).filter((t: any) => t.type === type && !t.deleted).map((t: any) => [t.id, t.name]);

type Sec = { k: string; title: string; btn: string; hint: string; head: string[]; opts: (s: S) => PickOpt[] };
const SECS: Sec[] = [
  { k: "branchIds", title: "Applies On Stores", btn: "Edit Stores", hint: "No stores chosen: this discount can be used at every store.", head: ["Name", "Reference"], opts: s => s.branches.filter(b => live(b) && b.active !== false).map(b => [b.id, b.name, b.code || ""]) },
  { k: "categoryIds", title: "Applies On Categories", btn: "Add Categories", hint: "Select the menu categories where this discount can be applied.", head: ["Name", "Reference"], opts: s => s.categories.filter(c => live(c) && !c.channel).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map(c => [c.id, c.name, c.reference || ""]) },
  { k: "productIds", title: "Applies On Items", btn: "Add Items", hint: "Select the items where this discount can be applied.", head: ["Name", "SKU"], opts: s => s.products.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(p => [p.id, p.name, p.sku || ""]) },
  { k: "productTags", title: "Apply On Item Tags", btn: "Add Item Tags", hint: "Select the item tags where this discount can be applied.", head: ["Name"], opts: s => tagsOf(s, "product") },
  { k: "customerTags", title: "Limit To Customer Tags", btn: "Add Customer Tags", hint: "Select the customers who are eligible for this discount.", head: ["Name"], opts: s => tagsOf(s, "customer") }];

export default function DiscountsPage() {
  const s = useS(["settings", "branches", "categories", "products"]);
  const [sp] = useSearchParams(), nav = useNavigate(), id = sp.get("id");
  const [tab, setTab] = useState("all"), [form, setForm] = useState<any>(undefined);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const list: any[] = (s.settings.find(x => x.id === "discounts") as any)?.list || [];
  const saveList = async (l: any[]) => { try { await put("settings", "discounts", { list: l }); return true; } catch { toast("Couldn't save. Only the owner or an admin can change discounts.", "error"); return false; } };
  const patch = (did: string, p: any) => saveList(list.map(d => d.id === did ? { ...d, ...p } : d));
  const open = id && list.find(d => d.id === id);
  const dlg = form !== undefined && <DiscountForm d={form} list={list} onClose={() => setForm(undefined)} onSave={async (l, nid) => { const ok = await saveList(l); if (ok && nid) nav("/discounts?id=" + nid); return ok; }}
    onDelete={async () => { if (await patch(form.id, { deleted: true })) { toast("Discount deleted"); setForm(undefined); nav("/discounts"); } }} />;
  if (open) return <><DiscountPage d={open} s={s} back={() => nav("/discounts")} edit={() => setForm(open)} patch={p => patch(open.id, p)} />{dlg}</>;
  const del = tab === "deleted";
  const rows = list.filter(d => !!d.deleted === del).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return (
    <>
      <PageBreadcrumb pageTitle="Discounts" />
      <DataTable<any>
        key={tab} data={rows} getRowId={d => d.id}
        columns={[
          { id: "name", title: "Name", value: d => d.name, hideable: false, cell: d => <><span className="font-medium text-gray-900 dark:text-gray-50">{d.name}</span>{d.nameAr && <span className="ms-2 text-gray-500" dir="auto">{d.nameAr}</span>}</> },
          { id: "ref", title: "Reference", value: d => d.reference || "", cell: d => d.reference || "—" },
          { id: "qual", title: "Qualification", value: d => (QUAL.find(x => x[0] === d.qualification) || QUAL[0])[1] },
          { id: "amt", title: "Discount", num: true, value: d => amtLbl(d) },
        ]}
        toolbar={<SegTabs value={tab} onChange={setTab} items={[["all", "All"], ["deleted", "Deleted"]]} />}
        actions={<Button className="h-[30px] py-1" onClick={() => setForm(null)}><PlusIcon className="size-4" />Create Discount</Button>}
        onRowClick={del ? undefined : d => openWin("/discounts?id=" + d.id)}
        rowActions={del ? [{ label: "Restore", onSelect: async d => { if (await patch(d.id, { deleted: false })) toast("Discount restored"); } }]
          : [{ label: "Open", onSelect: d => openWin("/discounts?id=" + d.id) }, { label: "Edit", onSelect: d => setForm(d) }, { label: "Delete", danger: true, onSelect: async d => { if (await askYes("Delete " + d.name + "?", "Delete", true) && await patch(d.id, { deleted: true })) toast("Discount deleted"); } }]}
        empty={<EmptyState text={del ? "No deleted discounts" : "No discounts yet"} />}
      />
      {dlg}
    </>
  );
}

function DiscountPage({ d, s, back, edit, patch }: { d: any; s: S; back: () => void; edit: () => void; patch: (p: any) => Promise<boolean> }) {
  const [pick, setPick] = useState<Sec | null>(null);
  const otl: Record<string, string> = { dinein: "In Store", pickup: "Pick Up", delivery: "Delivery", fast: "In Store" };
  return (
    <>
      <PageBreadcrumb pageTitle={d.name} />
      <div className="space-y-6">
        <Card className="p-5 lg:p-6">
          <div className="mb-6 flex items-center gap-4">
            <Button variant="outline" size="icon" className="shrink-0" aria-label="Back" onClick={back}><ArrowLeftIcon className="size-5" /></Button>
            <h4 className="flex-1 text-lg font-semibold text-gray-900 dark:text-gray-50">Details</h4>
            <Button variant="outline" onClick={edit}><PencilIcon className="size-4.5" />Edit Discount</Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7 2xl:gap-x-32">
            <L l="Name">{d.name}</L><L l="Name Localized">{d.nameAr || "—"}</L><L l="Qualification">{(QUAL.find(x => x[0] === d.qualification) || QUAL[0])[1]}</L>
            <L l="Discount Amount">{amtLbl(d)}</L><L l="Minimum Order Price">{d.minOrder != null ? money(d.minOrder) : "—"}</L><L l="Minimum Product Price">{d.minProduct != null ? money(d.minProduct) : "—"}</L>
            <L l="Maximum Discount">{d.type !== "fixed" && d.maxDiscount != null ? money(d.maxDiscount) : "—"}</L>
            <L l="Order Types">{(d.orderTypes || []).filter((k: string) => k !== "fast").map((k: string) => otl[k] || k).join(", ") || "—"}</L>
            <L l="Reference">{d.reference || "—"}</L><L l="Taxable">{d.taxable ? "Yes" : "No"}</L>
          </div>
        </Card>
        {SECS.map(sec => {
          const all = sec.opts(s), ids: string[] = d[sec.k] || [], rows = ids.map(i => all.find(o => o[0] === i)).filter(Boolean) as PickOpt[];
          return (
            <Card key={sec.k} title={sec.title} className="bg-white dark:bg-[#090E1A]" action={<Button size="sm" variant="outline" onClick={() => setPick(sec)}>{rows.length && sec.btn.startsWith("Add") ? sec.btn.replace("Add", "Edit") : sec.btn}</Button>}>
              {!rows.length ? <p className="text-sm text-gray-500 dark:text-gray-400">{sec.hint}</p>
                : <div className="-mx-5 -mb-5 overflow-x-auto border-t border-gray-100 lg:-mx-6 lg:-mb-6 dark:border-gray-800"><Table className="min-w-full"><TableHead className="border-b border-gray-200 dark:border-gray-800"><TableRow>{sec.head.map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}</TableRow></TableHead>
                  <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{rows.map(r => <TableRow key={r[0]}><TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{r[1]}</TableCell>{sec.head.length > 1 && <TableCell className={TD}>{r[2] || "—"}</TableCell>}</TableRow>)}</TableBody></Table></div>}
            </Card>);
        })}
      </div>
      {pick && <PickDialog title={pick.btn.replace(/^Add|^Edit/, "Select")} opts={pick.opts(s)} value={d[pick.k] || []} onClose={() => setPick(null)} onSave={ids => patch({ [pick.k]: ids })} />}
    </>
  );
}

function DiscountForm({ d, list, onClose, onSave, onDelete }: { d: any; list: any[]; onClose: () => void; onSave: (l: any[], newId?: string) => Promise<boolean>; onDelete: () => void }) {
  const x = d || { type: "pct", qualification: "order", orderTypes: ["dinein", "pickup", "delivery"] };
  const n = (v: any) => v == null ? "" : String(v);
  const [v, setV] = useState<Record<string, any>>({ name: x.name || "", nameAr: x.nameAr || "", qualification: x.qualification || "order", type: x.type === "fixed" ? "fixed" : "pct", open: !!x.open,
    amount: n(x.amount), maxDiscount: n(x.maxDiscount), minOrder: n(x.minOrder), minProduct: n(x.minProduct), orderTypes: x.orderTypes || [], reference: x.reference || "", taxable: !!x.taxable });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV(p => ({ ...p, [k]: val })), fx = v.type === "fixed";
  async function save() {
    const name = v.name.trim(), ref = v.reference.trim(), a = v.open ? "" : v.amount;
    if (!name) return setErr("Enter a name."); if (!v.open && (a === "" || +a < 0)) return setErr("Enter the discount amount."); if (!v.open && !fx && +a > 100) return setErr("A percentage can't be more than 100.");
    if (!v.orderTypes.length) return setErr("Choose at least one order type."); if (ref && !/^[A-Za-z0-9_-]+$/.test(ref)) return setErr("The reference may only contain letters, numbers, dashes and underscores.");
    if (list.some(o => !o.deleted && o.id !== x.id && String(o.name).toLowerCase() === name.toLowerCase())) return setErr("A discount with this name already exists.");
    const num = (s: string) => s === "" ? null : +s;
    const data = { name, nameAr: v.nameAr.trim(), qualification: v.qualification, type: v.type, open: v.open, amount: v.open ? null : +a, maxDiscount: fx ? null : num(v.maxDiscount), minOrder: num(v.minOrder), minProduct: num(v.minProduct), orderTypes: v.orderTypes, reference: ref, taxable: v.taxable };
    const nid = d ? undefined : newId("dsc");
    const l = d ? list.map(o => o.id === x.id ? { ...o, ...data } : o) : [...list, { id: nid, ...data, branchIds: [], categoryIds: [], productIds: [], productTags: [], customerTags: [], createdAt: new Date().toISOString() }];
    setBusy(true); const ok = await onSave(l, nid); setBusy(false);
    if (ok) { toast(d ? "Discount saved" : "Discount created"); onClose(); }
  }
  const numIn = (k: string, l: string) => <F l={l}><Input className="h-9" type="number" min="0" step="any" value={v[k]} onChange={e => set(k, e.target.value)} /></F>;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">{d ? "Edit" : "Create"} Discount</DialogTitle></DialogHeader>
        <form className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save(); }}>
          <F l="Name" req><Input className="h-9" autoFocus value={v.name} onChange={e => set("name", e.target.value)} /></F>
          <F l="Name Localized"><Input className="h-9" dir="auto" value={v.nameAr} onChange={e => set("nameAr", e.target.value)} /></F>
          <F l="Qualification" req><SelectNative className={SEL} value={v.qualification} onChange={e => set("qualification", e.target.value)}>{QUAL.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</SelectNative></F>
          <F l="Discount Type" req><SelectNative className={SEL} value={v.type} onChange={e => set("type", e.target.value)}><option value="fixed">Amount</option><option value="pct">Percentage</option></SelectNative></F>
          <F l="Discount Value" req help={v.open ? "The cashier enters the " + (fx ? "amount" : "percentage") + " when applying it." : undefined}>
            <SelectNative className={SEL} value={v.open ? "open" : "fixed"} onChange={e => set("open", e.target.value === "open")}><option value="fixed">Fixed</option><option value="open">Open</option></SelectNative></F>
          {!v.open && <F l={`Discount Amount (${fx ? sym() : "%"})`} req><Input className="h-9" type="number" min="0" step="any" value={v.amount} onChange={e => set("amount", e.target.value)} /></F>}
          {!fx && numIn("maxDiscount", `Maximum Discount (${sym()})`)}
          {numIn("minOrder", `Minimum Order Price (${sym()})`)}{numIn("minProduct", `Minimum Product Price (${sym()})`)}
          <F l="Applies On Order Types" req full><div className="flex flex-wrap gap-5 pt-1">{OT.map(([k, t]) => (
            <Label key={k} className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-gray-400">
              <Checkbox checked={v.orderTypes.includes(k)} onCheckedChange={c => set("orderTypes", c ? [...v.orderTypes, k] : v.orderTypes.filter((y: string) => y !== k))} />{t}</Label>))}</div></F>
          <F l="Reference"><Input className="h-9" value={v.reference} onChange={e => set("reference", e.target.value)} /></F>
          <Label className="col-span-full flex cursor-pointer items-start gap-3"><Switch checked={v.taxable} onCheckedChange={c => set("taxable", !!c)} />
            <span><span className="block text-sm font-medium text-gray-900 dark:text-gray-50">Taxable</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">On: the customer still pays the full tax of the order before the discount. Off: the tax is reduced with the discount.</span></span></Label>
          {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
          <div className="col-span-full flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            {d && <Button type="button" variant="destructive" className="sm:me-auto" onClick={async () => { if (await askYes("Delete this discount?", "Delete", true)) onDelete(); }}>Delete</Button>}
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>);
}
