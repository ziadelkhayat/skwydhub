import { PageHead } from "../ui/Record";
import { Section } from "../ui/Section";
import { Label } from "@/components/tremor/Label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
// An employee's page (Employees → a row): details, employment, documents, onboarding checklist (ticks save the date), the last clock-ins,
// roles and stores, with Edit Employee, Create / Change Password, Roles and Stores, the same as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, PencilIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { put, type Row } from "@/lib/db";
import { sb, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase";
import { fmtDateTime } from "@/lib/util";
import { createClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { EditDialog, live, useS } from "../crud/CrudPage";
import { CRUD } from "../crud/configs";
import { EmptyState } from "../ui/EmptyState";
import { F, TD, TH, TR } from "../ui/kit";
import { PickDialog } from "../ui/PickDialog";
import { toast } from "../ui/toast";
import { addDays, d10s, dmy, hm, tcHrs, today } from "./em";
import { DEF, DOC_TYPES, DocForm } from "./StaffDocs";

const ET: Record<string, string> = { full: "Full Time", part: "Part Time", temp: "Temporary", intern: "Intern" }, PT: Record<string, string> = { monthly: "/ month", hourly: "/ hour", daily: "/ day" };
const roleIds = (u: Row): string[] => u.roleIds?.length ? u.roleIds : u.roleId ? [u.roleId] : [];
const Sec = ({ title, act, children }: { title: React.ReactNode; act?: React.ReactNode; children: React.ReactNode }) => <Section title={title} act={act}>{children}</Section>;
const Info = ({ l, v }: { l: string; v: React.ReactNode }) => <div className="min-w-0"><dt className="text-sm text-gray-500 dark:text-gray-500">{l}</dt><dd className="mt-1 text-sm font-medium break-words text-gray-900 dark:text-gray-50">{v}</dd></div>;
const None = ({ t }: { t: string }) => <p className="text-sm text-gray-500 dark:text-gray-400">{t}</p>;

export default function EmployeePage() {
  const s = useS(["users", "roles", "branches", "staff_docs", "settings"]), [sp] = useSearchParams(), nav = useNavigate(), { staff } = useAuth();
  const [edit, setEdit] = useState(false), [pw, setPw] = useState(false), [dlg, setDlg] = useState<"" | "roles" | "stores">(""), [doc, setDoc] = useState<Row | null | undefined>(undefined);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const u = s.users.find(x => x.id === sp.get("id"));
  if (!u) return <><PageBreadcrumb pageTitle="Employees" /><EmptyState text="This employee wasn't found."><Button variant="outline" onClick={() => nav("/users")}>Employees</Button></EmptyState></>;
  const st = { ...DEF, ...((s.settings.find(x => x.id === "staff_docs_settings") as any) || {}) }, tc: any = s.settings.find(x => x.id === "timeclock") || {};
  const docs = s.staff_docs.filter(d => !d.deleted && d.employeeId === u.id).sort((a, b) => String(a.expiresOn || "9999").localeCompare(String(b.expiresOn || "9999")));
  const state = (d: Row) => { if (!d.expiresOn) return "ok"; const e = d10s(d.expiresOn), t = today(); return e < t ? "expired" : e <= addDays(t, +st.remindDays || 30) ? "soon" : "ok"; };
  const tag = (d: Row) => { const x = state(d), e = d.expiresOn ? dmy(d.expiresOn) : ""; return x === "expired" ? <Badge variant="light" color="error">Expired {e}</Badge> : x === "soon" ? <Badge variant="light" color="warning">Expires {e}</Badge> : e ? <Badge variant="light" color="success">Valid to {e}</Badge> : <span className="text-gray-400">No expiry</span>; };
  const miss = st.required.filter((t: string) => !docs.some(d => d.docType === t && state(d) !== "expired"));
  const view = async (d: Row) => { const w = window.open("", "_blank"); try { const { data, error } = await sb.storage.from("staff-docs").createSignedUrl(d.filePath, 300); if (error) throw error; if (w) w.location = data.signedUrl; else location.href = data.signedUrl; } catch { w?.close(); toast("Couldn't open the file.", "error"); } };
  const ob = u.onboarding || {}, ck: string[] = st.checklist || [], obN = ck.filter(i => ob[i]).length;
  const tick = async (i: string, on: boolean) => { const o = { ...ob }; if (on) o[i] = new Date().toISOString(); else delete o[i]; try { await put("users", u.id, { onboarding: o }); } catch { toast("Couldn't save.", "error"); } };
  const open = (tc.open || {})[u.id], clock = (tc.log || []).filter((x: any) => x.userId === u.id).sort((a: any, b: any) => String(b.in).localeCompare(String(a.in))).slice(0, 10);
  const bName = (id: string) => s.branches.find(b => b.id === id)?.name || "—";
  const rs = s.roles.filter(r => roleIds(u).includes(r.id)), picked = (u.branchIds || []).length, brs = picked ? s.branches.filter(b => u.branchIds.includes(b.id)) : s.branches.filter(b => live(b) && b.active !== false);
  const canPw = !u.userId || staff?.role === "owner";
  return (
    <>
      <PageBreadcrumb pageTitle="Employees" current={u.name} />
      <PageHead back={<><Button variant="outline" size="sm" render={<Link to="/users" />}><ArrowLeftIcon className="size-4" />Employees</Button></>} title={<>{u.name}</>} badges={<>{u.deleted && <Badge variant="light" color="error">Deleted</Badge>}</>} actions={<>{canPw && <Button variant="outline" onClick={() => setPw(true)}>{u.userId ? "Change Password" : "Create Password"}</Button>}<Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Employee</Button></>} />
      <Sec title="Details"><dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Info l="Name" v={u.name} /><Info l="Email" v={u.email || "—"} /><Info l="Phone" v={u.phone || "—"} /><Info l="Language" v={u.language === "ar" ? "Arabic" : "English"} />
        <Info l="Display Localized Names" v={u.displayLocalized ? "Yes" : "No"} /><Info l="Console Access" v={u.email ? (u.userId ? "Yes" : "Not created yet") : "No"} /><Info l="App Access (PIN)" v={u.pinHash ? "Yes" : "No"} /><Info l="Created" v={fmtDateTime(u.createdAt)} />
      </dl></Sec>
      <Sec title="Employment"><dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Info l="Employee Number" v={u.employeeNo || "—"} /><Info l="Job Title" v={u.jobTitle || "—"} /><Info l="Employment Type" v={ET[u.employmentType] || "—"} /><Info l="Hire Date" v={u.hireDate ? dmy(u.hireDate) : "—"} />
        <Info l="Date Of Birth" v={u.birthDate ? dmy(u.birthDate) : "—"} /><Info l="Pay" v={u.payRate != null && u.payRate !== "" ? "$" + (+u.payRate).toFixed(2) + " " + (PT[u.payType] || "") : "—"} />
        <Info l="Emergency Contact" v={[u.emergencyName, u.emergencyPhone].filter(Boolean).join(" · ") || "—"} /><Info l="Now" v={open ? `Clocked in since ${hm(open.at)}` : "Not clocked in"} /></dl>
        {u.notes && <p className="mt-4 text-sm whitespace-pre-wrap text-gray-500 dark:text-gray-400">{u.notes}</p>}</Sec>
      <Sec title="Documents" act={<Button size="sm" variant="outline" onClick={() => setDoc(null)}>Add Document</Button>}>
        {miss.length > 0 && <p className="mb-3 text-sm text-red-500">Missing: {miss.join(", ")}</p>}
        {!docs.length ? <None t="No documents yet" /> : <div className="overflow-x-auto"><Table className="w-full"><TableHead><TableRow>{["Document", "Number", "Status", ""].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}</TableRow></TableHead><TableBody>
          {docs.map(d => <TableRow key={d.id} className={TR}><TableCell className={TD}>{d.docType}</TableCell><TableCell className={TD}>{d.number || "—"}</TableCell><TableCell className={TD}>{tag(d)}</TableCell>
            <TableCell className={TD + " text-end whitespace-nowrap"}>{d.filePath && <Button size="xs" variant="outline" className="me-2" onClick={() => view(d)}>View</Button>}<Button size="xs" variant="outline" onClick={() => setDoc(d)}>Edit</Button></TableCell></TableRow>)}</TableBody></Table></div>}</Sec>
      <Sec title={<>Onboarding <span className="ms-1 text-sm font-normal text-gray-500">{obN}/{ck.length}</span></>}>
        {!ck.length ? <None t="No checklist yet (Documents → Settings)" /> : <div className="grid gap-3">{ck.map(i => <Label key={i} className="flex cursor-pointer items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
          <Checkbox checked={!!ob[i]} onCheckedChange={(chk: boolean) => tick(i, chk)} />{i}{ob[i] && <span className="text-xs text-gray-500">{dmy(isoLocal(ob[i]))}</span>}</Label>)}</div>}</Sec>
      <Sec title="Attendance" act={<Button size="sm" variant="outline" render={<Link to="/time-clock" />}>Time Clock</Button>}>
        {!clock.length ? <None t="No clock-ins yet. Employees clock in and out on the cashier app with their PIN." /> : <div className="overflow-x-auto"><Table className="w-full"><TableHead><TableRow>{["Date", "Store", "Clock In", "Clock Out", "Hours"].map(h => <TableHeaderCell key={h} className={TH + (h === "Hours" ? " text-end" : "")}>{h}</TableHeaderCell>)}</TableRow></TableHead><TableBody>
          {clock.map((x: any, i: number) => <TableRow key={i} className={TR}><TableCell className={TD}>{dmy(isoLocal(x.in))}</TableCell><TableCell className={TD}>{bName(x.branchId)}</TableCell><TableCell className={TD}>{hm(x.in)}</TableCell><TableCell className={TD}>{hm(x.out)}</TableCell><TableCell className={TD + " text-end"}>{tcHrs(x).toFixed(2)}</TableCell></TableRow>)}</TableBody></Table></div>}</Sec>
      <Sec title="Roles" act={<Button size="sm" variant="outline" onClick={() => setDlg("roles")}>Roles</Button>}>
        {!rs.length ? <None t="No roles" /> : <div className="flex flex-wrap gap-2">{rs.map(r => <Badge key={r.id} variant="light" color="primary">{r.name}</Badge>)}</div>}</Sec>
      <Sec title="Stores" act={<Button size="sm" variant="outline" onClick={() => setDlg("stores")}>Stores</Button>}>
        {!picked ? <None t="Applied on all existing and new stores" /> : !brs.length ? <None t="No stores yet" /> : <div className="overflow-x-auto"><Table className="w-full"><TableHead><TableRow><TableHeaderCell className={TH}>Name</TableHeaderCell><TableHeaderCell className={TH}>Reference</TableHeaderCell></TableRow></TableHead><TableBody>
          {brs.map(b => <TableRow key={b.id} className={TR}><TableCell className={TD}>{b.name}</TableCell><TableCell className={TD}>{b.code || "—"}</TableCell></TableRow>)}</TableBody></Table></div>}</Sec>

      {edit && <EditDialog cfg={CRUD.users} s={s} row={u} onClose={() => setEdit(false)} />}
      {doc !== undefined && <DocForm d={doc} s={s} emp={u.id} types={[...new Set([...st.required, ...DOC_TYPES])]} onClose={() => setDoc(undefined)} />}
      {pw && <PwDialog u={u} onClose={() => setPw(false)} />}
      {dlg === "roles" && <PickDialog title="Edit Roles" opts={s.roles.filter(r => live(r) || roleIds(u).includes(r.id)).map(r => [r.id, r.name])} value={roleIds(u)}
        onSave={async ids => { try { await put("users", u.id, { roleIds: ids, roleId: ids[0] || null }); toast("Roles saved"); setDlg(""); } catch { toast("Couldn't save.", "error"); return false; } }} onClose={() => setDlg("")} />}
      {dlg === "stores" && <PickDialog title="Stores" opts={s.branches.filter(b => live(b) && b.active !== false).map(b => [b.id, b.name, b.code || ""])} value={(u.branchIds || []).filter((x: string) => x !== "-")}
        onSave={async ids => { try { await put("users", u.id, { branchIds: ids.length ? ids : ["-"] }); toast("Stores saved"); setDlg(""); } catch { toast("Couldn't save.", "error"); return false; } }} onClose={() => setDlg("")} />}
    </>
  );
}
const isoLocal = (t: string) => { const d = new Date(t); return new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

// Create Password makes the back-office login for the employee's email (they confirm it once if the project asks); Change Password sets a
// new one (your own through your session, someone else's through skwyd_set_user_password, owner or admin only)
function PwDialog({ u, onClose }: { u: Row; onClose: () => void }) {
  const has = !!u.userId, [p1, setP1] = useState(""), [p2, setP2] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function save() {
    setErr(""); if (!has && !u.email) return setErr("Add the employee's email first (Edit Employee)."); if (p1.length < 8) return setErr("The password needs at least 8 characters."); if (p1 !== p2) return setErr("The passwords don't match.");
    setBusy(true);
    try {
      if (!has) { const tmp = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "skwyd-staff-signup" } });
        const { data, error } = await tmp.auth.signUp({ email: String(u.email).toLowerCase(), password: p1, options: { emailRedirectTo: location.origin + "/" } });
        if (error || (data?.user && !(data.user.identities || []).length)) return setErr(!error || /registered|exists/i.test(error.message) ? "This email already has a login. They sign in with it (or use Forgot password)." : "Couldn't create the login: " + error.message);
        if (data?.user?.id) await put("users", u.id, { userId: data.user.id });
        toast(data?.session ? "Password created" : "Password created · they confirm their email once, then sign in"); return onClose(); }
      const me = (await sb.auth.getUser())?.data?.user?.id;
      if (me && me === u.userId) { const { error } = await sb.auth.updateUser({ password: p1 }); if (error) return setErr("Couldn't change it: " + error.message); toast("Password changed"); return onClose(); }
      const { data, error } = await sb.rpc("skwyd_set_user_password", { p_user: u.userId, p_password: p1 });
      if (error) return setErr("Couldn't change it: " + error.message);
      if ((data as any)?.error) return setErr(({ forbidden: "Only the owner or an admin can change other users' passwords.", short: "The password needs at least 8 characters.", nouser: "This user's login wasn't found." } as any)[(data as any).error] || "Couldn't change it.");
      toast("Password changed"); onClose();
    } catch { setErr("Couldn't save. Check the connection and try again."); } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-full p-6 sm:max-w-md"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{has ? "Change Password" : "Create Password"}</DialogTitle></DialogHeader>
    {!has && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{u.email ? `${u.email} signs in to the back office with this password.` : "Add the employee's email first (Edit Employee): they sign in to the back office with their email and this password."}</p>}
    <form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); save(); }}>
      <F l={has ? "New Password" : "Password"} req><Input type="password" className="h-9" autoComplete="new-password" placeholder="At least 8 characters" value={p1} onChange={e => setP1(e.target.value)} autoFocus /></F>
      <F l={has ? "Confirm New Password" : "Confirm Password"} req><Input type="password" className="h-9" autoComplete="new-password" value={p2} onChange={e => setP2(e.target.value)} /></F>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Close</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div></form>
  </DialogContent></Dialog>;
}
