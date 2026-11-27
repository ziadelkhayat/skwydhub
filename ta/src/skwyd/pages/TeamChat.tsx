import { Label } from "@/components/tremor/Label";
import { ChoiceButton } from "../ui/Choice";
import { Checkbox } from "@/components/ui/checkbox";
// Employee Management → Chats (groups, channels and private chats with employees, answered in the SKWYD apps) and Manage → Applications
// (every SKWYD app with its download link). Same data (chat_groups, chat_messages) and rules as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Input as TInput } from "@/components/tremor/Input";
import { ArrowLeftIcon, DownloadIcon, PlusIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { put, type Row } from "@/lib/db";
import { cn } from "@/utils";
import { useEffect, useRef, useState } from "react";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { BOX, F } from "../ui/kit";
import { toast } from "../ui/toast";
import { who } from "./em";

const isAdminRow = (r: Row) => r.role === "owner" || r.role === "admin";
const roleIds = (u: Row): string[] => u.roleIds?.length ? u.roleIds : u.roleId ? [u.roleId] : [];
const nid = (p: string) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const tm = (t: string) => { const d = new Date(t), today = new Date().toDateString() === d.toDateString(), hm = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return today ? hm : `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()} ${hm}`; };
const Av = ({ n }: { n: string }) => <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">{String(n || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span>;

export function TeamChatPage() {
  const s = useS(["chat_groups", "chat_messages", "users", "roles", "branches"]), { staff } = useAuth(), by = who(staff);
  const [sel, setSel] = useState(""), [kind, setKind] = useState(""), [q, setQ] = useState(""), [adding, setAdding] = useState(false), [aq, setAq] = useState(""), [draft, setDraft] = useState(""), [dlg, setDlg] = useState<null | { g?: Row; kind: string }>(null);
  const box = useRef<HTMLDivElement>(null);
  const msgsOf = (id: string) => (s?.chat_messages || []).filter(m => m.groupId === id && !m.deleted).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const nMsgs = sel ? msgsOf(sel).length : 0;
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [sel, nMsgs]);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const direct = (g: Row) => g.kind === "direct", byId = Object.fromEntries(s.users.map(u => [u.id, u]));
  const name = (g: Row) => direct(g) ? (g.memberIds || []).map((id: string) => byId[id]?.name || "—").join(" & ") : g.name;
  const last = (g: Row) => { const l = msgsOf(g.id); return l[l.length - 1] || null; };
  const members = (g: Row) => { const ids = new Set(g.memberIds || []), rs = g.roleIds || [], bs = g.branchIds || []; return s.users.filter(u => live(u) && u.active !== false && (ids.has(u.id) || (rs.length && roleIds(u).some(r => rs.includes(r))) || (bs.length && (u.branchIds || []).some((b: string) => bs.includes(b))))); };
  const all = s.chat_groups.filter(g => !g.deleted).sort((a, b) => String(last(b)?.createdAt || b.createdAt).localeCompare(String(last(a)?.createdAt || a.createdAt)));
  const kOf = (g: Row) => direct(g) ? "direct" : g.kind === "channel" ? "channel" : "group", qq = q.trim().toLowerCase();
  const gs = all.filter(g => (!kind || kOf(g) === kind) && (!qq || name(g).toLowerCase().includes(qq))), g = all.find(x => x.id === sel), msgs = g ? msgsOf(g.id) : [];
  async function send(e: React.FormEvent) { e.preventDefault(); const body = draft.trim(); if (!body || !sel) return; setDraft("");
    try { await put("chat_messages", nid("cm"), { groupId: sel, body, fromOffice: true, senderName: by, deleted: false }); } catch { setDraft(body); toast("Couldn't send the message", "error"); } }
  async function dm(u: Row) { // a chat between the back office and one employee
    const ex = all.find(x => x.kind === "group" && (x.memberIds || []).length === 1 && x.memberIds[0] === u.id && !(x.roleIds || []).length && !(x.branchIds || []).length);
    if (ex) { setSel(ex.id); setAdding(false); setKind(""); return; }
    const id = nid("cg"); try { await put("chat_groups", id, { name: u.name, kind: "group", memberIds: [u.id], roleIds: [], branchIds: [], createdBy: by, deleted: false }); setSel(id); setAdding(false); setKind(""); } catch { toast("Couldn't start the chat", "error"); } }
  const emps = s.users.filter(u => live(u) && u.active !== false && !isAdminRow(u) && (!aq.trim() || (String(u.name || "") + " " + String(u.phone || "")).toLowerCase().includes(aq.trim().toLowerCase()))).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const roleOf = (u: Row) => roleIds(u).map(id => s.roles.find(r => r.id === id)?.name).filter(Boolean)[0] || u.jobTitle || "";
  const Item = ({ x }: { x: Row }) => { const l = last(x); return <button type="button" onClick={() => setSel(x.id)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-start", x.id === sel ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-white/3")}>
    <Av n={name(x)} /><span className="min-w-0 flex-1"><b className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-50"><span className="truncate">{name(x)}</span>{direct(x) ? <Badge variant="light" color="light">Private</Badge> : x.kind === "channel" ? <Badge variant="light" color="light">Channel</Badge> : null}</b>
      <span className="block truncate text-xs text-gray-500">{l ? (l.fromOffice ? "You: " : (l.senderName || "") + ": ") + l.body : members(x).length + " members"}</span></span>{l && <span className="shrink-0 text-xs text-gray-400">{tm(l.createdAt)}</span>}</button>; };
  const sub = g && !direct(g) ? [...(g.branchIds || []).map((id: string) => s.branches.find(b => b.id === id)?.name).filter(Boolean).map((n: string) => "Store: " + n), ...(g.roleIds || []).map((id: string) => s.roles.find(r => r.id === id)?.name).filter(Boolean).map((n: string) => "Role: " + n), ...(g.memberIds || []).map((id: string) => byId[id]?.name || "—")].join(", ") || "No members" : "";
  return <>
    <PageBreadcrumb pageTitle="Chats" />
    <div className={BOX + " grid h-[calc(100dvh-220px)] min-h-[480px] grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]"}>
      <aside className={cn("flex min-h-0 flex-col border-gray-200 md:border-e dark:border-gray-800", g && "hidden md:flex")}>
        {adding ? <>
          <div className="flex items-center gap-2 border-b border-gray-200 p-4 dark:border-gray-800"><Button size="icon-sm" variant="ghost" aria-label="Back" onClick={() => setAdding(false)}><ArrowLeftIcon className="size-5" /></Button><b className="text-gray-900 dark:text-gray-50">Add new</b></div>
          <div className="p-3"><TInput type="search" className="h-10" inputClassName="h-9 py-1.5" autoFocus placeholder="Search name or number" value={aq} onChange={e => setAq(e.target.value)} /></div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            {[["group", "New Group"], ["channel", "New Channel"]].map(([k, t]) => <button key={k} type="button" onClick={() => { setAdding(false); setDlg({ kind: k }); }} className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-50 dark:hover:bg-white/3"><span className="flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"><PlusIcon className="size-5" /></span>{t}</button>)}
            <p className="px-4 pt-3 pb-1 text-xs font-medium text-gray-500 uppercase">Contacts</p>
            {!emps.length ? <p className="px-4 py-6 text-center text-sm text-gray-500">{aq ? "Nothing matches." : "No employees yet."}</p> : emps.map(u => <button key={u.id} type="button" onClick={() => dm(u)} className="flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-gray-50 dark:hover:bg-white/3"><Av n={u.name} /><span><b className="block text-sm font-medium text-gray-900 dark:text-gray-50">{u.name}</b><span className="text-xs text-gray-500 uppercase">{roleOf(u)}</span></span></button>)}</div></>
        : <>
          <div className="flex items-center gap-2 border-b border-gray-200 p-4 dark:border-gray-800"><Button size="sm" onClick={() => { setAdding(true); setAq(""); }}><PlusIcon className="size-4" />Add New</Button></div>
          <div className="space-y-3 p-3"><TInput type="search" className="h-10" inputClassName="h-9 py-1.5" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
            <div className="flex flex-wrap gap-2">{[["", "All"], ["group", "Group"], ["channel", "Channel"], ["direct", "Private"]].map(([k, t]) => <ChoiceButton on={kind === k} key={k} onClick={() => setKind(k)} className="text-xs">{t}</ChoiceButton>)}</div></div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">{!gs.length ? <p className="px-4 py-10 text-center text-sm text-gray-500">{qq ? "Nothing matches." : kind === "direct" ? "No private chats yet." : "No conversations yet."}</p> : gs.map(x => <Item key={x.id} x={x} />)}</div></>}
      </aside>
      <section className={cn("flex min-h-0 flex-col", !g && "hidden md:flex")}>
        {!g ? <div className="m-auto max-w-sm px-6 text-center"><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Start Chatting</h3><p className="mt-1 text-sm text-gray-500">Message the team in groups and channels. Employees answer in the SKWYD apps.</p><Button className="mt-4" onClick={() => { setAdding(true); setAq(""); }}>Start Chatting</Button></div> : <>
          <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800"><Button size="icon-sm" variant="ghost" className="md:hidden" aria-label="Back" onClick={() => setSel("")}><ArrowLeftIcon className="size-5" /></Button><Av n={name(g)} />
            <div className="min-w-0 flex-1"><b className="block truncate text-sm font-medium text-gray-900 dark:text-gray-50">{name(g)}</b><span className="block truncate text-xs text-gray-500">{direct(g) ? "Private chat between two employees · read only" : `${sub} · ${members(g).length} members`}</span></div>
            {!direct(g) && <Button size="sm" variant="outline" onClick={() => setDlg({ g, kind: g.kind })}>{g.kind === "channel" ? "Edit Channel" : "Edit Group"}</Button>}</header>
          <div ref={box} className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-gray-50 p-4 dark:bg-white/2">{!msgs.length ? <p className="m-auto text-sm text-gray-500">{direct(g) ? "No messages yet." : "No messages yet. Say hello!"}</p> : msgs.map(m => { const me = direct(g) ? m.senderId === (g.memberIds || [])[0] : m.fromOffice;
            return <div key={m.id} className={cn("flex max-w-[75%] flex-col", me ? "self-end items-end" : "self-start items-start")}><span className={cn("rounded-lg px-3.5 py-2 text-sm whitespace-pre-wrap", me ? "rounded-br-sm bg-blue-500 text-white" : "rounded-bl-sm bg-white text-gray-800 shadow-xs dark:bg-gray-800 dark:text-gray-50")}>
              {(!me || direct(g)) && <b className="block text-xs font-semibold opacity-80">{m.senderName || "—"}</b>}{m.body}</span><small className="mt-0.5 text-[11px] text-gray-400">{me && !direct(g) && m.senderName ? m.senderName + " · " : ""}{tm(m.createdAt)}</small></div>; })}</div>
          {!direct(g) && <form onSubmit={send} className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-800"><Input className="h-9 flex-1" placeholder="Write a message…" autoComplete="off" maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} /><Button type="submit" className="h-9">Send</Button></form>}</>}
      </section>
    </div>
    {dlg && <GroupDialog s={s} g={dlg.g} kind={dlg.kind} by={by} onClose={() => setDlg(null)} onSaved={id => setSel(id)} onDeleted={() => setSel("")} />}
  </>;
}

const tog = (l: string[], set: (x: string[]) => void, id: string, v: boolean) => set(v ? [...l, id] : l.filter(x => x !== id));
const Pick = ({ items, on, set }: { items: [string, string, string?][]; on: string[]; set: (x: string[]) => void }) => <div className="custom-scrollbar max-h-40 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-800">{!items.length ? <p className="text-sm text-gray-500">None yet</p> : items.map(([id, t, n]) =>
  <Label key={id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><Checkbox checked={on.includes(id)} onCheckedChange={(chk: boolean) => tog(on, set, id, chk)} />{t}{n && <span className="text-xs text-gray-500">{n}</span>}</Label>)}</div>;
function GroupDialog({ s, g, kind, by, onClose, onSaved, onDeleted }: { s: S; g?: Row; kind: string; by: string; onClose: () => void; onSaved: (id: string) => void; onDeleted: () => void }) {
  const chan = g ? g.kind === "channel" : kind === "channel", T = chan ? "Channel" : "Group";
  const emps = s.users.filter(u => live(u) && u.active !== false && !isAdminRow(u)).sort((a, b) => String(a.name).localeCompare(String(b.name))), roles = s.roles.filter(live).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const stores = s.branches.filter(b => live(b) && b.active !== false);
  const [nm, setNm] = useState(g?.name || ""), [mem, setMem] = useState<string[]>(g?.memberIds || []), [rs, setRs] = useState<string[]>(g?.roleIds || []), [bs, setBs] = useState<string[]>(g?.branchIds || []), [q, setQ] = useState(""), [err, setErr] = useState("");
  const vis = emps.filter(u => !q.trim() || String(u.name).toLowerCase().includes(q.trim().toLowerCase()));
  async function save() { if (!nm.trim()) return setErr(`Enter a ${T.toLowerCase()} name.`); if (!mem.length && !rs.length && !bs.length) return setErr("Choose at least one store, role or employee.");
    try { const id = g?.id || nid("cg"); await put("chat_groups", id, g ? { name: nm.trim(), memberIds: mem, roleIds: rs, branchIds: bs } : { name: nm.trim(), kind: chan ? "channel" : "group", memberIds: mem, roleIds: rs, branchIds: bs, createdBy: by, deleted: false });
      toast(g ? T + " saved" : T + " created"); onSaved(id); onClose(); } catch { setErr(`Couldn't save the ${T.toLowerCase()}.`); } }
  async function del() { if (!(await askYes(`Delete the ${T.toLowerCase()} ${g!.name}? Its messages are removed for everyone.`, "Delete", true))) return;
    try { await put("chat_groups", g!.id, { deleted: true }); toast(T + " deleted"); onDeleted(); onClose(); } catch { setErr(`Couldn't delete the ${T.toLowerCase()}.`); } }
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-full p-6 sm:max-w-lg"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{g ? "Edit " + T : "New " + T}</DialogTitle></DialogHeader>
    <div className="mt-4 space-y-4">
      {chan && <p className="text-sm text-gray-500">Only the back office and the channel's creator can post. Members read the announcements in the app.</p>}
      <F l={T + " Name"} req><Input className="h-9" placeholder="e.g. Mar Mikhael Kitchen" value={nm} onChange={e => setNm(e.target.value)} autoFocus /></F>
      <F l="Stores (everyone working there)"><Pick items={stores.map(b => [b.id, b.name])} on={bs} set={setBs} /></F>
      <F l="Roles (everyone with the role, now and later)"><Pick items={roles.map(r => [r.id, r.name])} on={rs} set={setRs} /></F>
      <F l="Employees"><div className="mb-2 flex gap-2"><Input className="h-10 flex-1" placeholder="Search employees" value={q} onChange={e => setQ(e.target.value)} /><Button variant="outline" onClick={() => setMem([...new Set([...mem, ...vis.map(u => u.id)])])}>All</Button><Button variant="outline" onClick={() => setMem([])}>None</Button></div>
        <Pick items={vis.map(u => [u.id, u.name, [u.jobTitle, u.username ? "" : "no app login"].filter(Boolean).join(" · ")])} on={mem} set={setMem} /></F>
      {err && <p className="text-sm text-red-500">{err}</p>}</div>
    <div className="mt-6 flex gap-3">{g && <Button variant="destructive" onClick={del}>Delete</Button>}<Button variant="outline" className="ms-auto" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></div></DialogContent></Dialog>;
}

/* ---------- Manage → Applications ---------- */
const APPS: [string, string, string, string, string][] = [
  ["pos", "Point Of Sale App", "The cashier app on the store tablets: orders, payments, tables, tills, end of day. Staff sign in with their PIN.", "Android tablet", location.origin + "/skwydhub-pos.apk"],
  ["team", "Employee App", "For every employee: clock in and out, schedule, chats, guides and time-off requests. Sign in with the phone number and a WhatsApp code.", "Android phone", location.origin + "/skwyd-team.apk"],
  ["driver", "Driver App", "For delivery drivers: the orders they're given, the customer's map and phone, picked up and delivered. Sign in with the phone number and a WhatsApp code.", "Android phone", location.origin + "/skwyd-driver.apk"],
  ["insights", "Insights App", "For the owner: sales, today's orders, who's clocked in, the schedule, requests, chats, tasks and guides, live. Sign in with the account number, phone number and a WhatsApp code.", "Android phone", location.origin + "/skwyd-insights.apk"],
  ["manager", "Manager App", "For store and area managers: sales, orders, staff and approvals on the phone.", "Android phone", ""]];
export function ApplicationsPage() {
  const copy = async (u: string) => { try { await navigator.clipboard.writeText(u); toast("Link copied"); } catch { toast("Couldn't copy the link", "error"); } };
  return <>
    <PageBreadcrumb pageTitle="Applications" />
    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Install an app over the old one after an update: the sign-in and data stay.</p>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">{APPS.map(([k, n, d, on, url]) => <div key={k} className={BOX + " flex flex-col p-5"}>
      <b className="text-base font-semibold text-gray-900 dark:text-gray-50">{n}</b><span className="text-xs text-gray-500">{on}</span><p className="mt-3 flex-1 text-sm text-gray-600 dark:text-gray-400">{d}</p>
      <div className="mt-4 flex flex-wrap gap-2">{!url ? <Badge variant="light" color="light">Coming soon</Badge> : <><Button render={<a href={url} download />}><DownloadIcon className="size-5" />Download APK</Button><Button variant="outline" onClick={() => copy(url)}>Copy Link</Button></>}</div></div>)}</div>
  </>;
}
