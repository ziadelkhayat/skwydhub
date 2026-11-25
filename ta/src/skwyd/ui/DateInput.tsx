// Tremor Date Picker / Date Range Picker: shows dd-mm-yyyy, keeps yyyy-mm-dd as the value
import { RiCloseLine } from "@remixicon/react";
import { DatePicker, DateRangePicker } from "@/components/tremor/DatePicker";

const toDate = (v: string) => v ? new Date(v + "T12:00:00") : undefined;
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function DateInput({ value, onChange, placeholder = "dd-mm-yyyy" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <DatePicker value={toDate(value)} onChange={d => onChange(d ? iso(d) : "")} placeholder={placeholder} enableYearNavigation align="start" className="h-9 w-full py-1.5" />;
}

/** a business-date range (from – to), dd-mm-yyyy, empty = all dates */
export function RangeInput({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  return (
    <div className="relative">
      <DateRangePicker value={from ? { from: toDate(from), to: toDate(to || from) } : undefined} onChange={r => r?.from ? onChange(iso(r.from), iso(r.to || r.from)) : onChange("", "")}
        placeholder="Business Date" enableYearNavigation align="start" className="h-9 w-full py-1.5" />
      {from && <button type="button" aria-label="Clear dates" onClick={() => onChange("", "")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900"><RiCloseLine className="size-4" /></button>}
    </div>
  );
}
