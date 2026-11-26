import { Searchbar } from "@/components/tremor/Searchbar";
import { Label } from "@/components/tremor/Label";
import { Card } from "@/components/tremor/Card";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
import { SelectNative } from "@/components/tremor/SelectNative";
// Employee Management → Knowledge Base: folders of texts, links and files (private "kb" bucket), assigned to roles, stores or employees,
// read in the SKWYD apps; read statistics; the editor and the three assignment steps. Same data and rules as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Input as TInput } from "@/components/tremor/Input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArchiveIcon, ArrowLeftIcon, FileIcon, FolderIcon, GearIcon, LinkIcon, PencilIcon, PieChartIcon, PlusIcon, TextIcon, TrashBinIcon, UserIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { put, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { cn } from "@/utils";
import { useRef, useState } from "react";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { EmptyState } from "../ui/EmptyState";
import { F, SEL, TD, TH, TR } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";
import { dmy, who } from "./em";

type Item = { id: string; kind: string; parent: string; name?: string; url?: string; body?: string; path?: string; type?: string; size?: number };
const CATS = ["Policies", "Guides", "Recipes", "Training", "Safety", "Other"];
const isAdminRow = (r: Row) => r.role === "owner" || r.role === "admin";
const roleIds = (u: Row) => (u?.roleIds || []).length ? u.roleIds : (u?.roleId ? [u.roleId] : []);
const itemsOf = (a?: Row | null): Item[] => (a?.files || []).map((f: any, i: number) => ({ ...f, id: f.id || "f" + i, kind: f.kind || "file", parent: f.parent || "" }));
const kids = (items: Item[], p: string) => items.filter(x => x.parent === p).sort((a, b) => +(a.kind !== "folder") - +(b.kind !== "folder"));
const ICO: Record<string, React.ReactNode> = { folder: <FolderIcon className="size-5 text-amber-500" />, text: <TextIcon className="size-5 text-blue-500" />, link: <LinkIcon className="size-5 text-green-600" />, file: <FileIcon className="size-5 text-pink-500" /> };
const COLS = ["#f59e0b", "#3b82f6", "#e11d48", "#7c3aed", "#0ea5e9", "#ec4899", "#16a34a", "#ea580c"];
const Av = ({ n }: { n?: string }) => <span title={n} className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white dark:ring-gray-900" style={{ background: COLS[[...String(n || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 8] }}>{String(n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()}</span>;
const St = ({ a }: { a: Row }) => a.archived ? <Badge variant="light" color="light">Archived</Badge> : a.status === "draft" ? <Badge variant="light" color="warning">Draft</Badge> : <Badge variant="light" color="success">Published</Badge>;
// who it is given to: picked employees, or employees with one of the roles at one of the stores (nothing picked = everyone)
const audience = (s: S, a: Record<string, any>) => { const rs = a.roleIds || [], bs = a.branchIds || [], es = a.employeeIds || [], byGroup = !es.length || rs.length || bs.length;
  return s.users.filter(u => live(u) && u.active !== false && !isAdminRow(u) && (es.includes(u.id) || (byGroup && (!rs.length || roleIds(u).some((r: string) => rs.includes(r))) && (!bs.length || !(u.branchIds || []).length || (u.branchIds || []).some((b: string) => bs.includes(b)))))); };
/** the article text: ## heading, ### small heading, - list item, **bold** */
const Body = ({ t }: { t?: string }) => <div className="space-y-1 text-sm leading-6 text-gray-700 dark:text-gray-300">{String(t || "").split("\n").map((l, i) => {
  const b = (x: string) => x.split(/\*\*(.+?)\*\*/g).map((p, j) => j % 2 ? <b key={j}>{p}</b> : p);
  return l.startsWith("### ") ? <h5 key={i} className="font-semibold text-gray-900 dark:text-gray-50">{b(l.slice(4))}</h5> : l.startsWith("## ") ? <h4 key={i} className="text-base font-semibold text-gray-900 dark:text-gray-50">{b(l.slice(3))}</h4>
    : l.startsWith("- ") ? <li key={i} className="ms-5 list-disc">{b(l.slice(2))}</li> : l ? <p key={i}>{b(l)}</p> : <br key={i} />; })}</div>;
let CO: string | null = null;
const company = async () => { if (CO) return CO; const r = await sb.rpc("skwyd_company"); if (r.error || !r.data) throw r.error || new Error("no company"); return CO = r.data as string; };
const openFile = async (path?: string) => { if (!path) return; const w = window.open("", "_blank"); try { const { data, error } = await sb.storage.from("kb").createSignedUrl(path, 600); if (error) throw error; if (w) w.location = data.signedUrl; else location.href = data.signedUrl; } catch { w?.close(); toast("Couldn't open the file.", "error"); } };

export default function KnowledgePage() {
  const s = useS(["kb_articles", "kb_reads", "users", "roles", "branches"]), { staff } = useAuth();
  const [tab, setTab] = useState("active"), [q, setQ] = useState(""), [open, setOpen] = useState(""), [ed, setEd] = useState<{ a: Row | null; step: number } | null>(null);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const all = s.kb_articles.filter(a => !a.deleted), uName = (id: string) => s.users.find(u => u.id === id)?.name || "—";
  const views = (id: string) => s.kb_reads.filter(r => r.articleId === id).reduce((a, r) => a + (+r.views || 1), 0);
  if (ed) return <Editor s={s} a={ed.a} step0={ed.step} by={who(staff)} me={staff} onDone={id => { setEd(null); if (id) setOpen(id); }} />;
  const o = all.find(a => a.id === open);
  if (o) return <Detail s={s} a={o} uName={uName} back={() => setOpen("")} edit={() => setEd({ a: o, step: 0 })} assign={() => setEd({ a: o, step: 1 })} />;
  const act = all.filter(a => !a.archived), arc = all.filter(a => a.archived), qq = q.trim().toLowerCase();
  const rows = (tab === "archived" ? arc : act).filter(a => !qq || String(a.title).toLowerCase().includes(qq)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return (
    <>
      <PageBreadcrumb pageTitle="Knowledge Base" />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-x-6">
          <SegTabs value={tab} onChange={setTab} items={[["active", `Active (${act.length})`], ["archived", `Archived (${arc.length})`]]} />
          <div className="flex w-full flex-col gap-2 sm:w-fit sm:flex-row sm:items-center"><Searchbar type="search" className="w-full sm:max-w-[250px] sm:[&>input]:h-[30px]" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
            <Button onClick={() => setEd({ a: null, step: 0 })}><PlusIcon className="size-5" />Add New</Button></div>
        </div>
        <div className="relative overflow-x-auto">
          {!rows.length ? <EmptyState text={tab === "archived" ? "Nothing archived." : all.length ? "Nothing matches." : "No knowledge base yet. Press Add New to make your first one."} />
            : <Table className="min-w-full"><TableHead><TableRow className="border-y border-gray-200 dark:border-gray-800"><TableHeaderCell className={TH}>Name</TableHeaderCell><TableHeaderCell className={TH}>Status</TableHeaderCell><TableHeaderCell className={TH + " text-end"}>Views</TableHeaderCell>{["Assign To", "Created By", "Administrated By", "Date Created"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}<TableHeaderCell className={TH} /></TableRow></TableHead>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{rows.map(a => { const n = audience(s, a).length; return (
                <TableRow key={a.id} className={TR} onClick={() => setOpen(a.id)}>
                  <TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{a.title}</TableCell><TableCell className={TD}><St a={a} /></TableCell><TableCell className={TD + " text-end"}>{views(a.id)}</TableCell>
                  <TableCell className={TD}><Badge variant="light" color="primary">{n} employee{n === 1 ? "" : "s"}</Badge></TableCell><TableCell className={TD}><span className="flex items-center gap-2"><Av n={a.createdBy} />{a.createdBy || "—"}</span></TableCell>
                  <TableCell className={TD}><span className="flex -space-x-2">{(a.adminIds || []).map((id: string) => <Av key={id} n={uName(id)} />)}{!(a.adminIds || []).length && "—"}</span></TableCell><TableCell className={TD}>{dmy(a.createdAt)}</TableCell>
                  <TableCell className={TD + " text-end"} onClick={e => e.stopPropagation()}><div className="flex justify-end gap-1">
                    <Button size="icon-sm" variant="ghost" title={a.archived ? "Restore" : "Archive"} onClick={async () => { try { await put("kb_articles", a.id, { archived: !a.archived }); toast(a.archived ? "Restored" : "Archived · the apps no longer show it"); } catch { toast("Couldn't save.", "error"); } }}><ArchiveIcon className="size-4.5" /></Button>
                    <Button size="icon-sm" variant="ghost" title="Delete" onClick={async () => { if (!(await askYes(`Delete ${a.title}? Employees will no longer see it.`, "Delete", true))) return; try { await put("kb_articles", a.id, { deleted: true }); toast("Deleted"); } catch { toast("Couldn't delete.", "error"); } }}><TrashBinIcon className="size-4.5" /></Button></div></TableCell>
                </TableRow>); })}</TableBody></Table>}
        </div>
      </div>
    </>
  );
}

function Detail({ s, a, uName, back, edit, assign }: { s: S; a: Row; uName: (id: string) => string; back: () => void; edit: () => void; assign: () => void }) {
  const [node, setNode] = useState(""), [dq, setDq] = useState("");
  const items = itemsOf(a), aud = audience(s, a), rd = s.kb_reads.filter(r => r.articleId === a.id), byU = Object.fromEntries(rd.map(r => [r.staffId, r])), mon = new Date().toISOString().slice(0, 7);
  const viewed = aud.filter(u => byU[u.id]).length, vm = aud.filter(u => String(byU[u.id]?.lastViewedAt || byU[u.id]?.readAt || "").slice(0, 7) === mon).length, pc = (n: number) => aud.length ? Math.round(n * 100 / aud.length) : 0;
  const Ring = ({ p, c }: { p: number; c: string }) => <span className="relative flex size-16 items-center justify-center rounded-full" style={{ background: `conic-gradient(${c} ${p * 3.6}deg,#eef0f4 0)` }}><i className="flex size-12 items-center justify-center rounded-full bg-white text-sm font-semibold not-italic text-gray-800 dark:bg-gray-900 dark:text-gray-50">{p}%</i></span>;
  const tree = (p: string, d: number): React.ReactNode => kids(items, p).filter(x => x.kind === "folder").map(f => <div key={f.id}>
    <button type="button" onClick={() => setNode(f.id)} style={{ paddingInlineStart: 14 + d * 18 }} className={cn("flex w-full items-center gap-2 rounded-lg py-2 pe-3 text-start text-sm", node === f.id ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/3")}>{ICO.folder}{f.name}</button>{tree(f.id, d + 1)}</div>);
  const Prev = ({ x }: { x: Item }) => x.kind === "folder" ? <Card asChild className="flex w-full items-center gap-3 p-4 text-start transition hover:border-blue-500"><button type="button" onClick={() => setNode(x.id)} >{ICO.folder}<b className="font-medium text-gray-900 dark:text-gray-50">{x.name}</b><span className="ms-auto text-xs text-gray-500">{kids(items, x.id).length} items</span></button></Card>
    : x.kind === "text" ? <div className="rounded-md border border-gray-200 p-4 dark:border-gray-800"><div className="mb-2 flex items-center gap-2">{ICO.text}<b className="font-medium text-gray-900 dark:text-gray-50">{x.name || "Text"}</b></div><Body t={x.body} /></div>
    : x.kind === "link" ? <a href={/^https?:\/\//i.test(x.url || "") ? x.url : "https://" + (x.url || "")} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-md border border-gray-200 p-4 hover:border-blue-300 dark:border-gray-800">{ICO.link}<b className="font-medium text-gray-900 dark:text-gray-50">{x.name || x.url}</b><span className="ms-auto truncate text-xs text-gray-500">{x.url}</span></a>
    : <Card asChild className="flex w-full items-center gap-3 p-4 text-start transition hover:border-blue-500"><button type="button" onClick={() => openFile(x.path)} >{ICO.file}<b className="font-medium text-gray-900 dark:text-gray-50">{x.name}</b><span className="ms-auto text-xs text-gray-500">{x.size ? (x.size / 1048576).toFixed(1) + " MB" : ""}</span></button></Card>;
  const cur = items.find(x => x.id === node);
  return (
    <>
      <PageBreadcrumb pageTitle={a.title} />
      <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3"><Button variant="outline" size="icon" aria-label="Back" onClick={back}><ArrowLeftIcon className="size-5" /></Button><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{a.title}</h3><St a={a} /></div>
        <span className="flex -space-x-2">{(a.adminIds || []).map((id: string) => <Av key={id} n={uName(id)} />)}</span>
        <div className="flex gap-3"><Button onClick={edit}><PencilIcon className="size-4.5" />Edit</Button><Button variant="outline" onClick={assign}><UserIcon className="size-4.5" />Edit Assignments</Button></div>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-[#090E1A]">
          <button type="button" onClick={() => setNode("")} className={cn("mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-medium", !node ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300")}><PieChartIcon className="size-5" />Overall Statistics</button>
          <button type="button" onClick={() => setNode("__root")} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-semibold", node === "__root" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10" : "text-gray-800 hover:bg-gray-50 dark:text-gray-50")}>{ICO.folder}{a.title}</button>
          {tree("", 1)}
        </aside>
        <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-[#090E1A]">
          {node === "__root" || cur ? <><h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-50">{ICO[cur?.kind || "folder"]}{cur ? cur.name || cur.url : a.title}</h4>
            <div className="space-y-3">{node === "__root" && a.body && <div className="rounded-md border border-gray-200 p-4 dark:border-gray-800"><Body t={a.body} /></div>}
              {(node === "__root" ? kids(items, "") : cur!.kind === "folder" ? kids(items, cur!.id) : [cur!]).map(x => <Prev key={x.id} x={x} />)}
              {(node === "__root" ? !kids(items, "").length && !a.body : cur!.kind === "folder" && !kids(items, cur!.id).length) && <p className="py-10 text-center text-sm text-gray-500">This folder is empty</p>}</div></>
          : <><h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-50"><PieChartIcon className="size-5" />Overall Statistics</h4>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-md border border-gray-200 p-4 dark:border-gray-800"><Ring p={pc(viewed)} c="#3b82f6" /><span><small className="block text-gray-500">{viewed}/{aud.length} viewers</small><b className="text-blue-500">{a.ack ? "Confirmed reading" : "Viewed this"}</b></span></div>
              <div className="flex items-center gap-4 rounded-md border border-gray-200 p-4 dark:border-gray-800"><Ring p={pc(vm)} c="#f59e0b" /><span><small className="block text-gray-500">{vm}/{aud.length} viewers</small><b className="text-amber-600">Views this month</b></span></div></div>
            <TInput type="search" className="mb-4  sm:w-60" inputClassName="h-9 py-1.5" placeholder="Search..." value={dq} onChange={e => setDq(e.target.value)} />
            <div className="-mx-5 overflow-x-auto border-t border-gray-100 lg:-mx-6 dark:border-gray-800"><Table className="min-w-full"><TableHead className="border-b border-gray-200 dark:border-gray-800"><TableRow>{["Name", "Groups", "Last Viewed"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}<TableHeaderCell className={TH + " text-end"}>Total Views</TableHeaderCell></TableRow></TableHead>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{aud.filter(u => !dq || String(u.name).toLowerCase().includes(dq.toLowerCase())).map(u => { const r = byU[u.id]; return <TableRow key={u.id}>
                <TableCell className={TD}><span className="flex items-center gap-2"><Av n={u.name} />{u.name}</span></TableCell><TableCell className={TD}>{roleIds(u).map((id: string) => s.roles.find(x => x.id === id)?.name).filter(Boolean).join(", ") || "—"}</TableCell>
                <TableCell className={TD}>{r ? dmy(r.lastViewedAt || r.readAt) : <span className="text-gray-400">Not yet</span>}</TableCell><TableCell className={TD + " text-end"}>{r ? (+r.views || 1) : 0}</TableCell></TableRow>; })}
                {!aud.length && <TableRow><TableCell colSpan={4} className={TD}>No assigned employees yet.</TableCell></TableRow>}</TableBody></Table></div></>}
        </section>
      </div>
    </>
  );
}

type Ed = { id: string; title: string; body: string; items: Item[]; category: string; pinned: boolean; ack: boolean; status: string; roleIds: string[]; branchIds: string[]; employeeIds: string[]; adminIds: string[]; mode: string };
function Editor({ s, a, step0, by, me, onDone }: { s: S; a: Row | null; step0: number; by: string; me: any; onDone: (id?: string) => void }) {
  const [E, setE] = useState<Ed>(() => ({ id: a?.id || "", title: a?.title || "", body: a?.body || "", items: itemsOf(a).map(x => ({ ...x })), category: a?.category || "Policies", pinned: !!a?.pinned, ack: !!a?.ack, status: a?.status || "draft",
    roleIds: [...(a?.roleIds || [])], branchIds: [...(a?.branchIds || [])], employeeIds: [...(a?.employeeIds || [])],
    adminIds: a ? [...(a.adminIds || [])] : s.users.filter(u => live(u) && (u.userId === me?.userId || (me?.email && String(u.email || "").toLowerCase() === String(me.email).toLowerCase()))).map(u => u.id).slice(0, 1),
    mode: (a?.employeeIds || []).length && !(a?.roleIds || []).length && !(a?.branchIds || []).length ? "users" : "groups" }));
  const [step, setStep] = useState(step0), [folder, setFolder] = useState(""), [q, setQ] = useState(""), [aq, setAq] = useState(""), [dlg, setDlg] = useState<any>(a ? null : { kind: "name" }), [busy, setBusy] = useState(false);
  const fileIn = useRef<HTMLInputElement>(null), up = (p: Partial<Ed>) => setE(o => ({ ...o, ...p }));
  async function persist(status: string) {
    if (!E.title) { setDlg({ kind: "name" }); return ""; }
    const files = E.items.map(({ id, kind, parent, name, url, body, path, type, size }) => kind === "file" ? { id, kind, parent, name, path, type, size } : kind === "link" ? { id, kind, parent, name, url } : kind === "text" ? { id, kind, parent, name, body } : { id, kind, parent, name });
    const d = { title: E.title, body: E.body, category: E.category, files, pinned: E.pinned, ack: E.ack, status, roleIds: E.mode === "groups" ? E.roleIds : [], branchIds: E.mode === "groups" ? E.branchIds : [], employeeIds: E.mode === "users" ? E.employeeIds : [], adminIds: E.adminIds };
    const id = E.id || "kb_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await put("kb_articles", id, E.id ? d : { ...d, archived: false, createdBy: by, deleted: false }); return id;
  }
  async function upload(fl: FileList | null) {
    for (const f of Array.from(fl || [])) { if (f.size > 10485760) { toast(`${f.name} is larger than 10 MB`, "error"); continue; }
      try { const path = `${await company()}/kb/${Date.now().toString(36)}-${f.name.replace(/[^\w.-]+/g, "_")}`; toast("Uploading " + f.name + "…");
        const r = await sb.storage.from("kb").upload(path, f, { contentType: f.type || "application/octet-stream" }); if (r.error) throw r.error;
        setE(o => ({ ...o, items: [...o.items, { id: "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind: "file", parent: folder, name: f.name, path, type: f.type, size: f.size }] })); }
      catch { toast("Couldn't upload " + f.name, "error"); } }
  }
  const rm = async (it: Item) => { const gone = new Set([it.id]); let more = true; while (more) { more = false; E.items.forEach(x => { if (gone.has(x.parent) && !gone.has(x.id)) { gone.add(x.id); more = true; } }); }
    if (await askYes(it.kind === "folder" ? `Delete the folder ${it.name} and everything in it?` : `Delete ${it.name || "this item"}?`, "Delete", true)) up({ items: E.items.filter(x => !gone.has(x.id)) }); };
  const tree = (p: string, d: number): React.ReactNode => kids(E.items, p).filter(x => x.kind === "folder").map(f => <div key={f.id}>
    <div onClick={() => setFolder(f.id)} style={{ paddingInlineStart: 14 + d * 18 }} className={cn("group flex cursor-pointer items-center gap-2 rounded-lg py-2 pe-2 text-sm", folder === f.id ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/3")}>
      {ICO.folder}<span className="flex-1 truncate">{f.name}</span><Button variant="ghost" title="Rename" aria-label="Rename" onClick={e => { e.stopPropagation(); setDlg({ kind: "folder", it: f }); }} className="p-1 opacity-0 group-hover:opacity-100"><PencilIcon className="size-4" /></Button></div>{tree(f.id, d + 1)}</div>);
  const crumbs: Item[] = []; for (let f = E.items.find(x => x.id === folder); f; f = E.items.find(x => x.id === f!.parent)) crumbs.unshift(f);
  const list = q.trim() ? E.items.filter(x => ((x.name || "") + " " + (x.url || "") + " " + (x.body || "")).toLowerCase().includes(q.trim().toLowerCase())) : kids(E.items, folder);
  const size = E.items.reduce((t, x) => t + (+(x.size || 0)), 0);
  const STEPS = ["Assign Employees", "Assign Administrators", "Summary"];

  if (step) {
    const adm = step === 2, emps = s.users.filter(u => live(u) && u.active !== false && (adm || !isAdminRow(u))).sort((x, y) => String(x.name).localeCompare(String(y.name))), qq = aq.trim().toLowerCase();
    const sel = adm ? E.adminIds : E.employeeIds, setSel = (l: string[]) => up(adm ? { adminIds: l } : { employeeIds: l }), mode = adm ? "users" : E.mode;
    const users = emps.filter(u => !qq || String(u.name).toLowerCase().includes(qq)), brN = (u: Row) => (u.branchIds || []).filter((b: string) => b && b !== "-").map((b: string) => s.branches.find(x => x.id === b)?.name).filter(Boolean).join(", ") || "All Stores";
    const aud = audience(s, { roleIds: E.mode === "groups" ? E.roleIds : [], branchIds: E.mode === "groups" ? E.branchIds : [], employeeIds: E.mode === "users" ? E.employeeIds : [] });
    const tog = (arr: string[], id: string, on: boolean) => on ? [...new Set([...arr, id])] : arr.filter(x => x !== id);
    return (
      <>
        <PageBreadcrumb pageTitle={STEPS[step - 1]} />
        <div className="mb-6 flex items-center justify-center gap-3">{STEPS.map((t, i) => <div key={t} className="flex items-center gap-3">{i > 0 && <i className={cn("h-px w-10", step > i ? "bg-blue-500" : "bg-gray-300")} />}
          <span className={cn("flex size-8 items-center justify-center rounded-full text-sm font-semibold", step > i + 1 ? "bg-blue-500 text-white" : step === i + 1 ? "border-2 border-blue-500 text-blue-500" : "bg-gray-100 text-gray-400 dark:bg-white/5")}>{step > i + 1 ? "✓" : "0" + (i + 1)}</span><small className="hidden text-sm text-gray-600 sm:inline dark:text-gray-400">{t}</small></div>)}</div>
        <div className="space-y-3">
          {step === 3 ? <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2 lg:p-6">
            <div className="rounded-md border border-gray-200 p-5 dark:border-gray-800"><b className="text-gray-900 dark:text-gray-50">Assigned Employees · {aud.length}</b>
              <p className="mb-3 text-sm text-gray-500">{E.mode === "groups" ? [...E.roleIds.map(r => "Role: " + (s.roles.find(x => x.id === r)?.name || "—")), ...E.branchIds.map(b => "Store: " + (s.branches.find(x => x.id === b)?.name || "—"))].join(" · ") || "Everyone" : "Picked one by one"}</p>
              <div className="flex flex-wrap gap-2">{aud.map(u => <span key={u.id} className="flex items-center gap-2 rounded-full bg-gray-100 py-1 pe-3 ps-1 text-sm dark:bg-white/5"><Av n={u.name} />{u.name}</span>)}{!aud.length && <span className="text-sm text-gray-400">Nobody</span>}</div></div>
            <div className="rounded-md border border-gray-200 p-5 dark:border-gray-800"><b className="text-gray-900 dark:text-gray-50">Administrators · {E.adminIds.length}</b><p className="mb-3 text-sm text-gray-500">They can edit this knowledge base and see who read it.</p>
              <div className="flex flex-wrap gap-2">{E.adminIds.map(id => <span key={id} className="flex items-center gap-2 rounded-full bg-gray-100 py-1 pe-3 ps-1 text-sm dark:bg-white/5"><Av n={s.users.find(u => u.id === id)?.name} />{s.users.find(u => u.id === id)?.name || "—"}</span>)}{!E.adminIds.length && <span className="text-sm text-gray-400">Nobody</span>}</div></div>
          </div> : <>
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              {adm ? <span /> : <SegTabs value={mode} onChange={v => up({ mode: v })} items={[["groups", "Select By Groups"], ["users", "Select By Users"]]} />}
              <Searchbar type="search" className="w-full sm:max-w-[250px] sm:[&>input]:h-[30px]" placeholder="Search..." value={aq} onChange={e => setAq(e.target.value)} /></div>
            <div className="relative overflow-x-auto">
              {mode === "groups" ? <><Table className="min-w-full"><TableHead><TableRow className="border-y border-gray-200 dark:border-gray-800"><TableHeaderCell className={TH}>Name</TableHeaderCell><TableHeaderCell className={TH}>Group</TableHeaderCell><TableHeaderCell className={TH + " text-end"}>Members</TableHeaderCell></TableRow></TableHead>
                <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{[...s.roles.filter(r => live(r) && (!qq || String(r.name).toLowerCase().includes(qq))).map(r => ["r", r] as const), ...s.branches.filter(b => live(b) && b.active !== false && (!qq || String(b.name).toLowerCase().includes(qq))).map(b => ["b", b] as const)].map(([k, x]) => {
                  const arr = k === "r" ? E.roleIds : E.branchIds, mem = emps.filter(u => k === "r" ? roleIds(u).includes(x.id) : (u.branchIds || []).includes(x.id)).length;
                  return <TableRow key={k + x.id}><TableCell className={TD}><Label className="flex cursor-pointer items-center gap-3 font-medium text-gray-900 dark:text-gray-50"><Checkbox checked={arr.includes(x.id)} onCheckedChange={c => up(k === "r" ? { roleIds: tog(arr, x.id, !!c) } : { branchIds: tog(arr, x.id, !!c) })} />{x.name}</Label></TableCell>
                    <TableCell className={TD}>{k === "r" ? "Role" : "Store"}</TableCell><TableCell className={TD + " text-end"}>{mem} employees</TableCell></TableRow>; })}</TableBody></Table>
                <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 sm:px-6 dark:border-gray-800">Pick nothing to give it to everyone. Roles and stores together: employees with one of the roles at one of the stores.</p></>
              : <Table className="min-w-full"><TableHead><TableRow className="border-y border-gray-200 dark:border-gray-800"><TableHeaderCell className={TH + " w-12"}><Checkbox checked={users.length > 0 && users.every(u => sel.includes(u.id))} onCheckedChange={c => setSel(c ? [...new Set([...sel, ...users.map(u => u.id)])] : sel.filter(id => !users.some(u => u.id === id)))} /></TableHeaderCell>{["Name", "Store", "Job"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}</TableRow></TableHead>
                <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{users.map(u => <TableRow key={u.id}><TableCell className={TD}><Checkbox checked={sel.includes(u.id)} onCheckedChange={c => setSel(tog(sel, u.id, !!c))} /></TableCell>
                  <TableCell className={TD}><span className="flex items-center gap-2"><Av n={u.name} />{u.name}</span></TableCell><TableCell className={TD}>{brN(u)}</TableCell><TableCell className={TD}>{u.jobTitle ? <Badge variant="light" color="primary">{u.jobTitle}</Badge> : "—"}</TableCell></TableRow>)}
                  {!users.length && <TableRow><TableCell colSpan={4} className={TD}>Nobody matches.</TableCell></TableRow>}</TableBody></Table>}
            </div></>}
          <div className="flex justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:px-6 dark:border-gray-800">
            <Button variant="outline" onClick={() => step === 1 && step0 === 1 ? onDone() : (setStep(step - 1), setAq(""))}>{step === 1 && step0 === 1 ? "Cancel" : "Back"}</Button>
            <Button disabled={busy} onClick={async () => { if (step < 3) { setStep(step + 1); setAq(""); return; } setBusy(true); try { const id = await persist("published"); toast(step0 === 1 ? "Assignments saved" : "Knowledge base published"); onDone(id); } catch { toast("Couldn't save. Check your connection.", "error"); } setBusy(false); }}>{step === 3 ? "Publish" : "Next"}</Button>
          </div>
        </div>
      </>);
  }
  return (
    <>
      <PageBreadcrumb pageTitle={E.id ? "Edit Knowledge Base" : "Create a Knowledge Base"} />
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-gray-100 p-3 lg:border-e lg:border-b-0 dark:border-gray-800">
            <p className="px-3 pb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">Folders</p>
            <div onClick={() => setFolder("")} className={cn("group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold", !folder ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10" : "text-gray-800 hover:bg-gray-50 dark:text-gray-50")}>
              {ICO.folder}<span className="flex-1 truncate">{E.title || "Untitled"}</span><button type="button" title="Rename" onClick={e => { e.stopPropagation(); setDlg({ kind: "name" }); }}><PencilIcon className="size-4" /></button></div>
            {tree("", 1)}
            <Button variant="outline" className="mt-3 w-full" onClick={() => setDlg({ kind: "folder" })}><PlusIcon className="size-4.5" />Add Folder</Button>
          </aside>
          <section className="min-w-0 p-5 lg:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-1 text-sm"><Button variant="light" className="px-1.5 py-0.5 font-semibold" onClick={() => setFolder("")}>{E.title || "Untitled"}</Button>
              {crumbs.map(c => <span key={c.id} className="flex items-center gap-1 text-gray-500"><span>›</span><Button variant="light" className="px-1.5 py-0.5 font-normal" onClick={() => setFolder(c.id)}>{c.name}</Button></span>)}</div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">{[["text", "Add Text"], ["link", "Add Link"], ["file", "Add Files"], ["folder", "Add Folder"]].map(([k, t]) => <Button key={k} size="sm" variant="outline" onClick={() => k === "file" ? fileIn.current?.click() : setDlg({ kind: k })}>{ICO[k]}{t}</Button>)}</div>
              <Searchbar type="search" className="w-full sm:max-w-[250px] sm:[&>input]:h-[30px]" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} /></div>
            <input ref={fileIn} type="file" multiple hidden accept="image/*,application/pdf,video/mp4,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={e => { upload(e.target.files); e.target.value = ""; }} />
            <div className="divide-y divide-gray-100 rounded-md border border-gray-200 dark:divide-white/5 dark:border-gray-800">
              {!folder && E.body && <div className="flex items-center gap-3 px-4 py-3">{ICO.text}<b className="text-sm font-medium text-gray-900 dark:text-gray-50">Text (from the old article)</b><span className="flex-1 truncate text-xs text-gray-500">{E.body.slice(0, 80)}</span>
                <Button size="icon-sm" variant="ghost" onClick={() => setDlg({ kind: "text", it: "__body" })}><PencilIcon className="size-4" /></Button></div>}
              {list.map(x => <div key={x.id} onClick={() => x.kind === "folder" && setFolder(x.id)} className={cn("flex items-center gap-3 px-4 py-3", x.kind === "folder" && "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/2")}>
                {ICO[x.kind]}<b className="text-sm font-medium text-gray-900 dark:text-gray-50">{x.name || x.url || "Text"}</b>
                <span className="flex-1 truncate text-xs text-gray-500">{x.kind === "folder" ? kids(E.items, x.id).length + " items" : x.kind === "link" ? x.url : x.kind === "text" ? String(x.body || "").slice(0, 80) : x.size ? (x.size / 1048576).toFixed(1) + " MB" : ""}</span>
                {x.kind !== "folder" && <Button size="icon-sm" variant="ghost" title="Edit" onClick={e => { e.stopPropagation(); setDlg({ kind: x.kind === "file" ? "rename" : x.kind, it: x }); }}><PencilIcon className="size-4" /></Button>}
                <Button size="icon-sm" variant="ghost" title="Delete" onClick={e => { e.stopPropagation(); rm(x); }}><TrashBinIcon className="size-4" /></Button></div>)}
              {!list.length && !(!folder && E.body) && <p className="px-4 py-12 text-center text-sm text-gray-500">{q ? "Nothing matches." : "This folder is empty"}</p>}
            </div>
          </section>
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6 dark:border-gray-800">
          <div className="flex flex-1 items-center gap-3 text-xs text-gray-500"><span>Storage</span><span className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"><i className="block h-full bg-blue-500" style={{ width: Math.min(100, size / (500 * 10485.76)) + "%" }} /></span><span>{(size / 1048576).toFixed(1)} MB of 500 MB</span></div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={async () => { if (await askYes("Leave without saving your changes?", "Leave")) onDone(); }}>Cancel</Button>
            <Button variant="outline" onClick={() => setDlg({ kind: "settings" })}><GearIcon className="size-4.5" />Settings</Button>
            <Button variant="outline" onClick={async () => { try { const id = await persist("draft"); if (!id) return; toast("Saved as draft"); onDone(id); } catch { toast("Couldn't save. Check your connection.", "error"); } }}>Save as Draft</Button>
            <Button onClick={() => { if (!E.title) return setDlg({ kind: "name" }); if (!E.body && !E.items.some(x => x.kind !== "folder")) return toast("Add a text, link or file first.", "error"); setStep(1); }}>Save</Button>
          </div>
        </div>
      </div>
      {dlg && <ItemDialog d={dlg} E={E} folder={folder} up={up} onClose={() => setDlg(null)} cats={[...new Set([...CATS, ...s.kb_articles.map(x => x.category).filter(Boolean)])]} />}
    </>
  );
}

function ItemDialog({ d, E, folder, up, cats, onClose }: { d: any; E: Ed; folder: string; up: (p: Partial<Ed>) => void; cats: string[]; onClose: () => void }) {
  const it: Item | null = d.it === "__body" ? { id: "__body", kind: "text", parent: "", name: "", body: E.body } : d.it || null;
  const [name, setName] = useState(d.kind === "name" ? E.title : it?.name || ""), [url, setUrl] = useState(it?.url || ""), [body, setBody] = useState(it?.body || ""), [err, setErr] = useState("");
  const [cat, setCat] = useState(E.category), [other, setOther] = useState(""), [pin, setPin] = useState(E.pinned), [ack, setAck] = useState(E.ack);
  const T: Record<string, string> = { text: "Text", link: "Link", folder: "Folder" };
  const title = d.kind === "name" ? (E.id || E.title ? "Rename" : "New Knowledge Base") : d.kind === "settings" ? "Settings" : d.kind === "rename" ? "Rename File" : (it ? "Edit " : "Add ") + T[d.kind];
  function save() {
    if (d.kind === "name") { if (!name.trim()) return setErr("Enter a name."); up({ title: name.trim() }); return onClose(); }
    if (d.kind === "settings") { const c = cat === "__other" ? other.trim() : cat; if (!c) return setErr("Enter the category name."); up({ category: c, pinned: pin, ack }); return onClose(); }
    if (d.kind === "rename") { if (name.trim()) up({ items: E.items.map(x => x.id === it!.id ? { ...x, name: name.trim() } : x) }); return onClose(); }
    if (d.kind === "folder" && !name.trim()) return setErr("Enter the folder name."); if (d.kind === "link" && !url.trim()) return setErr("Enter the link."); if (d.kind === "text" && !body.trim()) return setErr("Write the text.");
    const v = { name: name.trim(), url: url.trim(), body: body.trim() };
    if (d.it === "__body") { if (v.name) up({ items: [...E.items, { id: "k" + Date.now().toString(36), kind: "text", parent: "", name: v.name, body: v.body }], body: "" }); else up({ body: v.body }); }
    else if (it) up({ items: E.items.map(x => x.id === it.id ? { ...x, ...v } : x) });
    else up({ items: [...E.items, { id: "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind: d.kind, parent: folder, ...v }] });
    onClose();
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className={cn("max-h-[90dvh] w-full overflow-y-auto p-6 sm:p-8", d.kind === "text" ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-50">{title}</DialogTitle></DialogHeader>
        <form className="mt-6 space-y-5" onSubmit={e => { e.preventDefault(); save(); }}>
          {d.kind === "settings" ? <>
            <F l="Category"><SelectNative className={SEL} value={cat} onChange={e => setCat(e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}<option value="__other">New category…</option></SelectNative></F>
            {cat === "__other" && <F l="New Category" req><Input className="h-9" maxLength={40} placeholder="e.g. Cleaning" value={other} onChange={e => setOther(e.target.value)} /></F>}
            <Label className="flex cursor-pointer items-center gap-3"><Switch checked={pin} onCheckedChange={v => setPin(!!v)} /><span className="text-sm text-gray-900 dark:text-gray-50">Pin to the top in the apps</span></Label>
            <Label className="flex cursor-pointer items-center gap-3"><Switch checked={ack} onCheckedChange={v => setAck(!!v)} /><span className="text-sm text-gray-900 dark:text-gray-50">Employees must confirm they read it</span></Label>
          </> : <>
            <F l={d.kind === "link" ? "Title" : "Name"} req={d.kind === "folder" || d.kind === "name" || d.kind === "rename"}><Input className="h-9" autoFocus maxLength={160} placeholder={d.kind === "folder" ? "e.g. Opening" : d.kind === "link" ? "e.g. Training video" : d.kind === "name" ? "e.g. Kitchen Guide" : "e.g. Opening checklist"} value={name} onChange={e => setName(e.target.value)} /></F>
            {d.kind === "link" && <F l="Link" req><Input className="h-9" placeholder="https://" value={url} onChange={e => setUrl(e.target.value)} /></F>}
            {d.kind === "text" && <F l="Text" req help="Use ## for a heading, - for a list item and **bold**."><Textarea rows={12} value={body} onChange={e => setBody(e.target.value)} /></F>}
          </>}
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>);
}
