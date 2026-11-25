// Shared bits for the Skwyd pages, in Tremor Raw styles: card, label/value pair, field wrapper, select style, table cell styles
import { Field, FieldLabel } from "@/components/ui/field";
import { cx, focusInput } from "@/components/tremor/utils";

export const SEL = cx("h-9 w-full appearance-none rounded-md border border-gray-300 bg-white ps-2.5 pe-9 text-sm text-gray-900 shadow-sm outline-none transition dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50", focusInput);
/** Tremor Table: TableHeaderCell / TableCell / TableRow (a little more compact) */
export const TH = "border-b border-gray-200 px-4 py-3 text-start text-sm font-semibold whitespace-nowrap text-gray-900 dark:border-gray-800 dark:text-gray-50";
export const TD = "px-4 py-2.5 text-sm whitespace-nowrap text-gray-600 dark:text-gray-400";
export const TR = "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/60";
/** Tremor Card (no padding) for lists and tables */
export const BOX = "overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-900 dark:bg-[#090E1A]";
export const Card = ({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={cx("relative w-full rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm dark:border-gray-900 dark:bg-[#090E1A]", className)}>
    <div className="mb-4 flex items-center justify-between gap-4"><h3 className="font-semibold text-gray-900 dark:text-gray-50">{title}</h3>{action}</div>
    {children}
  </div>);
export const L = ({ l, children }: { l: string; children: React.ReactNode }) => <div><p className="mb-1 text-sm text-gray-500 dark:text-gray-500">{l}</p><div className="text-sm font-medium text-gray-900 dark:text-gray-50">{children}</div></div>;
export const F = ({ l, req, help, full, children }: { l: string; req?: boolean; help?: string; full?: boolean; children: React.ReactNode }) => (
  <Field className={full ? "col-span-full" : ""}><FieldLabel className="mb-1.5 block">{l}{req && <span className="text-red-500"> *</span>}</FieldLabel>{children}
    {help && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">{help}</p>}</Field>);
