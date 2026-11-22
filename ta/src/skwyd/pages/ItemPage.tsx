// An item's page (Catalog → Items → an item), in TailAdmin profile-page style: details card with Edit, then the same sections as the current portal:
// Modifiers, Ingredients, Custom Price, Inactive In Stores, Out Of Stock.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { put, type Row } from "@/lib/db";
import { money } from "@/lib/util";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { EditDialog, live, useS } from "../crud/CrudPage";
import { CRUD } from "../crud/configs";
import { EmptyState } from "../ui/EmptyState";
import { toast } from "../ui/toast";

const Card = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
    <div className="mb-5 flex items-center justify-between gap-4"><h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h4>{action}</div>
    {children}
  </div>);
const L = ({ l, children }: { l: string; children: React.ReactNode }) => <div><p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">{l}</p><p className="text-sm font-medium text-gray-800 dark:text-white/90">{children}</p></div>;
const sel = "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function ItemPage() {
  const [sp] = useSearchParams(); const id = sp.get("id") || "";
  const s = useS(["products", "categories", "tax_groups", "modifiers", "modifier_options", "branches", "inv_items"]);
  const [edit, setEdit] = useState(false);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const p = s.products.find(x => x.id === id);
  if (!p) return <EmptyState text="This item isn't there anymore." />;
  const save = async (data: Record<string, any>, msg = "Item saved") => { try { await put("products", p.id, data); toast(msg); } catch (e: any) { toast(e?.message || "Couldn't save.", "error"); } };
  const stores = s.branches.filter(b => live(b) && b.active !== false);
  const links: any[] = p.modifiers || [], ings: any[] = p.ingredients || [];
  const cps: Record<string, any> = p.customPrices || {};

  return (
    <>
      <PageBreadcrumb pageTitle={p.name} />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="space-y-6">
          <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 p-5 lg:p-6 xl:flex-row xl:items-center xl:justify-between dark:border-gray-800">
            <div className="flex flex-col items-center gap-6 xl:flex-row">
              <div className="size-20 overflow-hidden rounded-full border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/5">{p.imageUrl && <img src={p.imageUrl} alt="" className="size-full object-cover" />}</div>
              <div className="text-center xl:text-start">
                <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">{p.name}{p.deleted && <Badge className="ms-2" variant="light" color="error">Deleted</Badge>}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.categories.find(c => c.id === p.categoryId)?.name || "—"} · {p.sku || "No SKU"}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setEdit(true)}><PencilIcon className="size-4.5" />Edit</Button>
          </div>

          <Card title="Details">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-7 2xl:gap-x-32">
              <L l="Name Localized">{p.nameAr || "—"}</L><L l="Price">{p.pricingMethod === "open" ? "Open Price" : money(p.price)}</L>
              <L l="Tax Group">{s.tax_groups.find(g => g.id === p.taxGroup)?.name || "—"}</L><L l="Costing Method">{p.costingMethod === "fixed" ? "Fixed Cost · " + money(p.cost) : "From Ingredients"}</L>
              <L l="Selling Method">{p.sellingMethod === "weight" ? "Weight" : "Unit"}</L><L l="Preparation Time">{p.prepTime ? p.prepTime + " min" : "—"}</L>
              <L l="Barcode">{p.barcode || "—"}</L><L l="Description">{p.description || "—"}</L>
            </div>
          </Card>

          <Card title="Modifiers" action={<AddPick label="Add Modifier" opts={s.modifiers.filter(m => live(m) && !links.some(l => l.modifierId === m.id)).map(m => [m.id, m.name])} onPick={v => save({ modifiers: [...links, { modifierId: v, min: 1, max: 1, free: 0 }] }, "Modifier added")} />}>
            {!links.length ? <EmptyState text="No modifiers on this item." /> : <div className="overflow-x-auto"><table className="min-w-full">
              <thead className="border-b border-gray-100 dark:border-white/5"><tr>{["Modifier", "Options", "Minimum", "Maximum", "Free", ""].map(h => <th key={h} className="px-3 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">{links.map((l, i) => {
                const upd = (k: string, v: any) => save({ modifiers: links.map((x, j) => j === i ? { ...x, [k]: Math.max(0, parseInt(v) || 0) } : x) });
                return <tr key={l.modifierId}>
                  <td className="px-3 py-3 text-sm font-medium text-gray-800 dark:text-white/90">{s.modifiers.find(m => m.id === l.modifierId)?.name || "?"}</td>
                  <td className="px-3 py-3 text-sm text-gray-500">{s.modifier_options.filter(o => live(o) && o.modifierId === l.modifierId).length}</td>
                  {["min", "max", "free"].map(k => <td key={k} className="px-3 py-3"><Input className="h-10 w-20" type="number" defaultValue={l[k] ?? 0} onBlur={e => +e.target.value !== +(l[k] ?? 0) && upd(k, e.target.value)} /></td>)}
                  <td className="px-3 py-3 text-end"><Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => save({ modifiers: links.filter((_, j) => j !== i) }, "Modifier removed")}><TrashBinIcon className="size-5 text-red-500" /></Button></td></tr>; })}</tbody>
            </table></div>}
          </Card>

          <Card title="Ingredients" action={<AddPick label="Add Ingredient" opts={s.inv_items.filter(x => live(x) && !ings.some(g => g.itemId === x.id)).map(x => [x.id, x.name + (x.ingredientUnit ? " (" + x.ingredientUnit + ")" : "")])} onPick={v => save({ ingredients: [...ings, { itemId: v, qty: 1, net: 1, yield: 100, types: ["dinein", "pickup", "delivery"] }] }, "Ingredient added")} />}>
            {!ings.length ? <EmptyState text="No ingredients yet. Add the inventory products this item uses, so its cost and stock are worked out." /> : <div className="overflow-x-auto"><table className="min-w-full">
              <thead className="border-b border-gray-100 dark:border-white/5"><tr>{["Product", "Quantity", "Unit", ""].map(h => <th key={h} className="px-3 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">{ings.map((g, i) => { const it = s.inv_items.find(x => x.id === g.itemId);
                return <tr key={g.itemId}><td className="px-3 py-3 text-sm font-medium text-gray-800 dark:text-white/90">{it?.name || "?"}</td>
                  <td className="px-3 py-3"><Input className="h-10 w-28" type="number" step="any" defaultValue={g.qty} onBlur={e => +e.target.value !== +g.qty && save({ ingredients: ings.map((x, j) => j === i ? { ...x, qty: +e.target.value || 0, net: +e.target.value || 0 } : x) })} /></td>
                  <td className="px-3 py-3 text-sm text-gray-500">{it?.ingredientUnit || "—"}</td>
                  <td className="px-3 py-3 text-end"><Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => save({ ingredients: ings.filter((_, j) => j !== i) }, "Ingredient removed")}><TrashBinIcon className="size-5 text-red-500" /></Button></td></tr>; })}</tbody>
            </table></div>}
          </Card>

          <Card title="Custom Price">
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">A different price in some stores. Empty = the item's price ({p.pricingMethod === "open" ? "Open" : money(p.price)}).</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{stores.map(b => (
              <div key={b.id}><p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">{b.name}</p>
                <Input className="h-11" type="number" step="any" placeholder={String(p.price ?? "")} defaultValue={cps[b.id] ?? ""} onBlur={e => { const v = e.target.value; const n = { ...cps }; if (v === "") delete n[b.id]; else n[b.id] = +v; if (String(cps[b.id] ?? "") !== v) save({ customPrices: n }, "Price saved"); }} /></div>))}</div>
          </Card>

          <Card title="Inactive In Stores">
            <StoreSwitches stores={stores} on={(p.inactiveBranchIds || []).filter((x: string) => !String(x).startsWith("only:"))} label="Inactive"
              set={ids => save({ inactiveBranchIds: [...(p.inactiveBranchIds || []).filter((x: string) => String(x).startsWith("only:")), ...ids] })} />
          </Card>
          <Card title="Out Of Stock">
            <StoreSwitches stores={stores} on={p.outOfStockBranchIds || []} label="Out of stock" set={ids => save({ outOfStockBranchIds: ids })} />
          </Card>
          <p className="text-sm text-gray-500 dark:text-gray-400"><Link to="/products" className="text-brand-500 hover:underline">← Back to Items</Link></p>
        </div>
      </div>
      {edit && <EditDialog cfg={CRUD.products} s={s} row={p as Row} onClose={() => setEdit(false)} />}
    </>
  );
}

function AddPick({ label, opts, onPick }: { label: string; opts: [string, string][]; onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <Button variant="outline" onClick={() => setOpen(true)} disabled={!opts.length}><PlusIcon className="size-5" />{label}</Button>;
  return <select autoFocus className={sel + " w-56"} defaultValue="" onBlur={() => setOpen(false)} onChange={e => { if (e.target.value) onPick(e.target.value); setOpen(false); }}>
    <option value="">Choose…</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}
function StoreSwitches({ stores, on, set, label }: { stores: Row[]; on: string[]; set: (ids: string[]) => void; label: string }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{stores.map(b => (
    <label key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
      <span className="text-sm font-medium text-gray-800 dark:text-white/90">{b.name}<span className="block text-theme-xs font-normal text-gray-500">{on.includes(b.id) ? label : "Active"}</span></span>
      <Switch checked={on.includes(b.id)} onCheckedChange={v => set(v ? [...on, b.id] : on.filter(x => x !== b.id))} /></label>))}</div>;
}
