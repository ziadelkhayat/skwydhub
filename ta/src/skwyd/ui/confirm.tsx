// askYes("…") → a Tremor Dialog with Cancel / Confirm (instead of the browser's confirm()); resolves true or false.
// askText("…") → the same with a Tremor Input (instead of the browser's prompt()); resolves the text, or null when cancelled.
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useSyncExternalStore } from "react";

type Q = { text: string; ok: string; danger: boolean; input?: { placeholder: string }; done: (v: string | null) => void } | null;
let cur: Q = null; const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const ask = (q: Omit<NonNullable<Q>, "done">) => new Promise<string | null>(res => { cur = { ...q, done: v => { cur = null; emit(); res(v); } }; emit(); });
export const askYes = async (text: string, ok = "Confirm", danger = false) => (await ask({ text, ok, danger })) != null;
export const askText = (text: string, ok = "Confirm", danger = false, placeholder = "") => ask({ text, ok, danger, input: { placeholder } });

function Ask({ q }: { q: NonNullable<Q> }) {
  const [v, setV] = useState("");
  return (
    <Dialog open onOpenChange={o => !o && q.done(null)}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <form onSubmit={e => { e.preventDefault(); q.done(q.input ? v : ""); }} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription className="mt-1 whitespace-pre-line text-sm leading-6">{q.text}</DialogDescription>
          </DialogHeader>
          {q.input ? <Input autoFocus value={v} onChange={e => setV(e.target.value)} placeholder={q.input.placeholder} aria-label={q.input.placeholder || "Answer"} /> : null}
          <DialogFooter className="mt-2">
            <Button variant="outline" className="w-full sm:w-fit" onClick={() => q.done(null)}>Cancel</Button>
            <Button type="submit" variant={q.danger ? "destructive" : "default"} className="w-full sm:w-fit">{q.ok}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function ConfirmHost() {
  const q = useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => cur, () => cur);
  return q ? <Ask key={q.text} q={q} /> : null;
}
