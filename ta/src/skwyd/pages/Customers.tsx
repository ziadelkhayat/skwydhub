import { DataTable, type DTColumn } from "@/components/tremor/data-table/DataTable";
import { downloadCsv } from "@/components/tremor/data-table/textOf";
import { SelectNative } from "@/components/tremor/SelectNative";
// Customers: the same tabs, columns and add/edit form as the current portal (rpc skwyd_customers), in TailAdmin layout.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon } from "@/icons";
import { sb } from "@/lib/supabase";
import { fmtDate, openWin } from "@/lib/util";
import { useEffect, useState } from "react";
import { DateInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

const TABS: [string, string][] = [["all", "All"], ["orders", "Has Orders"], ["negative", "Has Negative Balance"], ["blacklisted", "Blacklisted"], ["deleted", "Deleted"]];
const PER = 50;
const ago = (t?: string) => { if (!t) return "—"; const d = Math.floor((Date.now() - +new Date(t)) / 86400000); return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 31 ? d + " days ago" : fmtDate(t); };
const tel = (p: string) => String(p || "").replace(/^\+961(\d{1,2})(\d{3})(\d{3})$/, "+961 $1 $2 $3");
const CCS = ["+961", "+971", "+966", "+974", "+965", "+973", "+968", "+962", "+20", "+90", "+33", "+44", "+1"];

export default function CustomersPage() {
  const [tab, setTab] = useState("all"), [q, setQ] = useState(""), [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]), [count, setCount] = useState(0), [loading, setLoading] = useState(true), [err, setErr] = useState(""), [tick, setTick] = useState(0);
  const [edit, setEdit] = useState<any>(undefined);
  useEffect(() => { let off = false; setLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await sb.rpc("skwyd_customers", { p_q: q.trim(), p_filter: tab, p_sort: "last", p_limit: PER, p_offset: (page - 1) * PER });
      if (off) return; setLoading(false);
      if (error) setErr(error.message); else { setErr(""); setRows((data as any)?.rows || []); setCount((data as any)?.count || 0); } }, q ? 250 : 0);
    return () => { off = true; clearTimeout(t); }; }, [tab, q, page, tick]);
  const cols: DTColumn<any>[] = [
    { id: "name", title: "Name", value: c => c.name || "", hideable: false, cell: c => <><span className="font-medium text-gray-900 dark:text-gray-50">{c.name || "Unnamed"}</span>{c.blacklisted && <Badge className="ms-2" variant="light" color="error">Blacklisted</Badge>}
      {(c.tags || []).length > 0 && <span className="mt-1 flex gap-1">{c.tags.map((t: string) => <Badge key={t} variant="light" color="primary">{t}</Badge>)}</span>}</> },
    { id: "phone", title: "Phone", value: c => c.phone || "", cell: c => tel(c.phone) },
    { id: "email", title: "Email", value: c => c.email || "", cell: c => c.email || "—" },
    { id: "n", title: "Total Orders", num: true, value: c => +c.n || 0 },
    { id: "last", title: "Last Order", value: c => c.last_at || "", cell: c => ago(c.last_at) },
  ];
  return (
    <>
      <PageBreadcrumb pageTitle="Customers" />
      {err ? <p className="py-6 text-sm text-red-600">Couldn't load customers: {err}</p> : (
        <DataTable<any>
          data={rows} columns={cols} getRowId={c => c.id}
          server={{ page, total: Math.max(count, (page - 1) * PER + rows.length), onPage: setPage, search: q, onSearch: v => { setQ(v); setPage(1); } }}
          searchPlaceholder="Search name or phone..."
          toolbar={<SegTabs value={tab} onChange={v => { setTab(v); setPage(1); }} items={TABS} />}
          actions={<Button className="h-[30px] py-1" onClick={() => setEdit(null)}><PlusIcon className="size-4" />Add Customer</Button>}
          onRowClick={c => openWin("/customer?id=" + c.id)}
          rowActions={[{ label: "Open", onSelect: c => openWin("/customer?id=" + c.id) }, { label: "Edit", onSelect: c => setEdit(c) }]}
          onExport={list => downloadCsv("Customers", cols.map(c => c.title), list.map(c => cols.map(x => String(x.value?.(c) ?? ""))))}
          empty={<EmptyState text={loading ? "Loading customers…" : q || tab !== "all" ? "No customers match." : "No customers yet"} />}
          pageSize={PER}
        />
      )}
      {edit !== undefined && <CustomerDialog c={edit} onClose={() => setEdit(undefined)} onSaved={() => setTick(t => t + 1)} />}
    </>
  );
}

export function CustomerDialog({ c, onClose, onSaved }: { c: any; onClose: () => void; onSaved: () => void }) {
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
  const sel = "h-9 w-full py-1.5";
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] w-full overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">{c?.id ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
        <form className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save(); }}>
          <Field className="col-span-full"><FieldLabel className="mb-1.5 block">Name <span className="text-red-500">*</span></FieldLabel><Input className="h-9" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field><FieldLabel className="mb-1.5 block">Phone Number <span className="text-red-500">*</span></FieldLabel>
            <div className="flex gap-3"><SelectNative aria-label="Country code" className={sel.replace("w-full", "w-28 shrink-0")} value={cc} onChange={e => setCc(e.target.value)}>{CCS.map(x => <option key={x}>{x}</option>)}</SelectNative>
              <Input className="h-9 flex-1" type="tel" inputMode="tel" value={num} onChange={e => setNum(e.target.value)} /></div></Field>
          <Field><FieldLabel className="mb-1.5 block">Email</FieldLabel><Input className="h-9" type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
          <Field><FieldLabel className="mb-1.5 block">Birth Date</FieldLabel><DateInput value={bday || ""} onChange={setBday} /></Field>
          <Field><FieldLabel className="mb-1.5 block">Gender</FieldLabel><SelectNative className={sel} value={gender} onChange={e => setGender(e.target.value)}><option value="">—</option><option value="male">Male</option><option value="female">Female</option></SelectNative></Field>
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
