// An "Add …" box with search inside and ticks for several at once (Add Ingredient, Add Modifier).
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDownIcon, SearchIcon } from "@/icons";
import { cn } from "@/utils";
import { useState } from "react";
import { SEL } from "./kit";

export function PickMany({ label, opts, onAdd, className }: { label: string; opts: { id: string; name: string; sub?: string }[]; onAdd: (ids: string[]) => void; className?: string }) {
  const [open, setOpen] = useState(false), [q, setQ] = useState(""), [on, setOn] = useState<string[]>([]);
  const s = q.trim().toLowerCase(), list = opts.filter(o => !s || (o.name + " " + (o.sub || "")).toLowerCase().includes(s));
  const set = (v: boolean) => { setOpen(v); if (!v) { setQ(""); setOn([]); } };
  const tick = (id: string) => setOn(o => o.includes(id) ? o.filter(x => x !== id) : [...o, id]);
  const add = () => { if (on.length) onAdd(on); set(false); };
  return (
    <Popover open={open} onOpenChange={set}>
      <PopoverTrigger aria-label={label} className={cn(SEL, "flex h-10 w-48 items-center justify-between gap-2 bg-none text-start sm:w-56", className)}>
        <span className="truncate text-gray-500 dark:text-gray-400">{label}…</span><ChevronDownIcon className="size-4 shrink-0 text-gray-500" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-gray-200 p-2 dark:border-gray-800">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 dark:border-gray-700">
            <SearchIcon className="size-4 shrink-0 text-gray-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && list.length === 1 && !on.length) { onAdd([list[0].id]); set(false); } }}
              placeholder="Search…" aria-label="Search" className="h-full w-full appearance-none border-0 bg-transparent p-0 text-sm text-gray-800 shadow-none outline-none placeholder:text-gray-400 focus:border-0 focus:ring-0 focus:outline-none dark:text-white/90" />
          </div>
        </div>
        <div className="custom-scrollbar max-h-72 overflow-y-auto p-1">
          {list.length ? list.map(o => { const sel = on.includes(o.id); return (
            <label key={o.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5", sel && "bg-brand-50 dark:bg-brand-500/10")}>
              <input type="checkbox" checked={sel} onChange={() => tick(o.id)} className="size-4 accent-brand-500" />
              <span className="flex-1 text-gray-800 dark:text-white/90">{o.name}{o.sub ? <span className="text-gray-500"> ({o.sub})</span> : null}</span>
            </label>); }) : <p className="px-3 py-6 text-center text-sm text-gray-500">{opts.length ? "Nothing matches." : "Nothing left to add."}</p>}
        </div>
        <div className="flex items-center gap-2 border-t border-gray-200 p-2 dark:border-gray-800">
          <span className="flex-1 ps-1 text-sm text-gray-500">{on.length ? `${on.length} selected` : "Tick one or more"}</span>
          <Button size="sm" variant="outline" onClick={() => set(false)}>Cancel</Button>
          <Button size="sm" disabled={!on.length} onClick={add}>Add{on.length ? ` (${on.length})` : ""}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
