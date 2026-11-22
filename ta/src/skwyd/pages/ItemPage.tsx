// An item's page (Catalog → Items → an item), laid out and behaving like an inventory product's page:
// back button, details tiles, then Tags, Variants, Modifiers, Ingredients, Nutritional Values and Allergens (as in the current portal). Store prices, active and out of stock are set in Sales Channels.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { put, type Row } from "@/lib/db";
import { money } from "@/lib/util";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { EditDialog, live, useS } from "../crud/CrudPage";
import { CRUD } from "../crud/configs";
import { SEL, TD, TH, TR } from "../ui/kit";
import { toast } from "../ui/toast";
import { Allergens, Head, Info, Ingredients, Missing, None, Nutrition, Sec, Tags } from "./Details";

export default function ItemPage() {
  const [sp] = useSearchParams(); const id = sp.get("id") || "";
  const s = useS(["products", "categories", "tax_groups", "modifiers", "modifier_options", "inv_items", "settings", "variant_sets"]);
  const [edit, setEdit] = useState(false);
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
    {par && <Sec title="Variant"><p className="text-sm text-gray-700 dark:text-gray-300">{vset(par)} {par.variants.find((v: any) => v.productId === p.id)?.name} of <Link className="text-brand-500 hover:underline" to={"/item?id=" + par.id}>{par.name}</Link>. The POS, call center and web ordering show {par.name} and ask which {vset(par).toLowerCase()}.</p></Sec>}
    {!par && kids.length > 0 && <Sec title={"Variants · " + vset(p)}><div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Name", "Item", "SKU", "Price"].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
      {kids.map(({ v, k }: any) => <tr key={k.id} className={TR}><td className={TD + " font-medium text-gray-800 dark:text-white/90"}>{v.name}</td><td className={TD}><Link className="text-brand-500 hover:underline" to={"/item?id=" + k.id}>{k.name}</Link></td><td className={TD}>{k.sku || "—"}</td><td className={TD}>{money(k.price)}</td></tr>)}</tbody></table></div></Sec>}
    {!kids.length && <>
    <Sec title="Modifiers" act={<div className="flex gap-2"><select aria-label="Add modifier" className={SEL + " h-9 w-52"} value=""
        onChange={e => { const v = e.target.value; if (v) save({ modifiers: [...links, { modifierId: v, min: 1, max: 1, free: 0 }] }, "Modifier added"); }}>
        <option value="">Add modifier…</option>{mods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>}>
      {!links.length ? <None t="No modifiers on this item." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Modifier", "Options", "Minimum", "Maximum", "Free", ""].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
        {links.map((l, i) => { const upd = (k: string, v: any) => save({ modifiers: links.map((x, j) => j === i ? { ...x, [k]: Math.max(0, parseInt(v) || 0) } : x) });
          return <tr key={l.modifierId} className={TR}><td className={TD + " font-medium text-gray-800 dark:text-white/90"}>{s.modifiers.find(m => m.id === l.modifierId)?.name || "(deleted modifier)"}</td>
            <td className={TD}>{s.modifier_options.filter(o => live(o) && o.modifierId === l.modifierId).length}</td>
            {["min", "max", "free"].map(k => <td key={k} className={TD}><Input className="h-9 w-20" type="number" aria-label={k} defaultValue={l[k] ?? 0} onBlur={e => +e.target.value !== +(l[k] ?? 0) && upd(k, e.target.value)} /></td>)}
            <td className={TD + " text-end"}><Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => save({ modifiers: links.filter((_, j) => j !== i) }, "Modifier removed")}><TrashBinIcon className="size-5 text-red-500" /></Button></td></tr>; })}
      </tbody></table></div>}
    </Sec>
    <Ingredients s={s} col="products" rec={p as Row} /></>}
    <Nutrition col="products" rec={p as Row} />
    <Allergens s={s} col="products" rec={p as Row} />
    {edit && <EditDialog cfg={CRUD.products} s={s} row={p as Row} onClose={() => setEdit(false)} />}
  </>;
}
