import { XLink } from "@/components/shared/xlink";
// The lists ported from the current portal's CRUD config (index.html): same tabs, columns, fields and rules.
import { lazy } from "react";
// the full store form loads with the store page, not with every list
const StoreForm = lazy(() => import("../pages/Store").then(m => ({ default: m.StoreForm })));
import { Badge } from "@/components/ui/badge";
import { fmtDate, money } from "@/lib/util";
import { newId, put, type Row } from "@/lib/db";
import { live, type CrudCfg, type IoOp, type IoSet, type S } from "./CrudPage";
import { PERMS } from "./perms";
import { sb } from "@/lib/supabase";

const del = (r: Row) => !!r.deleted;
const allDel: CrudCfg["tabs"] = [["all", "All", live], ["deleted", "Deleted", del]];
const B = ({ children }: { children: React.ReactNode }) => <span className="font-medium text-gray-900 dark:text-gray-50">{children}</span>;
const Note = ({ children }: { children: React.ReactNode }) => <span className="text-gray-500 dark:text-gray-400">{children}</span>;
const nameCell = (r: Row) => <><B>{r.name}</B>{r.nameAr ? <span className="ms-1.5 text-xs text-gray-500">{r.nameAr}</span> : null}</>;
const created = { h: "Created", cell: (r: Row) => fmtDate(r.createdAt) };
const ref = { h: "Reference", cell: (r: Row) => r.reference || "—" };
const sku = (col: string, pre: string) => (s: S) => { let n = 0; const re = new RegExp("^" + pre + "-?(\\d+)$", "i"); s[col].forEach(r => { const m = re.exec(r.sku || ""); if (m) n = Math.max(n, +m[1]); }); return pre + "-" + String(n + 1).padStart(4, "0"); };
const taxGroupOpts = (s: S) => s.tax_groups.filter(live).map(g => [g.id, g.name] as [string, string]);
const tgName = (s: S, id: string) => s.tax_groups.find(g => g.id === id)?.name || "—";

/* ---------- Import / Export (CSV) for items and modifier options ---------- */
const low = (x: unknown) => String(x ?? "").trim().toLowerCase();
const yes = (v: string) => !/^(no|false|0|inactive|n)$/i.test(v.trim());
/** one plan entry per CSV row (row numbers count the header as row 1) */
function perRow(recs: Record<string, string>[], f: (v: Record<string, string>, nNew: number) => IoOp | string): { ops: IoOp[]; errs: string[] } {
  const ops: IoOp[] = [], errs: string[] = []; let n = 0;
  recs.forEach((v, i) => { const r = f(v, n); if (typeof r === "string") errs.push(`Row ${i + 2}: ${r}`); else { ops.push(r); if (!r.id) n++; } });
  return { ops, errs };
}
const nextSku = (s: S, col: string, pre: string, n: number) => { const b = sku(col, pre)(s); return pre + "-" + String(+b.split("-")[1] + n).padStart(4, "0"); };
const findTg = (s: S, v: string) => s.tax_groups.find(g => live(g) && low(g.name) === low(v));
/** shared money / tax / cost columns of an item or a modifier option */
function readSale(v: Record<string, string>, s: S, d: Record<string, any>, isNew: boolean): string | void {
  if (v.price) { if (isNaN(+v.price)) return `Price "${v.price}" isn't a number.`; d.price = +v.price; }
  if (v["tax group"]) { const g = findTg(s, v["tax group"]); if (!g) return `Tax group "${v["tax group"]}" not found.`; d.taxGroup = g.id; }
  else if (isNew) d.taxGroup = s.tax_groups.some(g => g.id === "tg_vat") ? "tg_vat" : "";
  if (v["costing method"]) d.costingMethod = /fix/i.test(v["costing method"]) ? "fixed" : "ingredients"; else if (isNew) d.costingMethod = "ingredients";
  if (v.cost) { if (isNaN(+v.cost)) return `Cost "${v.cost}" isn't a number.`; d.cost = +v.cost; }
  if (v.active) d.active = yes(v.active); else if (isNew) d.active = true;
}
/** ingredients file: one row per ingredient; every item in the file gets exactly the ingredients listed for it */
function ingSet(name: string, col: string, what: string, list: (s: S) => Row[]): IoSet {
  const W = what[0].toUpperCase() + what.slice(1);
  return { name, head: [W + " SKU", W + " Name", "Ingredient SKU", "Ingredient Name", "Quantity"],
    exp: s => list(s).flatMap(r => (r.ingredients || []).map((g: any) => { const it = s.inv_items.find(x => x.id === g.itemId); return [r.sku, r.name, it?.sku || "", it?.name || "", g.qty]; })),
    imp: (recs, s) => {
      const errs: string[] = [], by = new Map<string, { r: Row; l: any[] }>();
      recs.forEach((v, i) => { const at = `Row ${i + 2}: `, key = v[what + " sku"], nm = v[what + " name"];
        const r = list(s).find(x => key ? low(x.sku) === low(key) : low(x.name) === low(nm)); if (!r) return errs.push(at + `${W} "${key || nm}" not found.`);
        const it = s.inv_items.find(x => live(x) && (v["ingredient sku"] ? low(x.sku) === low(v["ingredient sku"]) : low(x.name) === low(v["ingredient name"])));
        if (!it) return errs.push(at + `Ingredient "${v["ingredient sku"] || v["ingredient name"]}" not found.`);
        const q = +v.quantity; if (!(q > 0)) return errs.push(at + `Quantity "${v.quantity}" isn't a number above 0.`);
        const e = by.get(r.id) || { r, l: [] }; const old = (r.ingredients || []).find((g: any) => g.itemId === it.id);
        e.l.push({ ...(old || { net: 1, yield: 100 }), itemId: it.id, qty: q }); by.set(r.id, e); });
      return { ops: [...by.values()].map(({ r, l }) => ({ name: r.name, col, id: r.id, data: { ingredients: l } })), errs };
    } };
}
const ITEM_IO: IoSet[] = [
  { name: "items", head: ["Name", "Name Localized", "SKU", "Category", "Price", "Pricing Method", "Tax Group", "Costing Method", "Cost", "Barcode", "Active"],
    exp: s => s.products.filter(live).map(p => [p.name, p.nameAr, p.sku, s.categories.find(c => c.id === p.categoryId)?.name, p.price, p.pricingMethod === "open" ? "Open" : "Fixed",
      s.tax_groups.find(g => g.id === p.taxGroup)?.name, p.costingMethod === "fixed" ? "Fixed" : "Ingredients", p.cost, p.barcode, p.active === false ? "No" : "Yes"]),
    imp: (recs, s) => perRow(recs, (v, n) => {
      const old = v.sku ? s.products.find(p => live(p) && low(p.sku) === low(v.sku)) : s.products.find(p => live(p) && low(p.name) === low(v.name)), isNew = !old, d: Record<string, any> = {};
      if (v.name) d.name = v.name; else if (isNew) return "Name is missing.";
      if (v["name localized"]) d.nameAr = v["name localized"];
      if (v.category) { const c = s.categories.find(c => live(c) && !c.channel && (low(c.name) === low(v.category) || low(c.reference) === low(v.category))); if (!c) return `Category "${v.category}" not found.`; d.categoryId = c.id; }
      else if (isNew) return "Category is missing.";
      if (v["pricing method"]) d.pricingMethod = /open/i.test(v["pricing method"]) ? "open" : "fixed"; else if (isNew) d.pricingMethod = "fixed";
      const e = readSale(v, s, d, isNew); if (e) return e;
      if (isNew && d.pricingMethod === "fixed" && d.price == null) return "Price is missing.";
      if (v.barcode) d.barcode = v.barcode;
      if (isNew) { d.sku = v.sku || nextSku(s, "products", "PR", n); d.sellingMethod = "unit"; }
      return { name: d.name || old!.name, col: "products", id: old?.id, data: d };
    }) },
  ingSet("items ingredients", "products", "item", s => s.products.filter(live))];
const MOD_IO: IoSet[] = [
  { name: "modifiers", head: ["Name", "Name Localized", "Reference"],
    exp: s => s.modifiers.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(m => [m.name, m.nameAr, m.reference]),
    imp: (recs, s) => { const seen = new Set<string>(); return perRow(recs, v => {
      const old = v.reference ? s.modifiers.find(m => live(m) && low(m.reference) === low(v.reference)) : s.modifiers.find(m => live(m) && low(m.name) === low(v.name)), d: Record<string, any> = {};
      if (v.name) d.name = v.name; else if (!old) return "Name is missing.";
      const k = low(d.name || old!.name); if (seen.has(k)) return `"${d.name || old!.name}" is already earlier in the file.`; seen.add(k);
      if (!old && s.modifiers.some(m => live(m) && low(m.name) === k)) return `Another modifier is already called "${d.name}".`;
      if (v["name localized"]) d.nameAr = v["name localized"]; if (v.reference) d.reference = v.reference;
      return { name: d.name || old!.name, col: "modifiers", id: old?.id, data: d }; }); } }];
const OPTION_IO: IoSet[] = [
  { name: "options", head: ["Modifier", "Name", "Name Localized", "SKU", "Price", "Tax Group", "Costing Method", "Cost", "Active"],
    exp: s => s.modifier_options.filter(live).map(o => [s.modifiers.find(m => m.id === o.modifierId)?.name, o.name, o.nameAr, o.sku, o.price ?? 0,
      s.tax_groups.find(g => g.id === o.taxGroup)?.name, o.costingMethod === "fixed" ? "Fixed" : "Ingredients", o.cost, o.active === false ? "No" : "Yes"]),
    imp: (recs, s) => perRow(recs, (v, n) => {
      const mod = v.modifier ? s.modifiers.find(m => live(m) && low(m.name) === low(v.modifier)) : undefined;
      const old = v.sku ? s.modifier_options.find(o => live(o) && low(o.sku) === low(v.sku)) : s.modifier_options.find(o => live(o) && low(o.name) === low(v.name) && (!mod || o.modifierId === mod.id));
      const isNew = !old, d: Record<string, any> = {};
      if (v.name) d.name = v.name; else if (isNew) return "Name is missing.";
      if (v["name localized"]) d.nameAr = v["name localized"];
      if (mod) d.modifierId = mod.id; else if (v.modifier) d.modifierId = "new:" + v.modifier; else if (isNew) return "Modifier is missing.";
      const e = readSale(v, s, d, isNew); if (e) return e;
      if (isNew) { d.sku = v.sku || nextSku(s, "modifier_options", "MD", n); if (d.price == null) d.price = 0; }
      return { name: d.name || old!.name, col: "modifier_options", id: old?.id, data: d };
    }),
    // a modifier named in the file that doesn't exist yet is created once
    before: async (d, cache) => { const m = /^new:(.*)$/.exec(String(d.modifierId || "")); if (!m) return; const k = low(m[1]);
      if (!cache[k]) { cache[k] = newId("mod"); await put("modifiers", cache[k], { name: m[1].trim(), deleted: false }); } d.modifierId = cache[k]; } },
  ingSet("options ingredients", "modifier_options", "option", s => s.modifier_options.filter(live))];
const bySort = (a: Row, b: Row) => (a.sort ?? 999) - (b.sort ?? 999) || String(a.name).localeCompare(String(b.name));
const TYPE_LBL: Record<string, string> = { dinein: "In Store", fast: "In Store", pickup: "Pickup", delivery: "Delivery" };
const PM_TYPES: [string, string][] = [["cash", "Cash"], ["card", "Card"], ["other", "Other"]];
const SYS_SRC = (n: string) => /^(web|api)$/i.test(String(n || "").trim());
const isAdminRow = (r: Row) => !!r && (r.role === "owner" || r.role === "admin");
export async function pinHash(id: string, pin: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("slick:" + id + ":" + pin)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const OnOff = ({ on }: { on: boolean }) => <Badge variant="light" color={on ? "success" : "gray"}>{on ? "Active" : "Inactive"}</Badge>;

export const CRUD: Record<string, CrudCfg> = {
  categories: {
    col: "categories", title: "Categories", one: "Category", needs: ["products"],
    filters: () => [{ k: "name", l: "Name", get: r => r.name + " " + (r.nameAr || "") }, { k: "ref", l: "Reference", get: r => r.reference }, { k: "created", l: "Created After", t: "date", get: r => r.createdAt }],
    tabs: [["all", "All", r => live(r) && !r.channel], ["deleted", "Deleted", r => del(r) && !r.channel]],
    search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: r => <B>{r.name}</B> }, ref,
      { h: "Products", cell: (r, s) => <XLink className="text-blue-500 hover:underline" to={"/products?cat=" + r.id} onClick={e => e.stopPropagation()}>Products ({s.products.filter(p => live(p) && p.categoryId === r.id).length})</XLink> }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" }],
  },
  products: {
    col: "products", title: "Items", one: "Item", needs: ["categories", "tax_groups", "modifiers", "settings", "inv_items"], detail: "/item", urlFilter: ["cat", "categoryId"], io: ITEM_IO,
    kids: (r, s) => (r.variants || []).map((v: any) => s.products.find(x => x.id === v.productId && live(x))).filter(Boolean) as Row[],
    filters: s => { const tg: any = s.settings.find(x => x.id === "tags") || {}, on = (tg.on || {}).product || {}, al: any = s.settings.find(x => x.id === "allergens") || {};
      const alls: string[] = Array.isArray(al.list) ? al.list : [...new Set(s.products.flatMap(p => p.allergens || []))] as string[];
      return [{ k: "name", l: "Name", get: r => r.name + " " + (r.nameAr || "") }, { k: "sku", l: "SKU", get: r => r.sku }, { k: "barcode", l: "Barcode", get: r => r.barcode },
        { k: "cat", l: "Categories", t: "multi", opts: s.categories.filter(c => live(c) && !c.channel).sort(bySort).map(c => [c.id, c.name]), get: r => r.categoryId },
        { k: "mod", l: "Modifiers", t: "multi", opts: s.modifiers.filter(live).map(m => [m.id, m.name]), get: r => (r.modifiers || []).map((l: any) => l.modifierId) },
        { k: "ingr", l: "Have Ingredients", t: "multi", opts: [["yes", "Yes"], ["no", "No"]], get: r => (r.ingredients || []).length ? "yes" : "no" },
        { k: "hasTags", l: "Has Tags", t: "multi", opts: [["yes", "Yes"], ["no", "No"]], get: r => (on[r.id] || []).length ? "yes" : "no" },
        { k: "tags", l: "Tags", t: "multi", opts: (tg.list || []).filter((t: any) => t.type === "product" && !t.deleted).map((t: any) => [t.id, t.name]), get: r => on[r.id] || [] },
        { k: "tax", l: "Tax Groups", t: "multi", opts: s.tax_groups.filter(live).map(g => [g.id, g.name]), get: r => r.taxGroup },
        { k: "costing", l: "Costing Method", t: "multi", opts: [["ingredients", "From Ingredients"], ["fixed", "Fixed Cost"]], get: r => r.costingMethod || "ingredients" },
        { k: "active", l: "Active", t: "multi", opts: [["yes", "Yes"], ["no", "No"]], get: r => r.active !== false ? "yes" : "no" },
        { k: "allergens", l: "Allergens", t: "multi", opts: alls.map(a => [a, a]), get: r => r.allergens || [] },
        { k: "created", l: "Created After", t: "date", get: r => r.createdAt }]; },
    tabs: allDel,
    search: (r, s) => r.name + " " + (r.sku || "") + " " + (s.categories.find(c => c.id === r.categoryId)?.name || ""),
    cols: [
      { h: "Name", cell: r => <span className="flex items-center gap-3">{r.imageUrl ? <img src={r.imageUrl} alt="" className="size-10 rounded-lg object-cover" /> : <span className="size-10 rounded-lg bg-gray-100 dark:bg-white/5" />}<B>{r.name}</B>{(r.variants || []).filter((v: any) => v.productId).length ? <Badge variant="light" color="primary">{(r.variants || []).filter((v: any) => v.productId).length} variants</Badge> : null}</span> },
      { h: "SKU", cell: r => r.sku || "" },
      { h: "Category", cell: (r, s) => s.categories.find(c => c.id === r.categoryId)?.name || "—" },
      { h: "Price", cell: r => r.pricingMethod === "open" ? "Open" : money(r.price) },
      { h: "Tax Group", cell: (r, s) => tgName(s, r.taxGroup) }],
    fields: [{ k: "imageUrl", l: "Image", t: "image" }, { k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" },
      { k: "categoryId", l: "Category", t: "select", req: true, opts: s => s.categories.filter(c => live(c) && !c.channel).sort(bySort).map(c => [c.id, c.name]) },
      { k: "sku", l: "SKU", auto: sku("products", "PR") },
      { k: "pricingMethod", l: "Pricing Method", t: "select", opts: () => [["fixed", "Fixed Price"], ["open", "Open Price"]], def: "fixed" },
      { k: "price", l: "Price (USD)", t: "number", req: true, when: { k: "pricingMethod", is: "fixed" } },
      { k: "taxGroup", l: "Tax Group", t: "select", opts: taxGroupOpts, def: "tg_vat" },
      { k: "costingMethod", l: "Costing Method", t: "select", opts: () => [["ingredients", "From Ingredients"], ["fixed", "Fixed Cost"]], def: "ingredients" },
      { k: "cost", l: "Fixed Cost (USD)", t: "number", req: true, when: { k: "costingMethod", is: "fixed" } },
      { k: "sellingMethod", l: "Selling Method", t: "select", opts: () => [["unit", "Unit"], ["weight", "Weight"]], def: "unit" },
      { k: "barcode", l: "Barcode" }, { k: "prepTime", l: "Preparation Time (Minute)", t: "number" },
      { k: "description", l: "Description", t: "textarea" }, { k: "descriptionAr", l: "Description Localized", t: "textarea" }],
  },
  modifiers: {
    col: "modifiers", title: "Modifiers", one: "Modifier", needs: ["modifier_options", "products"], tabs: allDel, detail: "/modifier", io: MOD_IO,
    filters: () => [{ k: "name", l: "Name", get: r => r.name + " " + (r.nameAr || "") }, { k: "ref", l: "Reference", get: r => r.reference }, { k: "created", l: "Created After", t: "date", get: r => r.createdAt }],
    search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: nameCell }, ref,
      { h: "Options", cell: (r, s) => <XLink className="text-blue-500 hover:underline" to={"/modifiers?view=options&mod=" + r.id} onClick={e => e.stopPropagation()}>Options ({s.modifier_options.filter(o => live(o) && o.modifierId === r.id).length})</XLink> },
      { h: "Linked Products", cell: (r, s) => `Products (${s.products.filter(p => live(p) && (p.modifiers || []).some((l: any) => l.modifierId === r.id)).length})` }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" }],
    unique: "name",
  },
  "modifier-options": {
    col: "modifier_options", title: "Modifier Options", one: "Modifier Option", needs: ["modifiers", "tax_groups", "inv_items", "settings"], tabs: allDel, urlFilter: ["mod", "modifierId"], detail: "/option", io: OPTION_IO,
    filters: s => { const al: any = s.settings.find(x => x.id === "allergens") || {}, alls: string[] = Array.isArray(al.list) ? al.list : [...new Set(s.modifier_options.flatMap(o => o.allergens || []))] as string[];
      return [{ k: "name", l: "Name", get: r => r.name + " " + (r.nameAr || "") }, { k: "mod", l: "Modifiers", t: "multi", opts: s.modifiers.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(m => [m.id, m.name]), get: r => r.modifierId },
        { k: "sku", l: "SKU", get: r => r.sku },
        { k: "tags", l: "Tags", t: "multi", opts: ((s.settings.find(x => x.id === "tags") as any)?.list || []).filter((t: any) => t.type === "option" && !t.deleted).map((t: any) => [t.id, t.name]), get: r => (((s.settings.find(x => x.id === "tags") as any)?.on || {}).option || {})[r.id] || [] },
        { k: "created", l: "Created After", t: "date", get: r => r.createdAt },
        { k: "allergens", l: "Allergens", t: "multi", opts: alls.map(a => [a, a]), get: r => r.allergens || [] }]; },
    sort: (a, b) => String(a.modifierId).localeCompare(String(b.modifierId)) || bySort(a, b),
    search: (r, s) => r.name + " " + (r.sku || "") + " " + (s.modifiers.find(m => m.id === r.modifierId)?.name || ""),
    cols: [{ h: "Name", cell: r => <B>{r.name}</B> }, { h: "SKU", cell: r => r.sku || "" },
      { h: "Modifier", cell: (r, s) => s.modifiers.find(m => m.id === r.modifierId)?.name || "—" },
      { h: "Price", cell: r => +r.price ? money(r.price) : <Note>Free</Note> }, { h: "Tax Group", cell: (r, s) => tgName(s, r.taxGroup) }],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" },
      { k: "modifierId", l: "Modifier", t: "select", req: true, opts: s => s.modifiers.filter(live).sort((a, b) => a.name.localeCompare(b.name)).map(m => [m.id, m.name]) },
      { k: "sku", l: "SKU", auto: sku("modifier_options", "MD") }, { k: "price", l: "Price (USD)", t: "number", def: 0 },
      { k: "taxGroup", l: "Tax Group", t: "select", opts: taxGroupOpts, def: "tg_vat" },
      { k: "costingMethod", l: "Costing Method", t: "select", opts: () => [["ingredients", "From Ingredients"], ["fixed", "Fixed Cost"]], def: "ingredients" },
      { k: "cost", l: "Fixed Cost (USD)", t: "number", req: true, when: { k: "costingMethod", is: "fixed" } }],
  },
  variants: {
    col: "variant_sets", title: "Variants", one: "Variant", needs: ["products"], tabs: allDel,
    search: r => r.name + " " + (r.options || []).join(" "),
    cols: [{ h: "Name", cell: nameCell }, { h: "Options", cell: r => <span className="flex flex-wrap gap-1.5">{(r.options || []).map((o: string) => <Badge key={o} variant="light" color="gray">{o}</Badge>)}</span> },
      { h: "Products", cell: (r, s) => s.products.filter(p => live(p) && p.variantSetId === r.id).length, num: true }],
    fields: [{ k: "name", l: "Name", req: true, ph: "e.g. Size" }, { k: "nameAr", l: "Name Localized" },
      { k: "options", l: "Options", t: "items", req: true, note: "Add each option one by one (Small, then Medium, then Large). Then open a product and choose this variant: each option becomes its own product with its own price." }],
    unique: "name",
    prep: data => { const list = (data.options || []).map((x: string) => String(x).trim()).filter(Boolean);
      if (list.length < 2) return "Add at least two variants."; if (new Set(list.map((x: string) => x.toLowerCase())).size !== list.length) return "Each variant name must be different."; data.options = list; },
    canDelete: (r, s) => { const used = s.products.filter(p => live(p) && p.variantSetId === r.id); return used.length ? `This variant set is used by ${used.length} product${used.length === 1 ? "" : "s"}. Remove it from those products first.` : ""; },
  },
  brands: {
    col: "brands", title: "Brands", one: "Brand", needs: ["branches"], tabs: allDel, detail: "/brand",
    cols: [{ h: "Brand", cell: nameCell }, { h: "Stores", cell: (r, s) => s.branches.filter(b => b.brandId === r.id).length, num: true }],
    fields: [{ k: "name", l: "Brand Name", req: true }, { k: "nameAr", l: "Name Localized" }],
    canDelete: (r, s) => { const n = s.branches.filter(b => b.brandId === r.id).length; return n ? `Delete this brand's ${n} store${n === 1 ? "" : "s"} first (Manage → Stores).` : ""; },
  },
  branches: {
    col: "branches", title: "Stores", one: "Store", scope: { brand: r => [r.brandId] }, needs: ["brands", "tax_groups", "settings", "users", "zones"], detail: "/store", form: p => <StoreForm {...p} />,
    filters: s => { const tg: any = s.settings.find(x => x.id === "tags") || {}, on = (tg.on || {}).branch || {};
      return [{ k: "name", l: "Name", get: r => r.name + " " + (r.nameAr || "") }, { k: "code", l: "Reference", get: r => r.code },
        { k: "tag", l: "Tag", t: "multi", opts: (tg.list || []).filter((t: any) => t.type === "branch" && !t.deleted).map((t: any) => [t.id, t.name]), get: r => on[r.id] || [] },
        { k: "taxGroup", l: "Tax Group", t: "multi", opts: s.tax_groups.filter(live).map(g => [g.id, g.name]), get: r => r.settings?.taxGroup },
        { k: "user", l: "User", t: "multi", opts: s.users.filter(live).map(u => [u.id, u.name]), get: r => s.users.filter(u => (u.branchIds || []).includes(r.id)).map(u => u.id) },
        { k: "zone", l: "Delivery Zone", t: "multi", opts: s.zones.filter(live).map(z => [z.id, z.name]), get: r => s.zones.filter(z => z.branchId === r.id).map(z => z.id) },
        { k: "created", l: "Created After", t: "date", get: r => r.createdAt }]; },
    tabs: [["all", "All", r => live(r) && r.active !== false], ["deleted", "Deleted", r => !!r.deleted || r.active === false]],
    cols: [{ h: "Name", cell: (r, s) => <><B>{r.name}</B>{s.brands.filter(live).length > 1 ? <span className="ms-1.5 text-xs text-gray-500">{s.brands.find(b => b.id === r.brandId)?.name}</span> : null}</> },
      { h: "Reference", cell: r => r.code || "—" }, { h: "Tax Group", cell: (r, s) => s.tax_groups.find(g => g.id === r.settings?.taxGroup)?.name || "—" },
      { h: "Active", cell: r => <OnOff on={r.active !== false} /> }, created],
    fields: [{ k: "brandId", l: "Brand", t: "select", req: true, opts: s => s.brands.filter(live).map(b => [b.id, b.name]), auto: s => { const l = s.brands.filter(live); return l.length === 1 ? l[0].id : ""; } },
      { k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" },
      { k: "code", l: "Reference", req: true, auto: s => "B" + (Math.max(-1, ...s.branches.map(b => +((/^B(\d+)$/i.exec(b.code || "") || [])[1] ?? -1))) + 1) },
      { k: "phone", l: "Phone" }, { k: "city", l: "City" }, { k: "address", l: "Address", full: true },
      { k: "open", l: "Opens At", ph: "11:00" }, { k: "close", l: "Closes At", ph: "23:30" }, { k: "taxNumber", l: "Tax Registration Number" },
      { k: "callCenter", l: "Takes call center orders", t: "chk", def: true }, { k: "active", l: "Active", t: "chk", def: true }],
    unique: "name",
    prep: (data, id) => { if (!id) data.settings = {}; },
  },
  taxes: {
    col: "taxes", title: "Taxes", one: "Tax", needs: ["tax_groups"], tabs: allDel,
    cols: [{ h: "Name", cell: nameCell }, { h: "Rate", cell: r => (+r.rate || 0) + " %", num: true }, { h: "Pricing", cell: r => r.inclusive === false ? "Added on top" : "Inclusive" },
      { h: "Order Types", cell: r => { const l = r.orderTypes || []; return l.length ? [...new Set(l.map((t: string) => t === "fast" ? "dinein" : t))].map((t: any) => TYPE_LBL[t] || t).join(", ") : "All"; } },
      { h: "Used In Groups", cell: (r, s) => s.tax_groups.filter(g => live(g) && (g.taxIds || []).includes(r.id)).map(g => g.name).join(", ") || "—" }, created],
    fields: [{ k: "name", l: "Name", req: true, ph: "e.g. VAT" }, { k: "nameAr", l: "Name Localized" }, { k: "rate", l: "Rate (%)", t: "number", req: true },
      { k: "orderTypes", l: "Applies On", t: "multi", opts: () => [["dinein", "In Store"], ["pickup", "Pickup"], ["delivery", "Delivery"]], def: ["dinein", "pickup", "delivery"] },
      { k: "inclusive", l: "Tax inclusive", t: "chk", def: true }],
    unique: "name",
  },
  "tax-groups": {
    col: "tax_groups", title: "Tax Groups", one: "Tax Group", needs: ["taxes", "products"], tabs: allDel,
    search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: r => <B>{r.name}</B> }, ref, { h: "Taxes", cell: (r, s) => (r.taxIds || []).map((id: string) => s.taxes.find(t => t.id === id)?.name || "?").join(" + ") || "None" },
      { h: "Products", cell: (r, s) => s.products.filter(p => live(p) && p.taxGroup === r.id).length, num: true }],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" },
      { k: "taxIds", l: "Taxes in this group", t: "multi", opts: s => s.taxes.filter(live).map(t => [t.id, t.name]) }],
    unique: "name",
  },
  "payment-methods": {
    col: "payment_methods", title: "Payment Methods", one: "Payment Method",
    tabs: [["all", "All", live], ["active", "Active", r => live(r) && r.active !== false], ["inactive", "Inactive", r => live(r) && r.active === false], ["deleted", "Deleted", del]],
    sort: bySort, sortable: true, search: r => r.name + " " + (r.code || ""),
    cols: [{ h: "Name", cell: nameCell }, { h: "Type", cell: r => PM_TYPES.find(t => t[0] === r.type)?.[1] || "Other" }, { h: "Code", cell: r => r.code || "—" },
      { h: "Auto Open Cash Drawer", cell: r => r.openDrawer ? "Yes" : "No" }, { h: "Active", cell: r => <OnOff on={r.active !== false} /> }],
    fields: [{ k: "name", l: "Name", req: true, ph: "e.g. Cash, Visa, OMT" }, { k: "nameAr", l: "Name Localized" },
      { k: "type", l: "Type", t: "select", req: true, opts: () => PM_TYPES, def: "cash", lockEdit: true }, { k: "code", l: "Code" },
      { k: "openDrawer", l: "Auto Open Cash Drawer", t: "chk", def: false }, { k: "active", l: "Active", t: "chk", def: true }],
    unique: "name",
  },
  "order-sources": {
    col: "order_sources", title: "Order Sources", one: "Order Source",
    tabs: [["all", "All", r => live(r) && !SYS_SRC(r.name)], ["deleted", "Deleted", r => del(r) && !SYS_SRC(r.name)]],
    prep: data => SYS_SRC(data.name) ? `"${data.name}" is set automatically on web and API orders. Choose another name.` : "",
    sort: bySort, sortable: true, noSearch: true, search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: nameCell }, ref],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" }],
    unique: "name",
  },
  "inv-categories": {
    col: "inv_categories", title: "Inventory Categories", one: "Category", needs: ["inv_items"], tabs: allDel,
    search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: nameCell }, ref, { h: "Products", cell: (r, s) => <XLink className="text-blue-500 hover:underline" to={"/inv-items?icat=" + encodeURIComponent(r.name)} onClick={e => e.stopPropagation()}>Products ({s.inv_items.filter(i => live(i) && i.category === r.name).length})</XLink> }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" }],
    unique: "name",
  },
  warehouses: {
    col: "warehouses", title: "Warehouses", one: "Warehouse", scope: { brand: r => [r.brandId] }, needs: ["brands"], tabs: allDel, detail: "/warehouse",
    sort: (a, b) => String(a.reference || "").localeCompare(String(b.reference || ""), undefined, { numeric: true }) || String(a.name).localeCompare(String(b.name)),
    search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: r => <B>{r.name}</B> }, ref, { h: "Brand", cell: (r, s) => s.brands.find(b => b.id === r.brandId)?.name || "—" }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "brandId", l: "Brand", t: "select", req: true, opts: s => s.brands.filter(live).map(b => [b.id, b.name]), auto: s => { const l = s.brands.filter(live); return l.length === 1 ? l[0].id : ""; } },
      { k: "reference", l: "Reference", req: true, auto: s => "W" + String(Math.max(0, ...s.warehouses.map(w => +((/^W(\d+)$/i.exec(w.reference || "") || [])[1] || 0))) + 1).padStart(2, "0") },
      { k: "address", l: "Address", t: "textarea" }],
    unique: "name",
  },
  suppliers: {
    col: "suppliers", title: "Suppliers", one: "Supplier", tabs: allDel, detail: "/supplier",
    search: r => [r.name, r.code, r.contactName, r.phone, r.email].join(" "),
    cols: [{ h: "Name", cell: r => <B>{r.name}</B> }, { h: "Code", cell: r => r.code || "" }, { h: "Contact", cell: r => r.contactName || "—" }, { h: "Phone", cell: r => r.phone || "—" }, { h: "Email", cell: r => r.email || "—" }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "code", l: "Code", auto: s => "SUP-" + String(s.suppliers.length + 1).padStart(3, "0") }, { k: "contactName", l: "Contact Name" }, { k: "phone", l: "Phone" }, { k: "email", l: "Email" },
      { k: "address", l: "Address", full: true }, { k: "notes", l: "Notes", t: "textarea" }],
    unique: "name",
  },
  users: {
    col: "users", title: "Employees", one: "Employee", scope: { store: r => r.branchIds || [] }, needs: ["roles", "branches"], detail: "/employee",
    tabs: [["all", "All", r => live(r) && !isAdminRow(r)], ["deleted", "Deleted", r => del(r) && !isAdminRow(r)]],
    search: r => r.name + " " + (r.email || "") + " " + (r.phone || "") + " " + (r.employeeNo || "") + " " + (r.jobTitle || ""),
    cols: [{ h: "Name", cell: r => <><B>{r.name}</B>{r.employeeNo ? <span className="ms-1.5 text-xs text-gray-500">{r.employeeNo}</span> : null}</> },
      { h: "Job Title", cell: r => r.jobTitle || "—" },
      { h: "Console Access", cell: r => r.email ? <Badge variant="light" color={r.userId ? "success" : "gray"}>{r.userId ? "Active" : "Invited"}</Badge> : <Badge variant="light" color="gray">Inactive</Badge> },
      { h: "App Access", cell: r => <Badge variant="light" color={r.pinHash ? "success" : "gray"}>{r.pinHash ? "Active" : "Inactive"}</Badge> },
      { h: "Roles", cell: (r, s) => (r.roleIds?.length ? r.roleIds : r.roleId ? [r.roleId] : []).map((id: string) => s.roles.find(x => x.id === id)?.name || "—").join(", ") || "—" }],
    fields: [{ k: "@a", l: "Account", t: "head" }, { k: "name", l: "Name", req: true, ph: "The employee's full name." },
      { k: "language", l: "Language", t: "select", opts: () => [["en", "English"], ["ar", "Arabic"]], def: "en" },
      { k: "phone", l: "Phone Number", t: "phone", req: true, note: "Employees sign in to the SKWYD apps with this number." },
      { k: "email", l: "Email", ph: "Needed only to log in to the back office" },
      { k: "pin", l: "Login PIN", t: "pin", note: "A unique 5-digit PIN the user types to sign in on the cashier app." },
      { k: "displayLocalized", l: "Display localized names", t: "chk", def: false },
      { k: "@e", l: "Employment", t: "head" }, { k: "employeeNo", l: "Employee Number", ph: "e.g. 1024" }, { k: "jobTitle", l: "Job Title", ph: "e.g. Cashier" },
      { k: "hireDate", l: "Hire Date", t: "date" }, { k: "birthDate", l: "Date Of Birth", t: "date" },
      { k: "employmentType", l: "Employment Type", t: "select", req: true, opts: () => [["full", "Full Time"], ["part", "Part Time"], ["temp", "Temporary"], ["intern", "Intern"]] },
      { k: "payType", l: "Pay Type", t: "select", req: true, opts: () => [["monthly", "Monthly Salary"], ["hourly", "Hourly Rate"], ["daily", "Daily Rate"]] },
      { k: "payRate", l: "Pay Rate (USD)", t: "number", ph: "Per month, hour or day" }, { k: "leaveDays", l: "Annual Leave Days", t: "number", ph: "e.g. 15 a year" },
      { k: "socialSecurity", l: "Registered for social security (payroll deducts it)", t: "chk", def: false },
      { k: "@c", l: "Emergency Contact", t: "head" }, { k: "emergencyName", l: "Contact Name" }, { k: "emergencyPhone", l: "Contact Phone", t: "phone" },
      { k: "notes", l: "Notes", t: "textarea" }],
    note: "POS users sign in on the tablet with their PIN. Back-office passwords are set on the employee's page (Create Password).",
    prep: async (data, id, s) => {
      const pin = data.pin; delete data.pin;
      const pn = (v: any) => String(v || "").replace(/\D/g, "");
      if (data.phone && s.users.some(x => live(x) && x.id !== id && pn(x.phone) === pn(data.phone))) return "Another employee has this phone number. Each employee signs in with their own number.";
      if (id) delete data.roleIds; else { data.roleIds = []; data.roleId = null; data.active = true; data.branchIds = ["-"]; data.id = "usr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
      if (data.email) data.email = String(data.email).toLowerCase();
      if (data.email && s.users.some(u => u.id !== id && live(u) && String(u.email || "").toLowerCase() === data.email)) return "Another user already has this email.";
      if (pin) { if (!/^\d{5}$/.test(pin)) return "The Login PIN must be exactly 5 digits.";
        const myId = id || data.id;
        for (const u of s.users.filter(u => live(u) && u.id !== myId && u.pinHash)) if (await pinHash(u.id, pin) === u.pinHash || await pinHash(u.id, pin.slice(0, 4)) === u.pinHash) return "This PIN clashes with another user's PIN. Pick a different one (Generate).";
        data.pinHash = await pinHash(myId, pin); }
    },
    saved: async (old, data) => { const call = async (body: any) => { const { data: d, error } = await sb.functions.invoke("team-account", { body }); if (error || d?.error) throw new Error(d?.error || "Couldn't save the login."); };
      if (!old) await call({ employeeId: "", all: true }); else if (old.phone !== data.phone) await call({ employeeId: old.id }); },
  },
  roles: {
    col: "roles", title: "Roles", one: "Role", needs: ["users"], tabs: [["all", "All", live]],
    cols: [{ h: "Name", cell: r => <><B>{r.name}</B>{r.description ? <span className="block text-xs text-gray-500">{r.description}</span> : null}</> },
      { h: "Back Office", cell: r => { const n = (r.permissions || []).filter((p: string) => p.startsWith("bo_")).length; return n ? (r.permissions.includes("bo_manage") ? <Badge variant="light" color="success">Full admin</Badge> : n + " areas") : <Note>No access</Note>; } },
      { h: "POS", cell: r => { const n = (r.permissions || []).filter((p: string) => p.startsWith("pos_")).length; return n ? n + " permissions" : <Note>No access</Note>; } },
      { h: "Employees", cell: (r, s) => s.users.filter(u => live(u) && ((u.roleIds || []).includes(r.id) || u.roleId === r.id)).length, num: true }],
    fields: [{ k: "name", l: "Name", req: true, ph: "The name of the role in the organization." }, { k: "nameAr", l: "Name Localized", ph: "The localized name in a 2nd language" },
      { k: "permissions", l: "Authorities", t: "multi", opts: () => PERMS.map(p => p[0].startsWith("@") ? [p[0], p[0]] as [string, string] : [p[0], p[1]] as [string, string]) }],
    unique: "name",
    canDelete: (r, s) => { const n = s.users.filter(u => !u.deleted && ((u.roleIds || []).includes(r.id) || u.roleId === r.id)).length; return n ? `This role is used by ${n} employee${n === 1 ? "" : "s"}. Remove it from ${n === 1 ? "that employee" : "those employees"} first.` : ""; },
  },
  "inv-items": {
    col: "inv_items", title: "Inventory Products", one: "Product", needs: ["inv_categories"], detail: "/inv-item", urlFilter: ["icat", "category"],
    tabs: [["all", "All", live], ["items", "Products", r => live(r) && !(r.ingredients || []).length && !r.menuItem], ["produced", "Production Products", r => live(r) && (r.ingredients || []).length > 0], ["menu", "Product Items", r => live(r) && !!r.menuItem], ["deleted", "Deleted", del]],
    sort: (a, b) => String(b.sku || "").localeCompare(String(a.sku || ""), undefined, { numeric: true }),
    search: r => r.name + " " + (r.sku || "") + " " + (r.category || ""),
    cols: [{ h: "Name", cell: r => <B>{r.name}</B> }, { h: "SKU", cell: r => r.sku || "" }, { h: "Category", cell: r => r.category || "—" }],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "sku", l: "SKU", req: true, auto: sku("inv_items", "IN") },
      { k: "category", l: "Category", t: "select", opts: s => s.inv_categories.filter(live).map(c => [c.name, c.name]) },
      { k: "storageUnit", l: "Storage Unit", req: true, ph: "e.g. kg, box, gallon" }, { k: "ingredientUnit", l: "Ingredient Unit", req: true, ph: "e.g. gram, ml, piece" },
      { k: "factor", l: "Storage To Ingredient", t: "number", req: true, ph: "e.g. 1000" },
      { k: "costingMethod", l: "Costing Method", req: true, t: "select", opts: () => [["transactions", "From Transactions"], ["fixed", "Fixed"]], def: "transactions" },
      { k: "barcode", l: "Barcode" }, { k: "cost", l: "Cost (Per Storage Unit)", t: "number", req: true, when: { k: "costingMethod", is: "fixed" } }],
  },
  charges: {
    col: "charges", title: "Charges", one: "Charge", needs: ["tax_groups", "brands", "branches"], tabs: allDel, sort: bySort, sortable: true, noSearch: true,
    search: r => r.name + " " + (r.nameAr || ""),
    cols: [{ h: "Name", cell: nameCell }, { h: "Type", cell: r => r.type === "percent" ? "Percentage" : r.type === "open" ? "Open amount" : "Amount" },
      { h: "Value", cell: r => r.type === "percent" ? (+r.value || 0) + " %" : r.type === "open" ? "Open" : money(r.value), num: true },
      { h: "Order Types", cell: r => { const l = r.orderTypes || []; return l.length ? [...new Set(l.map((t: string) => t === "fast" ? "dinein" : t))].map((t: any) => TYPE_LBL[t] || t).join(", ") : "All"; } }],
    fields: [{ k: "name", l: "Name", req: true, ph: "e.g. Delivery charge, Service charge" }, { k: "nameAr", l: "Name Localized" },
      { k: "type", l: "Type", t: "select", req: true, opts: () => [["fixed", "Amount"], ["percent", "Percentage"], ["open", "Open amount"]], def: "fixed" },
      { k: "value", l: "Value", t: "number", ph: "e.g. 2 or 10 (empty for open amount)" },
      { k: "taxGroup", l: "Tax Group", t: "select", opts: taxGroupOpts },
      { k: "orderTypes", l: "Order types it applies to", t: "multi", drop: true, opts: () => [["dinein", "In Store"], ["pickup", "Pickup"], ["delivery", "Delivery"]], def: ["delivery"] },
      { k: "brandIds", l: "Brands", t: "multi", drop: true, req: true, opts: s => s.brands.filter(live).map(b => [b.id, b.name]), auto: s => s.brands.filter(live).map(b => b.id) as any },
      { k: "branchIds", l: "Stores", t: "multi", drop: true, req: true, opts: s => s.branches.filter(b => b.active !== false).map(b => [b.id, b.name]), auto: s => s.branches.filter(b => b.active !== false).map(b => b.id) as any }],
    unique: "name",
    prep: data => { if (data.type === "open") { data.value = 0; return ""; } if (data.value == null || !(data.value >= 0)) return "Value is required."; if (data.type === "percent" && data.value > 100) return "A percentage can't be more than 100."; return ""; },
  },
};
