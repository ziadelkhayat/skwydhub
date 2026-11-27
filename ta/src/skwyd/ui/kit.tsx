// Shared bits for the Skwyd pages, in Tremor Raw styles: card, label/value pair, field wrapper, select style, table cell styles
import { Field, FieldLabel } from "@/components/ui/field";
import { cx } from "@/components/tremor/utils";
import { Card as TremorCard } from "@/components/tremor/Card";
import { Section } from "./Section";
import { selectNativeStyles } from "@/components/tremor/SelectNative";

/** extra classes for Tremor SelectNative (its look comes from Tremor) */
export const SEL = "h-9 py-1.5";
/** Tremor SelectNative look for things that aren't a <SelectNative> (e.g. a popover trigger) */
export const SEL_LOOK = cx(selectNativeStyles(), "h-9 py-1.5");
/** Tremor Table: TableHeaderCell / TableCell / TableRow (a little more compact) */
// Tremor Table cells keep Tremor's own styles: these stay empty so `className={TH + " text-end"}` still works
export const TH = "";
export const TD = "";
export const TR = "group cursor-pointer select-none hover:bg-gray-50 hover:dark:bg-gray-900";
/** Tremor Card (no padding) for lists and tables */
export const BOX = "overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-900 dark:bg-[#090E1A] portal:rounded-[14px] portal:border-transparent portal:shadow-[0_1px_2px_rgb(16_24_40/0.06),0_6px_16px_rgb(16_24_40/0.08)] dark:portal:border-gray-800 dark:portal:shadow-none";
/** Tremor Card; with a title it is a template settings section (title on the left, the card on the right) */
export const Card = ({ title, action, desc, children, className }: { title?: string; action?: React.ReactNode; desc?: React.ReactNode; children: React.ReactNode; className?: string }) =>
  title == null ? <TremorCard className={className}>{children}</TremorCard> : <Section title={title} desc={desc} act={action} className={className}>{children}</Section>;
export const L = ({ l, children }: { l: string; children: React.ReactNode }) => <div><p className="mb-1 text-sm text-gray-500 dark:text-gray-500">{l}</p><div className="text-sm font-medium text-gray-900 dark:text-gray-50">{children}</div></div>;
export const F = ({ l, req, help, full, children }: { l: string; req?: boolean; help?: string; full?: boolean; children: React.ReactNode }) => (
  <Field className={full ? "col-span-full" : ""}><FieldLabel className="mb-1.5 block">{l}{req && <span className="text-red-500"> *</span>}</FieldLabel>{children}
    {help && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">{help}</p>}</Field>);
