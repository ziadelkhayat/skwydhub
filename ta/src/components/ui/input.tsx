// Tremor Raw Input styles on a plain <input> (keeps width classes and refs working as before).
import * as React from "react";
import { inputStyles } from "@/components/tremor/Input";
import { cx, hasErrorInput } from "@/components/tremor/utils";
import { useField } from "@/components/ui/field";

function Input({ className, id, ...props }: React.ComponentProps<"input">) {
  const field = useField();
  return <input id={id ?? field?.id} data-slot="input" className={cx(inputStyles(), "h-9 min-w-0 py-1.5 text-sm", props["aria-invalid"] ? hasErrorInput : "", className)} {...props} />;
}

export { Input };
