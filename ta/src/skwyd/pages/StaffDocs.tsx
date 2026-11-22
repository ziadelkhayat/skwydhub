// Employee Management → Documents & Onboarding: papers with expiry dates (files in the private "staff-docs" bucket), required documents,
// compliance and the onboarding checklist. Same data, tabs and rules as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GearIcon, PlusIcon } from "@/icons";
import { put, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { useRef, useState } from "react";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { DateInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, SEL, TD, TH } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";
import { addDays, d10s, dmy, today } from "./em";

export const DOC_TYPES = ["ID Card", "Passport", "Employment Contract", "Health Certificate", "Work Permit", "Residence Permit", "Driving License", "Criminal Record", "CV", "Bank Details"];
export const DEF = { required: ["ID Card", "Employment Contract", "Health Certificate"], remindDays: 30, checklist: ["Signed the employment contract", "Received the uniform", "Food safety training", "POS training (PIN and register)", "Shown the kitchen and hygiene rules", "Added to the team group chat"] };
const isAdminRow = (r: Row) => r.role === "owner" || r.role === "admin";
let CO: string | null = null;
const company = async () => { if (CO) return CO; const r = await sb.rpc("skwyd_company"); if (r.error || !r.data) throw r.error || new Error("no company"); return CO = r.data as string; };

export default function StaffDocsPage() {
  const s = useS(["staff_docs", "users", "settings"]);
  const [tab, setTab] = useState("expiring"), [form, setForm] = useState<Row | null | undefined>(undefined), [setOpen, setSetOpen] = useState(false);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const st = { ...DEF, ...((s.settings.find(x => x.id === "staff_docs_settings") as any) || {}) };
  const docs = s.staff_docs.filter(d => !d.deleted).sort((a, b) => String(a.expiresOn || "9999").localeCompare(String(b.expiresOn || "9999")));
  const state = (d: Row) => { if (!d.expiresOn) return "ok"; const e = d10s(d.expiresOn), t = today(); return e < t ? "expired" : e <= addDays(t, +st.remindDays || 30) ? "soon" : "ok"; };
  const tag = (d: Row) => { const x = state(d), e = d.expiresOn ? dmy(d.expiresOn) : ""; return x === "expired" ? <Badge variant="light" color="error">Expired {e}</Badge> : x === "soon" ? <Badge variant="light" color="warning">Expires {e}</Badge> : e ? <Badge variant="light" color="success">Valid to {e}</Badge> : <span className="text-gray-400">No expiry</span>; };
  const emps = s.users.filter(u => live(u) && !isAdminRow(u)).sort((a, b) => String(a.name).localeCompare(String(b.name))), byId = Object.fromEntries(s.users.map(u => [u.id, u]));
  const alert = docs.filter(d => state(d) !== "ok"), rows = tab === "expiring" ? alert : docs;
  const missing = (u: Row) => st.required.filter((t: string) => !docs.some(d => d.employeeId === u.id && d.docType === t && state(d) !== "expired"));
  const view = async (d: Row) => { const w = window.open("", "_blank"); try { const { data, error } = await sb.storage.from("staff-docs").createSignedUrl(d.filePath, 300); if (error) throw error; if (w) w.location = data.signedUrl; else location.href = data.signedUrl; } catch { w?.close(); toast("Couldn't open the file.", "error"); } };
  const Emp = ({ u }: { u?: Row }) => <><span className="block font-medium text-gray-800 dark:text-white/90">{u?.name || "—"}</span><span className="text-xs text-gray-500">{u?.jobTitle || ""}</span></>;
  return (
    <>
      <PageBreadcrumb pageTitle="Documents" />
      <div className={BOX}>
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <SegTabs value={tab} onChange={setTab} items={[["expiring", `Expiring & Expired (${alert.length})`], ["all", "All Documents"], ["compliance", "Compliance"], ["onboarding", "Onboarding"]]} />
          <div className="flex gap-3"><Button variant="outline" onClick={() => setSetOpen(true)}><GearIcon className="size-5" />Settings</Button><Button onClick={() => setForm(null)}><PlusIcon className="size-5" />Add Document</Button></div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {tab === "compliance" ? (!emps.length ? <EmptyState text="No employees yet." /> : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr><th className={TH}>Employee</th>{st.required.map((t: string) => <th key={t} className={TH}>{t}</th>)}<th className={TH + " text-end"}>Complete</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">{emps.map(u => { const miss = missing(u); return <tr key={u.id}><td className={TD}><Emp u={u} /></td>
              {st.required.map((t: string) => { const d = docs.filter(x => x.employeeId === u.id && x.docType === t).sort((a, b) => String(b.expiresOn || "9999").localeCompare(String(a.expiresOn || "9999")))[0]; return <td key={t} className={TD}>{d ? tag(d) : <Badge variant="light" color="error">Missing</Badge>}</td>; })}
              <td className={TD + " text-end font-semibold text-gray-800 dark:text-white/90"}>{st.required.length ? Math.round((st.required.length - miss.length) / st.required.length * 100) : 100}%</td></tr>; })}</tbody></table>)
          : tab === "onboarding" ? (!emps.length ? <EmptyState text="No employees yet." /> : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>{["Employee", "Hire Date", "Progress", "Next Step"].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">{emps.map(u => { const o = u.onboarding || {}, n = st.checklist.length, d = st.checklist.filter((i: string) => o[i]).length, next = st.checklist.find((i: string) => !o[i]);
              return <tr key={u.id}><td className={TD}><Emp u={u} /></td><td className={TD}>{u.hireDate ? dmy(u.hireDate) : "—"}</td>
                <td className={TD}><div className="flex items-center gap-3"><div className="h-2 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"><div className={"h-full rounded-full " + (d === n ? "bg-green-500" : "bg-brand-500")} style={{ width: (n ? d / n * 100 : 100) + "%" }} /></div><span>{d}/{n}</span></div></td>
                <td className={TD}>{next || <Badge variant="light" color="success">Done</Badge>}</td></tr>; })}</tbody></table>)
          : !rows.length ? <EmptyState text={tab === "expiring" ? `Nothing expiring in the next ${+st.remindDays || 30} days.` : "No documents yet. Add IDs, contracts and health certificates with their expiry dates."} />
          : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>{["Employee", "Document", "Number", "Issued", "Status", "File"].map(h => <th key={h} className={TH}>{h}</th>)}<th className={TH} /></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">{rows.map(d => <tr key={d.id}><td className={TD}><Emp u={byId[d.employeeId]} /></td>
              <td className={TD}>{d.docType}{d.note && <span className="block text-xs text-gray-500">{d.note}</span>}</td><td className={TD}>{d.number || "—"}</td><td className={TD}>{d.issuedOn ? dmy(d.issuedOn) : "—"}</td><td className={TD}>{tag(d)}</td>
              <td className={TD}>{d.filePath ? <Button size="xs" variant="outline" onClick={() => view(d)}>View</Button> : "—"}</td><td className={TD + " text-end"}><Button size="xs" variant="outline" onClick={() => setForm(d)}>Edit</Button></td></tr>)}</tbody></table>}
        </div>
        {(tab === "compliance" || tab === "onboarding") && <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-white/5">{tab === "compliance" ? "Required documents are set in Settings. A document counts while it hasn't expired." : "Tick the steps on each employee's page. Edit the checklist in Settings."}</p>}
      </div>
      {form !== undefined && <DocForm d={form} s={s} types={[...new Set([...st.required, ...DOC_TYPES])]} onClose={() => setForm(undefined)} />}
      {setOpen && <SettingsDialog st={st} onClose={() => setSetOpen(false)} />}
    </>
  );
}

export function DocForm({ d, s, types, emp, onClose }: { d: Row | null; s: S; types: string[]; emp?: string; onClose: () => void }) {
  const [v, setV] = useState({ emp: d?.employeeId || emp || "", type: d?.docType || "", no: d?.number || "", iss: d10s(d?.issuedOn), exp: d10s(d?.expiresOn), note: d?.note || "" });
  const [file, setFile] = useState<File | null>(null), [err, setErr] = useState(""), [busy, setBusy] = useState(false), inp = useRef<HTMLInputElement>(null);
  const set = (k: string, x: string) => setV(p => ({ ...p, [k]: x }));
  async function save() {
    if (!v.emp) return setErr("Choose the employee."); if (!v.type.trim()) return setErr("Name the document."); if (file && file.size > 10485760) return setErr("The file is bigger than 10 MB.");
    if (v.iss && v.exp && v.exp < v.iss) return setErr("Expires must be after Issued.");
    setBusy(true);
    try {
      const did = d?.id || "doc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const data: any = { employeeId: v.emp, docType: v.type.trim(), number: v.no.trim() || null, issuedOn: v.iss || null, expiresOn: v.exp || null, note: v.note.trim() || null };
      if (file) { const path = `${await company()}/${v.emp}/${did}-${Date.now().toString(36)}.${(file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        const up = await sb.storage.from("staff-docs").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false }); if (up.error) throw up.error;
        if (d?.filePath) sb.storage.from("staff-docs").remove([d.filePath]).catch(() => {});
        data.filePath = path; data.fileName = file.name; }
      if (!d) data.deleted = false;
      await put("staff_docs", did, data); toast(d ? "Document saved" : "Document added"); onClose();
    } catch { setErr("Couldn't save. Check your connection."); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">{d ? "Edit Document" : "Add Document"}</DialogTitle></DialogHeader>
        <form className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save(); }}>
          <F l="Employee" req><select className={SEL} disabled={!!d} value={v.emp} onChange={e => set("emp", e.target.value)}><option value="">Choose…</option>{s.users.filter(live).sort((a, b) => String(a.name).localeCompare(String(b.name))).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></F>
          <F l="Document" req><Input className="h-11" list="sdTypes" placeholder="e.g. Health Certificate" value={v.type} onChange={e => set("type", e.target.value)} /><datalist id="sdTypes">{types.map(t => <option key={t} value={t} />)}</datalist></F>
          <F l="Number"><Input className="h-11" value={v.no} onChange={e => set("no", e.target.value)} /></F>
          <F l="Issued"><DateInput value={v.iss} onChange={x => set("iss", x)} /></F>
          <F l="Expires"><DateInput value={v.exp} onChange={x => set("exp", x)} /></F>
          <F l="File" full help="PDF or photo, up to 10 MB.">
            <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }} onClick={() => inp.current?.click()}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-600 hover:border-brand-500 dark:border-gray-700 dark:text-gray-400">
              <span className="truncate">{file ? file.name : d?.fileName ? "Current file: " + d.fileName : "Drop a file here or browse"}</span><Button type="button" size="sm" variant="outline">{file || d?.fileName ? "Replace" : "Browse"}</Button></div>
            <input ref={inp} type="file" hidden accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></F>
          <F l="Note" full><Input className="h-11" value={v.note} onChange={e => set("note", e.target.value)} /></F>
          {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
          <div className="col-span-full flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            {d && <Button type="button" variant="destructive" className="sm:me-auto" onClick={async () => { if (!(await askYes("Delete this document and its file?", "Delete", true))) return;
              try { if (d.filePath) await sb.storage.from("staff-docs").remove([d.filePath]); await put("staff_docs", d.id, { deleted: true, filePath: null }); toast("Document deleted"); onClose(); } catch { toast("Couldn't delete.", "error"); } }}>Delete</Button>}
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>);
}

function SettingsDialog({ st, onClose }: { st: any; onClose: () => void }) {
  const [req, setReq] = useState(st.required.join("\n")), [days, setDays] = useState(String(+st.remindDays || 30)), [ck, setCk] = useState(st.checklist.join("\n"));
  const lines = (v: string) => [...new Set(v.split("\n").map(x => x.trim()).filter(Boolean))];
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto p-6 sm:max-w-xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">Documents & Onboarding Settings</DialogTitle></DialogHeader>
        <div className="mt-6 space-y-5">
          <F l="Required Documents (one per line)"><Textarea rows={4} value={req} onChange={e => setReq(e.target.value)} /></F>
          <F l="Warn Before Expiry (Days)"><Input className="h-11" type="number" min="1" value={days} onChange={e => setDays(e.target.value)} /></F>
          <F l="Onboarding Checklist (one step per line)"><Textarea rows={7} value={ck} onChange={e => setCk(e.target.value)} /></F>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => { try { await put("settings", "staff_docs_settings", { required: lines(req), remindDays: +days || 30, checklist: lines(ck) }); toast("Settings saved"); onClose(); } catch { toast("Couldn't save.", "error"); } }}>Save</Button></div>
      </DialogContent>
    </Dialog>);
}
