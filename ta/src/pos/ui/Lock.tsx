"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The PIN sign-in (option J): a light-blue screen, the skwyd pos logo, navy PIN dots, big round navy-outline keys, Sync Users, and the store and register under it.
// Users of this store (and owners/admins) sign in with their 4–5 digit PIN.
import { SkwydLogo } from "@/components/shared/skwyd-logo";
import { cx } from "@/components/tremor/utils";
import { RiRefreshLine } from "@remixicon/react";
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
    <div className="flex h-full flex-col items-center justify-center gap-3 overflow-auto bg-[#EFF5FE] p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <SkwydLogo stacked label="pos" markClass="h-11 w-9" wordClass="h-10 w-auto" />
      <h1 className="mt-1 text-xl font-semibold">Enter Your PIN</h1>
      <Dots n={pin.length} navy />
      <p className="min-h-5 text-sm text-red-600 dark:text-red-400">{err}</p>
      <Keypad onKey={press} round />
      <button type="button" disabled={syncing} onClick={() => { setSyncing(true); reload(); setTimeout(() => setSyncing(false), 1500); }}
        className="mt-1 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-[#24409A] outline-none hover:bg-[#24409A]/5 focus-visible:ring-2 focus-visible:ring-[#24409A]/50 dark:text-blue-300 dark:hover:bg-white/10">
        <RiRefreshLine className={cx("size-4", syncing && "animate-spin")} />{syncing ? "Syncing…" : "Sync Users"}</button>
      <p className="text-xs text-gray-500">{[brand?.name, branch?.name, (device as any)?.name].filter(Boolean).join(" · ")}{acct ? "  ·  Account " + acct : ""}</p>
    </div>
  );
}
