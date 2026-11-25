// Tremor Toast: small messages after saving. toast("Saved") / toast("Couldn't save", "error")
import { toast as tremorToast } from "@/components/tremor/lib/useToast";
export { Toaster } from "@/components/tremor/Toaster";

export function toast(text: string, kind: "success" | "error" = "success") {
  tremorToast({ title: text, variant: kind, duration: 3200 });
}
