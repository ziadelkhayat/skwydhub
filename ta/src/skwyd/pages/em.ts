// Shared helpers for Employee Management (same rules as the current portal)
import type { Row } from "@/lib/db";

export const d10s = (x: any) => String(x || "").slice(0, 10);
export const dmy = (iso: string) => { const [y, m, d] = d10s(iso).split("-"); return y ? `${d}-${m}-${y}` : "—"; };
export const isoOf = (d: Date) => new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const today = () => isoOf(new Date());
export const addDays = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoOf(d); };
export const monOf = (iso: string) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); };
export const hm = (t?: string) => t ? new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
export const dayOf = (t: string) => isoOf(new Date(t));
// time clock
export const tcHrs = (x: any) => Math.max(0, ((x.out ? +new Date(x.out) : Date.now()) - +new Date(x.in)) / 3600000);
// shifts
export const tMin = (t?: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : 0; };
export const shHrs = (x: any) => { const a = tMin(x.startTime); let b = tMin(x.endTime); if (b <= a) b += 1440; return Math.max(0, (b - a - (+x.breakMin || 0)) / 60); };
export const shSpan = (x: any) => { const a = tMin(x.startTime); let b = tMin(x.endTime); if (b <= a) b += 1440; const d0 = +new Date(d10s(x.day) + "T00:00:00") / 60000; return [d0 + a, d0 + b]; };
export const t5 = (t?: string) => String(t || "").slice(0, 5);
export const shCost = (x: any, users: Row[]) => { const u = x.employeeId && users.find(e => e.id === x.employeeId); if (!u || u.payRate == null || u.payRate === "") return 0; const r = +u.payRate;
  return u.payType === "hourly" ? r * shHrs(x) : u.payType === "daily" ? r : u.payType === "monthly" ? r / 26 : 0; };
export const overlaps = (x: any, y: any) => { const [a1, b1] = shSpan(x), [a2, b2] = shSpan(y); return a1 < b2 && a2 < b1; };
// requests
export const LEAVE_T: Record<string, string> = { annual: "Annual Leave", sick: "Sick Leave", unpaid: "Unpaid Leave", other: "Other" };
export const rqDays = (r: any) => r.fromDay ? Math.max(1, Math.round((+new Date(d10s(r.toDay || r.fromDay) + "T12:00:00") - +new Date(d10s(r.fromDay) + "T12:00:00")) / 86400000) + 1) : 0;
export const rqUsed = (reqs: Row[], empId: string, type: string, year: number | string) => reqs.filter(r => !r.deleted && r.status === "approved" && r.kind === "time_off" && r.employeeId === empId && r.leaveType === type && d10s(r.fromDay).slice(0, 4) === String(year)).reduce((s, r) => s + rqDays(r), 0);
export const rqOffOn = (reqs: Row[], empId: string, day: string) => reqs.find(r => !r.deleted && r.status === "approved" && r.kind === "time_off" && r.employeeId === empId && d10s(r.fromDay) <= day && day <= d10s(r.toDay || r.fromDay));
/** a store passes when no brand is chosen or it belongs to the chosen brand */
export const inBrand = (branches: Row[], branchId: string, brand: string) => !brand || branches.find(b => b.id === branchId)?.brandId === brand;
/** the stores an employee works at (none set = every store) */
export const empStores = (u: Row | undefined, branches: Row[]) => { const ids = (u?.branchIds || []).filter((b: string) => b && b !== "-"); return ids.length ? ids : branches.map(b => b.id); };
export const who = (staff: any) => staff?.name || staff?.email || "Back office";
export const csv = (name: string, rows: any[][]) => { const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(",")).join("\n")], { type: "text/csv" })); a.download = name; a.click(); };
