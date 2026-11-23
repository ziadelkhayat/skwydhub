// Supabase for the Team app: a normal sign-in (phone + WhatsApp code), kept on the phone.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export const sb = createClient("https://akrezmxgtorkuwxxctyk.supabase.co", "sb_publishable_tL62keD2HdovsMpI8XAkWg_TPdjaUVh", {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
export const rpc = async <T = any>(fn: string, args?: Record<string, any>): Promise<T> => { const { data, error } = await sb.rpc(fn, args || {}); if (error) throw error; return data as T; };
export const isNet = (e: any) => /fetch|network|Failed to fetch|Load failed|timeout|offline/i.test(String(e?.message || e || ""));
export const LS = {
  async get<T>(k: string, d: T): Promise<T> { try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k: string, v: any) { AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}); },
};
// dates as dd-mm-yyyy, times as hh:mm (the system's display rules)
export const p2 = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
export const dmy = (v: any) => { if (!v) return "—"; const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T12:00:00") : new Date(v); return p2(d.getDate()) + "-" + p2(d.getMonth() + 1) + "-" + d.getFullYear(); };
export const hm = (v: any) => { const d = new Date(v); return p2(d.getHours()) + ":" + p2(d.getMinutes()); };
export const t5 = (s: any) => String(s || "").slice(0, 5);
export const mon = (d: Date) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const addD = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const distM = (a: number, b: number, c: number, d: number) => { const r = (x: number) => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 6371000 * 2 * Math.asin(Math.sqrt(h)); };
