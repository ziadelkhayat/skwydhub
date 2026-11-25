// Tremor Raw Tabs (Radix), solid variant.
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { cx } from "@/components/tremor/utils";

export function SegTabs({ value, onChange, items, className }: { value: string; onChange: (v: string) => void; items: [string, string][]; className?: string }) {
  return (
    <Tabs value={value} onValueChange={onChange} className="max-w-full">
      <TabsList variant="solid" className={cx("no-scrollbar max-w-full justify-start overflow-x-auto", className)}>
        {items.map(([k, l]) => <TabsTrigger key={k} value={k} className="shrink-0">{l}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}
