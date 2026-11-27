// Tremor Raw Textarea (takes the id of the Field it sits in).
import * as React from "react";
import { Textarea as TremorTextarea } from "@/components/tremor/Textarea";
import { useField } from "@/components/ui/field";

function Textarea({ id, ...props }: React.ComponentProps<typeof TremorTextarea>) {
  const field = useField();
  return <TremorTextarea id={id ?? field?.id} data-slot="textarea" hasError={!!props["aria-invalid"]} {...props} />;
}

export { Textarea };
