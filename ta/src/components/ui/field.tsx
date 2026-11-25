// A form row: Tremor Label tied to the control inside (Field gives the id, Input/Checkbox pick it up).
import * as React from "react";
import { createContext, useContext, useId, useMemo } from "react";
import { Label } from "@/components/tremor/Label";
import { cx } from "@/components/tremor/utils";

const FieldContext = createContext<{ id: string } | undefined>(undefined);
export const useField = () => useContext(FieldContext);

function Field({ className, orientation = "vertical", controlId, children, ...props }: React.ComponentProps<"div"> & { orientation?: "vertical" | "horizontal"; controlId?: string }) {
  const gen = useId(), id = controlId ?? gen, value = useMemo(() => ({ id }), [id]);
  return (
    <FieldContext.Provider value={value}>
      <div role="group" data-slot="field" className={cx("flex w-full", orientation === "horizontal" ? "flex-row items-center gap-3" : "flex-col gap-1.5", className)} {...props}>{children}</div>
    </FieldContext.Provider>
  );
}

function FieldLabel({ htmlFor, className, ...props }: React.ComponentProps<typeof Label>) {
  const field = useField();
  return <Label data-slot="field-label" htmlFor={htmlFor ?? field?.id} className={cx("font-medium", className)} {...props} />;
}

export { Field, FieldLabel };
