import { Button } from "@/components/tremor/Button";
// Tremor Date Picker / Date Range Picker: shows dd-mm-yyyy, keeps yyyy-mm-dd as the value
import { RiCloseLine } from "@remixicon/react";
import { DatePicker, DateRangePicker } from "@/components/tremor/DatePicker";

const toDate = (v: string) => v ? new Date(v + "T12:00:00") : undefined;
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function DateInput({ value, onChange, placeholder = "dd-mm-yyyy" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <DatePicker value={toDate(value)} onChange={d => onChange(d ? iso(d) : "")} placeholder={placeholder} enableYearNavigation align="start" className="h-9 w-full py-1.5" />;
}

const noon = (o = 0) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + o); return d; };
/** business-date quick picks: Today, Yesterday, This Week, Last Week, This Month, Last Month */
export function datePresets() {
  const t = noon(), mon = noon(-((t.getDay() + 6) % 7)), m1 = new Date(t.getFullYear(), t.getMonth(), 1, 12);
  return [
    { label: "Today", dateRange: { from: t, to: t } },
    { label: "Yesterday", dateRange: { from: noon(-1), to: noon(-1) } },
    { label: "This Week", dateRange: { from: mon, to: t } },
    { label: "Last Week", dateRange: { from: new Date(+mon - 7 * 86400000), to: new Date(+mon - 86400000) } },
    { label: "This Month", dateRange: { from: m1, to: t } },
    { label: "Last Month", dateRange: { from: new Date(t.getFullYear(), t.getMonth() - 1, 1, 12), to: new Date(t.getFullYear(), t.getMonth(), 0, 12) } },
  ];
}

/** a business-date range (from – to), dd-mm-yyyy, empty = all dates */
export function RangeInput({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  return (
    <div className="relative">
      <DateRangePicker value={from ? { from: toDate(from), to: toDate(to || from) } : undefined} onChange={r => r?.from ? onChange(iso(r.from), iso(r.to || r.from)) : onChange("", "")}
        placeholder="Business Date" presets={datePresets()} enableYearNavigation align="start" className="h-9 w-full py-1.5" />
      {from && <Button variant="ghost" aria-label="Clear dates" onClick={() => onChange("", "")} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5"><RiCloseLine className="size-4" /></Button>}
    </div>
  );
}
