// The pages of the open menu group (Catalog, Inventory, Reports…) as Tremor line tabs on top of the page (links, same look as Tabs variant="line").
import { RiArrowDownSLine, RiMoreLine, RiAddBoxLine, RiArchiveLine, RiArrowLeftRightLine, RiBankCardLine, RiBookLine, RiBox3Line, RiBriefcaseLine, RiBuilding2Line, RiCalculatorLine, RiCalendarScheduleLine, RiChat3Line, RiClipboardLine, RiCoinsLine, RiCoupon3Line, RiDeviceLine, RiDiscountPercentLine, RiExchangeDollarLine, RiFileList3Line, RiFileTextLine, RiFileTransferLine, RiFlowChart, RiFolderLine, RiFoldersLine, RiGift2Line, RiGitBranchLine, RiGovernmentLine, RiHandCoinLine, RiInboxLine, RiIncreaseDecreaseLine, RiLeafLine, RiLineChartLine, RiListCheck3, RiListUnordered, RiMapPin2Line, RiMedalLine, RiMegaphoneLine, RiMoneyDollarCircleLine, RiPieChartLine, RiPriceTag3Line, RiPriceTagLine, RiQuestionAnswerLine, RiReceiptLine, RiRestaurantLine, RiSearchEyeLine, RiSettings3Line, RiShapesLine, RiShieldUserLine, RiShoppingCart2Line, RiStackLine, RiStore2Line, RiTaskLine, RiTeamLine, RiTimeLine, RiToolsLine, RiTruckLine, RiUserAddLine, RiUserStarLine } from "@remixicon/react";
import { Link, useLocation, useNavigate } from "react-router";
import { useLayoutEffect, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/tremor/Dropdown";
import { cx, focusRing } from "@/components/tremor/utils";
import { useAccess } from "@/lib/access";
import { LABELS, groupOf } from "./nav-data";

/** an icon for each tab */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { skSalesReports: RiLineChartLine, skInventoryReports: RiArchiveLine, skBusinessReports: RiBriefcaseLine, skAnalysisReports: RiPieChartLine, skEmployeeReports: RiUserStarLine, skDiscounts: RiDiscountPercentLine, skLoyalty: RiMedalLine, skGiftCards: RiGift2Line, skPromotions: RiMegaphoneLine, skCoupons: RiCoupon3Line, skItems: RiRestaurantLine, skCategories: RiFolderLine, skModifiers: RiListCheck3, skModifierOptions: RiListUnordered, skVariants: RiShapesLine, skCombos: RiStackLine, skAllergens: RiLeafLine, skInvItems: RiBox3Line, skInvCategories: RiFolderLine, skWarehouses: RiBuilding2Line, skSuppliers: RiTruckLine, skPurchaseOrders: RiFileList3Line, skPurchasing: RiShoppingCart2Line, skTransferOrders: RiFileTransferLine, skTransfers: RiArrowLeftRightLine, skProduction: RiToolsLine, skInventoryCount: RiCalculatorLine, skQtyAdj: RiIncreaseDecreaseLine, skCostAdj: RiExchangeDollarLine, skSpotCheck: RiSearchEyeLine, skOrderTx: RiReceiptLine, skCountSheets: RiClipboardLine, skWebSettings: RiSettings3Line, skDeliveryZones: RiMapPin2Line, skDeliveryCharges: RiMoneyDollarCircleLine, skEmployeeList: RiTeamLine, skRoles: RiShieldUserLine, skSchedule: RiCalendarScheduleLine, skTimeClock: RiTimeLine, skRequests: RiInboxLine, skPayroll: RiHandCoinLine, skDocuments: RiFileTextLine, skChats: RiChat3Line, skTasks: RiTaskLine, skKnowledge: RiBookLine, skApplications: RiUserAddLine, skBrands: RiPriceTagLine, skStores: RiStore2Line, skDevices: RiDeviceLine, skTaxes: RiGovernmentLine, skTaxGroups: RiFoldersLine, skCurrency: RiCoinsLine, skPaymentMethods: RiBankCardLine, skOrderSources: RiGitBranchLine, skCharges: RiAddBoxLine, skKitchenFlows: RiFlowChart, skReasons: RiQuestionAnswerLine, skTags: RiPriceTag3Line };

const TAB = "-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-all";
const tabCls = (on: boolean) => cx(TAB, focusRing, on ? "border-gray-900 text-gray-900 dark:border-gray-50 dark:text-gray-50" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-500 hover:dark:border-gray-400 hover:dark:text-gray-400");

export function GroupTabs() {
  const { pathname } = useLocation(), { canOpen } = useAccess(), nav = useNavigate();
  const g = groupOf(pathname);
  const subs = g ? g.subItems!.filter(x => canOpen(x.path)) : [];
  // the tabs that don't fit the width go into a "More" menu at the end of the row
  const box = useRef<HTMLDivElement>(null), meas = useRef<HTMLDivElement>(null), [fit, setFit] = useState(99);
  useLayoutEffect(() => {
    const calc = () => { const W = box.current?.clientWidth || 0, ws = [...(meas.current?.children || [])].map(c => (c as HTMLElement).offsetWidth), more = 110;
      let used = 0, n = 0; for (let i = 0; i < ws.length; i++) { const rest = i < ws.length - 1 ? more : 0; if (used + ws[i] + rest > W) break; used += ws[i]; n++; }
      setFit(n >= ws.length ? 99 : n); };
    calc(); const ro = new ResizeObserver(calc); if (box.current) ro.observe(box.current); return () => ro.disconnect(); }, [g?.key, subs.length]);
  if (!g) return null;
  const isOn = (x: { path: string }) => pathname === x.path || pathname.startsWith(x.path + "/");
  const tab = (x: { key: string; path: string }) => { const Icon = ICONS[x.key]; return <>{Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}{LABELS[x.key]}</>; };
  const shown = subs.slice(0, fit), extra = subs.slice(fit), extraOn = extra.find(isOn);
  return (
    <div ref={box} className="relative mb-6 border-b border-gray-200 dark:border-gray-800">
      {/* measuring row (invisible) */}
      <div ref={meas} aria-hidden="true" className="pointer-events-none invisible absolute flex">{subs.map(x => <span key={x.path} className={TAB}>{tab(x)}</span>)}</div>
      <nav aria-label={LABELS[g.key]} className="flex items-center">
        {shown.map(x => <Link key={x.path} to={x.path} aria-current={isOn(x) ? "page" : undefined} className={tabCls(isOn(x))}>{tab(x)}</Link>)}
        {extra.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={tabCls(!!extraOn)}>{extraOn ? tab(extraOn) : <><RiMoreLine className="size-4 shrink-0" aria-hidden="true" />More</>}<RiArrowDownSLine className="size-4 shrink-0" aria-hidden="true" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {extra.map(x => <DropdownMenuItem key={x.path} onSelect={() => nav(x.path)} className={isOn(x) ? "font-semibold text-gray-900 dark:text-gray-50" : ""}><span className="flex items-center gap-2">{tab(x)}</span></DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>)}
      </nav>
    </div>
  );
}
