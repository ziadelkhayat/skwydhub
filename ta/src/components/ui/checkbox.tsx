// Tremor Raw Checkbox (Radix).
import * as React from "react";
import { Checkbox as TremorCheckbox } from "@/components/tremor/Checkbox";
import { useField } from "@/components/ui/field";

type Props = Omit<React.ComponentProps<typeof TremorCheckbox>, "onCheckedChange" | "checked"> & { checked?: boolean | "indeterminate"; indeterminate?: boolean; onCheckedChange?: (checked: boolean) => void };

function Checkbox({ id, checked, indeterminate, onCheckedChange, ...props }: Props) {
  const field = useField();
  return <TremorCheckbox id={id ?? field?.id} data-slot="checkbox" checked={indeterminate ? "indeterminate" : checked} onCheckedChange={v => onCheckedChange?.(v === true)} {...props} />;
}

export { Checkbox };
