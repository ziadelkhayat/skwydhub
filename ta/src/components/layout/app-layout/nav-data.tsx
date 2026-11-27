import { RiApps2Line, RiArchive2Line, RiBarChartBoxLine, RiBookOpenLine, RiCustomerService2Line, RiGlobalLine, RiGroupLine, RiHome2Line, RiPriceTag3Line, RiSettings5Line, RiShoppingBag3Line, RiStore2Line, RiUserSettingsLine } from "@remixicon/react";
import type { ComponentType } from "react";

export type SubItem = { key: string; path: string };
export type NavItem = { key: string; icon: ComponentType<{ className?: string }>; path?: string; subItems?: SubItem[] };

// Skwyd Hub back office menu, with Remix icons as in the Tremor dashboard template
const s = (key: string, path: string) => ({ key, path });

export const mainItems: NavItem[] = [
  { icon: RiHome2Line, key: "skSummary", path: "/" },
  { icon: RiShoppingBag3Line, key: "skOrders", path: "/orders" },
  { icon: RiCustomerService2Line, key: "skCallCenter", path: "/call-center" },
];
export const salesItems: NavItem[] = [
  { icon: RiGroupLine, key: "skCustomers", path: "/customers" },
  { icon: RiBarChartBoxLine, key: "skReports", subItems: [s("skSalesReports", "/sales-reports"), s("skInventoryReports", "/inventory-reports"), s("skBusinessReports", "/business-reports"), s("skAnalysisReports", "/analysis-reports"), s("skEmployeeReports", "/employee-reports")] },
  { icon: RiPriceTag3Line, key: "skMarketing", subItems: [s("skDiscounts", "/discounts"), s("skLoyalty", "/loyalty"), s("skGiftCards", "/gift-cards"), s("skPromotions", "/promotions"), s("skCoupons", "/coupons")] },
];
export const stockItems: NavItem[] = [
  { icon: RiBookOpenLine, key: "skCatalog", subItems: [s("skItems", "/products"), s("skCategories", "/categories"), s("skModifiers", "/modifiers"), s("skModifierOptions", "/modifier-options"), s("skVariants", "/variants"), s("skCombos", "/combos"), s("skAllergens", "/allergens")] },
  { icon: RiStore2Line, key: "skSalesChannels", path: "/branch-menu" },
  { icon: RiArchive2Line, key: "skInventory", subItems: [s("skInvItems", "/inv-items"), s("skInvCategories", "/inv-categories"), s("skWarehouses", "/warehouses"), s("skSuppliers", "/suppliers"), s("skPurchaseOrders", "/po"), s("skPurchasing", "/purchase-orders"), s("skTransferOrders", "/transfer-orders"), s("skTransfers", "/transfers"), s("skProduction", "/production"), s("skInventoryCount", "/inventory-count"), s("skQtyAdj", "/quantity-adjustments"), s("skCostAdj", "/cost-adjustments"), s("skSpotCheck", "/spot-check"), s("skOrderTx", "/order-transactions"), s("skCountSheets", "/count-sheets")] },
  { icon: RiGlobalLine, key: "skWebOrdering", subItems: [s("skWebSettings", "/online-ordering"), s("skDeliveryZones", "/delivery-zones"), s("skDeliveryCharges", "/delivery-charges")] },
];
export const businessItems: NavItem[] = [
  { icon: RiUserSettingsLine, key: "skEmployees", subItems: [s("skEmployeeList", "/users"), s("skRoles", "/roles"), s("skSchedule", "/schedule"), s("skTimeClock", "/time-clock"), s("skRequests", "/requests"), s("skPayroll", "/payroll"), s("skDocuments", "/documents"), s("skChats", "/team-chat"), s("skTasks", "/tasks"), s("skKnowledge", "/knowledge")] },
  { icon: RiSettings5Line, key: "skManage", subItems: [s("skBrands", "/brands"), s("skStores", "/branches"), s("skDevices", "/devices"), s("skTaxes", "/taxes"), s("skCurrency", "/currency"), s("skPaymentMethods", "/payment-methods"), s("skOrderSources", "/order-sources"), s("skCharges", "/charges"), s("skKitchenFlows", "/kitchen-flows"), s("skReasons", "/reasons"), s("skTags", "/tags"), s("skApplications", "/applications")] },
  { icon: RiApps2Line, key: "skMarketplace", path: "/marketplace" },
];

export const LABELS: Record<string, string> = {
  skSummary: "Summary", skOrders: "Orders", skCallCenter: "Call Center", skCustomers: "Customers", skReports: "Reports",
  skSalesReports: "Sales Reports", skInventoryReports: "Inventory Reports", skBusinessReports: "Business Reports", skAnalysisReports: "Analysis Reports", skEmployeeReports: "Employee Reports",
  skMarketing: "Marketing", skDiscounts: "Discounts", skLoyalty: "Loyalty", skGiftCards: "Gift Cards", skPromotions: "Promotions", skCoupons: "Coupons",
  skCatalog: "Catalog", skItems: "Items", skCategories: "Categories", skModifiers: "Modifiers", skModifierOptions: "Modifier Options", skVariants: "Variants", skCombos: "Combos", skAllergens: "Allergens", skSalesChannels: "Sales Channels",
  skInventory: "Inventory", skInvItems: "Products", skInvCategories: "Categories", skWarehouses: "Warehouses", skSuppliers: "Suppliers", skPurchasing: "Purchasing", skTransfers: "Transfers", skProduction: "Production", skInventoryCount: "Inventory Count", skPurchaseOrders: "Purchase Orders", skTransferOrders: "Transfer Orders", skQtyAdj: "Quantity Adjustment", skCostAdj: "Cost Adjustment", skSpotCheck: "Inventory Spot Check", skOrderTx: "Order Transactions", skCountSheets: "Count Sheet",
  skWebOrdering: "Web Ordering", skWebSettings: "Settings", skDeliveryZones: "Delivery Zones", skDeliveryCharges: "Delivery Charges",
  skEmployees: "Employee Management", skEmployeeList: "Employees", skRoles: "Roles", skSchedule: "Schedule", skTimeClock: "Time Clock", skRequests: "Requests", skPayroll: "Payroll", skDocuments: "Documents", skChats: "Chats", skApplications: "Applications", skTasks: "Tasks", skKnowledge: "Knowledge Base",
  skManage: "Manage", skBrands: "Brands", skStores: "Stores", skDevices: "Devices", skTaxes: "Taxes & Groups", skTaxGroups: "Tax Groups", skCurrency: "Currency", skPaymentMethods: "Payment Methods", skOrderSources: "Order Sources", skCharges: "Charges", skKitchenFlows: "Kitchen Flows", skReasons: "Reasons", skTags: "Tags",
  skMarketplace: "Marketplace", skSubscription: "Subscription",
};
export const ALL_ITEMS = [...mainItems, ...salesItems, ...stockItems, ...businessItems];
/** title + section of a path, for the page header and breadcrumb */
export function pageOf(path: string): { title: string; section?: string } {
  for (const n of ALL_ITEMS) {
    if (n.path === path) return { title: LABELS[n.key] };
    const sub = n.subItems?.find(x => x.path === path);
    if (sub) return { title: LABELS[sub.key], section: LABELS[n.key] };
  }
  return { title: "" };
}

export const SECTIONS: { label: string; items: NavItem[] }[] = [
  { label: "Menu", items: mainItems }, { label: "Sales", items: salesItems }, { label: "Menu & Stock", items: stockItems }, { label: "Business", items: businessItems },
];

/** the menu group whose pages show as tabs on top of the page (a group is one sidebar link; its pages are the tabs) */
export function groupOf(path: string): NavItem | undefined {
  return ALL_ITEMS.find(n => n.subItems?.some(x => path === x.path || path.startsWith(x.path + "/")));
}
