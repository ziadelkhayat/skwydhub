// askYes("…") → a TailAdmin modal with Cancel / Confirm (instead of the browser's confirm()); resolves true or false
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSyncExternalStore } from "react";

type Q = { text: string; ok: string; danger: boolean; done: (v: boolean) => void } | null;
let cur: Q = null; const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
export function askYes(text: string, ok = "Confirm", danger = false) {
  return new Promise<boolean>(res => { cur = { text, ok, danger, done: v => { cur = null; emit(); res(v); } }; emit(); });
}
export function ConfirmHost() {
  const q = useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => cur, () => cur);
  if (!q) return null;
  return (
    <Dialog open onOpenChange={o => !o && q.done(false)}>
      <DialogContent className="w-full p-6 sm:max-w-md sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-50">Are you sure?</DialogTitle></DialogHeader>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{q.text}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => q.done(false)}>Cancel</Button>
          <Button variant={q.danger ? "destructive" : "default"} onClick={() => q.done(true)}>{q.ok}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
