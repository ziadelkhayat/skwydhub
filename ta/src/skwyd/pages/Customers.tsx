import { RiUploadCloud2Line } from "@remixicon/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/tremor/Dropdown";
import { parseCsv } from "../crud/CrudPage";
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
import { FilterIcon, PlusIcon } from "@/icons";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/tremor/Drawer";
import { MultiField } from "@/components/tremor/data-table/FilterSelect";
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
const CF_LBL: Record<string, string> = { name: "Name", phone: "Phone", email: "Email", tag: "Tag", orders: "Has orders", black: "Blacklisted", loyalty: "Loyalty", house: "House account" };
const YN: Record<string, string> = { yes: "Yes", no: "No" };
// Customers Filters: a Tremor side panel (the Updated after date sits outside it)
function CustFilters({ open, F, onApply, onClose }: { open: boolean; F: Record<string, string>; onApply: (f: Record<string, string>) => void; onClose: () => void }) {
  const [d, setD] = useState<Record<string, string>>({ ...F });
  useEffect(() => { if (open) setD({ ...F }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: string) => setD(x => { const n = { ...x }; if (v) n[k] = v; else delete n[k]; return n; });
  const yn = (k: string) => <MultiField key={k} label={CF_LBL[k]} value={d[k] || ""} onChange={v => set(k, v)} options={Object.entries(YN).map(([value, label]) => ({ value, label }))} />;
  const txt = (k: string, ph?: string) => <Field key={k}><FieldLabel>{CF_LBL[k]}</FieldLabel><Input placeholder={ph || ""} value={d[k] || ""} onChange={e => set(k, e.target.value)} /></Field>;
  const H = ({ t }: { t: string }) => <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t}</h3>;
  return (
    <Drawer open={open} onOpenChange={o => !o && onClose()}>
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader><DrawerTitle>Filters</DrawerTitle></DrawerHeader>
        <DrawerBody className="-mx-6 space-y-7 overflow-y-auto px-6">
          <section className="space-y-3"><H t="Find" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{txt("name")}{txt("phone", "e.g. 70123456")}{txt("email")}{txt("tag", "e.g. VIP")}</div></section>
          <section className="space-y-3"><H t="Customer" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{yn("orders")}{yn("black")}{yn("loyalty")}{yn("house")}</div></section>
        </DrawerBody>
        <DrawerFooter className="-mx-6 -mb-2 gap-2 border-t border-gray-200 px-6 pt-4 dark:border-gray-800">
          <Button variant="ghost" className="sm:me-auto" onClick={() => setD(x => (x.updated ? { updated: x.updated } : {}) as Record<string, string>)}>Reset all</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onApply(d)}>Show customers</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
const CCS = ["+961", "+971", "+966", "+974", "+965", "+973", "+968", "+962", "+20", "+90", "+33", "+44", "+1"];

export default function CustomersPage() {
  const [tab, setTab] = useState("all"), [q, setQ] = useState(""), [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]), [count, setCount] = useState(0), [loading, setLoading] = useState(true), [err, setErr] = useState(""), [tick, setTick] = useState(0);
  const [edit, setEdit] = useState<any>(undefined), [imp, setImp] = useState(false);
  const [F, setF] = useState<Record<string, string>>({}), [fOpen, setFOpen] = useState(false);
  const chips = Object.entries(F).filter(([k, v]) => k !== "updated" && String(v || "").trim()).map(([k, v]) => ({ k, l: CF_LBL[k] || k, v: v.split(",").map(x => YN[x] || x).join(", ") }));
  const nF = chips.length;
  useEffect(() => { let off = false; setLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await sb.rpc("skwyd_customers", { p_q: q.trim(), p_filter: tab, p_sort: "last", p_limit: PER, p_offset: (page - 1) * PER, p_f: Object.fromEntries(Object.entries(F).filter(([k, v]) => !(["orders", "black", "loyalty", "house"].includes(k) && v.includes(","))) ) });
      if (off) return; setLoading(false);
      if (error) setErr(error.message); else { setErr(""); setRows((data as any)?.rows || []); setCount((data as any)?.count || 0); } }, q ? 250 : 0);
    return () => { off = true; clearTimeout(t); }; }, [tab, q, page, tick, F]);
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SegTabs className="flex-wrap self-start overflow-visible" value={tab} onChange={v => { setTab(v); setPage(1); }} items={TABS} />
        <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
            <div className="w-44"><DateInput placeholder="Updated after" value={F.updated || ""} onChange={v => { setF(f => { const n = { ...f }; if (v) n.updated = v; else delete n.updated; return n; }); setPage(1); }} /></div>
            <Button variant={nF ? "secondary" : "outline"} className="h-[30px] py-1" onClick={() => setFOpen(true)}><FilterIcon className="size-4" />Filters{nF ? <Badge variant="solid" color="primary" className="ms-1">{nF}</Badge> : null}</Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="secondary" className="h-[30px] py-1"><RiUploadCloud2Line className="size-4" aria-hidden="true" />Import / Export</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48"><DropdownMenuItem onSelect={() => setImp(true)}>Import customers</DropdownMenuItem><DropdownMenuItem onSelect={() => exportCustomers()}>Export customers</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Button className="h-[30px] py-1" onClick={() => setEdit(null)}><PlusIcon className="size-4" />Add Customer</Button></div>
      </div>
      {chips.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {chips.map(c => <span key={c.k} className="flex items-center gap-1 rounded-md bg-gray-100 py-1 ps-2.5 pe-1 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">{c.l}: <b className="font-semibold">{c.v}</b>
          <button type="button" aria-label={"Remove " + c.l + " filter"} className="rounded px-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800" onClick={() => { setF(f => { const n = { ...f }; delete n[c.k]; return n; }); setPage(1); }}>×</button></span>)}
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setF(f => (f.updated ? { updated: f.updated } : {}) as Record<string, string>); setPage(1); }}>Clear all</Button>
      </div>}
      <CustFilters open={fOpen} F={F} onApply={f => { setF(f); setPage(1); setFOpen(false); }} onClose={() => setFOpen(false)} />
      {err ? <p className="py-6 text-sm text-red-600">Couldn't load customers: {err}</p> : (
        <DataTable<any>
          data={rows} columns={cols} getRowId={c => c.id}
          server={{ page, total: Math.max(count, (page - 1) * PER + rows.length), onPage: setPage, search: q, onSearch: v => { setQ(v); setPage(1); } }}
          searchPlaceholder={false}
          onRowClick={c => openWin("/customer?id=" + c.id)}
          rowActions={[{ label: "Open", onSelect: c => openWin("/customer?id=" + c.id) }, { label: "Edit", onSelect: c => setEdit(c) }]}
          searchEnd
          hideView
          empty={<EmptyState text={loading ? "Loading customers…" : q || tab !== "all" ? "No customers match." : "No customers yet"} />}
          pageSize={PER}
        />
      )}
      {imp && <CustImport onClose={() => setImp(false)} onDone={() => setTick(t => t + 1)} />}
      {edit !== undefined && <CustomerDialog c={edit} onClose={() => setEdit(undefined)} onSaved={() => setTick(t => t + 1)} />}
    </>
  );
}

/* ---------- Import / Export (CSV) ---------- */
const CUST_HEAD = ["Name", "Phone", "Email", "Birth Date", "Gender", "Notes", "Tags", "Blacklisted", "Loyalty", "House Account", "House Limit"];
const yn = (v: string) => !/^(no|false|0|n|)$/i.test(v.trim());
/** +961 70 123 456, 0096170123456, 70123456 (Lebanon by default) → +96170123456 */
function normPhone(v: string) {
  const t = v.trim(); if (!t) return "";
  if (t.startsWith("+")) return "+" + t.slice(1).replace(/\D/g, "");
  const d = t.replace(/\D/g, ""); if (d.startsWith("00")) return "+" + d.slice(2);
  if (d.startsWith("961") && d.length >= 10) return "+" + d;
  return "+961" + d.replace(/^0+/, "");
}
function normDate(v: string): string | null | false {
  const t = v.trim(); if (!t) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return false;
}
async function exportCustomers() {
  const all: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("customers").select("name,phone,email,birthday,gender,notes,tags,blacklisted,loyalty,house_account,house_limit").is("deleted_at", null).order("created_at").range(from, from + 999);
    if (error) return toast("Couldn't export: " + error.message, "error");
    all.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  downloadCsv("Customers", CUST_HEAD, all.map(c => [c.name || "", c.phone || "", c.email || "", c.birthday || "", c.gender || "", c.notes || "", (c.tags || []).join("; "),
    c.blacklisted ? "Yes" : "No", c.loyalty ? "Yes" : "No", c.house_account ? "Yes" : "No", c.house_limit ?? ""]));
}
function CustImport({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [plan, setPlan] = useState<{ rows: any[]; errs: string[]; nNew: number } | null>(null), [busy, setBusy] = useState(false), [file, setFile] = useState(""), [done, setDone] = useState(0);
  async function pick(f?: File) {
    if (!f) return; setFile(f.name);
    const t = parseCsv(await f.text()); if (t.length < 2) return setPlan({ rows: [], errs: ["The file has no rows under the header."], nNew: 0 });
    const head = t[0].map(h => h.trim().toLowerCase()), has = (h: string) => head.includes(h);
    if (!has("phone")) return setPlan({ rows: [], errs: ["The file needs a Phone column."], nNew: 0 });
    const have = new Set<string>();
    for (let from = 0; ; from += 1000) { const { data } = await sb.from("customers").select("phone").range(from, from + 999); (data || []).forEach((r: any) => have.add(r.phone)); if (!data || data.length < 1000) break; }
    const rows: any[] = [], errs: string[] = [], seen = new Set<string>(); let nNew = 0;
    t.slice(1).forEach((r, i) => {
      const v: Record<string, string> = Object.fromEntries(head.map((h, j) => [h, String(r[j] ?? "").trim()])), at = `Row ${i + 2}: `;
      const phone = normPhone(v.phone || ""); if (phone.replace(/\D/g, "").length < 7) return errs.push(at + `Phone "${v.phone}" isn't valid.`);
      if (seen.has(phone)) return errs.push(at + `${phone} is already earlier in the file.`); seen.add(phone);
      const isNew = !have.has(phone); if (isNew && !v.name) return errs.push(at + "Name is missing for a new customer.");
      const row: any = { phone, updated_at: new Date().toISOString() };
      if (has("name") && (v.name || !isNew)) row.name = v.name || null;
      if (has("email")) row.email = v.email || null;
      if (has("birth date")) { const d = normDate(v["birth date"]); if (d === false) return errs.push(at + `Birth date "${v["birth date"]}" isn't a date (use 2026-01-31 or 31/01/2026).`); row.birthday = d; }
      if (has("gender")) { const g = v.gender.toLowerCase(); row.gender = g.startsWith("m") ? "male" : g.startsWith("f") ? "female" : null; }
      if (has("notes")) row.notes = v.notes || null;
      if (has("tags")) row.tags = v.tags ? v.tags.split(/[;|]/).map(x => x.trim()).filter(Boolean) : [];
      if (has("blacklisted")) row.blacklisted = yn(v.blacklisted);
      if (has("loyalty")) row.loyalty = yn(v.loyalty);
      if (has("house account")) row.house_account = yn(v["house account"]);
      if (has("house limit")) { if (v["house limit"] && isNaN(+v["house limit"])) return errs.push(at + `House limit "${v["house limit"]}" isn't a number.`); row.house_limit = v["house limit"] ? +v["house limit"] : null; }
      if (isNew) nNew++; rows.push({ row, isNew });
    });
    setPlan({ rows, errs, nNew });
  }
  async function run() {
    if (!plan) return; setBusy(true); let k = 0;
    try {
      // new customers in batches; existing ones one by one, so only the columns in the file change
      const add = plan.rows.filter(x => x.isNew).map(x => ({ tags: [], addresses: [], ...x.row }));
      for (let i = 0; i < add.length; i += 500) { const { error } = await sb.from("customers").insert(add.slice(i, i + 500)); if (error) throw error; k += Math.min(500, add.length - i); setDone(k); }
      for (const x of plan.rows.filter(x => !x.isNew)) { const { phone, ...upd } = x.row; const { error } = await sb.from("customers").update(upd).eq("phone", phone); if (error) throw error; setDone(++k); }
      toast(`${k} customer${k === 1 ? "" : "s"} imported`); onDone(); onClose();
    } catch (e: any) { toast((e?.message || "Couldn't import") + ` (stopped after ${k})`, "error"); } finally { setBusy(false); }
  }
  const n = plan?.rows.length || 0;
  return (
    <Dialog open onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="w-full p-6 sm:max-w-xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">Import customers</DialogTitle></DialogHeader>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">A CSV file with these columns: {CUST_HEAD.join(", ")}. Only Phone is required. A phone that's already a customer updates that customer (only the columns in the file); new phones are added. Tags are separated by ";".</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-50 dark:hover:bg-gray-900">
            <RiUploadCloud2Line className="size-4" aria-hidden="true" />{file || "Choose a CSV file"}<input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => pick(e.target.files?.[0])} /></label>
          <Button type="button" variant="ghost" onClick={() => downloadCsv("Customers template", CUST_HEAD, [])}>Download template</Button>
        </div>
        {plan && <div className="mt-5 space-y-3 text-sm">
          <p className="text-gray-900 dark:text-gray-50"><b>{plan.nNew}</b> to add · <b>{n - plan.nNew}</b> to change{plan.errs.length ? <> · <b className="text-red-500">{plan.errs.length}</b> with problems (skipped)</> : null}</p>
          {plan.errs.length > 0 && <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {plan.errs.slice(0, 100).map((e, i) => <li key={i}>{e}</li>)}{plan.errs.length > 100 && <li>…and {plan.errs.length - 100} more</li>}</ul>}
        </div>}
        <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={busy || !n} onClick={run}>{busy ? `Importing ${done}/${n}…` : `Import ${n || ""} customers`}</Button>
        </div>
      </DialogContent>
    </Dialog>);
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
