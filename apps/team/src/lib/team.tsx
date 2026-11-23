// The signed-in employee (rpc skwyd_team_me, cached on the phone) and the clock punches waiting to be sent (team.html Q / sync).
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { hm, isNet, LS, rpc, sb } from "./sb";

export type Me = { id: string; name: string; branches: { id: string; name: string; lat?: number; lng?: number }[]; open?: { at: string; branchId: string; late?: number } | null;
  leaveDays?: number; leaveUsed?: number; canChat?: boolean; canGroup?: boolean; canChannel?: boolean; [k: string]: any };
export type Punch = { lat: number; lng: number; acc: number; at: string; in: boolean; branchId: string };
type Team = { phase: "boot" | "login" | "ready" | "offline"; me: Me | null; queue: Punch[]; note: string;
  setNote: (s: string) => void; refresh: () => Promise<void>; addPunch: (p: Punch) => void; signOut: () => Promise<void>; boot: () => void; driver: boolean };
const Ctx = createContext<Team>(null as any);
export const useTeam = () => useContext(Ctx);

export function TeamProvider({ children, driver = false }: { children: ReactNode; driver?: boolean }) {
  const [phase, setPhase] = useState<Team["phase"]>("boot"), [me, setMe] = useState<Me | null>(null), [queue, setQueue] = useState<Punch[]>([]), [note, setNote0] = useState("");
  const qRef = useRef<Punch[]>([]), syncing = useRef(false);
  const setNote = (s: string) => { setNote0(s); setTimeout(() => setNote0(n => (n === s ? "" : n)), 3200); };
  const setQ = (q: Punch[]) => { qRef.current = q; setQueue(q); LS.set("skwyd_team_q", q); };
  const refresh = async () => { const m = await rpc<Me>("skwyd_team_me"); if (m) { setMe(m); LS.set("skwyd_team_me", m); } };
  // saved punches go in order when the connection is back; one the server refuses is dropped with a message
  const sync = async () => {
    if (syncing.current || !qRef.current.length) return; syncing.current = true; let changed = false;
    try {
      while (qRef.current.length) { const p = qRef.current[0]; let r: any;
        try { r = await rpc("skwyd_team_punch", { p_lat: p.lat, p_lng: p.lng, p_acc: p.acc, p_at: p.at, p_in: p.in }); }
        catch (e) { if (isNet(e)) break; r = { error: (e as any)?.message || "Couldn't send a saved punch." }; }
        if (r?.error) setNote(`Saved ${p.in ? "clock in" : "clock out"} at ${hm(p.at)}: ${r.error}`);
        setQ(qRef.current.slice(1)); changed = true; }
      if (changed) { await refresh().catch(() => {}); if (!qRef.current.length) setNote("Saved punches synced"); }
    } finally { syncing.current = false; }
  };
  const boot = async () => {
    setQ(await LS.get<Punch[]>("skwyd_team_q", []));
    const { data: { session } } = await sb.auth.getSession(); if (!session) return setPhase("login");
    try { const m = await rpc<Me>("skwyd_team_me"); if (!m) { await sb.auth.signOut(); setNote("This login isn't active. Ask your manager."); return setPhase("login"); } setMe(m); LS.set("skwyd_team_me", m); setPhase("ready"); sync(); }
    catch { const m = await LS.get<Me | null>("skwyd_team_me", null); if (m) { setMe(m); setPhase("ready"); } else setPhase("offline"); }   // offline: the copy saved on this phone
  };
  useEffect(() => { boot(); const t = setInterval(sync, 30000), s = AppState.addEventListener("change", v => { if (v === "active") sync(); }); return () => { clearInterval(t); s.remove(); }; }, []);
  const value: Team = { phase, me, queue, note, setNote, refresh, driver, boot,
    addPunch: p => { setQ([...qRef.current, p]); setTimeout(sync, 0); },
    signOut: async () => { if (qRef.current.length) return setNote("Connect to the internet first: some punches haven't synced yet."); await sb.auth.signOut(); setMe(null); setPhase("login"); } };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
