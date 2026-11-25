// Tremor Raw Switch (Radix).
import * as React from "react";
import { Switch as TremorSwitch } from "@/components/tremor/Switch";

export interface SwitchProps extends Omit<React.ComponentProps<typeof TremorSwitch>, "size" | "onCheckedChange"> {
  size?: "sm" | "default";
  onCheckedChange?: (checked: boolean) => void;
}

function Switch({ size = "default", onCheckedChange, ...props }: SwitchProps) {
  return <TremorSwitch data-slot="switch" size={size === "sm" ? "small" : "default"} onCheckedChange={v => onCheckedChange?.(v)} {...props} />;
}

export { Switch };
