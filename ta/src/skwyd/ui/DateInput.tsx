// TailAdmin date picker (flatpickr): shows dd-mm-yyyy, keeps yyyy-mm-dd as the value
import { Input } from "@/components/ui/input";
import { CalendarIcon } from "@/icons";
import flatpickr from "flatpickr";
import { useEffect, useRef } from "react";

export function DateInput({ value, onChange, placeholder = "dd-mm-yyyy" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null), fp = useRef<flatpickr.Instance | null>(null), cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!ref.current) return;
    fp.current = flatpickr(ref.current, { mode: "single", static: true, dateFormat: "Y-m-d", altInput: true, altFormat: "d-m-Y", altInputClass: ref.current.className, allowInput: true, defaultDate: value || undefined,
      onChange: (_d, str) => cb.current(str || "") }) as flatpickr.Instance;
    return () => { fp.current?.destroy(); fp.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (fp.current && (fp.current.input.value || "") !== (value || "")) fp.current.setDate(value || "", false); }, [value]);
  return (
    <div className="relative">
      <Input ref={ref} type="text" placeholder={placeholder} className="h-11 pe-10" />
      <span className="pointer-events-none absolute inset-e-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"><CalendarIcon className="size-5" /></span>
    </div>
  );
}
