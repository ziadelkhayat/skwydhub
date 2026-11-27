// Sort window: drag a row or use the arrows, then Save (gets the ids in the new order).
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/utils";

export function ReorderDialog({ title, note, items, onSave, onClose }: { title: string; note?: string; items: { id: string; name: string }[]; onSave: (ids: string[]) => Promise<boolean | void>; onClose: () => void }) {
  const [l, setL] = useState(items), [busy, setBusy] = useState(false), [drag, setDrag] = useState<number | null>(null);
  const move = (from: number, to: number) => setL(x => { if (to < 0 || to >= x.length || from === to) return x; const n = [...x]; const [r] = n.splice(from, 1); n.splice(to, 0, r); return n; });
  const save = async () => { setBusy(true); const ok = await onSave(l.map(x => x.id)); setBusy(false); if (ok !== false) onClose(); };
  const arrow = "flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800";
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-0 sm:max-w-lg">
        <div className="p-6 sm:p-8">
          <DialogHeader className="gap-1 sm:gap-2">
            <DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">{title}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">{note || "Drag a row, or use the arrows. The POS shows them in this order."}</DialogDescription>
          </DialogHeader>
          <ul className="mt-6 max-h-[60vh] space-y-2 overflow-y-auto">
            {l.map((r, i) => (
              <li key={r.id} draggable onDragStart={() => setDrag(i)} onDragOver={e => { e.preventDefault(); if (drag !== null && drag !== i) { move(drag, i); setDrag(i); } }} onDragEnd={() => setDrag(null)}
                className={cn("flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950", drag === i && "opacity-50")}>
                <span className="w-6 text-center text-sm text-gray-400">{i + 1}</span>
                <span aria-hidden="true" className="text-gray-400">⋮⋮</span>
                <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-50">{r.name}</span>
                <button type="button" aria-label={`Move ${r.name} up`} className={arrow} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
                <button type="button" aria-label={`Move ${r.name} down`} className={arrow} disabled={i === l.length - 1} onClick={() => move(i, i + 1)}>↓</button>
              </li>))}
          </ul>
          {!l.length && <p className="mt-6 text-sm text-gray-500">Nothing to sort yet.</p>}
          <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={busy || !l.length} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
