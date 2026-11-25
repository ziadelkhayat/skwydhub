import { Label } from "@/components/tremor/Label";
import { Input as TInput } from "@/components/tremor/Input";
import { Checkbox } from "@/components/ui/checkbox";
// An "Add …" box with search inside and ticks for several at once (Add Ingredient, Add Modifier).
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDownIcon } from "@/icons";
import { cn } from "@/utils";
import { useState } from "react";
import { SEL_LOOK } from "./kit";

export function PickMany({ label, opts, onAdd, className }: { label: string; opts: { id: string; name: string; sub?: string }[]; onAdd: (ids: string[]) => void; className?: string }) {
  const [open, setOpen] = useState(false), [q, setQ] = useState(""), [on, setOn] = useState<string[]>([]);
  const s = q.trim().toLowerCase(), list = opts.filter(o => !s || (o.name + " " + (o.sub || "")).toLowerCase().includes(s));
  const set = (v: boolean) => { setOpen(v); if (!v) { setQ(""); setOn([]); } };
  const tick = (id: string) => setOn(o => o.includes(id) ? o.filter(x => x !== id) : [...o, id]);
  const add = () => { if (on.length) onAdd(on); set(false); };
  return (
    <Popover open={open} onOpenChange={set}>
      <PopoverTrigger aria-label={label} className={cn(SEL_LOOK, "flex w-48 items-center justify-between gap-2 bg-none text-start sm:w-56", className)}>
        <span className="truncate text-gray-500 dark:text-gray-400">{label}…</span><ChevronDownIcon className="size-4 shrink-0 text-gray-500" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-gray-200 p-2 dark:border-gray-800">
          <TInput type="search" autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && list.length === 1 && !on.length) { onAdd([list[0].id]); set(false); } }}
            placeholder="Search…" aria-label="Search" inputClassName="h-8 py-1" />
        </div>
        <div className="custom-scrollbar max-h-72 overflow-y-auto p-1">
          {list.length ? list.map(o => { const sel = on.includes(o.id); return (
            <Label key={o.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5", sel && "bg-blue-50 dark:bg-blue-500/10")}>
              <Checkbox checked={sel} onCheckedChange={() => tick(o.id)} />
              <span className="flex-1 text-gray-900 dark:text-gray-50">{o.name}{o.sub ? <span className="text-gray-500"> ({o.sub})</span> : null}</span>
            </Label>); }) : <p className="px-3 py-6 text-center text-sm text-gray-500">{opts.length ? "Nothing matches." : "Nothing left to add."}</p>}
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
