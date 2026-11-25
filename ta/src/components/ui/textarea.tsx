// Tremor Raw Textarea styles.
import * as React from "react";
import { cx, focusInput, hasErrorInput } from "@/components/tremor/utils";
import { useField } from "@/components/ui/field";

function Textarea({ className, id, ...props }: React.ComponentProps<"textarea">) {
  const field = useField();
  return (
    <textarea
      id={id ?? field?.id}
      data-slot="textarea"
      className={cx(
        "flex min-h-20 w-full rounded-md border px-2.5 py-2 text-sm shadow-sm outline-none transition",
        "border-gray-300 bg-white text-gray-900 placeholder-gray-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 dark:placeholder-gray-500",
        "disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500",
        focusInput,
        props["aria-invalid"] ? hasErrorInput : "",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
