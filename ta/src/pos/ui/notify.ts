// POS messages, from Tremor's toast: short, gone after a couple of seconds.
import { toast } from "@/components/tremor/lib/useToast";
export const notify = (text: string, variant: "info" | "success" | "warning" | "error" = "info") => { toast({ title: text, variant, duration: Math.min(4500, 1800 + text.length * 25) }); };
