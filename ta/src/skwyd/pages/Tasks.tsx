// Employee Management → Tasks: tasks given to employees (or everyone at a store), done in the Employee App. Same table and rules as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, SearchIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { put, type Row } from "@/lib/db";
import { useState } from "react";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { DateInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, SEL, TD, TH, TR } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";
import { d10s, dmy, today, who } from "./em";
import { Checkbox } from "@/components/ui/checkbox";

export default function TasksPage() {
  const s = useS(["tasks", "users", "branches", "brands"]), { staff } = useAuth();
  const [tab, setTab] = useState("open"), [br, setBr] = useState(""), [brand, setBrand] = useState(""), [q, setQ] = useState(""), [form, setForm] = useState<Row | null | undefined>(undefined);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const all = s.tasks.filter(t => !t.deleted), stores = s.branches.filter(b => live(b) && b.active !== false && (!brand || b.brandId === brand));
  const n = (k: string) => all.filter(t => k === "all" || (k === "done") === (t.status === "done")).length;
  const whoOf = (t: Row) => (t.assigneeIds || []).length ? t.assigneeIds.map((id: string) => s.users.find(u => u.id === id)?.name || "—").join(", ") : t.branchId ? "Everyone at " + (s.branches.find(b => b.id === t.branchId)?.name || "") : "Everyone";
  const late = (t: Row) => t.status !== "done" && t.dueDay && d10s(t.dueDay) < today();
  const qq = q.trim().toLowerCase();
  const rows = all.filter(t => (tab === "all" || (tab === "done") === (t.status === "done")) && (!brand || !t.branchId || stores.some(b => b.id === t.branchId)) && (!br || t.branchId === br || (t.assigneeIds || []).some((id: string) => (s.users.find(u => u.id === id)?.branchIds || []).includes(br))) && (!qq || (t.title + " " + (t.notes || "")).toLowerCase().includes(qq)))
    .sort((a, b) => (+(a.status === "done") - +(b.status === "done")) || String(a.dueDay || "9999").localeCompare(String(b.dueDay || "9999")) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const toggle = async (t: Row) => { const done = t.status !== "done"; try { await put("tasks", t.id, { status: done ? "done" : "open", doneAt: done ? new Date().toISOString() : null, doneBy: done ? who(staff) : null }); } catch { toast("Couldn't save.", "error"); } };
  return (
    <>
      <PageBreadcrumb pageTitle="Tasks" />
      <div className={BOX}>
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <SegTabs value={tab} onChange={setTab} items={[["open", `Open (${n("open")})`], ["done", `Done (${n("done")})`], ["all", `All (${n("all")})`]]} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <InputGroup className="h-9 sm:w-60"><InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon><InputGroupInput placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} /></InputGroup>
            <select aria-label="Brand" className={SEL + " sm:w-44"} value={brand} onChange={e => { setBrand(e.target.value); setBr(""); }}><option value="">All Brands</option>{s.brands.filter(b => !b.deleted).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <select aria-label="Store" className={SEL + " sm:w-44"} value={br} onChange={e => setBr(e.target.value)}><option value="">All Stores</option>{stores.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <Button onClick={() => setForm(null)}><PlusIcon className="size-5" />New Task</Button></div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {!rows.length ? <EmptyState text={all.length ? "Nothing here." : "No tasks yet. Employees see their tasks in the Employee App and tick them when done."} />
            : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>{["Task", "Given To", "Due", "Status"].map(h => <th key={h} className={TH}>{h}</th>)}<th className={TH} /></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">{rows.map(t => <tr key={t.id} className={TR} onClick={() => setForm(t)}>
                <td className={TD + " whitespace-normal"}><span className="block font-medium text-gray-800 dark:text-white/90">{t.title}</span>{t.notes && <span className="text-xs text-gray-500">{String(t.notes).slice(0, 90)}</span>}</td>
                <td className={TD + " whitespace-normal"}>{whoOf(t)}</td><td className={TD}>{t.dueDay ? <span className={late(t) ? "font-semibold text-red-500" : ""}>{dmy(t.dueDay)}</span> : "—"}</td>
                <td className={TD}>{t.status === "done" ? <><Badge variant="light" color="success">Done</Badge><span className="block text-xs text-gray-500">{t.doneBy || ""}{t.doneAt ? " · " + dmy(t.doneAt) : ""}</span></> : late(t) ? <Badge variant="light" color="error">Late</Badge> : <Badge variant="light" color="warning">Open</Badge>}</td>
                <td className={TD + " text-end"}><Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); toggle(t); }}>{t.status === "done" ? "Reopen" : "Mark Done"}</Button></td></tr>)}</tbody></table>}
        </div>
      </div>
      {form !== undefined && <TaskForm t={form} s={s} by={who(staff)} onClose={() => setForm(undefined)} />}
    </>
  );
}

function TaskForm({ t, s, by, onClose }: { t: Row | null; s: S; by: string; onClose: () => void }) {
  const [v, setV] = useState({ title: t?.title || "", notes: t?.notes || "", br: t?.branchId || "", due: d10s(t?.dueDay) }), [on, setOn] = useState<string[]>(t?.assigneeIds || []), [q, setQ] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), set = (k: string, x: string) => setV(p => ({ ...p, [k]: x }));
  const emps = s.users.filter(u => live(u) && u.active !== false && u.role !== "owner" && u.role !== "admin").sort((a, b) => String(a.name).localeCompare(String(b.name)));
  async function save() {
    if (!v.title.trim()) return setErr("Enter the task.");
    const d = { title: v.title.trim(), notes: v.notes.trim() || null, branchId: v.br || null, dueDay: v.due || null, assigneeIds: on };
    setBusy(true);
    try { const id = t?.id || "tk_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); await put("tasks", id, t ? d : { ...d, status: "open", createdBy: by, deleted: false }); toast(t ? "Task saved" : "Task added"); onClose(); }
    catch { setErr("Couldn't save the task."); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">{t ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
        <form className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save(); }}>
          <F l="Task" req full><Input className="h-9" autoFocus maxLength={200} placeholder="e.g. Clean the fryer" value={v.title} onChange={e => set("title", e.target.value)} /></F>
          <F l="Notes" full><Textarea rows={3} value={v.notes} onChange={e => set("notes", e.target.value)} /></F>
          <F l="Store"><select className={SEL} value={v.br} onChange={e => set("br", e.target.value)}><option value="">All Stores</option>{s.branches.filter(b => live(b) && b.active !== false).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></F>
          <F l="Due Date"><DateInput value={v.due} onChange={x => set("due", x)} /></F>
          <F l="Given To" full help="None chosen: everyone at the store.">
            <div className="rounded-lg border border-gray-300 dark:border-gray-700"><input className="h-10 w-full border-b border-gray-200 bg-transparent px-3 text-sm outline-none dark:border-gray-800 dark:text-white/90" placeholder="Search employees" value={q} onChange={e => setQ(e.target.value)} />
              <div className="max-h-48 overflow-y-auto p-1.5">{emps.filter(u => !q || String(u.name).toLowerCase().includes(q.toLowerCase())).map(u => <label key={u.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/3">
                <Checkbox checked={on.includes(u.id)} onCheckedChange={c => setOn(c ? [...on, u.id] : on.filter(x => x !== u.id))} />{u.name}{u.jobTitle && <span className="text-gray-400">{u.jobTitle}</span>}</label>)}</div></div></F>
          {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
          <div className="col-span-full flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            {t && <Button type="button" variant="destructive" className="sm:me-auto" onClick={async () => { if (!(await askYes(`Delete the task ${t.title}?`, "Delete", true))) return; try { await put("tasks", t.id, { deleted: true }); toast("Task deleted"); onClose(); } catch { toast("Couldn't delete the task.", "error"); } }}>Delete</Button>}
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>);
}
