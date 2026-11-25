// Choice buttons in Tremor's RadioCard look (Tremor Button base; selected = blue border + ring, like RadioCardItem when checked).
import * as React from "react";
import { Button } from "@/components/tremor/Button";
import { cx } from "@/components/tremor/utils";

export function ChoiceButton({ on, className, ...props }: React.ComponentProps<typeof Button> & { on: boolean }) {
  return (
    <Button type="button" variant="secondary" aria-pressed={on} data-state={on ? "checked" : "unchecked"}
      className={cx("h-auto min-h-9 font-medium", on && "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500 hover:bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/10", className)} {...props} />
  );
}
