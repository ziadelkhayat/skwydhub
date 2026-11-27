"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// A new tablet (option I): a navy screen, the white skwyd pos logo, 6 round code circles and big round keys. Type the code from Manage → Devices.
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
    <div className="flex h-full flex-col items-center justify-center gap-3 overflow-auto bg-[#24409A] p-6 text-white">
      <SkwydLogo stacked white label="pos" markClass="h-11 w-9" wordClass="h-10 w-auto" />
      <h1 className="mt-1 text-xl font-semibold">Activate This Device</h1>
      <p className="max-w-xs text-center text-sm text-white/75">Type the 6-digit code shown for this device in Manage → Devices.</p>
      <div className="flex gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={cx("flex size-14 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold",
            i === code.length && !busy ? "border-2 border-[#9CC70F]" : "border border-white/25")}>{code[i] || ""}</div>))}
      </div>
      <p className="min-h-5 max-w-sm text-center text-sm text-red-300">{busy ? "" : err}</p>
      {busy ? <p className="text-sm text-white/75">Activating…</p> : <Keypad onKey={press} round />}
    </div>
  );
}
