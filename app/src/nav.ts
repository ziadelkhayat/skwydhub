// The back-office menu, the same sections as the current portal. `perm` is the role permission needed to open a section.
export type Kid = { id: string; t: string; head?: boolean };
export type Sec = { id?: string; t: string; i: string; perm?: string; kids?: Kid[] };
const k = (id: string, t: string): Kid => ({ id, t });
const h = (t: string): Kid => ({ id: "", t, head: true });

export const NAV: Sec[] = [
  { id: "dashboard", t: "Dashboard", i: "dash", perm: "bo_dashboard" },
  { id: "orders", t: "Orders", i: "orders", perm: "bo_orders" },
  { id: "call-center", t: "Call Center", i: "phone", perm: "bo_callcenter" },
  { id: "customers", t: "Customers", i: "users", perm: "bo_customers" },
  { t: "Reports", i: "chart", perm: "bo_reports", kids: [k("sales-reports", "Sales Reports"), k("inventory-reports", "Inventory Reports"), k("business-reports", "Business Reports"), k("analysis-reports", "Analysis Reports"), k("employee-reports", "Employee Reports")] },
  { t: "Menu", i: "book", perm: "bo_menu", kids: [k("branch-menu", "Sales Channels"), h("Catalog"), k("products", "Products"), k("categories", "Categories"), k("modifiers", "Modifiers"), k("variants", "Variants"), k("combos", "Combos"), h("Menu Settings"), k("allergens", "Allergens")] },
  { t: "Inventory", i: "box", perm: "bo_inventory", kids: [k("inv-items", "Items"), k("inv-categories", "Categories"), k("warehouses", "Warehouses"), k("suppliers", "Suppliers"), k("po", "Purchase Orders"), k("purchase-orders", "Purchasing"), k("transfer-orders", "Transfer Orders"), k("transfers", "Transfers"), k("production", "Production"), k("inventory-count", "Inventory Count"), k("quantity-adjustments", "Quantity Adjustment"), k("cost-adjustments", "Cost Adjustment"), k("spot-check", "Inventory Spot Check"), k("order-transactions", "Order Transactions"), k("count-sheets", "Count Sheet")] },
  { t: "Web Ordering", i: "globe", perm: "bo_manage", kids: [k("online-ordering", "Settings"), k("delivery-zones", "Delivery Zones"), k("delivery-charges", "Delivery Charges")] },
  { t: "Employee Management", i: "badge", perm: "bo_staff", kids: [k("users", "Employees"), k("roles", "Roles"), k("schedule", "Schedule"), k("time-clock", "Time Clock"), k("requests", "Requests"), k("payroll", "Payroll"), k("documents", "Documents"), k("team-chat", "Chats"), k("knowledge", "Knowledge Base")] },
  { t: "Manage", i: "gear", perm: "bo_manage", kids: [k("brands", "Brands"), k("branches", "Branches"), k("devices", "Devices"), k("taxes", "Taxes & Groups"), k("currency", "Currency"), k("payment-methods", "Payment Methods"), k("order-sources", "Order Sources"), k("charges", "Charges"), k("kitchen-flows", "Kitchen Flows"), k("reasons", "Reasons"), k("tags", "Tags"), k("settings", "Settings")] },
  { t: "Marketing", i: "tag", perm: "bo_marketing", kids: [k("discounts", "Discounts"), k("loyalty", "Loyalty"), k("gift-cards", "Gift Cards"), k("promotions", "Promotions"), k("coupons", "Coupons")] },
  { id: "marketplace", t: "Marketplace", i: "store", perm: "bo_manage" },
  { id: "subscription", t: "Subscription", i: "card", perm: "bo_manage" },
];
export const secOf = (route: string) => NAV.find(s => s.id === route || (s.kids || []).some(x => x.id === route));
export const titleOf = (route: string) => { const s = secOf(route); return s?.id === route ? s.t : s?.kids?.find(x => x.id === route)?.t || ""; };
/** may this person open the section? perms = null means owner / admin (everything) */
export const canOpen = (route: string, perms: string[] | null) => {
  if (!perms) return true; const need = secOf(route)?.perm;
  return !need || perms.includes(need) || (need === "bo_staff" && perms.includes("bo_manage"));
};
