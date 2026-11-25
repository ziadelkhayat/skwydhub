// Shared bits for the Skwyd pages: TailAdmin card, label/value pair, field wrapper, select style, table cell styles
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/utils";

export const SEL = "h-9 w-full rounded-lg border border-gray-300 bg-transparent ps-3 pe-9 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
export const TH = "px-5 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-500 sm:px-6 dark:text-gray-400";
export const TD = "px-5 py-2.5 text-sm whitespace-nowrap text-gray-700 sm:px-6 dark:text-gray-400";
export const TR = "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/2";
export const BOX = "overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3";
export const Card = ({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800", className)}>
    <div className="mb-5 flex items-center justify-between gap-4"><h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h4>{action}</div>
    {children}
  </div>);
export const L = ({ l, children }: { l: string; children: React.ReactNode }) => <div><p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">{l}</p><div className="text-sm font-medium text-gray-800 dark:text-white/90">{children}</div></div>;
export const F = ({ l, req, help, full, children }: { l: string; req?: boolean; help?: string; full?: boolean; children: React.ReactNode }) => (
  <Field className={full ? "col-span-full" : ""}><FieldLabel className="mb-1.5 block">{l}{req && <span className="text-red-500"> *</span>}</FieldLabel>{children}
    {help && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{help}</p>}</Field>);
