// The register's state: the device key, every collection (cached first, then from the server), live reloads,
// and who is signed in with their PIN.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { client, COLLECTIONS, deviceOk, emptyData, fetchAll, forgetDevice, isNet, listen, readCache, readDeviceKey, tableOf, type Col, type Data, type DeviceKey, type Row } from "./db";

type Phase = "boot" | "activate" | "ready";
type Store = {
  phase: Phase; S: Data; device: Row | null; branch: Row | null; online: boolean;
  cashier: Row | null; setCashier: (u: Row | null) => void;
  sb: SupabaseClient | null; reload: () => void; restart: () => void;
};
const Ctx = createContext<Store>(null as any);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [S, setS] = useState<Data>(emptyData);
  const [online, setOnline] = useState(true);
  const [cashier, setCashier] = useState<Row | null>(null);
  const [dk, setDk] = useState<DeviceKey | null>(null);
  const [gen, setGen] = useState(0);
  const sb = useMemo(() => (dk ? client(dk) : null), [dk]);
  const timers = useRef<Record<string, any>>({});

  // 1. the device key on this tablet decides: activate, or open the register
  useEffect(() => { (async () => {
    const k = await readDeviceKey();
    if (!k) { setPhase("activate"); return; }
    setS({ ...emptyData(), ...(await readCache()) });
    setDk(k);
  })(); }, [gen]);

  const load = (col: Col) => {
    if (!sb) return;
    clearTimeout(timers.current[col]);
    timers.current[col] = setTimeout(async () => {
      try { const rows = await fetchAll(sb, col); setOnline(true); setS(s => ({ ...s, [col]: rows })); }
      catch (e) { if (isNet(e)) setOnline(false); else console.warn("load", col, e); }
    }, 150);
  };
  const reload = () => COLLECTIONS.forEach(load);

  // 2. a deactivated or deleted register goes back to the activation screen
  const check = async () => {
    if (!sb) return;
    const ok = await deviceOk(sb);
    if (ok === false) { await forgetDevice(); setDk(null); setS(emptyData()); setCashier(null); setPhase("activate"); }
  };

  // 3. load everything, then listen to the database's bell; poll as a safety net and when the app comes back
  useEffect(() => {
    if (!sb || !dk) return;
    setPhase("ready"); reload(); check();
    let liveOk = false;
    const off = listen(sb, dk.topic, t => COLLECTIONS.forEach(c => { if (!t || tableOf(c) === t) load(c); }), ok => { if (ok && !liveOk) reload(); liveOk = ok; });
    const poll = setInterval(() => { if (!liveOk) reload(); }, 10000);
    const quiet = setInterval(reload, 120000), watch = setInterval(check, 20000);
    const sub = AppState.addEventListener("change", s => { if (s === "active") { reload(); check(); } });
    return () => { off(); clearInterval(poll); clearInterval(quiet); clearInterval(watch); sub.remove(); };
  }, [sb]);

  const device = dk ? S.devices.find(d => d.id === dk.deviceId) || null : null;
  const branch = device ? S.branches.find(b => b.id === device.branchId) || null : null;
  const value: Store = { phase, S, device, branch, online, cashier, setCashier, sb, reload, restart: () => setGen(g => g + 1) };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
