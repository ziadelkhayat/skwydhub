import AppLayout from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth";
import { ConfirmHost } from "@/skwyd/ui/confirm";
import SignInPage from "@/skwyd/pages/SignIn";
import { Toaster } from "@/skwyd/ui/toast";
import NotMoved from "@/skwyd/pages/NotMoved";
import { CRUD } from "@/skwyd/crud/configs";
import { lazy } from "react";

// every page loads only when it is opened (smaller first download, faster on phones)
const CrudPage = lazy(() => import("@/skwyd/crud/CrudPage"));
const Dashboard = lazy(() => import("@/skwyd/pages/Dashboard"));
const OrdersPage = lazy(() => import("@/skwyd/pages/Orders"));
const CustomersPage = lazy(() => import("@/skwyd/pages/Customers"));
const ItemPage = lazy(() => import("@/skwyd/pages/ItemPage"));
const OrderPage = lazy(() => import("@/skwyd/pages/OrderPage"));
const CustomerPage = lazy(() => import("@/skwyd/pages/CustomerPage"));
const DevicesPage = lazy(() => import("@/skwyd/pages/Devices"));
const DiscountsPage = lazy(() => import("@/skwyd/pages/Discounts"));
const PromotionsPage = lazy(() => import("@/skwyd/pages/Promotions"));
const WebOrderingPage = lazy(() => import("@/skwyd/pages/WebOrdering"));
const DeliveryZonesPage = lazy(() => import("@/skwyd/pages/DeliveryZones"));
const DeliveryChargesPage = lazy(() => import("@/skwyd/pages/DeliveryCharges"));
const CurrencyPage = lazy(() => import("@/skwyd/pages/Currency"));
const RequestsPage = lazy(() => import("@/skwyd/pages/Team").then(m => ({ default: m.RequestsPage })));
const TimeClockPage = lazy(() => import("@/skwyd/pages/Team").then(m => ({ default: m.TimeClockPage })));
const SchedulePage = lazy(() => import("@/skwyd/pages/Schedule"));
const PayrollPage = lazy(() => import("@/skwyd/pages/Payroll"));
const StaffDocsPage = lazy(() => import("@/skwyd/pages/StaffDocs"));
const TasksPage = lazy(() => import("@/skwyd/pages/Tasks"));
const KnowledgePage = lazy(() => import("@/skwyd/pages/Knowledge"));
const InvDocsPage = lazy(() => import("@/skwyd/pages/InvDocs"));
const CallCenterPage = lazy(() => import("@/skwyd/pages/CallCenter"));
const CallCenterOrderPage = lazy(() => import("@/skwyd/pages/CallCenterOrder").then(m => ({ default: m.CallCenterOrderPage })));
const ReportsPage = lazy(() => import("@/skwyd/pages/Reports"));
const OrderTxPage = lazy(() => import("@/skwyd/pages/OrderTx"));
const EmployeePage = lazy(() => import("@/skwyd/pages/Employee"));
const SalesChannelsPage = lazy(() => import("@/skwyd/pages/SalesChannels"));
const BrandPage = lazy(() => import("@/skwyd/pages/Brand"));
const StorePage = lazy(() => import("@/skwyd/pages/Store"));
const ApplicationsPage = lazy(() => import("@/skwyd/pages/TeamChat").then(m => ({ default: m.ApplicationsPage })));
const TeamChatPage = lazy(() => import("@/skwyd/pages/TeamChat").then(m => ({ default: m.TeamChatPage })));
const InvItemPage = lazy(() => import("@/skwyd/pages/Details").then(m => ({ default: m.InvItemPage })));
const OptionPage = lazy(() => import("@/skwyd/pages/Details").then(m => ({ default: m.OptionPage })));
const SupplierPage = lazy(() => import("@/skwyd/pages/Details").then(m => ({ default: m.SupplierPage })));
const WarehousePage = lazy(() => import("@/skwyd/pages/Details").then(m => ({ default: m.WarehousePage })));
const AccountPage = lazy(() => import("@/skwyd/pages/Account").then(m => ({ default: m.AccountPage })));
const MarketplacePage = lazy(() => import("@/skwyd/pages/Account").then(m => ({ default: m.MarketplacePage })));
const SubscriptionPage = lazy(() => import("@/skwyd/pages/Account").then(m => ({ default: m.SubscriptionPage })));
const InvHistoryPage = lazy(() => import("@/skwyd/pages/InvReports").then(m => ({ default: m.InvHistoryPage })));
const InvLevelsPage = lazy(() => import("@/skwyd/pages/InvReports").then(m => ({ default: m.InvLevelsPage })));
const PurchasingReportPage = lazy(() => import("@/skwyd/pages/InvReports").then(m => ({ default: m.PurchasingReportPage })));
const CouponsPage = lazy(() => import("@/skwyd/pages/Marketing").then(m => ({ default: m.CouponsPage })));
const GiftCardsPage = lazy(() => import("@/skwyd/pages/Marketing").then(m => ({ default: m.GiftCardsPage })));
const LoyaltyPage = lazy(() => import("@/skwyd/pages/Marketing").then(m => ({ default: m.LoyaltyPage })));
const ReasonsPage = lazy(() => import("@/skwyd/pages/Lists").then(m => ({ default: m.ReasonsPage })));
const TagsPage = lazy(() => import("@/skwyd/pages/Lists").then(m => ({ default: m.TagsPage })));
const AllergensPage = lazy(() => import("@/skwyd/pages/Lists").then(m => ({ default: m.AllergensPage })));
const CombosPage = lazy(() => import("@/skwyd/pages/Lists").then(m => ({ default: m.CombosPage })));
// the addresses of the inventory document lists and the report hubs (InvDocs DOC_KINDS, Reports RPT_HUB)
const DOC_ROUTES = ["quantity-adjustments", "cost-adjustments", "inventory-count", "spot-check", "po", "purchase-orders", "transfer-orders", "transfers", "production", "count-sheets"];
const RPT_ROUTES = ["sales-reports", "inventory-reports", "business-reports", "employee-reports", "analysis-reports"];
import "flatpickr/dist/flatpickr.css";
import { Route, Routes } from "react-router";
import { Locked, useSub } from "@/lib/access";

// Skwyd Hub back office on the TailAdmin template. Addresses with no page show NotMoved (Kitchen Flows: Coming next, as in the portal).
export default function App() {
  const { staff, loading, message } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900"><span className="size-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" /></div>;
  if (!staff) return <SignInPage message={message} />;
  return <Gate />;
}
function Gate() {
  const { staff } = useAuth(), sub = useSub();
  if (!staff!.viewAs && (staff!.locked || sub?.state === "locked")) return <Locked />;
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/item" element={<ItemPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/reasons" element={<ReasonsPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/discounts" element={<DiscountsPage />} />
          <Route path="/loyalty" element={<LoyaltyPage />} />
          <Route path="/gift-cards" element={<GiftCardsPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/online-ordering" element={<WebOrderingPage />} />
          <Route path="/delivery-zones" element={<DeliveryZonesPage />} />
          <Route path="/delivery-charges" element={<DeliveryChargesPage />} />
          <Route path="/currency" element={<CurrencyPage />} />
          <Route path="/time-clock" element={<TimeClockPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/documents" element={<StaffDocsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/call-center" element={<CallCenterPage />} />
          <Route path="/call-center-order" element={<CallCenterOrderPage />} />
          <Route path="/inv-levels" element={<InvLevelsPage />} />
          <Route path="/inv-history" element={<InvHistoryPage />} />
          <Route path="/order-transactions" element={<OrderTxPage />} />
          <Route path="/employee" element={<EmployeePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/allergens" element={<AllergensPage />} />
          <Route path="/combos" element={<CombosPage />} />
          <Route path="/branch-menu" element={<SalesChannelsPage />} />
          <Route path="/brand" element={<BrandPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/team-chat" element={<TeamChatPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/option" element={<OptionPage />} />
          <Route path="/supplier" element={<SupplierPage />} />
          <Route path="/inv-item" element={<InvItemPage />} />
          <Route path="/warehouse" element={<WarehousePage />} />
          <Route path="/purchasing" element={<PurchasingReportPage />} />
          {RPT_ROUTES.map(k => <Route key={k} path={"/" + k} element={<ReportsPage />} />)}
          {DOC_ROUTES.map(k => <Route key={k} path={"/" + k} element={<InvDocsPage />} />)}
          {Object.entries(CRUD).map(([k, cfg]) => <Route key={k} path={"/" + k} element={<CrudPage key={k} cfg={cfg} />} />)}
          <Route path="*" element={<NotMoved />} />
        </Route>
      </Routes>
      <Toaster />
      <ConfirmHost />
    </>
  );
}
