"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The number pad of the activation and PIN screens: Tremor buttons in a 3 × 4 grid, and the dots / boxes above it.
import { Button } from "@/components/tremor/Button";
import { cx } from "@/components/tremor/utils";
import { RiDeleteBack2Line } from "@remixicon/react";

export function Keypad({ onKey, disabled }: { onKey: (k: string) => void; disabled?: boolean }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "c", "0", "b"];
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

export const Dots = ({ n, max = 5 }: { n: number; max?: number }) => (
  <div className="flex gap-3" aria-label={`${n} digits`}>
    {Array.from({ length: max }, (_, i) => <span key={i} className={cx("size-4 rounded-full border-2", i < n ? "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500" : "border-gray-300 dark:border-gray-700")} />)}
  </div>);
