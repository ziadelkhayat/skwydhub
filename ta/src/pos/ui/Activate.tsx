"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// A new tablet: type the 6-digit code from Manage → Devices. There is no sign-in.
import { Card } from "@/components/tremor/Card";
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
    <div className="flex h-full items-center justify-center p-6">
      <Card className="flex w-auto flex-col items-center gap-4 px-10 py-8">
        <img src={import.meta.env.BASE_URL + "pos-files/logo.png"} alt="" className="size-16 rounded-md" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Activate This Device</h1>
        <p className="max-w-xs text-center text-sm text-gray-500">Type the 6-digit code shown for this device in Manage → Devices.</p>
        <div className="flex gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={cx("flex h-16 w-13 items-center justify-center rounded-md border bg-white text-3xl font-semibold text-gray-900 dark:bg-gray-950 dark:text-gray-50",
              i === code.length ? "border-2 border-blue-500" : "border-gray-300 dark:border-gray-800")}>{code[i] || ""}</div>))}
        </div>
        <p className="min-h-5 max-w-sm text-center text-sm text-red-600 dark:text-red-500">{busy ? "" : err}</p>
        {busy ? <p className="text-sm text-gray-500">Activating…</p> : <Keypad onKey={press} />}
      </Card>
    </div>
  );
}
