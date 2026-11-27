import { XLink } from "@/components/shared/xlink";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
// An item's page (Catalog → Items → an item), laid out and behaving like an inventory product's page:
// back button, details tiles, then Tags, Variants, Modifiers, Ingredients, Nutritional Values and Allergens (as in the current portal). Store prices, active and out of stock are set in Sales Channels.
import { PickMany } from "../ui/PickMany";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { newId, put, type Row } from "@/lib/db";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { SelectNative } from "@/components/tremor/SelectNative";
import { money } from "@/lib/util";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { EditDialog, live, useS, type S } from "../crud/CrudPage";
import { CRUD } from "../crud/configs";
import { TD, TH, TR } from "../ui/kit";
import { toast } from "../ui/toast";
import { Allergens, Head, Info, Ingredients, Missing, None, Nutrition, Sec, Tags } from "./Details";

export default function ItemPage() {
  const [sp] = useSearchParams(); const id = sp.get("id") || "";
  const s = useS(["products", "categories", "tax_groups", "modifiers", "modifier_options", "inv_items", "settings", "variant_sets"]);
  const [edit, setEdit] = useState(false), [addV, setAddV] = useState(false);
  if (!s) return null;
  const p = s.products.find(x => x.id === id);
  if (!p) return <Missing back="Items" to="/products" />;
  const save = async (data: Record<string, any>, msg = "Item saved") => { try { await put("products", p.id, data); toast(msg); } catch (e: any) { toast(e?.message || "Couldn't save.", "error"); } };
  const links: any[] = p.modifiers || [];
  const ingCost = (p.ingredients || []).reduce((a: number, g: any) => { const it = s.inv_items.find(x => x.id === g.itemId); return a + (it ? (+g.qty || 0) / (+it.factor || 1) * (+it.cost || 0) : 0); }, 0);
  const cost = p.costingMethod === "fixed" ? +p.cost || 0 : ingCost, price = +p.price || 0;
  const kids = (p.variants || []).map((v: any) => ({ v, k: s.products.find(x => x.id === v.productId && live(x)) })).filter((x: any) => x.k);
  const par = s.products.find(x => live(x) && (x.variants || []).some((v: any) => v.productId === p.id));
  const vset = (q: Row) => s.variant_sets.find(x => x.id === q.variantSetId)?.name || "Variant";
  const mods = s.modifiers.filter(m => live(m) && !links.some(l => l.modifierId === m.id)).sort((a, b) => a.name.localeCompare(b.name));

  return <>
    <Head back="Items" backTo="/products" title={p.name}><Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Item</Button></Head>
    <Info rows={[["Name", <>{p.name}{p.deleted && <Badge className="ms-2" variant="light" color="error">Deleted</Badge>}</>], ["Name Localized", p.nameAr || "—"], ["SKU", p.sku || "—"],
      ["Category", s.categories.find(c => c.id === p.categoryId)?.name || "—"], ["Price", p.pricingMethod === "open" ? "Open Price" : money(p.price)],
      ["Tax Group", s.tax_groups.find(g => g.id === p.taxGroup)?.name || "—"], ["Costing Method", p.costingMethod === "fixed" ? "Fixed Cost" : "From Ingredients"], [p.costingMethod === "fixed" ? "Fixed Cost" : "Ingredients Cost", money(cost)], ["Cost %", price && cost ? (cost / price * 100).toFixed(1) + " %" : "—"],
      ["Selling Method", p.sellingMethod === "weight" ? "Weight" : "Unit"], ["Preparation Time", p.prepTime ? p.prepTime + " min" : "—"], ["Barcode", p.barcode || "—"],
      ["Description", p.description || "—"], ["Description Localized", p.descriptionAr || "—"]]} />
    <Tags s={s} type="product" id={p.id} />
    {par && <Sec title="Variant"><p className="text-sm text-gray-700 dark:text-gray-300">{vset(par)} {par.variants.find((v: any) => v.productId === p.id)?.name} of <XLink className="text-blue-500 hover:underline" to={"/item?id=" + par.id}>{par.name}</XLink>. The POS, call center and web ordering show {par.name} and ask which {vset(par).toLowerCase()}.</p></Sec>}
    {!par && kids.length > 0 && <Sec title={"Variants · " + vset(p)}><div className="overflow-x-auto"><Table className="w-full"><TableHead><TableRow>{["Name", "Item", "SKU", "Price"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}</TableRow></TableHead><TableBody>
      {kids.map(({ v, k }: any) => <TableRow key={k.id} className={TR}><TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{v.name}</TableCell><TableCell className={TD}><XLink className="text-blue-500 hover:underline" to={"/item?id=" + k.id}>{k.name}</XLink></TableCell><TableCell className={TD}>{k.sku || "—"}</TableCell><TableCell className={TD}>{money(k.price)}</TableCell></TableRow>)}</TableBody></Table></div></Sec>}
    {!par && !kids.length && <Sec title="Variants" act={<Button size="sm" variant="outline" onClick={() => setAddV(true)}>Add Variants</Button>}><None t="No variants. Add variants (e.g. Small, Medium, Large) to sell this item in several versions, each with its own price, modifiers and ingredients." /></Sec>}
    {!kids.length && <>
    <Sec title="Modifiers" act={<div className="flex gap-2"><PickMany label="Add modifier" opts={mods.map(m => ({ id: m.id, name: m.name }))} onAdd={ids => save({ modifiers: [...links, ...ids.map(v => ({ modifierId: v, min: 1, max: 1, free: 0 }))] }, ids.length > 1 ? `${ids.length} modifiers added` : "Modifier added")} /></div>}>
      {!links.length ? <None t="No modifiers on this item." /> : <div className="overflow-x-auto"><Table className="w-full"><TableHead><TableRow>{["Modifier", "Options", "Minimum", "Maximum", "Free", ""].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}</TableRow></TableHead><TableBody>
        {links.map((l, i) => { const upd = (k: string, v: any) => save({ modifiers: links.map((x, j) => j === i ? { ...x, [k]: Math.max(0, parseInt(v) || 0) } : x) });
          return <TableRow key={l.modifierId} className={TR}><TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{s.modifiers.find(m => m.id === l.modifierId)?.name || "(deleted modifier)"}</TableCell>
            <TableCell className={TD}>{s.modifier_options.filter(o => live(o) && o.modifierId === l.modifierId).length}</TableCell>
            {["min", "max", "free"].map(k => <TableCell key={k} className={TD}><Input className="h-9 w-20" type="number" aria-label={k} defaultValue={l[k] ?? 0} onBlur={e => +e.target.value !== +(l[k] ?? 0) && upd(k, e.target.value)} /></TableCell>)}
            <TableCell className={TD + " text-end"}><Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => save({ modifiers: links.filter((_, j) => j !== i) }, "Modifier removed")}><TrashBinIcon className="size-5 text-red-500" /></Button></TableCell></TableRow>; })}
      </TableBody></Table></div>}
    </Sec>
    <Ingredients s={s} col="products" rec={p as Row} /></>}
    <Nutrition col="products" rec={p as Row} />
    <Allergens s={s} col="products" rec={p as Row} />
    {addV && <AddVariants p={p as Row} s={s} onClose={() => setAddV(false)} />}
    {edit && <EditDialog cfg={CRUD.products} s={s} row={p as Row} onClose={() => setEdit(false)} />}
  </>;
}

/** Add Variants: pick a variant set; each option becomes its own item (price, SKU). The item's modifiers and ingredients move to the variants. */
function AddVariants({ p, s, onClose }: { p: Row; s: S; onClose: () => void }) {
  const sets = s.variant_sets.filter(live), [vs, setVs] = useState(sets[0]?.id || ""), set = sets.find(x => x.id === vs);
  const [rows, setRows] = useState<Record<string, { name: string; price: string }>>({}), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const opts: string[] = set?.options || [];
  const val = (o: string) => rows[vs + "|" + o] || { name: p.name + " " + o, price: String(p.price ?? "") };
  const setV = (o: string, k: "name" | "price", v: string) => setRows(x => ({ ...x, [vs + "|" + o]: { ...val(o), [k]: v } }));
  async function save() {
    if (!set) return setErr("Choose a variant set (Catalog → Variants).");
    for (const o of opts) { const v = val(o); if (!v.name.trim()) return setErr(`Name the ${o} variant.`); if (v.price === "" || isNaN(+v.price)) return setErr(`Enter the ${o} price.`); }
    setErr(""); setBusy(true);
    try {
      let n = 0; s.products.forEach(r => { const m = /^PR-?(\d+)$/i.exec(r.sku || ""); if (m) n = Math.max(n, +m[1]); });
      const kids: { name: string; productId: string }[] = [];
      for (const o of opts) { const v = val(o), id = newId("pro"); n++;
        await put("products", id, { name: v.name.trim(), categoryId: p.categoryId, price: +v.price, pricingMethod: "fixed", taxGroup: p.taxGroup, costingMethod: p.costingMethod || "ingredients", cost: p.cost ?? null,
          sellingMethod: p.sellingMethod || "unit", sku: "PR-" + String(n).padStart(4, "0"), modifiers: p.modifiers || [], ingredients: p.ingredients || [], allergens: p.allergens || [], active: true, deleted: false });
        kids.push({ name: o, productId: id }); }
      await put("products", p.id, { variantSetId: set.id, variants: kids, modifiers: [], ingredients: [] });
      toast(`${kids.length} variants added`); onClose();
    } catch (e: any) { setErr(e?.message || "Couldn't save."); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="w-full p-0 sm:max-w-xl">
        <div className="p-6 sm:p-8">
          <DialogHeader className="gap-1 sm:gap-2">
            <DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">Add Variants</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">Each option becomes its own item with its own price. {p.name}'s modifiers and ingredients move to the variants; {p.name} keeps none.</DialogDescription>
          </DialogHeader>
          {!sets.length ? <p className="mt-6 text-sm text-gray-500">No variant sets yet. Create one in Catalog → Variants (e.g. Size: Small, Medium, Large).</p> : <div className="mt-6 space-y-4">
            <Field><FieldLabel>Variant set</FieldLabel><SelectNative value={vs} onChange={e => setVs(e.target.value)}>{sets.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectNative></Field>
            <div className="space-y-2">{opts.map(o => <div key={o} className="grid grid-cols-[6rem_1fr_7rem] items-center gap-3">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{o}</span>
              <Input aria-label={o + " name"} value={val(o).name} onChange={e => setV(o, "name", e.target.value)} />
              <Input aria-label={o + " price"} type="number" min="0" step="any" placeholder="Price" value={val(o).price} onChange={e => setV(o, "price", e.target.value)} /></div>)}</div>
          </div>}
          {err && <p className="mt-4 text-sm text-red-500">{err}</p>}
          <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={busy || !set} onClick={save}>{busy ? "Saving…" : `Add ${opts.length || ""} variants`}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
