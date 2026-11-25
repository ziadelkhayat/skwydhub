// Detail pages the lists open, as in the current portal: Modifier Option (ingredients, allergens), Supplier (tags, linked inventory products),
// Inventory Product (units, cost, tags, ingredients, suppliers, levels per location, stock), Warehouse (details, delete its inventory, delete it).
import { PickMany } from "../ui/PickMany";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { put, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDate, money } from "@/lib/util";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { EditDialog, live, useS, type S } from "../crud/CrudPage";
import { CRUD } from "../crud/configs";
import { askYes } from "../ui/confirm";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, SEL, TD, TH, TR } from "../ui/kit";
import { PickDialog } from "../ui/PickDialog";
import { toast } from "../ui/toast";

const n2 = (v: any) => (+v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const cost5 = (v: any) => money(+v || 0);
const DEF_ALLERGENS = ["Celery", "Cereals containing gluten", "Crustaceans", "Eggs", "Fish", "Lupin", "Milk", "Molluscs", "Mustard", "Tree nuts", "Peanuts", "Sesame", "Soy", "Sulphites"];
export const Head = ({ back, backTo, title, children }: { back: string; backTo: string; title: string; children?: React.ReactNode }) => <>
  <PageBreadcrumb pageTitle={back} current={title} />
  <div className="mb-6 flex flex-wrap items-center gap-3"><Button variant="outline" render={<Link to={backTo} />}><ArrowLeftIcon className="size-5" />{back}</Button><h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2><div className="ms-auto flex gap-3">{children}</div></div></>;
export const Info = ({ rows }: { rows: [string, React.ReactNode][] }) => <div className={BOX + " mb-6 grid grid-cols-2 gap-5 p-5 lg:grid-cols-4"}>{rows.map(([l, v]) =>
  <div key={l}><span className="block text-sm text-gray-500 dark:text-gray-400">{l}</span><b className="text-sm font-medium break-words text-gray-900 dark:text-gray-50">{v}</b></div>)}</div>;
export const Sec = ({ title, act, children }: { title: string; act?: React.ReactNode; children: React.ReactNode }) => (
  <div className={BOX + " mb-6"}><div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h3 className="text-base font-medium text-gray-900 dark:text-gray-50">{title}</h3>{act}</div><div className="p-5">{children}</div></div>);
export const None = ({ t }: { t: string }) => <p className="text-sm text-gray-500 dark:text-gray-400">{t}</p>;
export const Missing = ({ back, to }: { back: string; to: string }) => { const nav = useNavigate(); return <><PageBreadcrumb pageTitle={back} /><EmptyState text="This record wasn't found."><Button variant="outline" onClick={() => nav(to)}>{back}</Button></EmptyState></>; };
const useId = () => useSearchParams()[0].get("id") || "";
const setDoc = async (id: string, data: any, msg: string) => { try { await put("settings", id, data); toast(msg); } catch { toast("Couldn't save", "error"); } };

/* tags of a record: settings "tags" { list:[{id,name,type}], on:{ [type]: { [recordId]: [tagIds] } } } */
export function Tags({ s, type, id }: { s: S; type: string; id: string }) {
  const [open, setOpen] = useState(false), doc: any = s.settings.find(x => x.id === "tags") || {}, list = (doc.list || []).filter((t: any) => t.type === type && !t.deleted);
  const mine: string[] = (((doc.on || {})[type] || {})[id] || []).filter((t: string) => list.some((x: any) => x.id === t));
  return <Sec title="Tags" act={<Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add</Button>}>
    {!mine.length ? <None t="You don't have tags" /> : <div className="flex flex-wrap gap-2">{mine.map(t => <Badge key={t} variant="light" color="primary">{list.find((x: any) => x.id === t)?.name}</Badge>)}</div>}
    {open && <PickDialog title="Tags" opts={list.map((t: any) => [t.id, t.name])} value={mine} onClose={() => setOpen(false)}
      onSave={async ids => { const on = JSON.parse(JSON.stringify(doc.on || {})); (on[type] ||= {})[id] = ids; try { await put("settings", "tags", { on }); toast("Tags saved"); setOpen(false); } catch { toast("Couldn't save", "error"); return false; } }} />}
    {!list.length && <p className="mt-2 text-xs text-gray-500">Tags are created in Manage → Tags.</p>}
  </Sec>;
}
/* the recipe of a modifier option or a produced inventory product: inventory products in their ingredient unit */
export function Ingredients({ s, col, rec }: { s: S; col: string; rec: Row }) {
  const ings: any[] = rec.ingredients || [], item = (id: string) => s.inv_items.find(x => x.id === id);
  const save = async (l: any[], msg = "Ingredients saved") => { try { await put(col, rec.id, { ingredients: l }); toast(msg); } catch { toast("Couldn't save.", "error"); } };
  const lineCost = (g: any) => { const it = item(g.itemId); return it ? (+g.qty || 0) / (+it.factor || 1) * (+it.cost || 0) : 0; };
  const opts = s.inv_items.filter(x => live(x) && x.id !== rec.id && !ings.some(g => g.itemId === x.id)).sort((a, b) => a.name.localeCompare(b.name));
  return <Sec title="Ingredients" act={<div className="flex gap-2"><PickMany label="Add ingredient" opts={opts.map(x => ({ id: x.id, name: x.name, sub: x.ingredientUnit || "" }))} onAdd={ids => save([...ings, ...ids.map(v => ({ itemId: v, qty: 1, net: 1, yield: 100 }))], ids.length > 1 ? `${ids.length} ingredients added` : "Ingredient added")} /></div>}>
    {!ings.length ? <None t="No ingredients yet." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Product", "Quantity", "Unit", "Cost", ""].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
      {ings.map((g, i) => { const it = item(g.itemId); return <tr key={g.itemId} className={TR}><td className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{it?.name || "(deleted item)"}</td>
        <td className={TD}><Input className="h-9 w-28" type="number" step="any" defaultValue={g.qty} onBlur={e => +e.target.value !== +g.qty && save(ings.map((x, j) => j === i ? { ...x, qty: +e.target.value || 0, net: +e.target.value || 0 } : x))} /></td>
        <td className={TD}>{it?.ingredientUnit || "—"}</td><td className={TD}>{cost5(lineCost(g))}</td>
        <td className={TD + " text-end"}><Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => save(ings.filter((_, j) => j !== i), "Ingredient removed")}><TrashBinIcon className="size-5 text-red-500" /></Button></td></tr>; })}
      <tr><td colSpan={3} className={TD + " text-end font-medium"}>Total</td><td className={TD + " font-semibold text-gray-900 dark:text-gray-50"}>{cost5(ings.reduce((a, g) => a + lineCost(g), 0))}</td><td /></tr></tbody></table></div>}
  </Sec>;
}
export function Allergens({ s, col, rec }: { s: S; col: string; rec: Row }) {
  const [open, setOpen] = useState(false), doc: any = s.settings.find(x => x.id === "allergens") || {}, list: string[] = Array.isArray(doc.list) ? doc.list : DEF_ALLERGENS, mine: string[] = rec.allergens || [];
  return <Sec title="Allergens" act={<Button size="sm" variant="outline" onClick={() => setOpen(true)}>Edit</Button>}>
    {!mine.length ? <None t="No allergens." /> : <div className="flex flex-wrap gap-2">{mine.map(a => <Badge key={a} variant="light" color="warning">{a}</Badge>)}</div>}
    {open && <PickDialog title="Allergens" opts={list.map(a => [a, a])} value={mine} onClose={() => setOpen(false)} onSave={async v => { try { await put(col, rec.id, { allergens: v }); toast("Allergens saved"); setOpen(false); } catch { toast("Couldn't save", "error"); return false; } }} />}
  </Sec>;
}

/* nutritional values of an item: product.nutrition { calories, fat, … } */
const NUTR: [string, string, string][] = [["calories", "Calories", "kcal"], ["fat", "Total fat", "g"], ["satFat", "Saturated fat", "g"], ["transFat", "Trans fat", "g"], ["cholesterol", "Cholesterol", "mg"], ["carbs", "Carbohydrate", "g"], ["fiber", "Fiber", "g"], ["sugars", "Total sugars", "g"], ["addedSugars", "Added sugars", "g"], ["protein", "Protein", "g"], ["salt", "Salt", "g"], ["sodium", "Sodium", "mg"], ["caffeine", "Caffeine", "mg"]];
export function Nutrition({ col, rec }: { col: string; rec: Row }) {
  const cur: any = rec.nutrition || {}, [open, setOpen] = useState(false), [v, setV] = useState<Record<string, string>>({});
  const has = (k: string) => cur[k] != null && cur[k] !== "";
  const start = () => { setV(Object.fromEntries(NUTR.map(([k]) => [k, has(k) ? String(cur[k]) : ""]))); setOpen(true); };
  const save = async () => { const o: any = {}; Object.entries(v).forEach(([k, n]) => { if (n.trim() !== "") o[k] = +n; });
    try { await put(col, rec.id, { nutrition: o }); toast("Nutritional values saved"); setOpen(false); } catch { toast("Couldn't save", "error"); } };
  return <Sec title="Nutritional Values" act={<Button size="sm" variant="outline" onClick={start}>Edit</Button>}>
    {!NUTR.some(([k]) => has(k)) ? <None t="No nutritional values." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Ingredient", "Value", "Unit"].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
      {NUTR.filter(([k]) => has(k)).map(([k, l, u]) => <tr key={k} className={TR}><td className={TD}>{l}</td><td className={TD}>{cur[k]}</td><td className={TD}>{u}</td></tr>)}</tbody></table></div>}
    {open && <Dialog open onOpenChange={x => !x && setOpen(false)}><DialogContent className="w-full p-6 sm:max-w-lg"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">Nutritional Values</DialogTitle></DialogHeader>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{NUTR.map(([k, l, u]) => <F key={k} l={`${l} (${u})`}><Input type="number" min="0" step="any" value={v[k]} onChange={e => setV(o => ({ ...o, [k]: e.target.value }))} /></F>)}</div>
      <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></div></DialogContent></Dialog>}
  </Sec>;
}

export function OptionPage() {
  const s = useS(["modifier_options", "modifiers", "tax_groups", "inv_items", "settings"]), id = useId(), [edit, setEdit] = useState(false);
  if (!s) return null; const o = s.modifier_options.find(x => x.id === id); if (!o) return <Missing back="Modifier Options" to="/modifier-options" />;
  const fixed = o.costingMethod === "fixed", ingCost = (o.ingredients || []).reduce((a: number, g: any) => { const it = s.inv_items.find(x => x.id === g.itemId); return a + (it ? (+g.qty || 0) / (+it.factor || 1) * (+it.cost || 0) : 0); }, 0), cost = fixed ? +o.cost || 0 : ingCost, price = +o.price || 0;
  return <>
    <Head back="Modifier Options" backTo="/modifier-options" title={o.name}><Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Option</Button></Head>
    <Info rows={[["Name", o.name], ["Name Localized", o.nameAr || "—"], ["Modifier", s.modifiers.find(m => m.id === o.modifierId)?.name || "—"], ["SKU", o.sku || "—"], ["Price", price ? money(price) : "Free"], ["Tax Group", s.tax_groups.find(g => g.id === o.taxGroup)?.name || "—"],
      ["Costing Method", fixed ? "Fixed Cost" : "From Ingredients"], [fixed ? "Fixed Cost" : "Ingredients Cost", cost5(cost)], ["Cost %", price ? (cost / price * 100).toFixed(1) + " %" : "—"]]} />
    {!fixed && <Ingredients s={s} col="modifier_options" rec={o} />}
    <Allergens s={s} col="modifier_options" rec={o} />
    {edit && <EditDialog cfg={CRUD["modifier-options"]} s={s} row={o} onClose={() => setEdit(false)} />}
  </>;
}

/* supplier ⇄ inventory product links, kept in settings "supplier_items" */
function SupLinks({ s, side, id }: { s: S; side: "item" | "sup"; id: string }) {
  const doc: any = s.settings.find(x => x.id === "supplier_items") || {}, links: any[] = (doc.links || []).filter((l: any) => side === "item" ? l.itemId === id : l.supplierId === id); 
  const opts: [string, string][] = side === "item" ? s.suppliers.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(x => [x.id, x.name]) : s.inv_items.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(x => [x.id, x.name + (x.sku ? " · " + x.sku : "")]);
  const all = doc.links || [];
  return <Sec title={side === "item" ? "Suppliers" : "Inventory Products"} act={<PickMany label={side === "item" ? "Add supplier" : "Add product"} opts={opts.filter(([v]) => !links.some(l => (side === "item" ? l.supplierId : l.itemId) === v)).map(([v, t]) => ({ id: v, name: t }))}
    onAdd={ids => { const add = ids.map(v => side === "item" ? { supplierId: v, itemId: id } : { supplierId: id, itemId: v }); setDoc("supplier_items", { links: [...all.filter((x: any) => !add.some(a => a.supplierId === x.supplierId && a.itemId === x.itemId)), ...add] }, ids.length > 1 ? `${ids.length} linked` : "Linked"); }} />}>
    {!links.length ? <None t={side === "item" ? "Link this product to the suppliers you purchase from." : "Link this supplier to the inventory products you purchase from them."} /> :
      <table className="w-full"><tbody>{links.map(l => { const it = s.inv_items.find(x => x.id === l.itemId), sp = s.suppliers.find(x => x.id === l.supplierId); return <tr key={l.supplierId + l.itemId} className={TR}>
        <td className={TD}>{side === "item" ? <Link className="text-brand-500 hover:underline" to={"/supplier?id=" + l.supplierId}>{sp?.name || "—"}</Link> : <><Link className="text-brand-500 hover:underline" to={"/inv-item?id=" + l.itemId}>{it?.name || "—"}</Link> <span className="text-xs text-gray-500">{it?.sku || ""}</span></>}</td>
        <td className={TD + " text-end"}><Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => setDoc("supplier_items", { links: all.filter((x: any) => !(x.supplierId === l.supplierId && x.itemId === l.itemId)) }, "Link removed")}><TrashBinIcon className="size-5 text-red-500" /></Button></td></tr>; })}</tbody></table>}
  </Sec>;
}

export function SupplierPage() {
  const s = useS(["suppliers", "inv_items", "settings"]), id = useId(), [edit, setEdit] = useState(false);
  if (!s) return null; const sp = s.suppliers.find(x => x.id === id); if (!sp) return <Missing back="Suppliers" to="/suppliers" />;
  return <>
    <Head back="Suppliers" backTo="/suppliers" title={sp.name}><Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Supplier</Button></Head>
    <Info rows={[["Name", sp.name], ["Contact Name", sp.contactName || "—"], ["Phone", sp.phone || "—"], ["Primary Email", sp.email || "—"], ["Supplier Code", sp.code || "—"], ["Address", sp.address || "—"], ["Notes", sp.notes || "—"]]} />
    <Tags s={s} type="supplier" id={sp.id} />
    <SupLinks s={s} side="sup" id={sp.id} />
    {edit && <EditDialog cfg={CRUD.suppliers} s={s} row={sp} onClose={() => setEdit(false)} />}
  </>;
}

export function InvItemPage() {
  const s = useS(["inv_items", "inv_categories", "suppliers", "settings", "branches", "warehouses", "products", "brands"]), id = useId(), [edit, setEdit] = useState(false), [lv, setLv] = useState<string | null>(null), [stock, setStock] = useState<Record<string, number> | null>(null);
  useEffect(() => { sb.rpc("skwyd_stock_all").then(({ data }) => { const m: Record<string, number> = {}; (data || []).forEach((r: any) => { if (r.item_id === id) m[r.location_id] = +r.qty; }); setStock(m); }); }, [id]);
  if (!s) return null; const it = s.inv_items.find(x => x.id === id); if (!it) return <Missing back="Products" to="/inv-items" />;
  const locs: [string, string][] = [...s.branches.filter(b => live(b) && b.active !== false).map(b => [b.id, b.name] as [string, string]), ...s.warehouses.filter(live).map(w => [w.id, w.name + (w.reference ? ` (${w.reference})` : "")] as [string, string])];
  const ingCost = (it.ingredients || []).reduce((a: number, g: any) => { const x = s.inv_items.find(y => y.id === g.itemId); return a + (x ? (+g.qty || 0) / (+x.factor || 1) * (+x.cost || 0) : 0); }, 0);
  const levels: any = ((s.settings.find(x => x.id === "inv_levels") as any)?.levels) || {}, mine = levels[it.id] || {}, lvb = Object.entries(mine).filter(([b]) => locs.some(x => x[0] === b)) as [string, any][];
  const usedIn = s.products.filter(p => live(p) && (p.ingredients || []).some((l: any) => l.itemId === it.id));
  return <>
    <Head back="Products" backTo="/inv-items" title={it.name}><Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Product</Button></Head>
    <Info rows={[["Name", it.name], ["Name Localized", it.nameAr || "—"], ["SKU", it.sku || "—"], ["Storage Unit", it.storageUnit || "—"], ["Ingredient Unit", it.ingredientUnit || "—"],
      ["Factor", it.storageUnit && it.ingredientUnit ? `1 ${it.storageUnit} = ${n2(it.factor || 1)} ${it.ingredientUnit}` : "—"], ["Costing Method", it.costingMethod === "transactions" ? "From Transactions" : "Fixed"], ["Category", it.category || "—"],
      ["Cost", it.cost ? `${cost5(it.cost)} / ${it.storageUnit || "unit"}` : "—"], ...((it.ingredients || []).length ? [["Total Cost of Production", `${cost5(ingCost)} / ${it.storageUnit || "unit"}`] as [string, string]] : [])]} />
    <Tags s={s} type="inventory" id={it.id} />
    <Ingredients s={s} col="inv_items" rec={it} />
    <SupLinks s={s} side="item" id={it.id} />
    <Sec title="Inventory Levels" act={<Button size="sm" variant="outline" disabled={lvb.length >= locs.length} onClick={() => setLv("")}><PlusIcon className="size-4" />Add</Button>}>
      {!lvb.length ? <None t="Add the minimum, par and maximum level of this product for a store or warehouse." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Store / Warehouse", "Minimum Level", "Par Level", "Maximum Level", ""].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
        {lvb.map(([b, v]) => <tr key={b} className={TR + " cursor-pointer"} onClick={() => setLv(b)}><td className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{locs.find(x => x[0] === b)?.[1]}<span className="block text-xs font-normal text-gray-500">{s.brands.find(x => x.id === s.branches.find(y => y.id === b)?.brandId)?.name || (s.warehouses.some(w => w.id === b) ? "Warehouse" : "")}</span></td><td className={TD}>{v.min ?? "—"}</td><td className={TD}>{v.par ?? "—"}</td><td className={TD}>{v.max ?? "—"}</td>
          <td className={TD + " text-end"}><Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={e => { e.stopPropagation(); const o = { ...mine }; delete o[b]; const next = { ...levels }; if (Object.keys(o).length) next[it.id] = o; else delete next[it.id]; void setDoc("inv_levels", { levels: next }, "Level removed"); }}><TrashBinIcon className="size-5 text-red-500" /></Button></td></tr>)}</tbody></table></div>}</Sec>
    <Sec title="Stock">{stock === null ? <None t="Loading…" /> : !Object.keys(stock).length ? <None t="Not counted anywhere yet." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className={TH}>Store / Warehouse</th><th className={TH + " text-end"}>Quantity</th></tr></thead><tbody>
      {locs.filter(([k]) => stock[k] !== undefined).map(([k, n]) => <tr key={k} className={TR}><td className={TD}>{n}</td><td className={TD + " text-end"}>{n2(stock[k])} {it.storageUnit || ""}</td></tr>)}</tbody></table></div>}</Sec>
    {usedIn.length > 0 && <Sec title="Used In Items"><div className="flex flex-wrap gap-2">{usedIn.map(p => <Link key={p.id} to={"/item?id=" + p.id}><Badge variant="light" color="primary">{p.name}</Badge></Link>)}</div></Sec>}
    {lv !== null && <LevelsDialog s={s} it={it} loc={lv} free={k => k === lv || !mine[k]} cur={mine} all={levels} onClose={() => setLv(null)} />}
    {edit && <EditDialog cfg={CRUD["inv-items"]} s={s} row={it} onClose={() => setEdit(false)} />}
  </>;
}
// one store or warehouse at a time: pick it, then its minimum, par and maximum levels
// the store is picked inside its brand (a business can have several brands, each with its stores); warehouses are their own group
function LevelsDialog({ s, it, loc, free, cur, all, onClose }: { s: S; it: Row; loc: string; free: (k: string) => boolean; cur: any; all: any; onClose: () => void }) {
  const stores = s.branches.filter(x => live(x) && x.active !== false), whs = s.warehouses.filter(live), WH = "__wh";
  const groupOf = (k: string) => whs.some(w => w.id === k) ? WH : stores.find(x => x.id === k)?.brandId || "";
  const brands = s.brands.filter(x => live(x) && stores.some(st => st.brandId === x.id && free(st.id)) || x.id === groupOf(loc));
  const [g, setG] = useState(loc ? groupOf(loc) : brands.length === 1 && !whs.some(w => free(w.id)) ? brands[0].id : "");
  const opts: [string, string][] = g === WH ? whs.filter(w => free(w.id)).map(w => [w.id, w.name + (w.reference ? ` (${w.reference})` : "")]) : stores.filter(x => x.brandId === g && free(x.id)).map(x => [x.id, x.name]);
  const [b, setB] = useState(loc), [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(["min", "par", "max"].map(x => [x, cur[loc]?.[x] != null ? String(cur[loc][x]) : ""])));
  const save = async () => { const r: any = {}; Object.entries(v).forEach(([k, n]) => { if (n.trim() !== "") r[k] = +n; });
    const o = { ...cur }; if (loc && loc !== b) delete o[loc]; if (Object.keys(r).length) o[b] = r; else delete o[b];
    const next = { ...all }; if (Object.keys(o).length) next[it.id] = o; else delete next[it.id]; await setDoc("inv_levels", { levels: next }, "Level saved"); onClose(); };
  return <Dialog open onOpenChange={x => !x && onClose()}><DialogContent className="w-full p-6 sm:max-w-md"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{loc ? "Edit Inventory Level" : "Add Inventory Level"}</DialogTitle></DialogHeader>
    <div className="mt-4 grid grid-cols-1 gap-4">
      <F l="Brand" req><select className={SEL} value={g} onChange={e => { setG(e.target.value); setB(""); }}><option value="">Choose…</option>{brands.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}{whs.some(w => free(w.id) || w.id === loc) && <option value={WH}>Warehouses</option>}</select></F>
      <F l={g === WH ? "Warehouse" : "Store"} req><select className={SEL} value={b} disabled={!g} onChange={e => setB(e.target.value)}><option value="">Choose…</option>{opts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></F>
      {([["min", "Minimum Level"], ["par", "Par Level"], ["max", "Maximum Level"]] as const).map(([k, l]) => <F key={k} l={`${l} (${it.storageUnit || "storage unit"})`}><Input type="number" min="0" step="any" value={v[k]} onChange={e => setV(o => ({ ...o, [k]: e.target.value }))} /></F>)}
    </div>
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!b} onClick={save}>Save</Button></div></DialogContent></Dialog>;
}

export function WarehousePage() {
  const s = useS(["warehouses", "brands"]), id = useId(), nav = useNavigate(), [edit, setEdit] = useState(false);
  if (!s) return null; const w = s.warehouses.find(x => x.id === id); if (!w) return <Missing back="Warehouses" to="/warehouses" />;
  return <>
    <Head back="Warehouses" backTo="/warehouses" title={w.name}><Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Warehouse</Button></Head>
    <Info rows={[["Name", w.name], ["Brand", s.brands.find(b => b.id === w.brandId)?.name || "—"], ["Reference", w.reference || "—"], ["Address", w.address || "—"], ["Created", fmtDate(w.createdAt)]]} />
    <Sec title="Delete Inventory"><p className="mb-4 text-sm text-gray-500">If you delete this warehouse inventory, all the data will be permanently deleted.</p>
      <Button variant="destructive" onClick={async () => { if (!(await askYes(`Delete all the inventory of ${w.name}? Its stock levels and counts are permanently deleted.`, "Delete", true))) return;
        const { error } = await sb.from("stock_counts").delete().eq("branch_id", w.id); if (error) toast("Couldn't delete the inventory: " + error.message, "error"); else toast("Inventory deleted"); }}>Delete Inventory</Button></Sec>
    {!w.deleted && <Sec title="Delete Warehouse"><p className="mb-4 text-sm text-gray-500">If you delete this warehouse, all of its data will be deleted.</p>
      <Button variant="destructive" onClick={async () => { if (!(await askYes(`Delete the warehouse ${w.name}?`, "Delete", true))) return; try { await put("warehouses", w.id, { deleted: true }); toast("Warehouse deleted"); nav("/warehouses"); } catch { toast("Couldn't delete the warehouse", "error"); } }}>Delete</Button></Sec>}
    {edit && <EditDialog cfg={CRUD.warehouses} s={s} row={w} onClose={() => setEdit(false)} />}
  </>;
}

/* a modifier (Sauce, Add Toppings…): its options and the items it is linked to */
export function ModifierPage() {
  const s = useS(["modifiers", "modifier_options", "products", "tax_groups"]), id = useId(), [edit, setEdit] = useState(false), [newOpt, setNewOpt] = useState(false);
  if (!s) return null; const m = s.modifiers.find(x => x.id === id); if (!m) return <Missing back="Modifiers" to="/modifiers" />;
  const opts = s.modifier_options.filter(o => live(o) && o.modifierId === m.id).sort((a, b) => (+a.sort || 0) - (+b.sort || 0) || a.name.localeCompare(b.name));
  const items = s.products.filter(p => live(p) && (p.modifiers || []).some((l: any) => l.modifierId === m.id)).sort((a, b) => a.name.localeCompare(b.name));
  const link = (p: Row) => (p.modifiers || []).find((l: any) => l.modifierId === m.id) || {};
  const setLink = async (p: Row, d: Record<string, any>, msg = "Saved") => { try { await put("products", p.id, { modifiers: (p.modifiers || []).map((l: any) => l.modifierId === m.id ? { ...l, ...d } : l) }); toast(msg); } catch { toast("Couldn't save.", "error"); } };
  const rule = (l: any) => { const mn = +l.min || 0, mx = +l.max || 0; return mn && mx && mn === mx ? `Choose ${mn}` : mn && mx ? `Choose ${mn} to ${mx}` : mn ? `At least ${mn}` : mx ? `Up to ${mx}` : "Optional"; };
  const optCfg = { ...CRUD["modifier-options"], fields: CRUD["modifier-options"].fields.map(f => f.k === "modifierId" ? { ...f, def: m.id } : f) };
  const Num = ({ p, k }: { p: Row; k: string }) => <Input key={p.id + k + (link(p)[k] ?? "")} className="h-9 w-20" type="number" min="0" defaultValue={link(p)[k] ?? 0} aria-label={k}
    onBlur={e => { const v = Math.max(0, +e.target.value || 0); if (v !== +(link(p)[k] || 0)) setLink(p, { [k]: v }); }} />;
  return <>
    <Head back="Modifiers" backTo="/modifiers" title={m.name}><Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Modifier</Button></Head>
    <Info rows={[["Name", <>{m.name}{m.deleted && <Badge className="ms-2" variant="light" color="error">Deleted</Badge>}</>], ["Name Localized", m.nameAr || "—"], ["Reference", m.reference || "—"],
      ["Options", String(opts.length)], ["Linked Items", String(items.length)], ["Free Options", opts.filter(o => !+o.price).length + " of " + opts.length]]} />
    <Sec title="Options" act={<Button size="sm" onClick={() => setNewOpt(true)}><PlusIcon className="size-4" />Add Option</Button>}>
      {!opts.length ? <None t="No options yet. Add the choices of this modifier, like Spicy or Extra Cheese." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Name", "SKU", "Price", "Tax Group"].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
        {opts.map(o => <tr key={o.id} className={TR}><td className={TD}><Link className="font-medium text-brand-500 hover:underline" to={"/option?id=" + o.id}>{o.name}</Link></td><td className={TD}>{o.sku || "—"}</td>
          <td className={TD}>{+o.price ? money(o.price) : "Free"}</td><td className={TD}>{s.tax_groups.find(g => g.id === o.taxGroup)?.name || "—"}</td></tr>)}</tbody></table></div>}
    </Sec>
    <Sec title="Linked Items" act={<PickMany label="Add item" opts={s.products.filter(p => live(p) && !items.some(x => x.id === p.id)).sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ id: p.id, name: p.name, sub: p.sku || "" }))}
      onAdd={async ids => { try { for (const pid of ids) { const p = s.products.find(x => x.id === pid)!; await put("products", pid, { modifiers: [...(p.modifiers || []), { modifierId: m.id, min: 1, max: 1, free: 0 }] }); } toast(ids.length > 1 ? `Linked to ${ids.length} items` : "Linked"); } catch { toast("Couldn't save.", "error"); } }} />}>
      {!items.length ? <None t="Not linked to any item yet. Add the items that ask for this modifier." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Item", "Rule", "Minimum", "Maximum", "Free", ""].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
        {items.map(p => <tr key={p.id} className={TR}><td className={TD}><Link className="font-medium text-brand-500 hover:underline" to={"/item?id=" + p.id}>{p.name}</Link></td><td className={TD}>{rule(link(p))}</td>
          <td className={TD}><Num p={p} k="min" /></td><td className={TD}><Num p={p} k="max" /></td><td className={TD}><Num p={p} k="free" /></td>
          <td className={TD + " text-end"}><Button size="icon-sm" variant="ghost" aria-label={"Unlink " + p.name} onClick={async () => { if (await askYes(`Remove ${m.name} from ${p.name}?`, "Remove", true)) { try { await put("products", p.id, { modifiers: (p.modifiers || []).filter((l: any) => l.modifierId !== m.id) }); toast("Removed"); } catch { toast("Couldn't save.", "error"); } } }}><TrashBinIcon className="size-4 text-error-500" /></Button></td></tr>)}</tbody></table></div>}
    </Sec>
    {edit && <EditDialog cfg={CRUD.modifiers} s={s} row={m} onClose={() => setEdit(false)} />}
    {newOpt && <EditDialog cfg={optCfg} s={s} row={null} onClose={() => setNewOpt(false)} />}
  </>;
}
