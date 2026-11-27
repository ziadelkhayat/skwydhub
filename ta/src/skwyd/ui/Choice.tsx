// A choice that is on or off: Tremor's Toggle, shown picked in Tremor blue (as a checked RadioCard).
import * as React from "react";
import { Toggle } from "@/components/tremor/Toggle";
import { cx } from "@/components/tremor/utils";

export function ChoiceButton({ on, className, ...props }: Omit<React.ComponentProps<typeof Toggle>, "pressed" | "onPressedChange"> & { on: boolean }) {
  return (
    <Toggle pressed={on}
      className={cx("h-auto min-h-9 px-3 py-2", "data-[state=on]:border-blue-500 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700 data-[state=on]:ring-1 data-[state=on]:ring-blue-500 dark:data-[state=on]:border-blue-500 dark:data-[state=on]:bg-blue-500/10 dark:data-[state=on]:text-blue-400", className)} {...props} />
  );
}
