// An item's page (Catalog → Items → an item), laid out and behaving like an inventory product's page:
// back button, details tiles, then Modifiers and Ingredients. Store prices, active and out of stock are set in Sales Channels.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { put, type Row } from "@/lib/db";
import { money } from "@/lib/util";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { EditDialog, live, useS } from "../crud/CrudPage";
import { CRUD } from "../crud/configs";
import { SEL, TD, TH, TR } from "../ui/kit";
import { toast } from "../ui/toast";
import { Head, Info, Ingredients, Missing, None, Sec } from "./Details";

export default function ItemPage() {
  const [sp] = useSearchParams(); const id = sp.get("id") || "";
  const s = useS(["products", "categories", "tax_groups", "modifiers", "modifier_options", "inv_items"]);
  const [edit, setEdit] = useState(false);
  if (!s) return null;
  const p = s.products.find(x => x.id === id);
  if (!p) return <Missing back="Items" to="/products" />;
  const save = async (data: Record<string, any>, msg = "Item saved") => { try { await put("products", p.id, data); toast(msg); } catch (e: any) { toast(e?.message || "Couldn't save.", "error"); } };
  const links: any[] = p.modifiers || [];
  const mods = s.modifiers.filter(m => live(m) && !links.some(l => l.modifierId === m.id)).sort((a, b) => a.name.localeCompare(b.name));

  return <>
    <Head back="Items" backTo="/products" title={p.name}><Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Item</Button></Head>
    <Info rows={[["Name", <>{p.name}{p.deleted && <Badge className="ms-2" variant="light" color="error">Deleted</Badge>}</>], ["Name Localized", p.nameAr || "—"], ["SKU", p.sku || "—"],
      ["Category", s.categories.find(c => c.id === p.categoryId)?.name || "—"], ["Price", p.pricingMethod === "open" ? "Open Price" : money(p.price)],
      ["Tax Group", s.tax_groups.find(g => g.id === p.taxGroup)?.name || "—"], ["Costing Method", p.costingMethod === "fixed" ? "Fixed Cost · " + money(p.cost) : "From Ingredients"],
      ["Selling Method", p.sellingMethod === "weight" ? "Weight" : "Unit"], ["Preparation Time", p.prepTime ? p.prepTime + " min" : "—"], ["Barcode", p.barcode || "—"],
      ...(p.description ? [["Description", p.description] as [string, string]] : [])]} />
    <Sec title="Modifiers" act={<select aria-label="Add modifier" className={SEL + " h-9 w-52"} value="" disabled={!mods.length}
        onChange={e => { const v = e.target.value; if (v) save({ modifiers: [...links, { modifierId: v, min: 1, max: 1, free: 0 }] }, "Modifier added"); }}>
        <option value="">Add modifier…</option>{mods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}>
      {!links.length ? <None t="No modifiers on this item." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Modifier", "Options", "Minimum", "Maximum", "Free", ""].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
        {links.map((l, i) => { const upd = (k: string, v: any) => save({ modifiers: links.map((x, j) => j === i ? { ...x, [k]: Math.max(0, parseInt(v) || 0) } : x) });
          return <tr key={l.modifierId} className={TR}><td className={TD + " font-medium text-gray-800 dark:text-white/90"}>{s.modifiers.find(m => m.id === l.modifierId)?.name || "(deleted modifier)"}</td>
            <td className={TD}>{s.modifier_options.filter(o => live(o) && o.modifierId === l.modifierId).length}</td>
            {["min", "max", "free"].map(k => <td key={k} className={TD}><Input className="h-9 w-20" type="number" aria-label={k} defaultValue={l[k] ?? 0} onBlur={e => +e.target.value !== +(l[k] ?? 0) && upd(k, e.target.value)} /></td>)}
            <td className={TD + " text-end"}><Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => save({ modifiers: links.filter((_, j) => j !== i) }, "Modifier removed")}><TrashBinIcon className="size-5 text-red-500" /></Button></td></tr>; })}
      </tbody></table></div>}
    </Sec>
    <Ingredients s={s} col="products" rec={p as Row} />
    {edit && <EditDialog cfg={CRUD.products} s={s} row={p as Row} onClose={() => setEdit(false)} />}
  </>;
}
