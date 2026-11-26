import { Button } from "@/components/tremor/Button";
// Business date / week / month pickers (Tremor Popover + the Tremor date picker trigger look). Picking applies at once.
import * as React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCalendar2Fill } from "@remixicon/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tremor/Popover";
import { DatePicker } from "@/components/tremor/DatePicker";
import { cx, focusInput } from "@/components/tremor/utils";

export type Kind = "1" | "7" | "30";
const noon = (d: Date) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; };
const dmy = (d: Date) => [d.getDate(), d.getMonth() + 1].map(n => String(n).padStart(2, "0")).join("-") + "-" + d.getFullYear();
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const weekStart = (d: Date) => { const x = noon(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addD = (d: Date, n: number) => new Date(+d + n * 86400000);
const short = (d: Date) => String(d.getDate()).padStart(2, "0") + " " + MON[d.getMonth()];

const trigger = cx("flex h-[30px] w-full items-center gap-x-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition sm:w-fit dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 hover:bg-gray-50 dark:hover:bg-gray-950/50", focusInput);

function Trigger({ label }: { label: string }) {
  return <PopoverTrigger asChild><button type="button" className={trigger}><RiCalendar2Fill className="size-5 shrink-0 text-gray-400 dark:text-gray-600" /><span className="whitespace-nowrap tabular-nums">{label}</span></button></PopoverTrigger>;
}

function WeekPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = React.useState(false), [m, setM] = React.useState(() => new Date(value.getFullYear(), value.getMonth(), 1, 12));
  React.useEffect(() => { if (open) setM(new Date(value.getFullYear(), value.getMonth(), 1, 12)); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = weekStart(value), weeks: Date[] = [];
  for (let w = weekStart(m); w.getMonth() === m.getMonth() || +w < +m; w = addD(w, 7)) { if (+addD(w, 6) >= +m) weeks.push(w); if (weeks.length > 6) break; }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Trigger label={dmy(sel) + " → " + dmy(addD(sel, 6))} />
      <PopoverContent align="start" className="z-[110] w-80 p-3">
        <div className="mb-2 flex items-center justify-between"><Button variant="ghost" className="p-1" aria-label="Previous month" onClick={() => setM(new Date(m.getFullYear(), m.getMonth() - 1, 1, 12))}><RiArrowLeftSLine className="size-4" /></Button>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{MON[m.getMonth()]} {m.getFullYear()}</span>
          <Button variant="ghost" className="p-1" aria-label="Next month" onClick={() => setM(new Date(m.getFullYear(), m.getMonth() + 1, 1, 12))}><RiArrowRightSLine className="size-4" /></Button></div>
        <div className="grid grid-cols-2 gap-1">{weeks.map(w => <Button key={+w} variant={+w === +sel ? "primary" : "ghost"} className="px-2 py-1.5 font-normal" onClick={() => { onChange(w); setOpen(false); }}>{short(w)} – {short(addD(w, 6))}</Button>)}</div>
      </PopoverContent>
    </Popover>
  );
}

function MonthPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = React.useState(false), [y, setY] = React.useState(value.getFullYear());
  React.useEffect(() => { if (open) setY(value.getFullYear()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const first = new Date(value.getFullYear(), value.getMonth(), 1, 12), last = new Date(value.getFullYear(), value.getMonth() + 1, 0, 12);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Trigger label={dmy(first) + " → " + dmy(last)} />
      <PopoverContent align="start" className="z-[110] w-72 p-3">
        <div className="mb-2 flex items-center justify-between"><Button variant="ghost" className="p-1" aria-label="Previous year" onClick={() => setY(y - 1)}><RiArrowLeftSLine className="size-4" /></Button>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{y}</span>
          <Button variant="ghost" className="p-1" aria-label="Next year" onClick={() => setY(y + 1)}><RiArrowRightSLine className="size-4" /></Button></div>
        <div className="grid grid-cols-3 gap-1">{MON.map((n, i) => <Button key={n} variant={y === value.getFullYear() && i === value.getMonth() ? "primary" : "ghost"} className="px-2 py-1.5 font-normal" onClick={() => { onChange(new Date(y, i, 1, 12)); setOpen(false); }}>{n}</Button>)}</div>
      </PopoverContent>
    </Popover>
  );
}

/** Day: a business date; Week: Monday–Sunday; Month: a calendar month. `value` is any day in the period. */
export function PeriodPicker({ kind, value, onChange, max }: { kind: Kind; value: Date; onChange: (d: Date) => void; max?: Date }) {
  if (kind === "7") return <WeekPicker value={value} onChange={onChange} />;
  if (kind === "30") return <MonthPicker value={value} onChange={onChange} />;
  return <DatePicker value={value} onChange={d => d && onChange(noon(d))} toDate={max} enableYearNavigation align="start" placeholder="Business Date" className="h-[30px] w-full py-1 sm:w-40" />;
}
