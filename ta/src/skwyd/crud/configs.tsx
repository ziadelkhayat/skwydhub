// The lists ported from the current portal's CRUD config (index.html): same tabs, columns, fields and rules.
import { Badge } from "@/components/ui/badge";
import { fmtDate, money } from "@/lib/util";
import type { Row } from "@/lib/db";
import { Link } from "react-router";
import { live, type CrudCfg, type S } from "./CrudPage";

const del = (r: Row) => !!r.deleted;
const allDel: CrudCfg["tabs"] = [["all", "All", live], ["deleted", "Deleted", del]];
const B = ({ children }: { children: React.ReactNode }) => <span className="font-medium text-gray-800 dark:text-white/90">{children}</span>;
const Note = ({ children }: { children: React.ReactNode }) => <span className="text-gray-500 dark:text-gray-400">{children}</span>;
const nameCell = (r: Row) => <><B>{r.name}</B>{r.nameAr ? <span className="ms-1.5 text-theme-xs text-gray-500">{r.nameAr}</span> : null}</>;
const created = { h: "Created", cell: (r: Row) => fmtDate(r.createdAt) };
const ref = { h: "Reference", cell: (r: Row) => r.reference || "—" };
const sku = (col: string, pre: string) => (s: S) => { let n = 0; const re = new RegExp("^" + pre + "-?(\\d+)$", "i"); s[col].forEach(r => { const m = re.exec(r.sku || ""); if (m) n = Math.max(n, +m[1]); }); return pre + "-" + String(n + 1).padStart(4, "0"); };
const taxGroupOpts = (s: S) => s.tax_groups.filter(live).map(g => [g.id, g.name] as [string, string]);
const tgName = (s: S, id: string) => s.tax_groups.find(g => g.id === id)?.name || "—";
const bySort = (a: Row, b: Row) => (a.sort ?? 999) - (b.sort ?? 999) || String(a.name).localeCompare(String(b.name));
const TYPE_LBL: Record<string, string> = { dinein: "Dine-in", fast: "Dine-in", pickup: "Pickup", delivery: "Delivery" };
const PM_TYPES: [string, string][] = [["cash", "Cash"], ["card", "Card"], ["other", "Other"]];
const SYS_SRC = (n: string) => /^(web|api)$/i.test(String(n || "").trim());
const OnOff = ({ on }: { on: boolean }) => <Badge variant="light" color={on ? "success" : "gray"}>{on ? "Active" : "Inactive"}</Badge>;

export const CRUD: Record<string, CrudCfg> = {
  categories: {
    col: "categories", title: "Categories", one: "Category", needs: ["products"],
    note: "Menu categories group your products for reports and inventory. What the POS, call center and web ordering show is built per channel in Sales Channels.",
    tabs: [["all", "All", r => live(r) && !r.channel], ["deleted", "Deleted", r => del(r) && !r.channel]],
    search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: r => <B>{r.name}</B> }, ref,
      { h: "Products", cell: (r, s) => <Link className="text-brand-500 hover:underline" to={"/products?cat=" + r.id} onClick={e => e.stopPropagation()}>Products ({s.products.filter(p => live(p) && p.categoryId === r.id).length})</Link> }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" }],
  },
  products: {
    col: "products", title: "Items", one: "Item", needs: ["categories", "tax_groups"],
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
    col: "modifiers", title: "Modifiers", one: "Modifier", needs: ["modifier_options", "products"], tabs: allDel,
    search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: nameCell }, ref,
      { h: "Options", cell: (r, s) => <Link className="text-brand-500 hover:underline" to={"/modifier-options?mod=" + r.id} onClick={e => e.stopPropagation()}>Options ({s.modifier_options.filter(o => live(o) && o.modifierId === r.id).length})</Link> },
      { h: "Linked Products", cell: (r, s) => `Products (${s.products.filter(p => live(p) && (p.modifiers || []).some((l: any) => l.modifierId === r.id)).length})` }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" }],
    unique: "name",
    note: "A modifier is a group of choices, like Sauce or Add Toppings. Add its options, then link it to products (open a product → Modifiers).",
  },
  "modifier-options": {
    col: "modifier_options", title: "Modifier Options", one: "Modifier Option", needs: ["modifiers", "tax_groups"], tabs: allDel,
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
    col: "brands", title: "Brands", one: "Brand", needs: ["branches"], tabs: allDel,
    cols: [{ h: "Brand", cell: nameCell }, { h: "Stores", cell: (r, s) => s.branches.filter(b => b.brandId === r.id).length, num: true }],
    fields: [{ k: "name", l: "Brand Name", req: true }, { k: "nameAr", l: "Name Localized" }],
    canDelete: (r, s) => { const n = s.branches.filter(b => b.brandId === r.id).length; return n ? `Delete this brand's ${n} store${n === 1 ? "" : "s"} first (Manage → Stores).` : ""; },
  },
  taxes: {
    col: "taxes", title: "Taxes", one: "Tax", needs: ["tax_groups"], tabs: allDel,
    cols: [{ h: "Name", cell: nameCell }, { h: "Rate", cell: r => (+r.rate || 0) + " %", num: true }, { h: "Pricing", cell: r => r.inclusive === false ? "Added on top" : "Inclusive" },
      { h: "Order Types", cell: r => { const l = r.orderTypes || []; return l.length ? [...new Set(l.map((t: string) => t === "fast" ? "dinein" : t))].map((t: any) => TYPE_LBL[t] || t).join(", ") : "All"; } },
      { h: "Used In Groups", cell: (r, s) => s.tax_groups.filter(g => live(g) && (g.taxIds || []).includes(r.id)).map(g => g.name).join(", ") || "—" }, created],
    fields: [{ k: "name", l: "Name", req: true, ph: "e.g. VAT" }, { k: "nameAr", l: "Name Localized" }, { k: "rate", l: "Rate (%)", t: "number", req: true },
      { k: "orderTypes", l: "Applies On", t: "multi", opts: () => [["dinein", "Dine-in"], ["pickup", "Pickup"], ["delivery", "Delivery"]], def: ["dinein", "pickup", "delivery"] },
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
    unique: "name", note: "Give each product a tax group (Menu → Products). Its taxes add up.",
  },
  "payment-methods": {
    col: "payment_methods", title: "Payment Methods", one: "Payment Method",
    tabs: [["all", "All", live], ["active", "Active", r => live(r) && r.active !== false], ["inactive", "Inactive", r => live(r) && r.active === false], ["deleted", "Deleted", del]],
    sort: bySort, search: r => r.name + " " + (r.code || ""),
    cols: [{ h: "Name", cell: nameCell }, { h: "Type", cell: r => PM_TYPES.find(t => t[0] === r.type)?.[1] || "Other" }, { h: "Code", cell: r => r.code || "—" },
      { h: "Auto Open Cash Drawer", cell: r => r.openDrawer ? "Yes" : "No" }, { h: "Active", cell: r => <OnOff on={r.active !== false} /> }],
    fields: [{ k: "name", l: "Name", req: true, ph: "e.g. Cash, Visa, OMT" }, { k: "nameAr", l: "Name Localized" },
      { k: "type", l: "Type", t: "select", req: true, opts: () => PM_TYPES, def: "cash", lockEdit: true }, { k: "code", l: "Code" },
      { k: "openDrawer", l: "Auto Open Cash Drawer", t: "chk", def: false }, { k: "active", l: "Active", t: "chk", def: true }],
    unique: "name", note: "These are the buttons the cashier sees on the POS payment screen, in the order you sort them. Cash lets the cashier enter the amount received and gives change.",
  },
  "order-sources": {
    col: "order_sources", title: "Order Sources", one: "Order Source",
    tabs: [["all", "All", r => live(r) && !SYS_SRC(r.name)], ["deleted", "Deleted", r => del(r) && !SYS_SRC(r.name)]],
    prep: data => SYS_SRC(data.name) ? `"${data.name}" is set automatically on web and API orders. Choose another name.` : "",
    sort: bySort, search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: nameCell }, ref],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" }],
    unique: "name", note: "These are the choices in the call center's and the POS's Source list. Deleted sources are hidden from new orders but kept on old ones.",
  },
  "inv-categories": {
    col: "inv_categories", title: "Inventory Categories", one: "Category", needs: ["inv_items"], tabs: allDel,
    search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: nameCell }, ref, { h: "Items", cell: (r, s) => `Items (${s.inv_items.filter(i => live(i) && i.category === r.name).length})` }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" }],
    unique: "name",
  },
  warehouses: {
    col: "warehouses", title: "Warehouses", one: "Warehouse", needs: ["brands"], tabs: allDel,
    sort: (a, b) => String(a.reference || "").localeCompare(String(b.reference || ""), undefined, { numeric: true }) || String(a.name).localeCompare(String(b.name)),
    search: r => r.name + " " + (r.reference || ""),
    cols: [{ h: "Name", cell: r => <B>{r.name}</B> }, ref, { h: "Brand", cell: (r, s) => s.brands.find(b => b.id === r.brandId)?.name || "—" }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "brandId", l: "Brand", t: "select", req: true, opts: s => s.brands.filter(live).map(b => [b.id, b.name]), auto: s => { const l = s.brands.filter(live); return l.length === 1 ? l[0].id : ""; } },
      { k: "reference", l: "Reference", req: true, auto: s => "W" + String(Math.max(0, ...s.warehouses.map(w => +((/^W(\d+)$/i.exec(w.reference || "") || [])[1] || 0))) + 1).padStart(2, "0") },
      { k: "address", l: "Address", t: "textarea" }],
    unique: "name",
  },
  suppliers: {
    col: "suppliers", title: "Suppliers", one: "Supplier", tabs: allDel,
    search: r => [r.name, r.code, r.contactName, r.phone, r.email].join(" "),
    cols: [{ h: "Name", cell: r => <B>{r.name}</B> }, { h: "Code", cell: r => r.code || "" }, { h: "Contact", cell: r => r.contactName || "—" }, { h: "Phone", cell: r => r.phone || "—" }, { h: "Email", cell: r => r.email || "—" }, created],
    fields: [{ k: "name", l: "Name", req: true }, { k: "code", l: "Code", auto: s => "SUP-" + String(s.suppliers.length + 1).padStart(3, "0") }, { k: "contactName", l: "Contact Name" }, { k: "phone", l: "Phone" }, { k: "email", l: "Email" },
      { k: "address", l: "Address", full: true }, { k: "notes", l: "Notes", t: "textarea" }],
    unique: "name",
  },
};
