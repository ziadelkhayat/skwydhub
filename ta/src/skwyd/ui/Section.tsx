// Tremor dashboard template settings section: title and description on the left, content on the right (in a Tremor Card).
import * as React from "react";
import { Card } from "@/components/tremor/Card";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { cx } from "@/components/tremor/utils";

export function Section({ title, desc, act, children, card = true, className }: { title: React.ReactNode; desc?: React.ReactNode; act?: React.ReactNode; children: React.ReactNode; card?: boolean; className?: string }) {
  // the title (and its buttons) on top of the card; the section centred on the page
  return (
    <section className={cx("mx-auto w-full max-w-5xl py-4", className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="scroll-mt-10 font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
          {desc && <p className="mt-1 text-sm leading-6 text-gray-500">{desc}</p>}
        </div>
        {act && <div className="flex flex-wrap gap-2">{act}</div>}
      </div>
      <div className="min-w-0">{card ? <Card>{children}</Card> : children}</div>
    </section>
  );
}

/** Tremor line tabs (the template's tab navigation look) */
export function LineTabs({ value, onChange, items, className }: { value: string; onChange: (v: string) => void; items: [string, React.ReactNode][]; className?: string }) {
  return (
    <Tabs value={value} onValueChange={onChange} className={cx("mx-auto w-full max-w-5xl", className)}>
      <TabsList variant="line" className="no-scrollbar max-w-full overflow-x-auto">
        {items.map(([k, l]) => <TabsTrigger key={k} value={k} className="shrink-0">{l}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}
