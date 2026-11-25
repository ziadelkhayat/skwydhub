// Tremor Raw Label look.
import * as React from "react";
import { cx } from "@/components/tremor/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cx("flex items-center gap-2 text-sm font-medium leading-none text-gray-900 select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:text-gray-50", className)} {...props} />;
}

export { Label };
