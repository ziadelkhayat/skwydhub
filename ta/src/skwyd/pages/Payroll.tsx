import { Table, TableBody, TableCell, TableFoot, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
// Employee Management → Payroll: a month's pay from clock-ins, overtime and leave, plus bonuses, deductions, social security and tax;
// close / reopen the month, payslips, CSV, cost by store. Same formulas and settings documents as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, GearIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { put, type Row } from "@/lib/db";
import { coSet, money } from "@/lib/util";
import { useState } from "react";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, TD, TH } from "../ui/kit";
import { toast } from "../ui/toast";
import { addDays, csv, d10s, dayOf, dmy, inBrand, tcHrs, today, who } from "./em";
import { StoreFilter } from "./Team";

const DEF = { otAfter: 8, otRate: 1.5, workDays: 26, ssEmp: 0, ssEr: 0, ssCap: 0, taxRate: 0, taxFree: 0 };
const TY: Record<string, string> = { hourly: "Hourly", daily: "Daily", monthly: "Monthly" };
const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function compute(s: S, m: string, st: any) {
  const [y, mo] = m.split("-").map(Number), a = m + "-01", b = m + "-" + String(new Date(y, mo, 0).getDate()).padStart(2, "0");
  const doc: any = s.settings.find(x => x.id === "payroll_" + m) || {}, adj = doc.lines || {}, wd = +st.workDays || 26, otA = +st.otAfter || 8, otR = +st.otRate || 1.5;
  const per: Record<string, { days: Record<string, number>; br: Record<string, number> }> = {};
  (((s.settings.find(x => x.id === "timeclock") as any)?.log) || []).filter((x: any) => x?.in).forEach((x: any) => { const d = dayOf(x.in); if (d < a || d > b) return; const p = per[x.userId] ||= { days: {}, br: {} }; const h = tcHrs(x); p.days[d] = (p.days[d] || 0) + h; p.br[x.branchId || ""] = (p.br[x.branchId || ""] || 0) + h; });
  const leaveIn = (id: string, type: string) => s.work_requests.filter(r => !r.deleted && r.status === "approved" && r.kind === "time_off" && r.employeeId === id && r.leaveType === type).reduce((n0, r) => { let n = 0; for (let d = d10s(r.fromDay); d <= d10s(r.toDay || r.fromDay); d = addDays(d, 1)) if (d >= a && d <= b) n++; return n0 + n; }, 0);
  return s.users.filter(u => live(u) && ((u.payRate != null && u.payRate !== "") || per[u.id])).sort((x, z) => String(x.name).localeCompare(String(z.name))).map(u => {
    const p = per[u.id] || { days: {}, br: {} }, hrs = Object.values(p.days).reduce((q, v) => q + v, 0), ot = Object.values(p.days).reduce((q, v) => q + Math.max(0, v - otA), 0), days = Object.keys(p.days).length;
    const r = +u.payRate || 0, t = u.payType || "", paidLeave = leaveIn(u.id, "annual") + leaveIn(u.id, "sick"), unpaid = leaveIn(u.id, "unpaid");
    const hourly = t === "hourly" ? r : t === "daily" ? r / otA : t === "monthly" ? r / wd / otA : 0;
    const base = t === "hourly" ? r * (hrs - ot) : t === "daily" ? r * days : t === "monthly" ? Math.max(0, r - unpaid * r / wd) : 0;
    const otPay = hourly * otR * ot, leavePay = t === "hourly" ? paidLeave * otA * r : t === "daily" ? paidLeave * r : 0;
    const j = adj[u.id] || {}, bonus = +j.bonus || 0, deduction = +j.deduction || 0, advance = +j.advance || 0, gross = base + otPay + leavePay + bonus;
    // social security (registered employees) on pay up to the cap; income tax on what is left after it and the tax-free amount
    const ssBase = u.socialSecurity ? (+st.ssCap > 0 ? Math.min(gross, +st.ssCap) : gross) : 0, ssE = ssBase * (+st.ssEmp || 0) / 100, ssR = ssBase * (+st.ssEr || 0) / 100;
    const tax = Math.max(0, gross - ssE - (+st.taxFree || 0)) * (+st.taxRate || 0) / 100;
    return { id: u.id, name: u.name, no: u.employeeNo || "", job: u.jobTitle || "", type: t, rate: r, days, hrs, ot, paidLeave, unpaid, base, otPay, leavePay, bonus, deduction, advance, note: j.note || "", gross, ssE, ssR, tax, cost: gross + ssR, net: gross - ssE - tax - deduction - advance, br: p.br };
  });
}

function payslip(l: any, m: string) {
  const co = coSet(), ml = new Date(m + "-15T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" }), row = (k: string, v: any, b?: boolean) => `<TableRow><TableCell>${k}</TableCell><TableCell style="text-align:right">${b ? "<b>" + v + "</b>" : v}</TableCell></TableRow>`, M = (v: number) => esc(money(v));
  const w = window.open("", "_blank"); if (!w) return toast("Allow pop-ups to open the payslip", "error");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${esc(l.name)} ${esc(m)}</title><style>body{font:14px/1.5 Inter,system-ui,sans-serif;color:#1d2939;max-width:640px;margin:32px auto;padding:0 20px}h1{font-size:22px;margin:0}h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#667085;margin:24px 0 6px}table{width:100%;border-collapse:collapse}td{padding:7px 0;border-bottom:1px solid #eaecf0}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #3b82f6;padding-bottom:14px}.net{background:#3b82f6;color:#fff;border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;font-size:18px;margin-top:20px}@media print{button{display:none}}</style></head><body>
    <div class="top"><div><h1>Payslip</h1><div>${esc(ml)}</div></div><div style="text-align:right"><b>${esc(co.name || "")}</b></div></div>
    <h2>Employee</h2><Table>${row("Name", esc(l.name))}${l.no ? row("Employee Number", esc(l.no)) : ""}${l.job ? row("Job Title", esc(l.job)) : ""}${row("Days Worked", l.days)}${row("Hours", (+l.hrs).toFixed(2))}${l.ot ? row("Overtime Hours", (+l.ot).toFixed(2)) : ""}${l.paidLeave ? row("Paid Leave Days", l.paidLeave) : ""}${l.unpaid ? row("Unpaid Leave Days", l.unpaid) : ""}</Table>
    <h2>Earnings</h2><Table>${row("Base Pay", M(l.base))}${l.otPay ? row("Overtime", M(l.otPay)) : ""}${l.leavePay ? row("Paid Leave", M(l.leavePay)) : ""}${l.bonus ? row("Bonus", M(l.bonus)) : ""}${row("Gross Pay", M(l.gross), true)}</Table>
    ${l.deduction || l.advance || l.ssE || l.tax ? `<h2>Deductions</h2><Table>${l.ssE ? row("Social Security", "−" + M(l.ssE)) : ""}${l.tax ? row("Income Tax", "−" + M(l.tax)) : ""}${l.deduction ? row("Deductions", "−" + M(l.deduction)) : ""}${l.advance ? row("Advance", "−" + M(l.advance)) : ""}</Table>` : ""}
    <div class="net"><span>Net Pay</span><b>${M(l.net)}</b></div>${l.note ? `<p style="color:#667085">${esc(l.note)}</p>` : ""}
    <p style="margin-top:40px;display:flex;justify-content:space-between;color:#667085"><span>Employee signature ____________</span><span>Date ____________</span></p><button onclick="print()" style="margin-top:16px;padding:10px 18px;border-radius:10px;border:0;background:#3b82f6;color:#fff;font-size:14px">Print</button></body></html>`);
  w.document.close();
}

export default function PayrollPage() {
  const s = useS(["settings", "users", "work_requests", "branches", "brands"]), { staff } = useAuth();
  const [m, setM] = useState(today().slice(0, 7)), [brand, setBrand] = useState(""), [branch, setBranch] = useState(""), [adj, setAdj] = useState<Row | null>(null), [setOpen, setSetOpen] = useState(false);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const st = { ...DEF, ...((s.settings.find(x => x.id === "payroll_settings") as any) || {}) }, doc: any = s.settings.find(x => x.id === "payroll_" + m), closed = doc?.status === "closed";
  const saveDoc = async (patch: any) => { const { id: _i, updatedAt: _u, createdAt: _c, ...cur } = doc || { month: m, lines: {}, status: "draft" }; await put("settings", "payroll_" + m, { ...cur, ...patch }); };
  let lines: any[] = closed && doc.snapshot ? doc.snapshot : compute(s, m, st);
  if (branch) lines = lines.filter(l => branch.split(",").some(id => (l.br || {})[id])); else if (brand) lines = lines.filter(l => Object.keys(l.br || {}).some(b => inBrand(s.branches, b, brand)));
  const tot = (k: string) => lines.reduce((a, l) => a + (+l[k] || 0), 0), ml = new Date(m + "-15T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const step = (n: number) => { const [y, mo] = m.split("-").map(Number), d = new Date(y, mo - 1 + n, 15); setM(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")); };
  // cost by store: each person's gross split by the hours they worked at each store
  const byBr: Record<string, number> = {}; lines.forEach(l => { const h = Object.values(l.br || {}).reduce((a: number, v: any) => a + v, 0) as number; if (!h) { byBr[""] = (byBr[""] || 0) + l.gross; return; } Object.entries(l.br).forEach(([b, v]: any) => byBr[b] = (byBr[b] || 0) + l.gross * v / h); });
  const neg = (v: number) => v ? "−" + money(v) : "—";
  async function close() {
    const l = compute(s!, m, st); if (!l.length) return;
    if (!(await askYes(`Close ${ml}? The pay of ${l.length} employee${l.length === 1 ? "" : "s"} (net ${money(l.reduce((a, x) => a + x.net, 0))}) is frozen so later timesheet edits don't change it.`, "Close Month"))) return;
    try { await saveDoc({ status: "closed", snapshot: l, closedAt: new Date().toISOString(), closedBy: who(staff) }); toast("Month closed"); } catch { toast("Couldn't close the month.", "error"); }
  }
  const exportCsv = () => csv(`payroll-${m}.csv`, [["Employee", "Employee Number", "Job Title", "Pay Type", "Rate", "Days", "Hours", "Overtime Hours", "Base", "Overtime Pay", "Paid Leave", "Bonus", "Gross", "Social Security (Employee)", "Income Tax", "Deductions", "Advance", "Net", "Social Security (Employer)", "Employer Cost", "Note"],
    ...lines.map(l => [l.name, l.no, l.job, l.type, l.rate, l.days, (+l.hrs).toFixed(2), (+l.ot).toFixed(2), (+l.base).toFixed(2), (+l.otPay).toFixed(2), (+l.leavePay).toFixed(2), l.bonus, (+l.gross).toFixed(2), (+(l.ssE || 0)).toFixed(2), (+(l.tax || 0)).toFixed(2), l.deduction, l.advance, (+l.net).toFixed(2), (+(l.ssR || 0)).toFixed(2), (+(l.cost || l.gross)).toFixed(2), l.note])]);
  const kpis: [string, string][] = [["Employees", String(lines.length)], ["Hours", tot("hrs").toFixed(1)], ["Overtime Hours", tot("ot").toFixed(1)], ["Gross Pay", money(tot("gross"))], ["Social Security & Tax", money(tot("ssE") + tot("tax"))], ["Deductions & Advances", money(tot("deduction") + tot("advance"))], ["Net Pay", money(tot("net"))], ["Employer Cost", money(tot("cost") || tot("gross"))]];
  const nums = ["Days", "Hours", "Overtime", "Base", "Overtime Pay", "Paid Leave", "Bonus", "Gross", "Social Sec.", "Tax", "Deductions", "Advance", "Net Pay"];
  return (
    <>
      <PageBreadcrumb pageTitle="Payroll" />
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"><StoreFilter s={s} brand={brand} setBrand={setBrand} branch={branch} setBranch={setBranch} />
          <div className="flex items-center gap-2"><Button variant="outline" size="icon-lg" aria-label="Previous month" onClick={() => step(-1)}><ChevronLeftIcon className="size-5" /></Button>
            <b className="min-w-40 text-center text-sm font-semibold text-gray-900 dark:text-gray-50">{ml}</b><Button variant="outline" size="icon-lg" aria-label="Next month" onClick={() => step(1)}><ChevronRightIcon className="size-5" /></Button></div></div>
        <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => setSetOpen(true)}><GearIcon className="size-5" />Settings</Button><Button variant="outline" onClick={exportCsv}><DownloadIcon className="size-5" />Export CSV</Button>
          {closed ? <Button variant="outline" onClick={async () => { if (!(await askYes("Reopen this month? Its figures are worked out again from the timesheets.", "Reopen"))) return; try { await saveDoc({ status: "draft", snapshot: null }); toast("Month reopened"); } catch { toast("Couldn't reopen.", "error"); } }}>Reopen Month</Button>
            : <Button disabled={!lines.length} onClick={close}>Close Month</Button>}</div>
      </div>
      {closed && <p className="mb-6 rounded-md border border-green-500 bg-green-50 p-4 text-sm text-gray-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-white/80">Closed by {doc.closedBy || "—"} on {dmy(doc.closedAt)}. The figures are frozen; Reopen Month to change them.</p>}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">{kpis.map(([l, v]) => <div key={l} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#090E1A]">
        <span className="text-sm text-gray-500 dark:text-gray-400">{l}</span><h4 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">{v}</h4></div>)}</div>
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-50">Employees</h3>
        <div className="relative overflow-x-auto">
          {!lines.length ? <EmptyState text="Nobody to pay this month. Set each employee's pay on Edit Employee; hours come from clock-ins on the cashier app." />
            : <Table className="min-w-[1400px] w-full"><TableHead><TableRow className="border-y border-gray-200 dark:border-gray-800"><TableHeaderCell className={TH}>Employee</TableHeaderCell><TableHeaderCell className={TH}>Pay</TableHeaderCell>{nums.map(h => <TableHeaderCell key={h} className={TH + " text-end"}>{h}</TableHeaderCell>)}<TableHeaderCell className={TH} /></TableRow></TableHead>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{lines.map(l => <TableRow key={l.id}>
                <TableCell className={TD}><span className="font-medium text-gray-900 dark:text-gray-50">{l.name}</span>{l.no && <span className="ms-1 text-xs text-gray-400">{l.no}</span>}<span className="block text-xs text-gray-500">{l.job}</span></TableCell>
                <TableCell className={TD}>{l.type ? money(l.rate) + " " + (TY[l.type] || "").toLowerCase() : <span className="text-gray-400">No pay rate</span>}{l.unpaid ? <span className="block text-xs text-gray-500">{l.unpaid} unpaid day{l.unpaid === 1 ? "" : "s"}</span> : null}</TableCell>
                <TableCell className={TD + " text-end"}>{l.days}</TableCell><TableCell className={TD + " text-end"}>{(+l.hrs).toFixed(1)}</TableCell><TableCell className={TD + " text-end"}>{l.ot ? (+l.ot).toFixed(1) : "—"}</TableCell><TableCell className={TD + " text-end"}>{money(l.base)}</TableCell>
                <TableCell className={TD + " text-end"}>{l.otPay ? money(l.otPay) : "—"}</TableCell><TableCell className={TD + " text-end"}>{l.leavePay ? money(l.leavePay) : l.paidLeave ? l.paidLeave + "d" : "—"}</TableCell><TableCell className={TD + " text-end"}>{l.bonus ? money(l.bonus) : "—"}</TableCell>
                <TableCell className={TD + " text-end"}>{money(l.gross)}</TableCell><TableCell className={TD + " text-end"}>{neg(l.ssE)}</TableCell><TableCell className={TD + " text-end"}>{neg(l.tax)}</TableCell><TableCell className={TD + " text-end"}>{neg(l.deduction)}</TableCell><TableCell className={TD + " text-end"}>{neg(l.advance)}</TableCell>
                <TableCell className={TD + " text-end font-semibold text-gray-900 dark:text-gray-50"}>{money(l.net)}</TableCell>
                <TableCell className={TD + " text-end"}><div className="flex justify-end gap-2">{!closed && <Button size="xs" variant="outline" onClick={() => setAdj(s.users.find(u => u.id === l.id) || null)}>Adjust</Button>}<Button size="xs" variant="outline" onClick={() => payslip(l, m)}>Payslip</Button></div></TableCell></TableRow>)}</TableBody>
              <TableFoot className="border-t border-gray-200 dark:border-white/10"><TableRow><TableCell className={TD + " font-semibold text-gray-900 dark:text-gray-50"}>Total</TableCell><TableCell /><TableCell /><TableCell className={TD + " text-end"}>{tot("hrs").toFixed(1)}</TableCell><TableCell className={TD + " text-end"}>{tot("ot").toFixed(1)}</TableCell>
                {["base", "otPay", "leavePay", "bonus", "gross"].map(k => <TableCell key={k} className={TD + " text-end"}>{money(tot(k))}</TableCell>)}{["ssE", "tax", "deduction", "advance"].map(k => <TableCell key={k} className={TD + " text-end"}>{neg(tot(k))}</TableCell>)}
                <TableCell className={TD + " text-end font-semibold text-gray-900 dark:text-gray-50"}>{money(tot("net"))}</TableCell><TableCell /></TableRow></TableFoot></Table>}
        </div>
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800">Hourly: rate × regular hours. Daily: rate × days worked. Monthly: salary less unpaid leave days (salary ÷ {+st.workDays || 26}). Overtime is hours over {+st.otAfter || 8} a day at {+st.otRate || 1.5}× the hourly equivalent. Paid leave (annual and sick) is paid at {+st.otAfter || 8} hours a day for hourly and daily staff.{" "}
          {+st.ssEmp || +st.taxRate ? `Social security: ${+st.ssEmp || 0}% employee, ${+st.ssEr || 0}% employer${+st.ssCap ? ` on pay up to ${money(st.ssCap)}` : ""}, for employees marked as registered. Tax: ${+st.taxRate || 0}% above ${money(st.taxFree)}.` : "Social security and tax are off: set their rates in Settings."}</p>
      </div>
      <div className={BOX + " mt-6"}>
        <h3 className="px-5 py-4 text-lg font-semibold text-gray-800 sm:px-6 dark:text-gray-50">Cost By Store</h3>
        <div className="max-w-full overflow-x-auto border-t border-gray-200 dark:border-gray-800"><Table className="min-w-full"><TableHead className="border-b border-gray-200 dark:border-gray-800"><TableRow><TableHeaderCell className={TH}>Store</TableHeaderCell><TableHeaderCell className={TH + " text-end"}>Gross Pay</TableHeaderCell><TableHeaderCell className={TH + " text-end"}>Share</TableHeaderCell></TableRow></TableHead>
          <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{Object.entries(byBr).sort((x, z) => z[1] - x[1]).map(([b, v]) => <TableRow key={b}><TableCell className={TD}>{b ? s.branches.find(x => x.id === b)?.name || "—" : <span className="text-gray-400">No clock-ins (salary only)</span>}</TableCell>
            <TableCell className={TD + " text-end"}>{money(v)}</TableCell><TableCell className={TD + " text-end"}>{tot("gross") ? (v / tot("gross") * 100).toFixed(1) + "%" : "—"}</TableCell></TableRow>)}
            {!Object.keys(byBr).length && <TableRow><TableCell className={TD} colSpan={3}>—</TableCell></TableRow>}</TableBody></Table></div>
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800">Each employee's gross pay is split across stores by the hours they clocked at each.</p>
      </div>
      {adj && <AdjustDialog u={adj} j={(doc?.lines || {})[adj.id] || {}} onClose={() => setAdj(null)} onSave={async j => { await saveDoc({ lines: { ...(doc?.lines || {}), [adj.id]: j } }); }} />}
      {setOpen && <PaySettings st={st} onClose={() => setSetOpen(false)} />}
    </>
  );
}

function AdjustDialog({ u, j, onClose, onSave }: { u: Row; j: any; onClose: () => void; onSave: (j: any) => Promise<void> }) {
  const [v, setV] = useState({ b: j.bonus ?? "", d: j.deduction ?? "", a: j.advance ?? "", n: j.note || "" }), set = (k: string, x: string) => setV(p => ({ ...p, [k]: x }));
  const n = (x: any) => x === "" ? 0 : Math.max(0, +x || 0);
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-6 sm:max-w-lg sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-50">Adjust · {u.name}</DialogTitle></DialogHeader>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <F l="Bonus"><Input className="h-9" type="number" min="0" step="any" value={v.b} onChange={e => set("b", e.target.value)} /></F><F l="Deductions"><Input className="h-9" type="number" min="0" step="any" value={v.d} onChange={e => set("d", e.target.value)} /></F>
          <F l="Advance Paid"><Input className="h-9" type="number" min="0" step="any" value={v.a} onChange={e => set("a", e.target.value)} /></F><F l="Note"><Input className="h-9" placeholder="Shown on the payslip" value={v.n} onChange={e => set("n", e.target.value)} /></F></div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => { try { await onSave({ bonus: n(v.b), deduction: n(v.d), advance: n(v.a), note: v.n.trim() }); toast("Saved"); onClose(); } catch { toast("Couldn't save. Check your connection.", "error"); } }}>Save</Button></div>
      </DialogContent>
    </Dialog>);
}
function PaySettings({ st, onClose }: { st: any; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(Object.entries(st).map(([k, x]) => [k, +(x as any) ? String(x) : ""]))), set = (k: string, x: string) => setV(p => ({ ...p, [k]: x }));
  const num = (k: string, l: string, ph?: string) => <F l={l}><Input className="h-9" type="number" min="0" step="any" placeholder={ph} value={v[k] ?? ""} onChange={e => set(k, e.target.value)} /></F>;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">Payroll Settings</DialogTitle></DialogHeader>
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {num("otAfter", "Overtime After (Hours A Day)", "8")}{num("otRate", "Overtime Rate (×)", "1.5")}
          <F l="Working Days A Month" help="Used to turn a monthly salary into a day's pay (unpaid leave) and an hour's pay (overtime)."><Input className="h-9" type="number" min="1" max="31" placeholder="26" value={v.workDays ?? ""} onChange={e => set("workDays", e.target.value)} /></F><div />
          <h4 className="col-span-full mt-2 text-base font-semibold text-gray-900 dark:text-gray-50">Social Security</h4>
          {num("ssEmp", "Employee Share (%)", "0")}{num("ssEr", "Employer Share (%)", "0")}
          <F l="Monthly Pay Cap" help={'Only for employees ticked "Registered for social security" on Edit Employee.'}><Input className="h-9" type="number" min="0" step="any" placeholder="No cap" value={v.ssCap ?? ""} onChange={e => set("ssCap", e.target.value)} /></F><div />
          <h4 className="col-span-full mt-2 text-base font-semibold text-gray-900 dark:text-gray-50">Income Tax</h4>
          {num("taxRate", "Tax Rate (%)", "0")}{num("taxFree", "Tax-Free Amount A Month", "0")}
          <p className="col-span-full text-xs text-gray-500">Rates change by law; check them with your accountant. Leave at 0 to turn a deduction off.</p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => { try { await put("settings", "payroll_settings", { otAfter: +v.otAfter || 8, otRate: +v.otRate || 1.5, workDays: +v.workDays || 26, ssEmp: +v.ssEmp || 0, ssEr: +v.ssEr || 0, ssCap: +v.ssCap || 0, taxRate: +v.taxRate || 0, taxFree: +v.taxFree || 0 }); toast("Payroll settings saved"); onClose(); } catch { toast("Couldn't save.", "error"); } }}>Save</Button></div>
      </DialogContent>
    </Dialog>);
}
