import { FilterSelect } from "@/components/tremor/data-table/FilterSelect";
import { Table, TableBody, TableCell, TableFoot, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
import { SelectNative } from "@/components/tremor/SelectNative";
// Employee Management → Time Clock and Requests: same data (settings "timeclock", table staff_requests), tabs, filters, rules and actions
// as the current portal, in TailAdmin layout.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DownloadIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { put, type Row } from "@/lib/db";
import { money } from "@/lib/util";
import { useState } from "react";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { RangeInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, SEL, TD, TH } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";
import { addDays, csv, d10s, dayOf, dmy, empStores, hm, inBrand, LEAVE_T, monOf, overlaps, rqDays, rqUsed, t5, tcHrs, today, who } from "./em";

export function StoreFilter({ s, brand, setBrand, branch, setBranch }: { s: S; brand: string; setBrand: (v: string) => void; branch: string; setBranch: (v: string) => void }) {
  const bl = s.brands.filter(b => live(b) && b.active !== false);
  return <>
    {<FilterSelect title="Brand" value={brand} onChange={v => { setBrand(v); if (branch && !inBrand(s.branches, branch, v)) setBranch(""); }} all="All Brands" options={bl.map(b => ({ value: String(b.id), label: String(b.name) }))} />}
    <FilterSelect title="Store" value={branch} onChange={v => setBranch(v)} all="All Stores" options={s.branches.filter(b => live(b) && b.active !== false && inBrand(s.branches, b.id, brand)).map(b => ({ value: String(b.id), label: String(b.name) }))} />
  </>;
}
const Flags = ({ x }: { x: any }) => <>{x.unscheduled && <Badge className="ms-1" variant="light" color="light">Unscheduled</Badge>}{x.late ? <Badge className="ms-1" variant="light" color="error">Late {+x.late}m</Badge> : null}{x.earlyOut ? <Badge className="ms-1" variant="light" color="warning">Left {+x.earlyOut}m early</Badge> : null}</>;

/* ---------------- Time Clock ---------------- */
export function TimeClockPage() {
  const s = useS(["settings", "users", "branches", "brands", "work_requests"]), { staff } = useAuth();
  const [tab, setTab] = useState("now"), [brand, setBrand] = useState(""), [branch, setBranch] = useState(""), [emp, setEmp] = useState("");
  const [from, setFrom] = useState(monOf(today())), [to, setTo] = useState(today()), [edit, setEdit] = useState<number | null>(null);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const doc: any = s.settings.find(x => x.id === "timeclock") || {}, log: any[] = (doc.log || []);
  const byId = Object.fromEntries(s.users.map(u => [u.id, u])), bName = (id: string) => s.branches.find(b => b.id === id)?.name || "—";
  const save = async (next: any) => { await put("settings", "timeclock", { open: { ...(doc.open || {}) }, log: [...log], ...next }); };
  const open = Object.entries(doc.open || {}).map(([userId, o]: any) => ({ userId, ...o })).filter(o => (!branch || o.branchId === branch) && inBrand(s.branches, o.branchId, brand)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const clockOut = async (o: any) => {
    const u = byId[o.userId]; if (!(await askYes(`Clock out ${u?.name || o.name || "this employee"} now?`, "Clock Out"))) return;
    const op = { ...doc.open }; delete op[o.userId];
    try { await save({ open: op, log: [...log, { userId: o.userId, name: u?.name || o.name, branchId: o.branchId, deviceId: o.deviceId, in: o.at, out: new Date().toISOString(), editedBy: who(staff) }].slice(-2000) }); toast("Clocked out"); }
    catch { toast("Couldn't clock out. Check your connection.", "error"); }
  };
  const rows = log.map((x, i) => ({ ...x, i })).filter(x => x && x.in && (() => { const d = dayOf(x.in); return d >= from && d <= to; })() && (!branch || x.branchId === branch) && inBrand(s.branches, x.branchId, brand) && (!emp || x.userId === emp)).sort((a, b) => String(b.in).localeCompare(String(a.in)));
  // totals per employee: hours, overtime over 8 h a day, estimated pay for hourly / daily rates
  const tot: Record<string, { hrs: number; days: Record<string, number>; late: number }> = {};
  rows.forEach(x => { const t = tot[x.userId] ||= { hrs: 0, days: {}, late: 0 }; if (x.late) t.late++; const h = tcHrs(x); t.hrs += h; const d = dayOf(x.in); t.days[d] = (t.days[d] || 0) + h; });
  const sum = Object.entries(tot).map(([id, t]) => { const u = byId[id], ot = Object.values(t.days).reduce((a, v) => a + Math.max(0, v - 8), 0);
    const p = !u || u.payRate == null || u.payRate === "" ? null : u.payType === "hourly" ? +u.payRate * t.hrs : u.payType === "daily" ? +u.payRate * Object.keys(t.days).length : null;
    return { name: u?.name || rows.find(r => r.userId === id)?.name || "—", job: u?.jobTitle || "—", days: Object.keys(t.days).length, hrs: t.hrs, ot, p, late: t.late }; }).sort((a, b) => a.name.localeCompare(b.name));
  // entries: overtime per clock-in (hours past 8 in that employee's day, in clock-in order) plus approved paid leave days (8 h each)
  const used: Record<string, number> = {}, otOf = new Map<any, number>();
  rows.slice().sort((a, b) => String(a.in).localeCompare(String(b.in))).forEach(x => { const k = x.userId + "|" + dayOf(x.in), h = tcHrs(x), b0 = used[k] || 0; used[k] = b0 + h; otOf.set(x, Math.max(0, b0 + h - 8) - Math.max(0, b0 - 8)); });
  const leave: { at: string; r: Row; day: string }[] = [];
  s.work_requests.filter(r => !r.deleted && r.status === "approved" && r.kind === "time_off" && (r.leaveType === "annual" || r.leaveType === "sick") && (!emp || r.employeeId === emp)
    && empStores(byId[r.employeeId], s.branches).some((b: string) => (!branch || b === branch) && inBrand(s.branches, b, brand))).forEach(r => {
    for (let d = d10s(r.fromDay); d <= d10s(r.toDay || r.fromDay); d = addDays(d, 1)) if (d >= from && d <= to) leave.push({ at: d + "T00:00:00", r, day: d }); });
  const items = [...rows.map(x => ({ at: x.in, x })), ...leave].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const nm = (n: string) => { const p = String(n || "—").trim().split(/\s+/); return [p[0] || "—", p.slice(1).join(" ") || "—"]; };
  const exportCsv = () => csv(`timesheet-${from}-${to}.csv`, [["Employee", "Employee Number", "Store", "Date", "Clock In", "Clock Out", "Hours"],
    ...rows.map(x => [byId[x.userId]?.name || x.name, byId[x.userId]?.employeeNo || "", bName(x.branchId), dmy(dayOf(x.in)), hm(x.in), hm(x.out), tcHrs(x).toFixed(2)])]);
  const emps = s.users.filter(live).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return (
    <>
      <PageBreadcrumb pageTitle="Time Clock" />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-x-6">
          <SegTabs value={tab} onChange={setTab} items={[["now", `Clocked In Now (${open.length})`], ["sheet", "Timesheets"]]} />
          <div className="flex w-full flex-col gap-2 sm:w-fit sm:flex-row sm:items-center">
            <StoreFilter s={s} brand={brand} setBrand={setBrand} branch={branch} setBranch={setBranch} />
            {tab === "sheet" && <>
              <FilterSelect title="Employee" value={emp} onChange={v => setEmp(v)} all="All Employees" options={emps.map(u => ({ value: String(u.id), label: String(u.name) }))} />
              <div className="sm:w-60"><RangeInput from={from} to={to} onChange={(a, b) => { setFrom(a || monOf(today())); setTo(b || today()); }} /></div>
              <Button variant="outline" onClick={exportCsv}><DownloadIcon className="size-5" />Export CSV</Button></>}
          </div>
        </div>
        <div className="relative overflow-x-auto">
          {tab === "now" ? (!open.length ? <EmptyState text={`Nobody is clocked in${branch ? " at this store" : ""}. Employees clock in on the cashier app: they type their PIN, then Clock In.`} />
            : <Table className="min-w-full"><TableHead><TableRow className="border-y border-gray-200 dark:border-gray-800">{["Employee", "Job Title", "Store", "Clocked In"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}<TableHeaderCell className={TH + " text-end"}>Hours So Far</TableHeaderCell><TableHeaderCell className={TH} /></TableRow></TableHead>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{open.map(o => { const u = byId[o.userId]; return (
                <TableRow key={o.userId}><TableCell className={TD}><span className="font-medium text-gray-900 dark:text-gray-50">{u?.name || o.name || "—"}</span><Flags x={o} /></TableCell><TableCell className={TD}>{u?.jobTitle || "—"}</TableCell><TableCell className={TD}>{bName(o.branchId)}</TableCell>
                  <TableCell className={TD}>{dmy(dayOf(o.at))} {hm(o.at)}</TableCell><TableCell className={TD + " text-end"}>{tcHrs({ in: o.at }).toFixed(2)}</TableCell>
                  <TableCell className={TD + " text-end"}><Button size="sm" variant="outline" onClick={() => clockOut(o)}>Clock Out</Button></TableCell></TableRow>); })}</TableBody></Table>)
          : !sum.length ? <EmptyState text="No clock-ins in this period." />
          : <Table className="min-w-full"><TableHead><TableRow className="border-y border-gray-200 dark:border-gray-800"><TableHeaderCell className={TH}>Employee</TableHeaderCell><TableHeaderCell className={TH}>Job Title</TableHeaderCell>{["Days", "Hours", "Overtime", "Late", "Estimated Pay"].map(h => <TableHeaderCell key={h} className={TH + " text-end"}>{h}</TableHeaderCell>)}</TableRow></TableHead>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{sum.map(r => <TableRow key={r.name}><TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{r.name}</TableCell><TableCell className={TD}>{r.job}</TableCell>
              <TableCell className={TD + " text-end"}>{r.days}</TableCell><TableCell className={TD + " text-end"}>{r.hrs.toFixed(2)}</TableCell><TableCell className={TD + " text-end"}>{r.ot ? r.ot.toFixed(2) : "—"}</TableCell><TableCell className={TD + " text-end"}>{r.late || "—"}</TableCell><TableCell className={TD + " text-end"}>{r.p != null ? money(r.p) : "—"}</TableCell></TableRow>)}</TableBody>
            <TableFoot className="border-t border-gray-200 dark:border-white/10"><TableRow className="font-semibold"><TableCell className={TD + " font-semibold text-gray-900 dark:text-gray-50"}>Total</TableCell><TableCell /><TableCell /><TableCell className={TD + " text-end"}>{sum.reduce((a, r) => a + r.hrs, 0).toFixed(2)}</TableCell><TableCell className={TD + " text-end"}>{sum.reduce((a, r) => a + r.ot, 0).toFixed(2)}</TableCell>
              <TableCell className={TD + " text-end"}>{sum.reduce((a, r) => a + r.late, 0) || "—"}</TableCell><TableCell className={TD + " text-end"}>{sum.some(r => r.p) ? money(sum.reduce((a, r) => a + (r.p || 0), 0)) : "—"}</TableCell></TableRow></TableFoot></Table>}
        </div>
        {tab === "sheet" && <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800">Overtime counts hours over 8 in a day. Late means clocking in more than 5 minutes after the published shift starts; Unscheduled means no published shift. Estimated pay uses each employee's hourly or daily rate (Edit Employee → Pay).</p>}
      </div>
      {tab === "sheet" && <div className={BOX + " mt-6"}>
        <h3 className="px-5 py-4 text-lg font-semibold text-gray-800 sm:px-6 dark:text-gray-50">Entries</h3>
        <div className="max-w-full overflow-x-auto border-t border-gray-200 dark:border-gray-800">
          {!items.length ? <EmptyState text="No clock-ins in this period." /> : <Table className="min-w-full"><TableHead className="border-b border-gray-200 dark:border-gray-800"><TableRow>
            {["First Name", "Last Name", "Store", "Job", "Clock In", "Clock Out"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}{["Total Hours", "Regular Hours", "Overtime", "Paid Leave"].map(h => <TableHeaderCell key={h} className={TH + " text-end"}>{h}</TableHeaderCell>)}<TableHeaderCell className={TH} /></TableRow></TableHead>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{items.map((it: any, k) => {
              if (it.r) { const u = byId[it.r.employeeId], [f, l] = nm(u?.name);
                return <TableRow key={"l" + k}><TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{f}</TableCell><TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{l}</TableCell><TableCell className={TD}>{(u?.branchIds || []).filter((b: string) => b && b !== "-").map(bName).join(", ") || "All Stores"}</TableCell><TableCell className={TD}>{u?.jobTitle || "—"}</TableCell>
                  <TableCell className={TD} colSpan={2}><Badge variant="light" color="success">{LEAVE_T[it.r.leaveType]}</Badge> <span className="text-gray-500">{dmy(it.day)}</span></TableCell><TableCell className={TD + " text-end"}>—</TableCell><TableCell className={TD + " text-end"}>—</TableCell><TableCell className={TD + " text-end"}>—</TableCell><TableCell className={TD + " text-end"}>8.00</TableCell><TableCell /></TableRow>; }
              const x = it.x, u = byId[x.userId], [f, l] = nm(u?.name || x.name), h = tcHrs(x), o = otOf.get(x) || 0;
              return <TableRow key={x.i}><TableCell className={TD}><span className="font-medium text-gray-900 dark:text-gray-50">{f}</span><Flags x={x} />{x.editedBy && <span className="ms-1 text-xs text-gray-400" title={"Edited by " + x.editedBy}>edited</span>}</TableCell><TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{l}</TableCell>
                <TableCell className={TD}>{bName(x.branchId)}</TableCell><TableCell className={TD}>{u?.jobTitle || "—"}</TableCell><TableCell className={TD}>{dmy(dayOf(x.in))} {hm(x.in)}</TableCell><TableCell className={TD}>{x.out ? dmy(dayOf(x.out)) + " " + hm(x.out) : "—"}</TableCell>
                <TableCell className={TD + " text-end"}>{h.toFixed(2)}</TableCell><TableCell className={TD + " text-end"}>{(h - o).toFixed(2)}</TableCell><TableCell className={TD + " text-end"}>{o ? o.toFixed(2) : "—"}</TableCell><TableCell className={TD + " text-end"}>—</TableCell>
                <TableCell className={TD + " text-end"}><Button size="xs" variant="outline" onClick={() => setEdit(x.i)}>Edit</Button></TableCell></TableRow>; })}</TableBody></Table>}
        </div></div>}
      {edit != null && log[edit] && <EditClock x={log[edit]} who={byId[log[edit].userId]?.name || log[edit].name} store={bName(log[edit].branchId)} onClose={() => setEdit(null)}
        onSave={async (a, b) => { const l = [...log]; l[edit] = { ...l[edit], in: a, out: b, editedBy: who(staff) }; await save({ log: l }); }}
        onDelete={async () => { const l = [...log]; l.splice(edit, 1); await save({ log: l }); }} />}
    </>
  );
}
function EditClock({ x, who: name, store, onClose, onSave, onDelete }: { x: any; who: string; store: string; onClose: () => void; onSave: (a: string, b: string) => Promise<void>; onDelete: () => Promise<void> }) {
  const loc = (t?: string) => { if (!t) return ""; const d = new Date(t); return new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const [a, setA] = useState(loc(x.in)), [b, setB] = useState(loc(x.out)), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function go() {
    if (!a || !b) return setErr("Enter both times."); const ia = new Date(a).toISOString(), ib = new Date(b).toISOString(); if (ib <= ia) return setErr("Clock Out must be after Clock In.");
    setBusy(true); try { await onSave(ia, ib); toast("Clock-in saved"); onClose(); } catch { setErr("Couldn't save."); } setBusy(false);
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-6 sm:max-w-md sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-50">Edit Clock-In</DialogTitle></DialogHeader>
        <p className="mt-2 text-sm text-gray-500">{name} · {store}</p>
        <div className="mt-5 space-y-5"><F l="Clock In" req><Input className="h-9" type="datetime-local" value={a} onChange={e => setA(e.target.value)} /></F>
          <F l="Clock Out" req><Input className="h-9" type="datetime-local" value={b} onChange={e => setB(e.target.value)} /></F>{err && <p className="text-sm text-red-500">{err}</p>}</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="destructive" className="sm:me-auto" onClick={async () => { if (!(await askYes("Delete this clock-in? Its hours are removed from the timesheet.", "Delete", true))) return; try { await onDelete(); toast("Clock-in deleted"); onClose(); } catch { toast("Couldn't delete.", "error"); } }}>Delete</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={go}>{busy ? "Saving…" : "Save"}</Button></div>
      </DialogContent>
    </Dialog>);
}

/* ---------------- Requests ---------------- */
export function RequestsPage() {
  const s = useS(["work_requests", "work_shifts", "users", "branches", "brands"]), { staff } = useAuth();
  const [tab, setTab] = useState("all"), [brand, setBrand] = useState(""), [branch, setBranch] = useState(""), [year, setYear] = useState(new Date().getFullYear()), [dec, setDec] = useState<Row | null>(null);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const reqs = s.work_requests.filter(r => !r.deleted), byId = Object.fromEntries(s.users.map(u => [u.id, u]));
  const userIn = (u?: Row) => !brand && !branch ? true : empStores(u, s.branches).some((id: string) => (!branch || id === branch) && inBrand(s.branches, id, brand));
  const rqIn = (r: Row) => { if (r.kind === "swap") { const sh = s.work_shifts.find(x => x.id === r.shiftId); if (sh?.branchId) return (!branch || sh.branchId === branch) && inBrand(s.branches, sh.branchId, brand); } return userIn(byId[r.employeeId]); };
  const all = reqs.filter(rqIn).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), n = (k: string) => all.filter(r => r.status === k).length;
  const what = (r: Row) => { if (r.kind === "swap") { const sh = s.work_shifts.find(x => x.id === r.shiftId), w = byId[r.swapWith];
      return <>Swap Shift{sh ? ` · ${dmy(sh.day)} ${t5(sh.startTime)} – ${t5(sh.endTime)}` : ""}{w && <> with <b className="font-medium text-gray-900 dark:text-gray-50">{w.name}</b></>}</>; }
    const a = d10s(r.fromDay), b = d10s(r.toDay || r.fromDay); return <>{LEAVE_T[r.leaveType] || "Time Off"} · {dmy(a)}{b !== a ? " – " + dmy(b) : ""} <span className="text-gray-400">({rqDays(r)} day{rqDays(r) === 1 ? "" : "s"})</span></>; };
  const st = (r: Row) => r.status === "approved" ? <Badge variant="light" color="success">Approved</Badge> : r.status === "declined" ? <Badge variant="light" color="error">Declined</Badge> : r.status === "cancelled" ? <Badge variant="light" color="light">Cancelled</Badge> : <Badge variant="light" color="warning">Pending</Badge>;
  // approving time off: their shifts on those days can become open shifts; approving a swap gives the shift to the colleague
  async function approve(r: Row) {
    try {
      if (r.kind === "swap") { const sh = s!.work_shifts.find(x => x.id === r.shiftId && !x.deleted);
        if (!sh) return toast("That shift no longer exists", "error");
        if (s!.work_shifts.some(y => !y.deleted && y.id !== sh.id && y.employeeId === r.swapWith && overlaps(sh, y))) return toast(`${byId[r.swapWith]?.name || "The colleague"} already works at that time`, "error");
        await put("work_shifts", sh.id, { employeeId: r.swapWith }); }
      else { const a = d10s(r.fromDay), b = d10s(r.toDay || r.fromDay), sh = s!.work_shifts.filter(x => !x.deleted && x.employeeId === r.employeeId && d10s(x.day) >= a && d10s(x.day) <= b);
        if (sh.length && await askYes(`${byId[r.employeeId]?.name || "They"} ha${sh.length === 1 ? "s a shift" : "ve " + sh.length + " shifts"} on these days. Make ${sh.length === 1 ? "it an open shift" : "them open shifts"} so someone else can take ${sh.length === 1 ? "it" : "them"}?`, "Yes"))
          for (const x of sh) await put("work_shifts", x.id, { employeeId: null, published: false }); }
      await put("work_requests", r.id, { status: "approved", decidedBy: who(staff), decidedAt: new Date().toISOString(), decisionNote: null }); toast("Request approved");
    } catch { toast("Couldn't approve. Check your connection.", "error"); }
  }
  const emps = s.users.filter(u => live(u) && userIn(u)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const rows = tab === "all" ? all : all.filter(r => r.status === tab);
  return (
    <>
      <PageBreadcrumb pageTitle="Requests" />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-x-6">
          <SegTabs value={tab} onChange={setTab} items={[["all", "All Requests"], ["pending", "Pending" + (n("pending") ? ` (${n("pending")})` : "")], ["declined", "Declined"], ["approved", "Approved"], ["balances", "Leave Balances"]]} />
          <div className="flex w-full flex-col gap-2 sm:w-fit sm:flex-row sm:items-center"><StoreFilter s={s} brand={brand} setBrand={setBrand} branch={branch} setBranch={setBranch} />
            {tab === "balances" && <SelectNative aria-label="Year" className={SEL + " sm:w-28"} value={year} onChange={e => setYear(+e.target.value)}>{[0, 1, 2].map(i => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}</SelectNative>}</div>
        </div>
        <div className="relative overflow-x-auto">
          {tab === "balances" ? (!emps.length ? <EmptyState text="No employees yet." /> : <Table className="min-w-full"><TableHead><TableRow className="border-y border-gray-200 dark:border-gray-800"><TableHeaderCell className={TH}>Employee</TableHeaderCell><TableHeaderCell className={TH}>Job Title</TableHeaderCell>
            {["Annual Leave Days", "Annual Used", "Annual Left", "Sick Days", "Unpaid Days"].map(h => <TableHeaderCell key={h} className={TH + " text-end"}>{h}</TableHeaderCell>)}</TableRow></TableHead>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{emps.map(u => { const al = u.leaveDays == null || u.leaveDays === "" ? null : +u.leaveDays, used = rqUsed(reqs, u.id, "annual", year);
              return <TableRow key={u.id}><TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{u.name}</TableCell><TableCell className={TD}>{u.jobTitle || "—"}</TableCell><TableCell className={TD + " text-end"}>{al ?? "—"}</TableCell><TableCell className={TD + " text-end"}>{used || "—"}</TableCell>
                <TableCell className={TD + " text-end"}>{al == null ? "—" : <b className={al - used < 0 ? "text-red-500" : "text-gray-900 dark:text-gray-50"}>{al - used}</b>}</TableCell><TableCell className={TD + " text-end"}>{rqUsed(reqs, u.id, "sick", year) || "—"}</TableCell><TableCell className={TD + " text-end"}>{rqUsed(reqs, u.id, "unpaid", year) || "—"}</TableCell></TableRow>; })}</TableBody></Table>)
          : !rows.length ? <EmptyState text={tab === "pending" || tab === "all" ? "No requests yet. Staff ask for time off or a shift swap through the app." : "Nothing here yet."} />
          : <Table className="min-w-full"><TableHead><TableRow className="border-y border-gray-200 dark:border-gray-800">{["Employee", "Request", "Note", "Asked", "Status"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}<TableHeaderCell className={TH} /></TableRow></TableHead>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{rows.map(r => { const u = byId[r.employeeId], al = u && u.leaveDays != null && u.leaveDays !== "" ? +u.leaveDays : null;
              return <TableRow key={r.id}><TableCell className={TD}><span className="block font-medium text-gray-900 dark:text-gray-50">{u?.name || "—"}</span><span className="text-xs text-gray-500">{u?.jobTitle || ""}</span></TableCell>
                <TableCell className={TD}>{what(r)}{r.kind === "time_off" && r.leaveType === "annual" && al != null && <span className="block text-xs text-gray-500">Annual left: {al - rqUsed(reqs, r.employeeId, "annual", d10s(r.fromDay).slice(0, 4))}</span>}</TableCell>
                <TableCell className={TD + " whitespace-normal"}>{r.note || "—"}{r.decisionNote && <span className="block text-xs text-gray-500">Reply: {r.decisionNote}</span>}</TableCell><TableCell className={TD}>{dmy(r.createdAt)}</TableCell>
                <TableCell className={TD}>{st(r)}{r.decidedBy && <span className="block text-xs text-gray-500">{r.decidedBy}</span>}</TableCell>
                <TableCell className={TD + " text-end"}><div className="flex justify-end gap-2">{r.status === "pending" ? <><Button size="sm" onClick={() => approve(r)}>Approve</Button><Button size="sm" variant="outline" onClick={() => setDec(r)}>Decline</Button></>
                  : r.status === "approved" ? <Button size="sm" variant="outline" onClick={async () => { if (!(await askYes("Cancel this approved request? Shifts already changed stay as they are.", "Cancel Request", true))) return;
                    try { await put("work_requests", r.id, { status: "cancelled", decidedBy: who(staff), decidedAt: new Date().toISOString() }); toast("Request cancelled"); } catch { toast("Couldn't save.", "error"); } }}>Cancel</Button> : null}</div></TableCell></TableRow>; })}</TableBody></Table>}
        </div>
        {tab === "balances" && <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800">Set each employee's Annual Leave Days on Edit Employee. Approved requests count on the year they start.</p>}
      </div>
      {dec && <DeclineDialog r={dec} name={byId[dec.employeeId]?.name || ""} onClose={() => setDec(null)} onGo={async why => { await put("work_requests", dec.id, { status: "declined", decidedBy: who(staff), decidedAt: new Date().toISOString(), decisionNote: why || null }); toast("Request declined"); }} />}
    </>
  );
}
function DeclineDialog({ name, onClose, onGo }: { r: Row; name: string; onClose: () => void; onGo: (why: string) => Promise<void> }) {
  const [why, setWhy] = useState("");
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-6 sm:max-w-md sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-50">Decline Request</DialogTitle></DialogHeader>
        <p className="mt-2 text-sm text-gray-500">{name}</p>
        <div className="mt-5"><F l="Reason"><Input className="h-9" autoFocus placeholder="Shown to the employee (optional)" value={why} onChange={e => setWhy(e.target.value)} /></F></div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={async () => { try { await onGo(why.trim()); onClose(); } catch { toast("Couldn't save.", "error"); } }}>Decline</Button></div>
      </DialogContent>
    </Dialog>);
}
