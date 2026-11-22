// Small TailAdmin-style alerts at the bottom of the screen after saving
import { CheckCircleIcon, OctagonAlertIcon } from "@/icons";
import { cn } from "@/utils";
import { useSyncExternalStore } from "react";

type T = { id: number; text: string; kind: "success" | "error" };
let list: T[] = []; const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
export function toast(text: string, kind: "success" | "error" = "success") {
  const t = { id: Date.now() + Math.random(), text, kind }; list = [...list, t]; emit();
  setTimeout(() => { list = list.filter(x => x.id !== t.id); emit(); }, 3200);
}
export function Toaster() {
  const items = useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => list, () => list);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-999999 flex flex-col items-center gap-3 px-4">
      {items.map(t => (
        <div key={t.id} className={cn("pointer-events-auto flex w-full max-w-sm animate-in items-center gap-3 rounded-xl border p-4 text-sm font-medium shadow-theme-lg duration-200 fade-in-0 slide-in-from-bottom-2",
          t.kind === "success" ? "border-green-500 bg-green-50 text-gray-800 dark:border-green-500/30 dark:bg-green-500/15 dark:text-white/90" : "border-red-500 bg-red-50 text-gray-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-white/90")}>
          {t.kind === "success" ? <CheckCircleIcon className="size-5 shrink-0 text-green-500" /> : <OctagonAlertIcon className="size-5 shrink-0 text-red-500" />}
          {t.text}
        </div>))}
    </div>
  );
}
