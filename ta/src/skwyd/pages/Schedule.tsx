// Employee Management → Schedule: shifts per store by day / week / month (draft → publish), open shifts, labor cost vs sales,
// time off and clock-ins shown in the grid, drag a shift to move it (Ctrl / Alt copies). Same rules as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@/icons";
import { put, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { money } from "@/lib/util";
import { cn } from "@/utils";
import { useEffect, useState } from "react";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { DateInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { F, SEL } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";
import { addDays, d10s, dayOf, dmy, isoOf, LEAVE_T, monOf, overlaps, rqOffOn, shCost, shHrs, t5, tcHrs, tMin, today } from "./em";

const isAdminRow = (r: Row) => r.role === "owner" || r.role === "admin";
const ini = (n: string) => String(n || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

export default function SchedulePage() {
  const s = useS(["work_shifts", "work_requests", "users", "branches", "brands", "settings"]);
  const [brand, setBrand] = useState(""), [br0, setBr] = useState(""), [view, setView] = useState("week"), [at, setAt] = useState(today());
  const [form, setForm] = useState<{ id?: string; emp?: string; day: string } | null>(null), [sales, setSales] = useState<Record<string, number>>({}), [over, setOver] = useState("");
  const brs = (s?.branches || []).filter(b => live(b) && b.active !== false && (!brand || !b.brandId || b.brandId === brand));
  const br = brs.some(b => b.id === br0) ? br0 : brs[0]?.id || "";
  const mStart = at.slice(0, 8) + "01", mLen = new Date(+at.slice(0, 4), +at.slice(5, 7), 0).getDate();
  const first = view === "day" ? at : view === "month" ? mStart : monOf(at), nDays = view === "day" ? 1 : view === "month" ? mLen : 7;
  const days = [...Array(nDays)].map((_, i) => addDays(first, i)), last = days[days.length - 1];
  // sales per day of this store, for labor %
  useEffect(() => { if (!br) return; let off = false;
    (async () => { const { data, error } = await sb.from("orders").select("total,status,created_at,brand_id").eq("branch_id", br).in("status", ["closed", "returned"]).gte("created_at", new Date(first + "T00:00:00").toISOString()).lt("created_at", new Date(addDays(first, nDays) + "T00:00:00").toISOString()).limit(10000);
      if (off || error) return; const m: Record<string, number> = {}; (data || []).filter((o: any) => !brand || o.brand_id === brand).forEach((o: any) => { const d = isoOf(new Date(o.created_at)); m[d] = (m[d] || 0) + (+o.total || 0); }); setSales(m); })();
    return () => { off = true; }; }, [br, first, nDays, brand]);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  if (!brs.length) return <><PageBreadcrumb pageTitle="Schedule" /><EmptyState text="No stores yet. Add a store first (Manage → Stores)." /></>;
  const shifts = s.work_shifts.filter(x => !x.deleted), reqs = s.work_requests;
  const week = shifts.filter(x => x.branchId === br && d10s(x.day) >= days[0] && d10s(x.day) <= last);
  const drafts = week.filter(x => !x.published);
  const emps = s.users.filter(u => live(u) && ((!(u.branchIds || []).length && !isAdminRow(u)) || (u.branchIds || []).includes(br) || week.some(x => x.employeeId === u.id))).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const clash = (x: Row) => !!x.employeeId && shifts.some(y => y.id !== x.id && y.employeeId === x.employeeId && overlaps(x, y));
  // hours worked from the time clock, per employee and day
  const tc: any = s.settings.find(x => x.id === "timeclock") || {}, worked: Record<string, number> = {}, wflag: Record<string, string> = {};
  const addW = (uid: string, x: any, inAt: string) => { if (x.branchId && x.branchId !== br) return; const d = dayOf(inAt); if (d < days[0] || d > last) return; const k = uid + "|" + d;
    worked[k] = (worked[k] || 0) + tcHrs({ in: inAt, out: x.out }); if (x.late || x.unscheduled) wflag[k] = (wflag[k] ? wflag[k] + ", " : "") + (x.late ? `late ${+x.late}m` : "unscheduled"); };
  (tc.log || []).filter((x: any) => x?.in).forEach((x: any) => addW(x.userId, x, x.in)); Object.entries(tc.open || {}).forEach(([id, o]: any) => addW(id, o, o.at));
  const t0 = today(), wHrs = week.reduce((a, x) => a + shHrs(x), 0), wCost = week.reduce((a, x) => a + shCost(x, s.users), 0), wSales = Object.values(sales).reduce((a, v) => a + v, 0);
  const move = (n: number | "m") => { if (n === "m" || typeof n !== "number") return; setAt(addDays(at, n)); };
  const step = (dir: 1 | -1) => { if (view === "month") { const d = new Date(at.slice(0, 8) + "01T12:00:00"); d.setMonth(d.getMonth() + dir); setAt(isoOf(d)); } else move(dir * (view === "day" ? 1 : 7)); };
  const label = view === "day" ? new Date(at + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" }) + " " + dmy(at) : view === "month" ? new Date(at + "T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : dmy(days[0]) + " – " + dmy(last);
  const isNow = days.includes(t0), nowLbl = view === "day" ? "Today" : view === "month" ? "This Month" : "This Week";

  async function publish() {
    const list = drafts; if (!list.length) return;
    if (!(await askYes(`Publish ${list.length} shift${list.length === 1 ? "" : "s"} for ${s!.branches.find(b => b.id === br)?.name}? Employees can then see them.`, "Publish"))) return;
    try { for (const x of list) await put("work_shifts", x.id, { published: true }); toast("Shifts published"); } catch { toast("Couldn't publish. Check your connection.", "error"); }
  }
  async function copyLast() {
    const wk = monOf(at), from = addDays(wk, -7), to = addDays(wk, -1), src = shifts.filter(x => x.branchId === br && d10s(x.day) >= from && d10s(x.day) <= to);
    if (!src.length) return toast("Last week has no shifts at this store", "error");
    const have = shifts.filter(x => x.branchId === br && d10s(x.day) >= wk && d10s(x.day) <= addDays(wk, 6)).length;
    if (!(await askYes(`Copy ${src.length} shift${src.length === 1 ? "" : "s"} from last week as drafts${have ? ` (this week already has ${have}; they stay)` : ""}?`, "Copy"))) return;
    try { for (const x of src) { const n = { employeeId: x.employeeId || null, branchId: x.branchId, day: addDays(d10s(x.day), 7), startTime: x.startTime, endTime: x.endTime, breakMin: x.breakMin || 0, jobTitle: x.jobTitle || null, note: x.note || null, published: false, deleted: false };
      if (n.employeeId && clash({ ...n, id: "-" } as Row)) continue; await put("work_shifts", null, n); } toast("Last week copied"); } catch { toast("Couldn't copy every shift. Check your connection.", "error"); }
  }
  async function drop(e: React.DragEvent, emp: string, d: string) {
    const id = e.dataTransfer.getData("text/shift"); setOver(""); if (!id) return; e.preventDefault();
    const x = shifts.find(y => y.id === id); if (!x) return; const copy = e.ctrlKey || e.altKey;
    if (!copy && (x.employeeId || "") === emp && d10s(x.day) === d) return;
    const n = { employeeId: emp || null, day: d, published: false };
    if (n.employeeId && shifts.some(y => y.id !== (copy ? "-" : x.id) && y.employeeId === n.employeeId && overlaps({ ...x, ...n }, y))) return toast("That would overlap another shift of this employee", "error");
    try { if (copy) await put("work_shifts", null, { employeeId: n.employeeId, branchId: x.branchId, day: d, startTime: x.startTime, endTime: x.endTime, breakMin: x.breakMin || 0, jobTitle: x.jobTitle || null, note: x.note || null, published: false, deleted: false });
      else await put("work_shifts", x.id, n); } catch { toast("Couldn't move the shift.", "error"); }
  }
  const cell = (empId: string, d: string) => {
    const list = week.filter(x => (x.employeeId || "") === empId && d10s(x.day) === d).sort((a, b) => tMin(a.startTime) - tMin(b.startTime)), k = empId + "|" + d, w = empId && worked[k], off = empId && rqOffOn(reqs, empId, d);
    return (
      <td key={d} onClick={() => setForm({ emp: empId, day: d })} onDragOver={e => { if (!e.dataTransfer.types.includes("text/shift")) return; e.preventDefault(); e.dataTransfer.dropEffect = e.ctrlKey || e.altKey ? "copy" : "move"; setOver(k); }}
        onDragLeave={() => setOver(o => o === k ? "" : o)} onDrop={e => drop(e, empId, d)}
        className={cn("h-16 cursor-pointer border-s border-gray-100 p-1.5 align-top transition-colors hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/2", over === k && "bg-brand-50 dark:bg-brand-500/10", d === t0 && "bg-brand-50/30")}
        style={off ? { background: "repeating-linear-gradient(135deg,rgba(70,95,255,.10) 0 8px,transparent 8px 16px)" } : undefined}>
        {off && <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">{LEAVE_T[off.leaveType] || "Time Off"}</span>}
        {list.map(x => { const c = clash(x); return (
          <span key={x.id} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/shift", x.id); e.dataTransfer.effectAllowed = "copyMove"; }} onClick={e => { e.stopPropagation(); setForm({ id: x.id, day: d10s(x.day) }); }}
            title={(x.published ? "Published" : "Draft · not published yet") + (c ? " · overlaps another shift" : "") + (x.note ? " · " + x.note : "")}
            className={cn("mb-1 block cursor-grab rounded-lg border-s-3 px-2 py-1 text-xs select-none", x.published ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "border-dashed border-gray-400 bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300", c && "ring-2 ring-red-500")}>
            <b className="font-semibold">{t5(x.startTime)} – {t5(x.endTime)}</b><span className="block text-[11px] opacity-75">{x.jobTitle || ""}{x.breakMin ? ` · ${+x.breakMin}m break` : ""}{x.published ? "" : " · Draft"}</span></span>); })}
        {!w && empId && d < t0 && list.some(x => x.published) && <span className="block text-[11px] text-red-500" title="Published shift with no clock-in">✗ No clock-in</span>}
        {w ? <span className={cn("block text-[11px]", wflag[k] ? "text-red-500" : "text-green-600")} title="Clocked in on the cashier app">✓ {w.toFixed(1)}h worked{wflag[k] ? " · " + wflag[k] : ""}</span> : null}
      </td>);
  };
  const row = (u: Row | null) => { const mine = week.filter(x => u ? x.employeeId === u.id : !x.employeeId), hrs = mine.reduce((a, x) => a + shHrs(x), 0), cost = mine.reduce((a, x) => a + shCost(x, s.users), 0);
    return (
      <tr key={u?.id || "open"} className="border-t border-gray-100 dark:border-white/5">
        <td className="sticky start-0 z-1 w-52 min-w-52 bg-white px-4 py-2 dark:bg-gray-900">
          <div className="flex items-center gap-3"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", u ? "bg-brand-50 text-brand-500 dark:bg-brand-500/15" : "bg-gray-100 text-gray-500 dark:bg-white/5")}>{u ? ini(u.name) : <PlusIcon className="size-4" />}</span>
            <div className="min-w-0"><b className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">{u ? u.name : "Open Shifts"}</b><span className="block truncate text-xs text-gray-500">{u ? u.jobTitle || "—" : "Not given to anyone yet"}</span>
              <span className="block text-xs text-gray-400">{hrs ? hrs.toFixed(1) + "h" : "0h"}{cost ? " · " + money(cost) : ""}</span></div></div></td>
        {days.map(d => cell(u ? u.id : "", d))}</tr>); };
  const cards: [string, string, string][] = [["Scheduled Hours", wHrs.toFixed(1) + "h", `${week.length} shift${week.length === 1 ? "" : "s"}`], ["Labor Cost", money(wCost), "From pay rates"], ["Sales", money(wSales), view === "day" ? "This day" : view === "month" ? "This month" : "This week"],
    ["Labor %", wSales ? (wCost / wSales * 100).toFixed(1) + "%" : "—", "Labor ÷ sales"], ["Drafts", String(drafts.length), drafts.length ? "Not published yet" : "All published"]];
  return (
    <>
      <PageBreadcrumb pageTitle="Schedule" />
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {<select aria-label="Brand" className={SEL + " sm:w-44"} value={brand} onChange={e => setBrand(e.target.value)}><option value="">All Brands</option>{s.brands.filter(b => live(b) && b.active !== false).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
          <select aria-label="Store" className={SEL + " sm:w-44"} value={br} onChange={e => setBr(e.target.value)}>{brs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <SegTabs value={view} onChange={setView} items={[["day", "Day"], ["week", "Week"], ["month", "Month"]]} />
          <div className="flex items-center gap-2"><Button variant="outline" size="icon-lg" aria-label="Previous" onClick={() => step(-1)}><ChevronLeftIcon className="size-5" /></Button>
            <span className="min-w-44 text-center text-sm font-medium text-gray-800 dark:text-white/90">{label}</span>
            <Button variant="outline" size="icon-lg" aria-label="Next" onClick={() => step(1)}><ChevronRightIcon className="size-5" /></Button>
            {!isNow && <Button variant="outline" onClick={() => setAt(today())}>{nowLbl}</Button>}</div>
        </div>
        <div className="flex flex-wrap gap-3">{view === "week" && <Button variant="outline" onClick={copyLast}>Copy Last Week</Button>}
          <Button variant="outline" onClick={() => setForm({ emp: "", day: view === "day" ? at : days.includes(t0) ? t0 : days[0] })}><PlusIcon className="size-5" />Add Shift</Button>
          <Button disabled={!drafts.length} onClick={publish}>Publish{drafts.length ? ` (${drafts.length})` : ""}</Button></div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">{cards.map(([l, v, d]) => (
        <div key={l} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"><span className="text-sm text-gray-500 dark:text-gray-400">{l}</span>
          <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">{v}</h4><span className="text-xs text-gray-400">{d}</span></div>))}</div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <table className="w-full" style={{ minWidth: nDays > 7 ? 208 + nDays * 120 : nDays === 1 ? 0 : 1000 }}>
            <thead><tr><th className="sticky start-0 z-1 bg-white px-4 py-3 text-start text-xs font-medium text-gray-500 dark:bg-gray-900">Employee</th>{days.map(d => { const ds = week.filter(x => d10s(x.day) === d), hrs = ds.reduce((a, x) => a + shHrs(x), 0), cost = ds.reduce((a, x) => a + shCost(x, s.users), 0), sl = sales[d] || 0, dt = new Date(d + "T12:00:00");
              return <th key={d} className={cn("border-s border-gray-100 px-2 py-3 text-start align-top text-xs font-medium dark:border-white/5", d === t0 ? "text-brand-500" : "text-gray-500")}>
                <b className="block text-sm font-semibold text-gray-800 dark:text-white/90">{dt.toLocaleDateString("en-GB", { weekday: "short" })} {dmy(d).slice(0, 5)}</b>
                <span className="mt-1 block font-normal">{hrs.toFixed(1)}h · {ds.length} shift{ds.length === 1 ? "" : "s"}</span><span className="block font-normal">Labor {money(cost)} · Sales {money(sl)}</span>
                <span className="block font-normal">Labor % {sl ? (cost / sl * 100).toFixed(1) + "%" : "—"}</span></th>; })}</tr></thead>
            <tbody>{row(null)}{emps.map(u => row(u))}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-white/5">
          <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-sm border-s-3 border-brand-500 bg-brand-50" />Published</span><span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-sm border-s-3 border-dashed border-gray-400 bg-gray-100" />Draft (not published yet)</span>
          <span className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-sm ring-2 ring-red-500" />Overlaps another shift</span><span>Click a day to add · drag a shift to move it, hold Ctrl or Alt to copy it</span></div>
      </div>
      {!emps.length && <p className="mt-3 text-sm text-gray-500">No employees work at this store yet. Pick their stores on each employee's page (Employee Management → Employees).</p>}
      {form && <ShiftForm s={s} br={br} f={form} clash={clash} onClose={() => setForm(null)} />}
    </>
  );
}

function ShiftForm({ s, br, f, onClose }: { s: S; br: string; f: { id?: string; emp?: string; day: string }; clash: (x: Row) => boolean; onClose: () => void }) {
  const x = f.id ? s.work_shifts.find(y => y.id === f.id) : null, shifts = s.work_shifts.filter(y => !y.deleted);
  const cur: any = x || { employeeId: f.emp || "", day: f.day, startTime: "09:00", endTime: "17:00", breakMin: 0, jobTitle: (f.emp && s.users.find(u => u.id === f.emp)?.jobTitle) || "" };
  const [v, setV] = useState({ emp: cur.employeeId || "", job: cur.jobTitle || "", a: t5(cur.startTime), b: t5(cur.endTime), brk: String(+cur.breakMin || 0), note: cur.note || "" });
  const [ds, setDs] = useState<string[]>([d10s(cur.day)]), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k: string, val: string) => setV(p => ({ ...p, [k]: val }));
  const used: Record<string, number> = {}; shifts.filter(y => y.branchId === br).forEach(y => { const k = t5(y.startTime) + "-" + t5(y.endTime); used[k] = (used[k] || 0) + 1; });
  const pre = Object.entries(used).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]); ["09:00-17:00", "12:00-20:00", "16:00-00:00"].forEach(p => { if (pre.length < 6 && !pre.includes(p)) pre.push(p); });
  const wk = [...Array(7)].map((_, i) => addDays(monOf(d10s(cur.day)), i));
  const jobs = [...new Set(s.users.map(u => u.jobTitle).filter(Boolean).concat(["Cashier", "Waiter", "Cook", "Chef", "Driver", "Store Manager", "Supervisor", "Cleaner"]))];
  const len = shHrs({ startTime: v.a, endTime: v.b, breakMin: v.brk }), nextDay = !!v.b && tMin(v.b) <= tMin(v.a);
  const nameOf = (id: string) => s.users.find(u => u.id === id)?.name || "This employee";
  async function save() {
    if (!v.a || !v.b) return setErr("Enter the start and end times."); if (v.a === v.b) return setErr("The shift needs a length."); if (!ds.length) return setErr("Pick a day.");
    const base = { employeeId: v.emp || null, branchId: br, startTime: v.a, endTime: v.b, breakMin: +v.brk || 0, jobTitle: v.job.trim() || null, note: v.note.trim() || null, published: false };
    if (shHrs(base) <= 0) return setErr("The break is longer than the shift.");
    for (const d of ds) { const off = base.employeeId && rqOffOn(s.work_requests, base.employeeId, d); if (off) return setErr(`${nameOf(base.employeeId!)} has approved ${(LEAVE_T[off.leaveType] || "time off").toLowerCase()} on ${dmy(d)}.`); }
    for (const d of ds) { const c = shifts.find(y => y.id !== x?.id && base.employeeId && y.employeeId === base.employeeId && overlaps({ ...base, day: d }, y));
      if (c) return setErr(`${nameOf(base.employeeId!)} already works ${t5(c.startTime)} – ${t5(c.endTime)} on ${dmy(c.day)}${c.branchId !== br ? " at " + (s.branches.find(b => b.id === c.branchId)?.name || "another store") : ""}.`); }
    setBusy(true);
    try { if (x) await put("work_shifts", x.id, { ...base, day: ds[0] }); else for (const d of ds) await put("work_shifts", null, { ...base, day: d, deleted: false });
      toast(x ? "Shift saved" : ds.length > 1 ? ds.length + " shifts added" : "Shift added"); onClose(); } catch { setErr("Couldn't save. Check your connection."); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">{x ? "Edit Shift" : "Add Shift"}</DialogTitle></DialogHeader>
        <div className="mt-5 flex flex-wrap gap-2">{pre.map(p => <button key={p} type="button" onClick={() => { const [a, b] = p.split("-"); setV(o => ({ ...o, a, b })); }}
          className={cn("h-9 rounded-lg border px-3 text-sm font-medium", v.a + "-" + v.b === p ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10" : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400")}>{p.replace("-", " – ")}</button>)}</div>
        <form className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save(); }}>
          <F l="Employee"><select className={SEL} value={v.emp} onChange={e => { const u = s.users.find(y => y.id === e.target.value); setV(o => ({ ...o, emp: e.target.value, job: o.job || u?.jobTitle || "" })); }}>
            <option value="">Open Shift (anyone)</option>{s.users.filter(live).sort((a, b) => String(a.name).localeCompare(String(b.name))).map(u => <option key={u.id} value={u.id}>{u.name}{u.jobTitle ? " · " + u.jobTitle : ""}</option>)}</select></F>
          <F l="Job Title"><Input className="h-9" list="shJobDl" placeholder="e.g. Cashier" value={v.job} onChange={e => set("job", e.target.value)} /><datalist id="shJobDl">{jobs.map(j => <option key={j} value={j} />)}</datalist></F>
          <F l="Start" req><Input className="h-9" type="time" value={v.a} onChange={e => set("a", e.target.value)} /></F>
          <F l="End" req><Input className="h-9" type="time" value={v.b} onChange={e => set("b", e.target.value)} /></F>
          <F l="Break (Minutes)"><Input className="h-9" type="number" min="0" step="5" value={v.brk} onChange={e => set("brk", e.target.value)} /></F>
          <F l="Length"><p className="flex h-9 items-center text-sm font-semibold text-gray-800 dark:text-white/90">{len.toFixed(2)} hours{nextDay ? " (ends next day)" : ""}</p></F>
          <F l={x ? "Day" : "Days"} full help={x ? undefined : "Pick several days to add the same shift on each."}>
            {x ? <DateInput value={ds[0]} onChange={d => d && setDs([d])} />
              : <div className="flex flex-wrap gap-2">{wk.map(d => { const on = ds.includes(d); return <button key={d} type="button" aria-pressed={on} onClick={() => setDs(on ? ds.filter(y => y !== d) : [...ds, d])}
                className={cn("h-10 rounded-lg border px-3 text-sm font-medium", on ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10" : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400")}>
                {new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" })} {dmy(d).slice(0, 5)}</button>; })}</div>}</F>
          <F l="Note" full><Input className="h-9" placeholder="Shown to the employee" value={v.note} onChange={e => set("note", e.target.value)} /></F>
          {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
          <div className="col-span-full flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            {x && <Button type="button" variant="destructive" className="sm:me-auto" onClick={async () => { if (!(await askYes("Delete this shift?", "Delete", true))) return; try { await put("work_shifts", x.id, { deleted: true }); toast("Shift deleted"); onClose(); } catch { toast("Couldn't delete.", "error"); } }}>Delete</Button>}
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>);
}
