// Tremor KPI card: label, big number, change badge.
import { Badge } from "@/components/ui/badge";
import { cx } from "@/components/tremor/utils";
import React from "react";

export interface MetricCardProps {
  icon?: React.ReactNode;
  title: string;
  value: string | number;
  change?: string;
  direction?: "up" | "down";
  badge?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export default function MetricCard({ title, value, change, direction = "up", badge, className, children }: MetricCardProps) {
  return (
    <div className={cx("relative w-full rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm dark:border-gray-900 dark:bg-[#090E1A]", className)}>
      <dt className="flex items-center justify-between gap-2 text-sm font-medium text-gray-500 dark:text-gray-500">
        <span className="truncate">{title}</span>
        {badge !== undefined ? badge : change ? <Badge color={direction === "down" ? "error" : "success"}>{direction === "down" ? "−" : "+"}{change.replace(/^[+−-]/, "")}</Badge> : null}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">{value}</dd>
      {children}
    </div>
  );
}
