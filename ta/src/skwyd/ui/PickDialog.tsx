// A searchable checklist in a TailAdmin dialog (pick stores, categories, items, tags…), with Select All
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { SearchIcon } from "@/icons";
import { useState } from "react";

export type PickOpt = [id: string, name: string, sub?: string];
export function PickDialog({ title, opts, value, onSave, onClose }: { title: string; opts: PickOpt[]; value: string[]; onSave: (ids: string[]) => Promise<boolean | void> | boolean | void; onClose: () => void }) {
  const [sel, setSel] = useState(new Set(value)), [q, setQ] = useState(""), [busy, setBusy] = useState(false);
  const vis = opts.filter(([, t, s]) => !q.trim() || (t + " " + (s || "")).toLowerCase().includes(q.trim().toLowerCase()));
  const toggleAll = () => { const on = vis.some(o => !sel.has(o[0])); const n = new Set(sel); vis.forEach(o => on ? n.add(o[0]) : n.delete(o[0])); setSel(n); };
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-6 sm:max-w-lg sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">{title}</DialogTitle></DialogHeader>
        <div className="mt-5 flex gap-3">
          <InputGroup className="h-9 flex-1"><InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon>
            <InputGroupInput placeholder="Search" value={q} onChange={e => setQ(e.target.value)} /></InputGroup>
          <Button variant="outline" className="h-9" onClick={toggleAll}>Select All</Button>
        </div>
        <div className="mt-4 max-h-[50dvh] space-y-0.5 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-gray-800">
          {!vis.length ? <p className="p-3 text-sm text-gray-500">Nothing to choose yet.</p> : vis.map(([id, t, s]) => (
            <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/3">
              <Checkbox checked={sel.has(id)} onCheckedChange={c => { const n = new Set(sel); if (c) n.add(id); else n.delete(id); setSel(n); }} />
              <span className="text-gray-900 dark:text-gray-50">{t}</span>{s && <span className="text-gray-400">{s}</span>}</label>))}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <span className="text-sm text-gray-500 sm:me-auto">{sel.size} selected</span>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button disabled={busy} onClick={async () => { setBusy(true); const r = await onSave([...sel]); setBusy(false); if (r !== false) onClose(); }}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>);
}
