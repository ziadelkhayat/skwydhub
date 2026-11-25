import { cn } from "@/utils";

/** TailAdmin tab switch (Overview · Sales · Revenue style): gray track, white active tab */
export function SegTabs({ value, onChange, items, className }: { value: string; onChange: (v: string) => void; items: [string, string][]; className?: string }) {
  return (
    <div className={cn("no-scrollbar flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900", className)}>
      {items.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className={cn("text-sm shrink-0 rounded-md px-3 py-1.5 font-medium whitespace-nowrap transition-colors hover:text-gray-900 dark:hover:text-white",
            value === k ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400")}>{l}</button>
      ))}
    </div>
  );
}
