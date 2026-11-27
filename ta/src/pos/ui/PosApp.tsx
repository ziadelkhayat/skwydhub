"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// One screen decides what the tablet shows: activation, the PIN sign-in, or the register.
import { Toaster } from "@/components/tremor/Toaster";
import { pinsOn } from "../lib/pos";
import { useStore } from "../lib/store";
import { Activate } from "./Activate";
import { AlertBanner } from "./Alert";
import { Lock } from "./Lock";
import { Register } from "./Register";

export function PosApp() {
  const { phase, S, device, cashier, restart } = useStore();
  if (phase === "activate") return <><Activate onDone={restart} /><Toaster /></>;
  if (phase === "boot" || !device) return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
      <span className="size-6 rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden /><p className="text-sm text-gray-500">Loading the register…</p>
    </div>);
  return <div className="h-dvh select-none overflow-hidden bg-gray-50 dark:bg-gray-950">{pinsOn(S) && !cashier ? <Lock /> : <Register />}<AlertBanner /><Toaster /></div>;
}
