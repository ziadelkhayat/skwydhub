import { Card } from "@/components/tremor/Card";
import { ChoiceButton } from "../ui/Choice";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
import { SelectNative } from "@/components/tremor/SelectNative";
// A Skwyd list page in TailAdmin style: title + breadcrumb, one card (tabs · search · add button), table, pages, and a dialog to add or edit.
// Driven by the same kind of config as the current portal (CRUD in index.html): tabs, columns, fields, unique name, prep.
import { Suspense } from "react";
import { openWin } from "@/lib/util";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Input as TInput } from "@/components/tremor/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon } from "@/icons";
import { put, softDelete, newId, useCol, type Row } from "@/lib/db";
import { cn } from "@/utils";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { ImageField } from "../ui/ImageField";
import { DateInput } from "../ui/DateInput";
import { EmptyState } from "../ui/EmptyState";
import { Pager } from "../ui/Pager";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

export type Opt = [string, string];
export type S = Record<string, Row[]>;
export type CField = {
  k: string; l: string; t?: "text" | "number" | "select" | "textarea" | "chk" | "multi" | "items" | "image" | "head" | "date" | "phone" | "pin";
  req?: boolean; ph?: string; note?: string; full?: boolean; lockEdit?: boolean; def?: any;
  opts?: (s: S) => Opt[]; auto?: (s: S) => any; when?: { k: string; is: any }; hideIf?: (r: Row | null, s: S) => boolean;
};
export type CCol = { h: string; cell: (r: Row, s: S) => ReactNode; num?: boolean };
export type CrudCfg = {
  col: string; title: string; one: string; needs?: string[]; addLbl?: string;
  tabs: [string, string, (r: Row) => boolean][];
  sort?: (a: Row, b: Row) => number; search?: (r: Row, s: S) => string;
  cols: CCol[]; fields: CField[]; unique?: string; note?: string;
  prep?: (data: Record<string, any>, id: string | null, s: S) => Promise<string | void> | string | void;
  canDelete?: (r: Row, s: S) => string;
  detail?: string;   // open rows on their own page (path?id=)
  form?: (p: { s: S; row: Row | null; onClose: () => void }) => ReactNode;   // a page of its own form instead of the generic one
  urlFilter?: [string, string];
  saved?: (old: Row | null, data: Record<string, any>) => Promise<void> | void;   // after saving (e.g. update the employee app login)   // e.g. ["cat", "categoryId"]: /products?cat=… shows one category
};

export const live = (r: Row) => !r.deleted;
const PER = 20;

/** load several collections at once (each stays live) */
export function useS(names: string[]): S | null {
  const out: S = {}; let ready = true;
  for (const n of names) { const rows = useCol(n); if (!rows) ready = false; out[n] = rows || []; } // eslint-disable-line react-hooks/rules-of-hooks
  return ready ? out : null;
}

export default function CrudPage({ cfg }: { cfg: CrudCfg }) {
  const s = useS([cfg.col, ...(cfg.needs || [])]);
  const [tab, setTab] = useState(cfg.tabs[0][0]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Row | null | undefined>(undefined);   // undefined = closed, null = new
  const [sp, setSp] = useSearchParams();
  const uf = cfg.urlFilter && sp.get(cfg.urlFilter[0]);

  const list = useMemo(() => {
    if (!s) return [];
    const f = cfg.tabs.find(t => t[0] === tab)?.[2] || live;
    const needle = q.trim().toLowerCase();
    return s[cfg.col].filter(f).filter(r => !uf || r[cfg.urlFilter![1]] === uf).filter(r => !needle || (cfg.search ? cfg.search(r, s) : String(r.name || "")).toLowerCase().includes(needle))
      .sort(cfg.sort || ((a, b) => String(a.name || "").localeCompare(String(b.name || ""))));
  }, [s, tab, q, cfg, uf]);
  const pages = Math.max(1, Math.ceil(list.length / PER)), cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PER, cur * PER);

  return (
    <>
      <PageBreadcrumb pageTitle={cfg.title} />
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <SegTabs value={tab} onChange={v => { setTab(v); setPage(1); }} items={cfg.tabs.map(t => [t[0], t[1]])} />
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <TInput type="search" className="flex-1 sm:w-75 sm:flex-initial" inputClassName="h-9 py-1.5" placeholder="Search..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
            <Button onClick={() => setEdit(null)}><PlusIcon className="size-5" />{cfg.addLbl || "Add " + cfg.one}</Button>
          </div>
        </div>
        {uf && <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-600 sm:px-6 dark:border-gray-800 dark:text-gray-400">Filtered to one {cfg.urlFilter![0] === "mod" ? "modifier" : "category"}{cfg.urlFilter![0] === "icat" ? ": " + uf : ""}.<Button type="button" variant="link" className="" onClick={() => setSp({})}>Show all</Button></div>}
        {cfg.note && <p className="border-t border-gray-100 px-5 py-3 text-sm text-gray-500 sm:px-6 dark:border-gray-800 dark:text-gray-400">{cfg.note}</p>}
        <div className="max-w-full overflow-x-auto border-t border-gray-200 dark:border-gray-800">
          {!s ? <div className="p-10 text-center text-sm text-gray-500">Loading…</div>
            : !list.length ? <EmptyState text={q ? "Nothing matches." : tab === cfg.tabs[0][0] ? `No ${cfg.title.toLowerCase()} yet.` : "Nothing here."} />
            : <Table className="min-w-full">
              <TableHead className="border-b border-gray-200 dark:border-gray-800"><TableRow>
                {cfg.cols.map(c => <TableHeaderCell key={c.h} className={cn("border-b border-gray-200 px-4 py-3 text-start text-sm font-semibold whitespace-nowrap text-gray-900 dark:border-gray-800 dark:text-gray-50", c.num && "text-end")}>{c.h}</TableHeaderCell>)}
              </TableRow></TableHead>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
                {shown.map(r => (
                  <TableRow key={r.id} onClick={() => cfg.detail ? openWin(cfg.detail + "?id=" + r.id) : setEdit(r)} className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/2">
                    {cfg.cols.map(c => <TableCell key={c.h} className={cn("px-4 py-2.5 text-sm whitespace-nowrap text-gray-600 dark:text-gray-400", c.num && "text-end")}>{c.cell(r, s)}</TableCell>)}
                  </TableRow>))}
              </TableBody>
            </Table>}
        </div>
        {list.length > PER && <Pager className="border-t border-gray-200 dark:border-gray-800" currentPage={cur} totalPages={pages} onPageChange={setPage} />}
      </Card>
      {edit !== undefined && s && (cfg.form ? <Suspense fallback={null}>{cfg.form({ s, row: edit, onClose: () => setEdit(undefined) })}</Suspense> : <EditDialog cfg={cfg} s={s} row={edit} onClose={() => setEdit(undefined)} />)}
    </>
  );
}

export function EditDialog({ cfg, s, row, onClose }: { cfg: CrudCfg; s: S; row: Row | null; onClose: () => void }) {
  const init = () => { const d: Record<string, any> = {};
    for (const f of cfg.fields) { if (f.t === "head") continue; d[f.k] = row ? (row[f.k] ?? f.def ?? (f.t === "chk" ? false : f.t === "multi" || f.t === "items" ? [] : "")) : f.auto ? f.auto(s) : f.def ?? (f.t === "chk" ? false : f.t === "multi" || f.t === "items" ? [] : ""); }
    return d; };
  const [d, setD] = useState<Record<string, any>>(init);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setD(p => ({ ...p, [k]: v }));
  const vis = (f: CField) => !(f.hideIf && f.hideIf(row, s)) && (!f.when || d[f.when.k] === f.when.is);

  async function save() {
    setErr("");
    for (const f of cfg.fields) if (f.req && vis(f) && f.t !== "head" && (d[f.k] === "" || d[f.k] == null || (Array.isArray(d[f.k]) && !d[f.k].length))) return setErr(`${f.l} is required.`);
    if (cfg.unique && s[cfg.col].some(r => live(r) && r.id !== row?.id && String(r[cfg.unique!] || "").trim().toLowerCase() === String(d[cfg.unique!] || "").trim().toLowerCase())) return setErr(`Another ${cfg.one.toLowerCase()} has this name.`);
    const data: Record<string, any> = {};
    for (const f of cfg.fields) if (f.t !== "head" && (vis(f) || !row)) data[f.k] = f.t === "number" ? (d[f.k] === "" || d[f.k] == null ? null : +d[f.k]) : f.t === "date" ? (d[f.k] || null) : typeof d[f.k] === "string" ? d[f.k].trim() : d[f.k];
    setBusy(true);
    try {
      const msg = cfg.prep ? await cfg.prep(data, row?.id || null, s) : ""; if (msg) return setErr(msg);
      const id = row?.id || data.id || newId(cfg.col.slice(0, 3)); delete data.id;
      await put(cfg.col, id, row ? data : { ...data, deleted: false });
      try { await cfg.saved?.(row, { ...data, id }); } catch (e: any) { toast(e?.message || "Saved, but the login couldn't be updated.", "error"); }
      toast(row ? `${cfg.one} saved` : `${cfg.one} added`); onClose();
    } catch (e: any) { setErr(e?.message || "Couldn't save."); } finally { setBusy(false); }
  }
  async function del(on: boolean) {
    const why = on && cfg.canDelete ? cfg.canDelete(row!, s) : ""; if (why) return setErr(why);
    setBusy(true); try { await softDelete(cfg.col, row!.id, on); toast(on ? `${cfg.one} deleted` : `${cfg.one} restored`, on ? "error" : "success"); onClose(); } catch (e: any) { setErr(e?.message || "Couldn't save."); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-0 sm:max-w-2xl">
        <div>
          <div className="p-6 sm:p-8">
            <DialogHeader className="gap-1 sm:gap-2">
              <DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">{row ? (row.name ? `Edit ${row.name}` : `Edit ${cfg.one}`) : `Add ${cfg.one}`}</DialogTitle>
              {cfg.note && <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">{cfg.note}</DialogDescription>}
            </DialogHeader>
            <form className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save(); }} noValidate>
              {cfg.fields.filter(vis).map((f, i) => f.t === "head"
                ? <h4 key={"h" + i} className="col-span-full mt-2 text-base font-medium text-gray-900 dark:text-gray-50">{f.l}</h4>
                : <FieldBox key={f.k} f={f} v={d[f.k]} set={v => set(f.k, v)} s={s} locked={!!(row && f.lockEdit)} />)}
              {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
              <div className="col-span-full flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                {row && (row.deleted
                  ? <Button type="button" variant="outline" className="sm:me-auto" disabled={busy} onClick={() => del(false)}>Restore</Button>
                  : <Button type="button" variant="outline" className="text-red-500 sm:me-auto" disabled={busy} onClick={() => del(true)}>Delete</Button>)}
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldBox({ f, v, set, s, locked }: { f: CField; v: any; set: (v: any) => void; s: S; locked: boolean }) {
  const full = f.full || f.t === "textarea" || f.t === "multi" || f.t === "items" || f.t === "image";
  const label = <FieldLabel className="mb-1.5 block">{f.l}{f.req && <span className="text-red-500"> *</span>}</FieldLabel>;
  const note = f.note && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{f.note}</p>;
  if (f.t === "chk") return (
    <Field orientation="horizontal" className={cn("items-center gap-3", full && "col-span-full")}>
      <Switch checked={!!v} onCheckedChange={c => set(!!c)} disabled={locked} />
      <FieldLabel className="cursor-pointer text-sm font-normal text-gray-700 dark:text-gray-400">{f.l}</FieldLabel>
    </Field>);
  if (f.t === "select") { const opts = f.opts ? f.opts(s) : [];
    return (<Field className={cn(full && "col-span-full")}>{label}
      <Select value={v || null} onValueChange={x => set(x ?? "")} disabled={locked} items={opts.map(([value, l]) => ({ value, label: l }))}>
        <SelectTrigger className="h-9 w-full"><SelectValue placeholder={f.ph || "Choose..."} /></SelectTrigger>
        <SelectContent>{opts.map(([value, l]) => <SelectItem key={value} value={value}>{l}</SelectItem>)}</SelectContent>
      </Select>{note}</Field>); }
  if (f.t === "multi") { const opts = f.opts ? f.opts(s) : [], cur: string[] = Array.isArray(v) ? v : [];
    return (<Field className="col-span-full">{label}
      <div className="flex flex-wrap gap-2">{opts.map(([value, l]) => { if (value.startsWith("@")) return <h5 key={value} className="mt-3 w-full text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">{value.slice(1)}</h5>; const on = cur.includes(value);
        return <ChoiceButton on={on} key={value} onClick={() => set(on ? cur.filter(x => x !== value) : [...cur, value])}
          >{l}</ChoiceButton>; })}</div>{note}</Field>); }
  if (f.t === "items") { const cur: string[] = Array.isArray(v) ? v : [];
    return (<Field className="col-span-full">{label}
      <div className="flex flex-col gap-2">{[...cur, ""].map((x, i) => (
        <Input key={i} className="h-9" value={x} placeholder={i === cur.length ? "Add an option" : ""} onChange={e => { const n = [...cur]; if (i === cur.length) n.push(e.target.value); else n[i] = e.target.value; set(n.filter((y, j) => y !== "" || j < n.length - 1)); }} />))}</div>{note}</Field>); }
  if (f.t === "phone") { const CCS = ["+961", "+971", "+966", "+974", "+965", "+973", "+968", "+962", "+20", "+90", "+33", "+44", "+1"]; const str = String(v || ""); const cc = CCS.find(x => str.startsWith(x)) || "+961"; const num = str.startsWith(cc) ? str.slice(cc.length) : str;
    const mk = (c: string, n: string) => { const d = n.replace(/\D/g, "").replace(/^0+/, ""); return d ? c + d : ""; };
    return (<Field className={cn(full && "col-span-full")}>{label}
      <div className="flex gap-3"><SelectNative aria-label="Country code" value={cc} onChange={e => set(mk(e.target.value, num))} className="h-9 w-28 shrink-0 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-xs focus:border-blue-300 focus:ring-3 focus:ring-blue-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50">{CCS.map(c => <option key={c}>{c}</option>)}</SelectNative>
        <Input className="h-9 flex-1" type="tel" inputMode="tel" placeholder={f.ph || "70 123 456"} value={num} onChange={e => set(mk(cc, e.target.value))} /></div>{note}</Field>); }
  if (f.t === "pin") return (<Field className={cn(full && "col-span-full")}>{label}
    <div className="flex gap-3"><Input className="h-9 flex-1 tracking-widest" inputMode="numeric" maxLength={5} placeholder={f.ph || "5 digits"} value={v || ""} onChange={e => set(e.target.value.replace(/\D/g, "").slice(0, 5))} />
      <Button type="button" variant="outline" className="h-9" onClick={() => set(String(Math.floor(10000 + Math.random() * 90000)))}>Generate</Button></div>{note}</Field>);
  if (f.t === "date") return (<Field className={cn(full && "col-span-full")}>{label}<DateInput value={v || ""} onChange={set} />{note}</Field>);
  if (f.t === "textarea") return (<Field className="col-span-full">{label}<Textarea rows={4} value={v || ""} placeholder={f.ph} onChange={e => set(e.target.value)} />{note}</Field>);
  if (f.t === "image") return (<Field className="col-span-full">{label}
    <ImageField value={v || ""} onChange={set} />{note}</Field>);
  return (<Field className={cn(full && "col-span-full")}>{label}
    <Input className="h-9" type={f.t === "number" ? "number" : "text"} inputMode={f.t === "number" ? "decimal" : undefined} value={v ?? ""} placeholder={f.ph || (f.req ? "Required" : "Optional")} disabled={locked} onChange={e => set(e.target.value)} />{note}</Field>);
}
