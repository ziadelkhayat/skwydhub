// Customers: the same tabs, sort, columns and add/edit form as the current portal (rpc skwyd_customers), in TailAdmin layout.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, SearchIcon } from "@/icons";
import { sb } from "@/lib/supabase";
import { fmtDate } from "@/lib/util";
import { useEffect, useState } from "react";
import { EmptyState } from "../ui/EmptyState";
import { Pager } from "../ui/Pager";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

const TABS: [string, string][] = [["all", "All"], ["orders", "Has Orders"], ["negative", "Has Negative Balance"], ["blacklisted", "Blacklisted"], ["deleted", "Deleted"]];
const SORTS: [string, string][] = [["last", "Last order"], ["spent", "Total spent"], ["orders", "Most orders"], ["new", "Newest"], ["name", "Name A–Z"]];
const PER = 50;
const ago = (t?: string) => { if (!t) return "—"; const d = Math.floor((Date.now() - +new Date(t)) / 86400000); return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 31 ? d + " days ago" : fmtDate(t); };
const tel = (p: string) => String(p || "").replace(/^\+961(\d{1,2})(\d{3})(\d{3})$/, "+961 $1 $2 $3");
const CCS = ["+961", "+971", "+966", "+974", "+965", "+973", "+968", "+962", "+20", "+90", "+33", "+44", "+1"];

export default function CustomersPage() {
  const [tab, setTab] = useState("all"), [sort, setSort] = useState("last"), [q, setQ] = useState(""), [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]), [count, setCount] = useState(0), [loading, setLoading] = useState(true), [err, setErr] = useState(""), [tick, setTick] = useState(0);
  const [edit, setEdit] = useState<any>(undefined);
  useEffect(() => { let off = false; setLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await sb.rpc("skwyd_customers", { p_q: q.trim(), p_filter: tab, p_sort: sort, p_limit: PER, p_offset: (page - 1) * PER });
      if (off) return; setLoading(false);
      if (error) setErr(error.message); else { setErr(""); setRows((data as any)?.rows || []); setCount((data as any)?.count || 0); } }, q ? 250 : 0);
    return () => { off = true; clearTimeout(t); }; }, [tab, sort, q, page, tick]);
  const pages = Math.max(1, Math.ceil(count / PER));
  const th = "px-5 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-500 sm:px-6 dark:text-gray-400", td = "px-5 py-4 text-sm whitespace-nowrap text-gray-700 sm:px-6 dark:text-gray-400";
  return (
    <>
      <PageBreadcrumb pageTitle="Customers" />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <SegTabs value={tab} onChange={v => { setTab(v); setPage(1); }} items={TABS} />
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center 2xl:w-auto">
            <InputGroup className="h-11 flex-1 sm:w-64 sm:flex-initial">
              <InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon>
              <InputGroupInput type="text" placeholder="Search..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
            </InputGroup>
            <select aria-label="Sort" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className="h-11 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {SORTS.map(([v, t]) => <option key={v} value={v}>Sort: {t}</option>)}</select>
            <Button onClick={() => setEdit(null)}><PlusIcon className="size-5" />Add Customer</Button>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">
          {err ? <p className="p-6 text-sm text-red-500">Couldn't load customers: {err}</p>
            : !rows.length ? <EmptyState text={loading ? "Loading customers…" : q || tab !== "all" ? "No customers match." : "No customers yet"} />
            : <table className="min-w-full"><thead className="border-b border-gray-100 dark:border-white/5"><tr>
                <th className={th}>Name</th><th className={th}>Phone</th><th className={th}>Email</th><th className={th + " text-end"}>Total Orders</th><th className={th}>Last Order</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">{rows.map(c => (
                <tr key={c.id} onClick={() => setEdit(c)} className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/2">
                  <td className={td}><span className="font-medium text-gray-800 dark:text-white/90">{c.name || "Unnamed"}</span>{c.blacklisted && <Badge className="ms-2" variant="light" color="error">Blacklisted</Badge>}
                    {(c.tags || []).length > 0 && <span className="mt-1 flex gap-1">{c.tags.map((t: string) => <Badge key={t} variant="light" color="primary">{t}</Badge>)}</span>}</td>
                  <td className={td}>{tel(c.phone)}</td><td className={td}>{c.email || "—"}</td><td className={td + " text-end"}>{c.n ?? 0}</td><td className={td}>{ago(c.last_at)}</td></tr>))}</tbody></table>}
        </div>
        {count > 0 && <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5">
          <Pager currentPage={page} totalPages={pages} onPageChange={setPage} />
          <span className="pe-6 text-sm text-gray-500 dark:text-gray-400">{(page - 1) * PER + 1}–{Math.min(count, page * PER)} of {count.toLocaleString()}</span></div>}
      </div>
      {edit !== undefined && <CustomerDialog c={edit} onClose={() => setEdit(undefined)} onSaved={() => setTick(t => t + 1)} />}
    </>
  );
}

function CustomerDialog({ c, onClose, onSaved }: { c: any; onClose: () => void; onSaved: () => void }) {
  const sp = (() => { const p = String(c?.phone || ""); const cc = CCS.find(x => p.startsWith(x)) || "+961"; return { cc, num: p.startsWith(cc) ? p.slice(cc.length) : p }; })();
  const [name, setName] = useState(c?.name || ""), [cc, setCc] = useState(sp.cc), [num, setNum] = useState(sp.num), [email, setEmail] = useState(c?.email || "");
  const [bday, setBday] = useState(c?.birthday || ""), [gender, setGender] = useState(c?.gender || ""), [notes, setNotes] = useState(c?.notes || ""), [black, setBlack] = useState(!!c?.blacklisted);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function save() {
    const phone = cc + num.replace(/\D/g, "").replace(/^0+/, "");
    if (!name.trim()) return setErr("Customer name is required."); if (phone.length < 6) return setErr("Enter a valid phone number.");
    const row: any = { name: name.trim(), phone, email: email.trim() || null, birthday: bday || null, gender: gender || null, blacklisted: black, notes: notes.trim() || null, updated_at: new Date().toISOString() };
    if (!c?.id) { row.tags = []; row.addresses = []; }
    setBusy(true);
    const res = c?.id ? await sb.from("customers").update(row).eq("id", c.id) : await sb.from("customers").insert(row);
    setBusy(false);
    if (res.error) return setErr(/duplicate|unique/i.test(res.error.message) ? "A customer with this phone already exists (check the Deleted tab)." : res.error.message);
    toast(c?.id ? "Customer saved" : "Customer added"); onSaved(); onClose();
  }
  const sel = "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">{c?.id ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
        <form className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save(); }}>
          <Field className="col-span-full"><FieldLabel className="mb-1.5 block">Name <span className="text-red-500">*</span></FieldLabel><Input className="h-11" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field><FieldLabel className="mb-1.5 block">Phone Number <span className="text-red-500">*</span></FieldLabel>
            <div className="flex gap-3"><select aria-label="Country code" className={sel.replace("w-full", "w-28 shrink-0")} value={cc} onChange={e => setCc(e.target.value)}>{CCS.map(x => <option key={x}>{x}</option>)}</select>
              <Input className="h-11 flex-1" type="tel" inputMode="tel" value={num} onChange={e => setNum(e.target.value)} /></div></Field>
          <Field><FieldLabel className="mb-1.5 block">Email</FieldLabel><Input className="h-11" type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
          <Field><FieldLabel className="mb-1.5 block">Birth Date</FieldLabel><Input className="h-11" type="date" value={bday || ""} onChange={e => setBday(e.target.value)} /></Field>
          <Field><FieldLabel className="mb-1.5 block">Gender</FieldLabel><select className={sel} value={gender} onChange={e => setGender(e.target.value)}><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select></Field>
          <Field className="col-span-full"><FieldLabel className="mb-1.5 block">Customer Notes</FieldLabel><Textarea rows={3} placeholder="Allergies, preferences, gate code…" value={notes} onChange={e => setNotes(e.target.value)} />
            <p className="mt-1.5 text-xs text-gray-500">Shown to the cashier and call center when this customer orders.</p></Field>
          <Field orientation="horizontal" className="col-span-full items-center gap-3"><Switch checked={black} onCheckedChange={v => setBlack(!!v)} /><FieldLabel className="text-sm font-normal text-gray-700 dark:text-gray-400">Blacklist</FieldLabel></Field>
          {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
          <div className="col-span-full flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
