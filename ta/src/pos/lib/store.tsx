"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The register's state: the device key, every collection (cached first, then from the server), live reloads,
// and who is signed in with their PIN.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { applyOp, client, COLLECTIONS, deviceOk, emptyData, fetchAll, forgetDevice, isNet, listen, readCache, readDeviceKey, readOutbox, saveOutbox, send, tableOf, type Col, type Data, type DeviceKey, type Op, type Row } from "./db";

type Phase = "boot" | "activate" | "ready";
type Store = {
  phase: Phase; S: Data; device: Row | null; branch: Row | null; online: boolean;
  cashier: Row | null; setCashier: (u: Row | null) => void;
  sb: SupabaseClient | null; reload: () => void; restart: () => void;
  // a change made on the register: on screen at once, sent to the server in order (now, or when back online)
  write: (col: Col, id: string, data: Record<string, any>, op?: "set" | "update") => void;
  pending: number; failed: number;
};
const Ctx = createContext<Store>(null as any);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [base, setBase] = useState<Data>(emptyData);   // as the server (or the cache) has it
  const [box, setBox] = useState<{ outbox: Op[]; failed: Op[] }>({ outbox: [], failed: [] });
  const boxRef = useRef(box); boxRef.current = box;
  const S = useMemo(() => { if (!box.outbox.length) return base; const o: any = { ...base }; box.outbox.forEach(op => { o[op.col] = applyOp(o[op.col] || [], op); }); return o as Data; }, [base, box]);
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
    setBase({ ...emptyData(), ...(await readCache()) }); setBox(await readOutbox());
    setDk(k);
  })(); }, [gen]);

  const load = (col: Col) => {
    if (!sb) return;
    clearTimeout(timers.current[col]);
    timers.current[col] = setTimeout(async () => {
      try { const rows = await fetchAll(sb, col); setOnline(true); setBase(s => ({ ...s, [col]: rows })); }
      catch (e) { if (isNet(e)) setOnline(false); else console.warn("load", col, e); }
    }, 150);
  };
  const reload = () => { COLLECTIONS.forEach(load); flush(); };

  // send the waiting writes in order; a network failure stops and waits, a refused write is tried 3 times then set aside
  const busy = useRef(false);
  const flush = async () => {
    if (!sb || busy.current) return; busy.current = true;
    try {
      const touched = new Set<Col>();
      while (boxRef.current.outbox.length) {
        const op = boxRef.current.outbox[0];
        try { await send(sb, op); touched.add(op.col); setOnline(true);
          const nb = { outbox: boxRef.current.outbox.slice(1), failed: boxRef.current.failed }; boxRef.current = nb; setBox(nb); saveOutbox(nb.outbox, nb.failed); }
        catch (e: any) {
          if (isNet(e)) { setOnline(false); break; }
          const tries = (op.tries || 0) + 1, bad = { ...op, tries, lastError: e?.message || String(e) };
          const nb = tries >= 3 ? { outbox: boxRef.current.outbox.slice(1), failed: [...boxRef.current.failed, bad] } : { outbox: [bad, ...boxRef.current.outbox.slice(1)], failed: boxRef.current.failed };
          boxRef.current = nb; setBox(nb); saveOutbox(nb.outbox, nb.failed); console.warn("sync", op, e); if (tries < 3) break;
        }
      }
      touched.forEach(load);
    } finally { busy.current = false; }
  };
  const write = (col: Col, id: string, data: Record<string, any>, op: "set" | "update" = "update") => {
    const nb = { outbox: [...boxRef.current.outbox, { col, op, id, data }], failed: boxRef.current.failed };
    boxRef.current = nb; setBox(nb); saveOutbox(nb.outbox, nb.failed); setTimeout(flush, 0);
  };

  // 2. a deactivated or deleted register goes back to the activation screen
  const check = async () => {
    if (!sb) return;
    const ok = await deviceOk(sb);
    if (ok === false) { await forgetDevice(); setDk(null); setBase(emptyData()); setCashier(null); setPhase("activate"); }
  };

  // 3. load everything, then listen to the database's bell; poll as a safety net and when the app comes back
  useEffect(() => {
    if (!sb || !dk) return;
    setPhase("ready"); reload(); check();
    let liveOk = false;
    const off = listen(sb, dk.topic, t => COLLECTIONS.forEach(c => { if (!t || tableOf(c) === t) load(c); }), ok => { if (ok && !liveOk) reload(); liveOk = ok; });
    const poll = setInterval(() => { if (!liveOk) reload(); else if (boxRef.current.outbox.length) flush(); }, 10000);
    const quiet = setInterval(reload, 120000), watch = setInterval(check, 20000);
    const vis = () => { if (document.visibilityState === "visible") { reload(); check(); } }; document.addEventListener("visibilitychange", vis);
    return () => { off(); clearInterval(poll); clearInterval(quiet); clearInterval(watch); document.removeEventListener("visibilitychange", vis); };
  }, [sb]);

  const device = dk ? S.devices.find(d => d.id === dk.deviceId) || null : null;
  const branch = device ? S.branches.find(b => b.id === device.branchId) || null : null;
  const value: Store = { phase, S, device, branch, online, cashier, setCashier, sb, reload, restart: () => setGen(g => g + 1), write, pending: box.outbox.length, failed: box.failed.length };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
