// Tremor Raw Select (Radix). `value={null}` shows the placeholder, like before.
import * as React from "react";
import * as T from "@/components/tremor/Select";
import { cx } from "@/components/tremor/utils";

function Select({ value, onValueChange, items: _items, ...props }: Omit<React.ComponentProps<typeof T.Select>, "value" | "onValueChange"> & { value?: string | null; onValueChange?: (v: string | null) => void; items?: unknown }) {
  return <T.Select value={value ?? ""} onValueChange={v => onValueChange?.(v || null)} {...props} />;
}
const SelectGroup = T.SelectGroup;
const SelectLabel = T.SelectGroupLabel;
const SelectSeparator = T.SelectSeparator;
const SelectValue = T.SelectValue;
const SelectTrigger = ({ className, ...props }: React.ComponentProps<typeof T.SelectTrigger>) => <T.SelectTrigger className={cx("h-9 py-1.5", className)} {...props} />;
const SelectContent = ({ className, ...props }: React.ComponentProps<typeof T.SelectContent>) => <T.SelectContent className={cx("z-[110]", className)} {...props} />;
const SelectItem = T.SelectItem;

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue };
