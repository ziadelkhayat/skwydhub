"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The POS icons, by the names the native POS used, from Remix Icon (the icon set Tremor uses).
import {
  RiArrowGoBackLine, RiArrowLeftLine, RiBankCardLine, RiCalendarLine, RiCheckLine, RiCloseLine, RiComputerLine, RiDeleteBack2Line, RiDeleteBinLine, RiDraftLine, RiEBike2Line,
  RiFileList3Line, RiForbidLine, RiHandbagLine, RiHeadphoneLine, RiLayoutGridLine, RiLineChartLine, RiLogoutBoxRLine, RiMoneyDollarCircleLine, RiMoonClearLine, RiMoreLine,
  RiNotification3Line, RiPauseLine, RiPercentLine, RiPhoneLine, RiPrinterLine, RiRefreshLine, RiSafe2Line, RiSearchLine, RiStore2Line, RiSubtractLine, RiAddLine, RiTable2,
  RiPriceTag3Line, RiTimeLine, RiUserLine, RiVolumeMuteLine, RiVolumeUpLine, RiBowlLine, RiKnifeLine,
} from "@remixicon/react";
import type { ComponentType } from "react";

const I: Record<string, ComponentType<{ className?: string }>> = {
  search: RiSearchLine, table: RiTable2, user: RiUserLine, tag: RiPriceTag3Line, note: RiDraftLine, void: RiForbidLine, print: RiPrinterLine, grid: RiLayoutGridLine, list: RiFileList3Line,
  scooter: RiEBike2Line, till: RiSafe2Line, clock: RiTimeLine, more: RiMoreLine, back: RiArrowLeftLine, x: RiCloseLine, minus: RiSubtractLine, plus: RiAddLine, trash: RiDeleteBinLine,
  del: RiDeleteBack2Line, dayend: RiMoonClearLine, chart: RiLineChartLine, device: RiComputerLine, sound: RiVolumeUpLine, mute: RiVolumeMuteLine, sync: RiRefreshLine, logout: RiLogoutBoxRLine,
  phone: RiPhoneLine, store: RiStore2Line, bag: RiHandbagLine, headset: RiHeadphoneLine, ret: RiArrowGoBackLine, cal: RiCalendarLine, check: RiCheckLine, bell: RiNotification3Line,
  chef: RiKnifeLine, pause: RiPauseLine, pct: RiPercentLine, dollar: RiMoneyDollarCircleLine, bowl: RiBowlLine, card: RiBankCardLine,
};
export function Icon({ name, className = "size-5" }: { name: string; className?: string }) {
  const C = I[name] || RiMoreLine; return <C className={className} aria-hidden="true" />;
}
