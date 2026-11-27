"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// A new tablet (option J): a light-blue screen, the skwyd pos logo, 6 round code circles and big round navy-outline keys. Type the code from Manage → Devices.
import { SkwydLogo } from "@/components/shared/skwyd-logo";
import { cx } from "@/components/tremor/utils";
import { useState } from "react";
import { activate } from "../lib/db";
import { Keypad } from "./Keypad";

export function Activate({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const press = async (k: string) => {
    if (busy) return;
    const next = k === "c" ? "" : k === "b" ? code.slice(0, -1) : code.length < 6 ? code + k : code;
    setCode(next); setErr("");
    if (next.length === 6) { setBusy(true); const r = await activate(next); setBusy(false); if (r.error) { setErr(r.error); setCode(""); } else onDone(); }
  };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 overflow-auto bg-[#EFF5FE] p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <SkwydLogo stacked label="pos" markClass="h-11 w-9" wordClass="h-10 w-auto" />
      <h1 className="mt-1 text-xl font-semibold">Activate This Device</h1>
      <p className="max-w-xs text-center text-sm text-gray-500">Type the 6-digit code shown for this device in Manage → Devices.</p>
      <div className="flex gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={cx("flex size-14 items-center justify-center rounded-full bg-white text-2xl font-semibold text-[#24409A] dark:bg-gray-900 dark:text-white",
            i === code.length && !busy ? "border-2 border-[#24409A] dark:border-white" : "border border-indigo-200 dark:border-gray-700")}>{code[i] || ""}</div>))}
      </div>
      <p className="min-h-5 max-w-sm text-center text-sm text-red-600 dark:text-red-400">{busy ? "" : err}</p>
      {busy ? <p className="text-sm text-gray-500">Activating…</p> : <Keypad onKey={press} round />}
    </div>
  );
}
