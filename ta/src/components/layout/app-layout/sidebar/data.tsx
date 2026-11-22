import {
  BarChartIcon, BoxIcon, CallIcon, CartIcon, DollarIcon, GearIcon, GlobeIcon, LayoutGridIcon,
  PageIcon, PluginIcon, TagIcon, UserCircleIcon, UsersIcon,
} from "@/icons";
import type { NavItem } from "./types";

// Skwyd Hub back office menu (same sections as the current portal), TailAdmin layout and icons
const s = (key: string, path: string) => ({ key, path });

export const mainItems: NavItem[] = [
  { icon: <LayoutGridIcon className="size-6" />, key: "skSummary", path: "/" },
  { icon: <CartIcon className="size-6" />, key: "skOrders", path: "/orders" },
  { icon: <CallIcon className="size-6" />, key: "skCallCenter", path: "/call-center" },
];
export const salesItems: NavItem[] = [
  { icon: <UsersIcon className="size-6" />, key: "skCustomers", path: "/customers" },
  { icon: <BarChartIcon className="size-6" />, key: "skReports", subItems: [s("skSalesReports", "/sales-reports"), s("skInventoryReports", "/inventory-reports"), s("skBusinessReports", "/business-reports"), s("skAnalysisReports", "/analysis-reports"), s("skEmployeeReports", "/employee-reports")] },
  { icon: <TagIcon className="size-6" />, key: "skMarketing", subItems: [s("skDiscounts", "/discounts"), s("skLoyalty", "/loyalty"), s("skGiftCards", "/gift-cards"), s("skPromotions", "/promotions"), s("skCoupons", "/coupons")] },
];
export const stockItems: NavItem[] = [
  { icon: <PageIcon className="size-6" />, key: "skCatalog", subItems: [s("skItems", "/products"), s("skCategories", "/categories"), s("skModifiers", "/modifiers"), s("skModifierOptions", "/modifier-options"), s("skVariants", "/variants"), s("skCombos", "/combos"), s("skAllergens", "/allergens"), s("skSalesChannels", "/branch-menu")] },
  { icon: <BoxIcon className="size-6" />, key: "skInventory", subItems: [s("skInvItems", "/inv-items"), s("skInvCategories", "/inv-categories"), s("skWarehouses", "/warehouses"), s("skSuppliers", "/suppliers"), s("skPurchasing", "/purchasing"), s("skTransfers", "/transfers"), s("skProduction", "/production"), s("skInventoryCount", "/inventory-count")] },
  { icon: <GlobeIcon className="size-6" />, key: "skWebOrdering", subItems: [s("skWebSettings", "/online-ordering"), s("skDeliveryZones", "/delivery-zones"), s("skDeliveryCharges", "/delivery-charges")] },
];
export const businessItems: NavItem[] = [
  { icon: <UserCircleIcon className="size-6" />, key: "skEmployees", subItems: [s("skEmployeeList", "/users"), s("skRoles", "/roles"), s("skSchedule", "/schedule"), s("skTimeClock", "/time-clock"), s("skRequests", "/requests"), s("skPayroll", "/payroll"), s("skDocuments", "/documents"), s("skTasks", "/tasks"), s("skKnowledge", "/knowledge")] },
  { icon: <GearIcon className="size-6" />, key: "skManage", subItems: [s("skBrands", "/brands"), s("skStores", "/branches"), s("skDevices", "/devices"), s("skTaxes", "/taxes"), s("skTaxGroups", "/tax-groups"), s("skCurrency", "/currency"), s("skPaymentMethods", "/payment-methods"), s("skOrderSources", "/order-sources"), s("skCharges", "/charges"), s("skKitchenFlows", "/kitchen-flows"), s("skReasons", "/reasons"), s("skTags", "/tags")] },
  { icon: <PluginIcon className="size-6" />, key: "skMarketplace", path: "/marketplace" },
  { icon: <DollarIcon className="size-6" />, key: "skSubscription", path: "/subscription" },
];

export const LABELS: Record<string, string> = {
  skSummary: "Summary", skOrders: "Orders", skCallCenter: "Call Center", skCustomers: "Customers", skReports: "Reports",
  skSalesReports: "Sales Reports", skInventoryReports: "Inventory Reports", skBusinessReports: "Business Reports", skAnalysisReports: "Analysis Reports", skEmployeeReports: "Employee Reports",
  skMarketing: "Marketing", skDiscounts: "Discounts", skLoyalty: "Loyalty", skGiftCards: "Gift Cards", skPromotions: "Promotions", skCoupons: "Coupons",
  skCatalog: "Catalog", skItems: "Items", skCategories: "Categories", skModifiers: "Modifiers", skModifierOptions: "Modifier Options", skVariants: "Variants", skCombos: "Combos", skAllergens: "Allergens", skSalesChannels: "Sales Channels",
  skInventory: "Inventory", skInvItems: "Products", skInvCategories: "Categories", skWarehouses: "Warehouses", skSuppliers: "Suppliers", skPurchasing: "Purchasing", skTransfers: "Transfers", skProduction: "Production", skInventoryCount: "Inventory Count",
  skWebOrdering: "Web Ordering", skWebSettings: "Settings", skDeliveryZones: "Delivery Zones", skDeliveryCharges: "Delivery Charges",
  skEmployees: "Employee Management", skEmployeeList: "Employees", skRoles: "Roles", skSchedule: "Schedule", skTimeClock: "Time Clock", skRequests: "Requests", skPayroll: "Payroll", skDocuments: "Documents", skTasks: "Tasks", skKnowledge: "Knowledge Base",
  skManage: "Manage", skBrands: "Brands", skStores: "Stores", skDevices: "Devices", skTaxes: "Taxes", skTaxGroups: "Tax Groups", skCurrency: "Currency", skPaymentMethods: "Payment Methods", skOrderSources: "Order Sources", skCharges: "Charges", skKitchenFlows: "Kitchen Flows", skReasons: "Reasons", skTags: "Tags",
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
