// askYes("…") → a Tremor Dialog with Cancel / Confirm (instead of the browser's confirm()); resolves true or false
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-6">{q.text}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button variant="outline" className="w-full sm:w-fit" onClick={() => q.done(false)}>Cancel</Button>
          <Button variant={q.danger ? "destructive" : "default"} className="w-full sm:w-fit" onClick={() => q.done(true)}>{q.ok}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
