// Tremor Raw Input. Layout classes (width, margin, flex, grid) go on Tremor's wrapper, the rest on the input itself.
import * as React from "react";
import { Input as TremorInput } from "@/components/tremor/Input";
import { useField } from "@/components/ui/field";

const OUTER = /^(?:[a-z0-9-]+:)*(?:w-|min-w-|max-w-|flex-|grow|shrink|basis-|m[trblxyse]?-|-m[trblxyse]?-|col-|row-|self-|justify-self|order-|hidden$|block$|inline-block$|sm:w-|md:w-|lg:w-)/;

function Input({ className, id, ...props }: React.ComponentProps<"input">) {
  const field = useField();
  const all = String(className || "").split(/\s+/).filter(Boolean);
  const outer = all.filter(c => OUTER.test(c)).join(" "), inner = all.filter(c => !OUTER.test(c)).join(" ");
  return <TremorInput id={id ?? field?.id} data-slot="input" hasError={!!props["aria-invalid"]} className={outer} inputClassName={inner} {...(props as React.ComponentProps<typeof TremorInput>)} />;
}

export { Input };
