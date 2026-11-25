// Tremor dashboard template settings section: title and description on the left, content on the right (in a Tremor Card).
import * as React from "react";
import { Card } from "@/components/tremor/Card";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { cx } from "@/components/tremor/utils";

export function Section({ title, desc, act, children, card = true, className }: { title: React.ReactNode; desc?: React.ReactNode; act?: React.ReactNode; children: React.ReactNode; card?: boolean; className?: string }) {
  return (
    <section className={cx("grid grid-cols-1 gap-x-14 gap-y-4 border-b border-gray-200 py-8 first:pt-0 last:border-b-0 md:grid-cols-3 dark:border-gray-800", className)}>
      <div>
        <h2 className="scroll-mt-10 font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
        {desc && <p className="mt-1 text-sm leading-6 text-gray-500">{desc}</p>}
        {act && <div className="mt-4 flex flex-wrap gap-2">{act}</div>}
      </div>
      <div className="min-w-0 md:col-span-2">{card ? <Card>{children}</Card> : children}</div>
    </section>
  );
}

/** Tremor line tabs (the template's tab navigation look) */
export function LineTabs({ value, onChange, items, className }: { value: string; onChange: (v: string) => void; items: [string, React.ReactNode][]; className?: string }) {
  return (
    <Tabs value={value} onValueChange={onChange} className={className}>
      <TabsList variant="line" className="no-scrollbar max-w-full overflow-x-auto">
        {items.map(([k, l]) => <TabsTrigger key={k} value={k} className="shrink-0">{l}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}
