// Tremor Raw Popover (Radix).
import * as React from "react";
import * as T from "@/components/tremor/Popover";
import { cx } from "@/components/tremor/utils";

const Popover = T.Popover;
const PopoverTrigger = T.PopoverTrigger;
const PopoverClose = T.PopoverClose;
const PopoverAnchor = T.PopoverAnchor;
function PopoverContent({ className, ...props }: React.ComponentProps<typeof T.PopoverContent>) {
  return <T.PopoverContent className={cx("z-[110]", className)} {...props} />;
}
const PopoverHeader = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cx("flex flex-col gap-1 px-3 pt-3", className)} {...props} />;
const PopoverTitle = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cx("text-sm font-semibold text-gray-900 dark:text-gray-50", className)} {...props} />;

export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger };
