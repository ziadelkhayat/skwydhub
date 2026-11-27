"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// Touch pieces for the 16:10 tablet: everything a finger presses is at least 52px.
// Panel: a window over the menu (the cart stays in view on the left) with a big ✕, the title and one main button.
// Chip: a big choice button (categories, filters, quick notes). Pick: a big tile that toggles, with a tick when on.
import { Button } from "@/components/tremor/Button";
import { cx } from "@/components/tremor/utils";
import { createContext, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/** the register's menu area: every window opened from the register (Sheet) shows there, the cart stays on the left */
export const AreaCtx = createContext<{ cartW: string } | null>(null);

export function Panel({ area, title, sub, onClose, action, children, className, cartOpen, back }: { area: { cartW: string }; title: ReactNode; sub?: ReactNode; onClose: () => void; action?: ReactNode; children: ReactNode; className?: string; cartOpen?: boolean; back?: string }) {
  return (
    <>
      {/* the cart stays visible; a tap on it closes the window */}
      {cartOpen ? null : <button type="button" aria-label="Close" className="fixed inset-y-0 left-0 z-30 cursor-default" style={{ width: area.cartW }} onClick={onClose} />}
      <div className="fixed inset-y-0 right-0 z-30 flex bg-gray-200 p-4 portal:bg-[var(--portal-canvas)] dark:bg-gray-900 dark:portal:bg-gray-900" style={{ left: area.cartW }}>
        <section role="dialog" aria-label={typeof title === "string" ? title : "Window"} className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgb(16_24_40/0.06),0_8px_24px_rgb(16_24_40/0.08)] dark:bg-gray-950">
          <header className="flex shrink-0 items-center gap-4 border-b border-gray-100 px-4 py-3.5 dark:border-gray-800">
            {back ? <Button variant="secondary" className="h-14 shrink-0 gap-1.5 rounded-[14px] px-5 text-[17px]" onClick={onClose}><Icon name="back" className="size-5" />{back}</Button>
              : <Button variant="secondary" aria-label="Close" className="size-14 shrink-0 rounded-[14px] p-0" onClick={onClose}><Icon name="x" className="size-6" /></Button>}
            <div className="min-w-0 flex-1"><p className="truncate text-2xl font-semibold text-gray-900 dark:text-gray-50">{title}</p>{sub ? <p className="truncate text-sm text-gray-500">{sub}</p> : null}</div>
            {action}
          </header>
          <div className={cx("min-h-0 flex-1 overflow-y-auto p-5", className)}>{children}</div>
        </section>
      </div>
    </>);
}

/** the main button of a window or page: 56px, rounded */
export const Main = ({ children, onClick, disabled, variant = "primary", className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "destructive"; className?: string }) =>
  <Button variant={variant} disabled={disabled} onClick={onClick} className={cx("h-14 shrink-0 gap-2 rounded-[14px] px-7 text-[17px]", className)}>{children}</Button>;

export const Chip = ({ on, onClick, children, className, n }: { on?: boolean; onClick: () => void; children: ReactNode; className?: string; n?: number }) =>
  <button type="button" onClick={onClick} aria-pressed={!!on} className={cx("flex h-[52px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[14px] px-5 text-[17px] font-medium",
    on ? "bg-blue-600 text-white shadow-[0_2px_8px_rgb(79_70_229/0.3)] dark:bg-blue-500" : "bg-white text-gray-800 shadow-[0_1px_2px_rgb(16_24_40/0.06),0_4px_12px_rgb(16_24_40/0.06)] dark:bg-gray-900 dark:text-gray-200", className)}>
    {children}{n != null ? <span className={cx("text-sm", on ? "text-blue-100" : "text-gray-500")}>{n}</span> : null}</button>;

export function Pick({ on, onClick, title, sub, disabled, right, className }: { on: boolean; onClick: () => void; title: ReactNode; sub?: ReactNode; disabled?: boolean; right?: ReactNode; className?: string }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={on}
      className={cx("relative flex min-h-[92px] w-full flex-col items-start justify-center gap-1 rounded-2xl px-5 py-3 text-left disabled:opacity-45",
        on ? "bg-blue-50 ring-[2.5px] ring-inset ring-blue-600 dark:bg-blue-500/10 dark:ring-blue-500" : "bg-gray-50 ring-[1.5px] ring-inset ring-gray-200 dark:bg-gray-900 dark:ring-gray-800", className)}>
      <span className="pe-9 text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</span>
      {sub ? <span className="pe-9 text-sm text-gray-500">{sub}</span> : null}
      {right ? <span className="absolute bottom-3 right-4">{right}</span> : null}
      {on ? <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500"><Icon name="check" className="size-5" /></span> : null}
    </button>);
}

/** a big two- or three-way switch (%, Amount; Pickup, Delivery) */
export const Seg = <T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, ReactNode][] }) => (
  <div className="flex rounded-[14px] bg-gray-100 p-1 dark:bg-gray-900">{items.map(([k, l]) =>
    <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} className={cx("flex h-14 flex-1 items-center justify-center gap-2 rounded-[11px] px-4 text-[17px] font-semibold",
      value === k ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-50" : "text-gray-500")}>{l}</button>)}</div>);

/** the section label inside a window */
export const Label = ({ children }: { children: ReactNode }) => <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{children}</p>;

/** an on-screen keyboard for notes (the tablet's own keyboard stays closed): letters, numbers, Shift, space, delete */
export function Keyboard({ onKey }: { onKey: (k: string) => void }) {
  const [up, setUp] = useState(false);
  const rows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const K = ({ k, label, wide, dark }: { k: string; label?: ReactNode; wide?: string; dark?: boolean }) =>
    <button type="button" onPointerDown={e => e.preventDefault()} onClick={() => { onKey(k); if (up && k.length === 1) setUp(false); }} aria-label={k === "\b" ? "Delete" : k === " " ? "Space" : k === "\n" ? "New line" : k}
      className={cx("flex h-14 items-center justify-center rounded-xl text-[20px] font-medium", wide || "flex-1", dark ? "bg-gray-200 text-gray-800 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-200" : "bg-white text-gray-900 shadow-[0_1px_0_rgb(16_24_40/0.15)] active:bg-blue-50 dark:bg-gray-900 dark:text-gray-50")}>{label ?? k}</button>;
  return (
    <div className="space-y-2 rounded-2xl bg-gray-100 p-2.5 dark:bg-gray-950">
      {rows.map((r, i) => <div key={r} className={cx("flex gap-2", i === 2 && "px-6")}>
        {i === 3 ? <button type="button" onClick={() => setUp(v => !v)} aria-pressed={up} aria-label="Shift" className={cx("flex h-14 w-20 items-center justify-center rounded-xl text-[20px]", up ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200")}>⇧</button> : null}
        {r.split("").map(c => { const ch = up ? c.toUpperCase() : c; return <K key={c} k={ch} />; })}
        {i === 3 ? <K k={"\b"} label={<Icon name="del" className="size-6" />} wide="w-20" dark /> : null}</div>)}
      <div className="flex gap-2"><K k="," dark wide="w-20" /><K k="-" dark wide="w-20" /><K k=" " label="space" /><K k="." dark wide="w-20" /><K k={"\n"} label="return" dark wide="w-28" /></div>
    </div>);
}
