"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The number pad of the activation and PIN screens: Tremor buttons in a 3 × 4 grid, and the dots / boxes above it.
import { Button } from "@/components/tremor/Button";
import { cx } from "@/components/tremor/utils";
import { RiDeleteBack2Line } from "@remixicon/react";

export function Keypad({ onKey, disabled, round }: { onKey: (k: string) => void; disabled?: boolean; round?: boolean }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "c", "0", "b"];
  // round: the sign-in and activation screens (option J) — big round navy-outline keys with navy numbers; Clear and ⌫ are grey text
  // the sign-in and activation screens: the same keys as every POS keypad (soft tinted, rounded, finger size)
  if (round) return (
    <div className="grid grid-cols-3 gap-2.5">
      {keys.map(k => { const fn = k === "c" || k === "b"; return (
        <button key={k} type="button" disabled={disabled} onClick={() => onKey(k)} aria-label={k === "c" ? "Clear" : k === "b" ? "Delete" : k}
          className={cx("flex h-[min(76px,9.5dvh)] w-32 items-center justify-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50",
            fn ? "text-base font-medium text-gray-700 active:bg-gray-100 dark:text-gray-300 dark:active:bg-gray-900" : "bg-blue-50 text-[28px] font-semibold text-blue-700 active:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400")}>
          {k === "b" ? <RiDeleteBack2Line className="size-7" /> : k === "c" ? "Clear" : k}
        </button>); })}
    </div>);
  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.map(k => (
        <Button key={k} variant={k === "c" || k === "b" ? "ghost" : "secondary"} disabled={disabled} onClick={() => onKey(k)} aria-label={k === "c" ? "Clear" : k === "b" ? "Delete" : k}
          className="size-20 text-2xl font-semibold">
          {k === "b" ? <RiDeleteBack2Line className="size-6" /> : k === "c" ? <span className="text-base font-medium">Clear</span> : k}
        </Button>))}
    </div>
  );
}

export const Dots = ({ n, max = 5, navy }: { n: number; max?: number; navy?: boolean }) => (
  <div className="flex gap-3" aria-label={`${n} digits`}>
    {Array.from({ length: max }, (_, i) => <span key={i} className={cx("size-4 rounded-full border-2", navy ? (i < n ? "border-[#24409A] bg-[#24409A] dark:border-white dark:bg-white" : "border-gray-300 dark:border-gray-600") : i < n ? "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500" : "border-gray-300 dark:border-gray-700")} />)}
  </div>);
