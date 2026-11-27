"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The number pad of the activation and PIN screens: Tremor buttons in a 3 × 4 grid, and the dots / boxes above it.
import { Button } from "@/components/tremor/Button";
import { cx } from "@/components/tremor/utils";
import { RiDeleteBack2Line } from "@remixicon/react";

export function Keypad({ onKey, disabled, round }: { onKey: (k: string) => void; disabled?: boolean; round?: boolean }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "c", "0", "b"];
  // round: the sign-in and activation screens (option J) — big round navy-outline keys with navy numbers; Clear and ⌫ are grey text
  if (round) return (
    <div className="grid grid-cols-3 gap-4">
      {keys.map(k => { const fn = k === "c" || k === "b"; return (
        <button key={k} type="button" disabled={disabled} onClick={() => onKey(k)} aria-label={k === "c" ? "Clear" : k === "b" ? "Delete" : k}
          className={cx("flex size-[min(5.5rem,10.5dvh)] items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[#24409A]/50 active:scale-95 disabled:opacity-50",
            fn ? "text-base font-medium text-gray-500 hover:bg-[#24409A]/5 active:bg-[#24409A]/10 dark:text-gray-400 dark:hover:bg-white/10" : "border-[1.5px] border-[#24409A]/35 text-3xl font-medium text-[#24409A] hover:bg-[#24409A]/5 active:bg-[#24409A]/10 dark:border-white/30 dark:text-white dark:hover:bg-white/10")}>
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
