export const fmtDate = (v?: string | null) => { if (!v) return "—"; const d = new Date(v); return isNaN(+d) ? "—" : `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`; };
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
export const ls = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off */ } },
};
/** The current portal (still the full product while sections move over). */
export const OLD_PORTAL = "https://portal.skwydhub.com/";
