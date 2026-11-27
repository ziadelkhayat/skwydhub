// A Filters button and side panel for list pages (Devices, Stores…): text boxes, dropdowns with tick boxes and a date.
// The panel keeps its own draft; "Show results" applies it. Brand, Store and type tabs stay on the page beside it.
import { useEffect, useState } from "react";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/tremor/Drawer";
import { MultiField, selList } from "@/components/tremor/data-table/FilterSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FilterIcon } from "@/icons";

/** one filter: text (contains), multi (any of the picked values) or date (on or after) */
export type FDef<R = any> = { k: string; l: string; t?: "text" | "multi" | "date"; opts?: [string, string][]; get: (r: R) => unknown; ph?: string };
export type FVals = Record<string, string>;

export const countF = (F: FVals) => Object.values(F).filter(v => String(v || "").trim()).length;
export function applyF<R>(rows: R[], defs: FDef<R>[], F: FVals) {
  const on = defs.filter(d => String(F[d.k] || "").trim());
  if (!on.length) return rows;
  return rows.filter(r => on.every(d => {
    const v = String(F[d.k]).trim(), x = d.get(r);
    if (d.t === "multi") { const sel = selList(v), xs = Array.isArray(x) ? x.map(String) : [String(x ?? "")]; return xs.some(y => sel.includes(y)); }
    if (d.t === "date") return !!x && String(x).slice(0, 10) >= v;
    return String(x ?? "").toLowerCase().includes(v.toLowerCase());
  }));
}

export function FiltersButton({ F, onClick }: { F: FVals; onClick: () => void }) {
  const n = countF(F);
  return <Button variant={n ? "secondary" : "outline"} className="h-[30px] py-1" onClick={onClick}><FilterIcon className="size-4" />Filters{n ? <Badge variant="solid" color="primary" className="ms-1">{n}</Badge> : null}</Button>;
}

export function ListFilters({ open, defs, F, onApply, onClose }: { open: boolean; defs: FDef[]; F: FVals; onApply: (f: FVals) => void; onClose: () => void }) {
  const [d, setD] = useState<FVals>({ ...F });
  useEffect(() => { if (open) setD({ ...F }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: string) => setD(x => { const n = { ...x }; if (v) n[k] = v; else delete n[k]; return n; });
  return (
    <Drawer open={open} onOpenChange={o => !o && onClose()}>
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader><DrawerTitle>Filters</DrawerTitle></DrawerHeader>
        <DrawerBody className="-mx-6 space-y-5 overflow-y-auto px-6">
          {defs.map(f => f.t === "multi"
            ? (f.opts || []).length ? <MultiField key={f.k} label={f.l} value={d[f.k] || ""} onChange={v => set(f.k, v)} options={(f.opts || []).map(([value, label]) => ({ value, label }))} /> : null
            : <Field key={f.k}><FieldLabel>{f.l}</FieldLabel><Input type={f.t === "date" ? "date" : "text"} placeholder={f.ph || ""} value={d[f.k] || ""} onChange={e => set(f.k, e.target.value)} /></Field>)}
        </DrawerBody>
        <DrawerFooter className="-mx-6 -mb-2 gap-2 border-t border-gray-200 px-6 pt-4 dark:border-gray-800">
          <Button variant="ghost" className="sm:me-auto" onClick={() => setD({})}>Reset all</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onApply(d)}>Show results</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
