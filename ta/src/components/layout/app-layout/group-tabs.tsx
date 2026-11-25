// The pages of the open menu group (Catalog, Inventory, Reports…) as Tremor line tabs on top of the page (links, same look as Tabs variant="line").
import { RiAddBoxLine, RiArchiveLine, RiArrowLeftRightLine, RiBankCardLine, RiBookLine, RiBox3Line, RiBriefcaseLine, RiBuilding2Line, RiCalculatorLine, RiCalendarScheduleLine, RiChat3Line, RiClipboardLine, RiCoinsLine, RiCoupon3Line, RiDeviceLine, RiDiscountPercentLine, RiExchangeDollarLine, RiFileList3Line, RiFileTextLine, RiFileTransferLine, RiFlowChart, RiFolderLine, RiFoldersLine, RiGift2Line, RiGitBranchLine, RiGovernmentLine, RiHandCoinLine, RiInboxLine, RiIncreaseDecreaseLine, RiLeafLine, RiLineChartLine, RiListCheck3, RiListUnordered, RiMapPin2Line, RiMedalLine, RiMegaphoneLine, RiMoneyDollarCircleLine, RiPieChartLine, RiPriceTag3Line, RiPriceTagLine, RiQuestionAnswerLine, RiReceiptLine, RiRestaurantLine, RiSearchEyeLine, RiSettings3Line, RiShapesLine, RiShieldUserLine, RiShoppingCart2Line, RiStackLine, RiStore2Line, RiTaskLine, RiTeamLine, RiTimeLine, RiToolsLine, RiTruckLine, RiUserAddLine, RiUserStarLine } from "@remixicon/react";
import { Link, useLocation } from "react-router";
import { cx, focusRing } from "@/components/tremor/utils";
import { useAccess } from "@/lib/access";
import { LABELS, groupOf } from "./nav-data";

/** an icon for each tab */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { skSalesReports: RiLineChartLine, skInventoryReports: RiArchiveLine, skBusinessReports: RiBriefcaseLine, skAnalysisReports: RiPieChartLine, skEmployeeReports: RiUserStarLine, skDiscounts: RiDiscountPercentLine, skLoyalty: RiMedalLine, skGiftCards: RiGift2Line, skPromotions: RiMegaphoneLine, skCoupons: RiCoupon3Line, skItems: RiRestaurantLine, skCategories: RiFolderLine, skModifiers: RiListCheck3, skModifierOptions: RiListUnordered, skVariants: RiShapesLine, skCombos: RiStackLine, skAllergens: RiLeafLine, skInvItems: RiBox3Line, skInvCategories: RiFolderLine, skWarehouses: RiBuilding2Line, skSuppliers: RiTruckLine, skPurchaseOrders: RiFileList3Line, skPurchasing: RiShoppingCart2Line, skTransferOrders: RiFileTransferLine, skTransfers: RiArrowLeftRightLine, skProduction: RiToolsLine, skInventoryCount: RiCalculatorLine, skQtyAdj: RiIncreaseDecreaseLine, skCostAdj: RiExchangeDollarLine, skSpotCheck: RiSearchEyeLine, skOrderTx: RiReceiptLine, skCountSheets: RiClipboardLine, skWebSettings: RiSettings3Line, skDeliveryZones: RiMapPin2Line, skDeliveryCharges: RiMoneyDollarCircleLine, skEmployeeList: RiTeamLine, skRoles: RiShieldUserLine, skSchedule: RiCalendarScheduleLine, skTimeClock: RiTimeLine, skRequests: RiInboxLine, skPayroll: RiHandCoinLine, skDocuments: RiFileTextLine, skChats: RiChat3Line, skTasks: RiTaskLine, skKnowledge: RiBookLine, skApplications: RiUserAddLine, skBrands: RiPriceTagLine, skStores: RiStore2Line, skDevices: RiDeviceLine, skTaxes: RiGovernmentLine, skTaxGroups: RiFoldersLine, skCurrency: RiCoinsLine, skPaymentMethods: RiBankCardLine, skOrderSources: RiGitBranchLine, skCharges: RiAddBoxLine, skKitchenFlows: RiFlowChart, skReasons: RiQuestionAnswerLine, skTags: RiPriceTag3Line };

export function GroupTabs() {
  const { pathname } = useLocation(), { canOpen } = useAccess();
  const g = groupOf(pathname);
  if (!g) return null;
  return (
    <nav aria-label={LABELS[g.key]} className="no-scrollbar mb-6 flex items-center overflow-x-auto border-b border-gray-200 dark:border-gray-800">
      {g.subItems!.filter(x => canOpen(x.path)).map(x => {
        const on = pathname === x.path || pathname.startsWith(x.path + "/");
        const Icon = ICONS[x.key];
        return <Link key={x.path} to={x.path} aria-current={on ? "page" : undefined} className={cx("-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-all", focusRing,
          on ? "border-gray-900 text-gray-900 dark:border-gray-50 dark:text-gray-50" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-500 hover:dark:border-gray-400 hover:dark:text-gray-400")}>{Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}{LABELS[x.key]}</Link>;
      })}
    </nav>
  );
}
