"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The PIN sign-in: the logo, PIN dots, the keypad, Sync Users, and the store and register under it.
// Users of this store (and owners/admins) sign in with their 4–5 digit PIN.
import { SkwydLogo } from "@/components/shared/skwyd-logo";
import { Button } from "@/components/tremor/Button";
import { useState } from "react";
import { pinUser, posUsers } from "../lib/pos";
import { useStore } from "../lib/store";
import { Dots, Keypad } from "./Keypad";

export function Lock() {
  const { S, device, branch, setCashier, reload } = useStore();
  const [pin, setPin] = useState(""), [err, setErr] = useState(""), [syncing, setSyncing] = useState(false);
  const brand = branch && S.brands.find(b => b.id === branch.brandId);
  const acct = S.settings.find(x => x.id === "company")?.accountNo;
  const press = async (k: string) => {
    const next = k === "c" ? "" : k === "b" ? pin.slice(0, -1) : pin.length < 5 ? pin + k : pin;
    setPin(next); setErr("");
    if (next.length >= 4) {
      const u = await pinUser(posUsers(S, device!.branchId), next);
      if (u) { setPin(""); setCashier(u); } else if (next.length === 5) { setPin(""); setErr("Wrong PIN. Try again."); }
    }
  };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-blue-50 p-6 dark:bg-gray-950">
      <span role="img" aria-label="skwyd pos" className="mb-1"><SkwydLogo stacked label="pos" markClass="h-14 w-12" wordClass="h-10 w-auto" /></span>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Enter Your PIN</h1>
      <Dots n={pin.length} />
      <p className="-mt-2 min-h-5 text-sm text-red-600 dark:text-red-500">{err}</p>
      <Keypad onKey={press} />
      <Button variant="secondary" onClick={() => { setSyncing(true); reload(); setTimeout(() => setSyncing(false), 1500); }} isLoading={syncing} loadingText="Syncing…">Sync Users</Button>
      <p className="text-xs text-gray-500">{[brand?.name, branch?.name, (device as any)?.name].filter(Boolean).join(" · ")}{acct ? "  ·  Account " + acct : ""}</p>
    </div>
  );
}
