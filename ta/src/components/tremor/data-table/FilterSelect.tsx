// The Tremor dashboard template's filter button (dashed until set, "+" turns into "×" to clear), as a standalone
// filter for any page. Picking an option applies it at once (no Apply button).
import * as React from "react";
import { RiAddLine, RiArrowDownSLine, RiCheckLine } from "@remixicon/react";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover";
import { Checkbox } from "../Checkbox";
import { Label } from "../Label";
import { cx, focusRing } from "../utils";

type Opt = { value: string; label: string };

/** several choices kept as one comma-joined string ("a,b"); "" = all */
export const inSel = (sel: string, v: unknown) => !sel || sel.split(",").includes(String(v ?? ""));
export const selList = (sel: string) => (sel ? sel.split(",") : []);

export function FilterSelect({ title, options, value, onChange, all, required, multiple }: { title: string; options: Opt[]; value: string; onChange: (v: string) => void; all?: string; required?: boolean; multiple?: boolean }) {
  if (multiple) return <FilterMulti title={title} options={options} value={selList(value)} onChange={l => onChange(l.join(","))} />;
  return <FilterOne title={title} options={options} value={value} onChange={onChange} all={all} required={required} />;
}
// one choice (its own component, so the hooks below always run in the same order)
function FilterOne({ title, options, value, onChange, all, required }: { title: string; options: Opt[]; value: string; onChange: (v: string) => void; all?: string; required?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const cur = options.find(o => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cx("flex w-full items-center gap-x-1.5 whitespace-nowrap rounded-md border border-gray-300 px-2 py-1.5 font-medium text-gray-600 hover:bg-gray-50 sm:w-fit sm:text-xs dark:border-gray-700 dark:text-gray-400 hover:dark:bg-gray-900", cur ? "" : "border-dashed", focusRing)}>
          <span aria-hidden="true" onClick={e => { if (cur && !required) { e.stopPropagation(); e.preventDefault(); onChange(""); } }}>
            <RiAddLine className={cx("-ml-px size-5 shrink-0 transition sm:size-4", cur && !required && "rotate-45 hover:text-red-500")} aria-hidden="true" />
          </span>
          <span className={cur ? "" : "w-full text-left sm:w-fit"}>{title}</span>
          {cur && <><span className="h-4 w-px bg-gray-300 dark:bg-gray-700" aria-hidden="true" /><span className="max-w-40 truncate font-semibold text-blue-600 dark:text-blue-500">{cur.label}</span></>}
          <RiArrowDownSLine className="size-5 shrink-0 text-gray-500 sm:size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={7} className="z-[110] w-56 p-2">
        <Label className="block px-2 pb-1 pt-1 text-xs font-medium text-gray-500">Filter by {title}</Label>
        <ul role="listbox" className="max-h-64 overflow-y-auto">
          {(required ? options : [{ value: "", label: all || "All" }, ...options]).map(o => (
            <li key={o.value || "_all"}>
              <button type="button" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-50 hover:dark:bg-gray-900">
                <span className="truncate">{o.label}</span>{o.value === value && <RiCheckLine className="size-4 shrink-0 text-blue-600" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** the same filter button with several choices (checkboxes), applied as they are ticked */
export function FilterMulti({ title, options, value, onChange }: { title: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  const labels = options.filter(o => value.includes(o.value)).map(o => o.label);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cx("flex w-full items-center gap-x-1.5 whitespace-nowrap rounded-md border border-gray-300 px-2 py-1.5 font-medium text-gray-600 hover:bg-gray-50 sm:w-fit sm:text-xs dark:border-gray-700 dark:text-gray-400 hover:dark:bg-gray-900", labels.length ? "" : "border-dashed", focusRing)}>
          <span aria-hidden="true" onClick={e => { if (labels.length) { e.stopPropagation(); e.preventDefault(); onChange([]); } }}>
            <RiAddLine className={cx("-ml-px size-5 shrink-0 transition sm:size-4", labels.length && "rotate-45 hover:text-red-500")} aria-hidden="true" />
          </span>
          <span>{title}</span>
          {labels.length > 0 && <><span className="h-4 w-px bg-gray-300 dark:bg-gray-700" aria-hidden="true" /><span className="max-w-40 truncate font-semibold text-blue-600 dark:text-blue-500">{labels.length < 3 ? labels.join(", ") : labels[0] + " and " + (labels.length - 1) + " more"}</span></>}
          <RiArrowDownSLine className="size-5 shrink-0 text-gray-500 sm:size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={7} className="z-[110] w-56">
        <Label className="text-sm font-medium">Filter by {title}</Label>
        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
          {options.map(o => (
            <div key={o.value} className="flex items-center gap-2">
              <Checkbox id={"f-" + title + o.value} checked={value.includes(o.value)} onCheckedChange={c => onChange(c ? [...value, o.value] : value.filter(x => x !== o.value))} />
              <Label htmlFor={"f-" + title + o.value} className="text-sm">{o.label}</Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
