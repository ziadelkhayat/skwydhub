// Tremor dashboard template Overview cards: ProgressBarCard, CategoryBarCard and ChartCard (props made generic).
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "../ProgressBar";
import { LineChart } from "../LineChart";
import { cx } from "../utils";

export const changeBadge = (v: number | null | undefined) => {
  if (v == null || !isFinite(v)) return null;
  const color = v > 0 ? "success" : v < -0.5 ? "warning" : v < 0 ? "error" : "gray";
  return <Badge color={color as any}>{(v > 0 ? "+" : "") + (v * 100).toFixed(1)}%</Badge>;
};

export type ProgressItem = { title: string; current: string; percentage: number };
export function ProgressBarCard({ title, change, value, valueDescription, data, footer }: { title: string; change?: number | null; value: string; valueDescription?: string; data: ProgressItem[]; footer?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2"><dt className="font-bold text-gray-900 sm:text-sm dark:text-gray-50">{title}</dt>{changeBadge(change)}</div>
        <dd className="mt-2 flex items-baseline gap-2"><span className="text-xl text-gray-900 dark:text-gray-50">{value}</span>{valueDescription && <span className="text-sm text-gray-500">{valueDescription}</span>}</dd>
        <ul role="list" className="mt-4 space-y-5">
          {!data.length && <li className="text-sm text-gray-500">No sales yet.</li>}
          {data.map(item => (
            <li key={item.title}>
              <p className="flex justify-between text-sm"><span className="font-medium text-gray-900 dark:text-gray-50">{item.title}</span><span className="font-medium text-gray-900 dark:text-gray-50">{item.current}<span className="font-normal text-gray-500"> · {item.percentage.toFixed(0)}%</span></span></p>
              <ProgressBar value={item.percentage} className="mt-2 [&>*]:h-1.5" />
            </li>
          ))}
        </ul>
      </div>
      {footer && <p className="mt-6 text-xs text-gray-500">{footer}</p>}
    </div>
  );
}

export type CategoryItem = { title: string; value: string; percentage: number; color: string };
export const CAT_COLORS = ["bg-blue-600 dark:bg-blue-500", "bg-cyan-500 dark:bg-cyan-500", "bg-violet-500 dark:bg-violet-500", "bg-amber-500 dark:bg-amber-500", "bg-emerald-500 dark:bg-emerald-500", "bg-gray-400 dark:bg-gray-600"];
export function CategoryBarCard({ title, change, value, valueDescription, subtitle, data, footer }: { title: string; change?: number | null; value: string; valueDescription?: string; subtitle: string; data: CategoryItem[]; footer?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2"><h3 className="font-bold text-gray-900 sm:text-sm dark:text-gray-50">{title}</h3>{changeBadge(change)}</div>
        <p className="mt-2 flex items-baseline gap-2"><span className="text-xl text-gray-900 dark:text-gray-50">{value}</span>{valueDescription && <span className="text-sm text-gray-500">{valueDescription}</span>}</p>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{subtitle}</p>
          <div className="mt-2 flex items-center gap-0.5">
            {!data.length && <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-800" />}
            {data.map(item => <div key={item.title} className={cx(item.color, "h-1.5 rounded-full")} style={{ width: `${item.percentage}%` }} />)}
          </div>
        </div>
        <ul role="list" className="mt-5 space-y-2">
          {data.map(item => (
            <li key={item.title} className="flex items-center gap-2 text-xs">
              <span className={cx(item.color, "size-2.5 rounded-sm")} aria-hidden="true" />
              <span className="text-gray-900 dark:text-gray-50">{item.title}</span>
              <span className="text-gray-600 dark:text-gray-400">({item.value} / {item.percentage.toFixed(0)}%)</span>
            </li>
          ))}
        </ul>
      </div>
      {footer && <p className="mt-6 text-xs text-gray-500">{footer}</p>}
    </div>
  );
}

export function ChartCard({ title, value, previous, change, data, compare, formatter }: {
  title: string; value: string; previous?: string; change?: number | null;
  data: { label: string; value: number | null; previousValue?: number | null }[]; compare: boolean; formatter: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center gap-x-2"><dt className="font-bold text-gray-900 sm:text-sm dark:text-gray-50">{title}</dt>{compare && changeBadge(change)}</div>
      <div className="mt-2 flex items-baseline justify-between">
        <dd className="text-xl text-gray-900 dark:text-gray-50">{value}</dd>
        {compare && previous != null && <dd className="text-sm text-gray-500">from {previous}</dd>}
      </div>
      <LineChart className="mt-6 h-32" data={data} index="label" colors={["blue", "gray"]} startEndOnly showGridLines={false} showYAxis={false} showLegend={false}
        categories={compare ? ["value", "previousValue"] : ["value"]} valueFormatter={v => formatter(v as number)} />
    </div>
  );
}
