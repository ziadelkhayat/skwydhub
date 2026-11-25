// Record pages in the Tremor template style: page header, KPI cards, and a "Details" description list section.
import * as React from "react";
import { Card } from "@/components/tremor/Card";
import { Section } from "./Section";

/** Tremor page header: title with badges, actions on the right; the way back is a secondary button */
export function PageHead({ back, title, badges, actions }: { back?: React.ReactNode; title: React.ReactNode; badges?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6 dark:border-gray-800">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {back}
        <h2 className="truncate text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50">{title}</h2>
        {badges}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Tremor KPI cards (kpi-card-01) */
export function Kpis({ items, className }: { items: [React.ReactNode, React.ReactNode][]; className?: string }) {
  return (
    <dl className={"mb-8 grid grid-cols-2 gap-4 sm:gap-6 " + (className || (items.length > 4 ? "sm:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4"))}>
      {items.map(([l, v], i) => (
        <Card key={i} className="p-4 sm:p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-500">{l}</dt>
          <dd className="mt-2 text-xl font-semibold break-words text-gray-900 dark:text-gray-50">{v}</dd>
        </Card>
      ))}
    </dl>
  );
}

/** "Details": the record's fields as a description list, in a template settings section */
export function InfoList({ rows, title = "Details", desc, act }: { rows: [string, React.ReactNode][]; title?: string; desc?: React.ReactNode; act?: React.ReactNode }) {
  return (
    <Section title={title} desc={desc} act={act}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([l, v]) => (
          <div key={l} className="min-w-0">
            <dt className="text-sm text-gray-500 dark:text-gray-500">{l}</dt>
            <dd className="mt-1 text-sm font-medium break-words text-gray-900 dark:text-gray-50">{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
