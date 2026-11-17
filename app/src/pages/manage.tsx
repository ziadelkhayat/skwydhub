// Manage sections that use the list + dialog pattern.
import { Crud, type CrudCfg } from "../ui/Crud";
import { peek, live, useCol, type Row } from "../lib/db";

const nm = (r: Row) => <><b>{r.name}</b>{r.nameAr && <span className="note"> {r.nameAr}</span>}</>;
const status = (r: Row) => r.active === false ? <span className="tag off">Inactive</span> : <span className="tag on">Active</span>;
const bySort = (a: Row, b: Row) => (a.sort ?? 999) - (b.sort ?? 999) || String(a.name).localeCompare(String(b.name));
const activeTabs: CrudCfg["tabs"] = [["all", "All", live], ["active", "Active", r => live(r) && r.active !== false], ["inactive", "Inactive", r => live(r) && r.active === false], ["deleted", "Deleted", r => !!r.deleted]];
const PM_TYPES: [string, string][] = [["cash", "Cash"], ["card", "Card"], ["other", "Other"]];

export const brands: CrudCfg = {
  col: "brands", title: "Brands", one: "Brand",
  tabs: [["all", "All", live], ["deleted", "Deleted", r => !!r.deleted]],
  cols: [["Brand", nm], ["Branches", r => peek("branches").filter(b => b.brandId === r.id).length, "num"]],
  fields: [{ k: "name", l: "Brand Name", req: true }, { k: "nameAr", l: "Name Localized" }],
  canDelete: r => { const n = peek("branches").filter(b => b.brandId === r.id).length; return n ? `Delete this brand's ${n} branch${n === 1 ? "" : "es"} first (Manage → Branches).` : ""; },
};
export const paymentMethods: CrudCfg = {
  col: "payment_methods", title: "Payment Methods", one: "Payment Method", tabs: activeTabs, sort: bySort, search: r => r.name + " " + (r.code || ""),
  cols: [["Name", nm], ["Type", r => PM_TYPES.find(t => t[0] === r.type)?.[1] || "Other"], ["Code", r => r.code || "—"], ["Opens Cash Drawer", r => r.openDrawer ? "Yes" : "No"], ["Active", status]],
  fields: [{ k: "name", l: "Name", req: true, ph: "e.g. Cash, Visa, OMT" }, { k: "nameAr", l: "Name Localized" }, { k: "type", l: "Type", t: "select", req: true, opts: () => PM_TYPES, def: "cash" }, { k: "code", l: "Reference" },
    { k: "openDrawer", l: "Open the cash drawer when used", t: "chk", def: false }, { k: "active", l: "Active", t: "chk", def: true }],
  unique: "name", note: "These are the buttons the cashier sees on the POS payment screen. Cash lets the cashier enter the amount received and gives change.",
};
export const orderSources: CrudCfg = {
  col: "order_sources", title: "Order Sources", one: "Order Source", tabs: activeTabs, sort: bySort, search: r => r.name + " " + (r.reference || ""),
  cols: [["Name", nm], ["Reference", r => r.reference || "—"], ["Status", status]],
  fields: [{ k: "name", l: "Name", req: true }, { k: "nameAr", l: "Name Localized" }, { k: "reference", l: "Reference" }, { k: "active", l: "Show in the call center", t: "chk", def: true }],
  unique: "name",
};
export const BrandsPage = () => { useCol("branches"); return <Crud cfg={brands} />; };
export const PaymentMethodsPage = () => <Crud cfg={paymentMethods} />;
export const OrderSourcesPage = () => <Crud cfg={orderSources} />;
