// Tremor data table pagination: page x of y, with first / previous / next / last buttons.
import { RiArrowLeftDoubleLine, RiArrowLeftSLine, RiArrowRightDoubleLine, RiArrowRightSLine } from "@remixicon/react";
import { Button } from "@/components/tremor/Button";
import { cx } from "@/components/tremor/utils";

export interface PagerProps { currentPage?: number; totalPages?: number; onPageChange?: (page: number) => void; className?: string }

export function Pager({ currentPage = 1, totalPages = 1, onPageChange, className }: PagerProps) {
  const go = (p: number) => onPageChange?.(Math.min(totalPages, Math.max(1, p)));
  const btns = [
    { l: "First page", icon: RiArrowLeftDoubleLine, to: 1, off: currentPage <= 1, cls: "hidden sm:inline-flex" },
    { l: "Previous page", icon: RiArrowLeftSLine, to: currentPage - 1, off: currentPage <= 1, cls: "" },
    { l: "Next page", icon: RiArrowRightSLine, to: currentPage + 1, off: currentPage >= totalPages, cls: "" },
    { l: "Last page", icon: RiArrowRightDoubleLine, to: totalPages, off: currentPage >= totalPages, cls: "hidden sm:inline-flex" },
  ];
  return (
    <div className={cx("flex items-center justify-between px-4 py-3", className)}>
      <p className="text-sm tabular-nums text-gray-500">
        Page <span className="font-medium text-gray-900 dark:text-gray-50">{currentPage}</span> of <span className="font-medium text-gray-900 dark:text-gray-50">{totalPages}</span>
      </p>
      <div className="flex items-center gap-x-1.5">
        {btns.map(b => (
          <Button key={b.l} variant="secondary" className={cx(b.cls, "p-1.5")} disabled={b.off} onClick={() => go(b.to)}>
            <span className="sr-only">{b.l}</span><b.icon className="size-4 shrink-0" aria-hidden="true" />
          </Button>
        ))}
      </div>
    </div>
  );
}
