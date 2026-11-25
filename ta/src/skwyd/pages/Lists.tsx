// Manage → Reasons and Manage → Tags: lists kept in settings documents ("app" and "tags"), same sections, rules and
// General / Deleted tabs as the current portal. Rows can be dragged to change their order.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlusIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { put, useCol } from "@/lib/db";
import { useState } from "react";
import { askYes } from "../ui/confirm";
import { F } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

type Item = { key: string; name: string; nameAr?: string };

/** one titled list card with drag-to-move rows */
function Section({ title, items, empty, onNew, onOpen, onMove, action }: { title: string; items: Item[]; empty: string; onNew?: () => void; onOpen?: (it: Item) => void; onMove?: (keys: string[]) => void; action?: (it: Item) => React.ReactNode }) {
  const [drag, setDrag] = useState<string | null>(null), [over, setOver] = useState<string | null>(null);
  const drop = (target: string) => {
    if (!drag || drag === target || !onMove) return;
    const keys = items.map(i => i.key).filter(k => k !== drag); keys.splice(keys.indexOf(target) + (items.findIndex(i => i.key === drag) < items.findIndex(i => i.key === target) ? 1 : 0), 0, drag); onMove(keys);
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        {onNew && <Button size="sm" variant="outline" onClick={onNew}><PlusIcon className="size-4.5" />Create</Button>}
      </div>
      <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/5 dark:border-white/5">
        {!items.length ? <li className="px-5 py-4 text-sm text-gray-500 sm:px-6 dark:text-gray-400">{empty}</li> : items.map(it => (
          <li key={it.key} draggable={!!onMove} onDragStart={() => setDrag(it.key)} onDragEnd={() => { setDrag(null); setOver(null); }}
            onDragOver={e => { if (onMove) { e.preventDefault(); setOver(it.key); } }} onDrop={e => { e.preventDefault(); drop(it.key); setDrag(null); setOver(null); }}
            onClick={() => onOpen?.(it)}
            className={"flex items-center gap-3 px-5 py-3.5 text-sm sm:px-6 " + (onOpen ? "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/2 " : "") + (over === it.key && drag !== it.key ? "bg-brand-50 dark:bg-brand-500/10 " : "") + (drag === it.key ? "opacity-50" : "")}>
            {onMove && <span className="cursor-grab text-gray-400 select-none" title="Drag to move" aria-hidden>⋮⋮</span>}
            <span className="font-medium text-gray-800 dark:text-white/90">{it.name}</span>
            {it.nameAr && <span className="text-gray-500 dark:text-gray-400" dir="auto">{it.nameAr}</span>}
            <span className="flex-1" />{action?.(it)}
          </li>))}
      </ul>
    </div>);
}

function NameDialog({ title, name, nameAr, onSave, onDelete, onClose, readOnly, onRestore }: { title: string; name: string; nameAr?: string; onSave?: (n: string, ar: string) => Promise<string | null>; onDelete?: () => Promise<boolean>; onClose: () => void; readOnly?: boolean; onRestore?: () => void }) {
  const [n, setN] = useState(name), [ar, setAr] = useState(nameAr || ""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async () => { if (!n.trim()) return setErr("Enter a name."); setBusy(true); const e = await onSave!(n.trim(), ar.trim()); setBusy(false); if (e) setErr(e); else onClose(); };
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full p-6 sm:max-w-lg sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">{title}</DialogTitle></DialogHeader>
        <form className="mt-6 space-y-5" onSubmit={e => { e.preventDefault(); if (!readOnly) go(); }}>
          <F l="Name" req={!readOnly}><Input className="h-9" autoFocus disabled={readOnly} value={n} onChange={e => setN(e.target.value)} /></F>
          <F l="Name Localized"><Input className="h-9" dir="auto" disabled={readOnly} value={ar} onChange={e => setAr(e.target.value)} /></F>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            {onDelete && <Button type="button" variant="destructive" className="sm:me-auto" onClick={async () => { if (await askYes("Are you sure you want to delete this?", "Delete", true) && await onDelete()) onClose(); }}>Delete</Button>}
            {onRestore && <Button type="button" variant="outline" className="sm:me-auto" onClick={() => { onRestore(); onClose(); }}>Restore</Button>}
            <Button type="button" variant="outline" onClick={onClose}>{readOnly ? "Close" : "Cancel"}</Button>
            {!readOnly && <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>}
          </div>
        </form>
      </DialogContent>
    </Dialog>);
}

/* ---------- Reasons ---------- */
const RS_KINDS: [string, string][] = [["vr", "Void and Return Reason"], ["rejectReasons", "Order Rejection Reason"], ["editRejectReasons", "Order Edit Rejection Reason"], ["cancelReasons", "Order Cancellation Reason"], ["qtyReasons", "Quantity Adjustment Reason"], ["drawerReasons", "Drawer Operation Reason"]];
const RS_GONE = new Set(["Customer changed mind", "Wrong item entered", "Item not available", "Kitchen mistake", "Quality complaint", "Wrong order delivered", "Late delivery", "Damaged", "Theft", "Staff meal", "Sample", "Found stock"]);
const RS_DEF: Record<string, string[]> = { qtyReasons: ["Waste", "Expired"], drawerReasons: ["Cash Change"], rejectReasons: ["Item not available", "Store too busy", "Order already prepared"], editRejectReasons: ["Order already prepared", "Item not available", "Already out for delivery"], cancelReasons: ["Customer cancelled", "Duplicate order", "Wrong order details"] };
const split = (v: any) => String(v || "").split("\n").map(x => x.trim()).filter(Boolean);

export function ReasonsPage() {
  const sets = useCol("settings"), { staff } = useAuth();
  const [tab, setTab] = useState("general"), [form, setForm] = useState<{ k: string; i: number | null } | null>(null);
  if (!sets) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const a: any = { voidReasons: "", ...(sets.find(x => x.id === "app") || {}) }, ar: Record<string, string> = a.reasonsAr || {};
  const admin = !staff?.role || staff.role === "owner" || staff.role === "admin", del = tab === "deleted";
  const get = (k: string): string[] => k === "vr" ? [...new Set([...split(a.voidReasons), ...split(a.returnReasons)])].filter(x => !RS_GONE.has(x))
    : (a[k] == null ? (RS_DEF[k] || []).slice() : split(a[k])).filter(x => k !== "qtyReasons" || !RS_GONE.has(x));
  const getDel = (k: string) => split(a[k + "Del"]);
  const save = async (k: string, list: string[], dl?: string[], extra: Record<string, any> = {}) => {
    const d: Record<string, any> = k === "vr" ? { voidReasons: list.join("\n"), returnReasons: list.join("\n") } : { [k]: list.join("\n") };
    if (dl) d[k + "Del"] = dl.join("\n");
    try { await put("settings", "app", { ...d, ...extra }); return true; } catch { toast("Couldn't save. Only the owner or an admin can change reasons.", "error"); return false; }
  };
  const secs = RS_KINDS.map(([k, title]) => {
    const l = del ? getDel(k) : get(k); if (del && !l.length) return null;
    return <Section key={k} title={title} empty="No reasons yet." items={l.map((n, i) => ({ key: String(i), name: n, nameAr: ar[n] }))}
      onNew={admin && !del ? () => setForm({ k, i: null }) : undefined}
      onOpen={admin && !del ? it => setForm({ k, i: +it.key }) : undefined}
      onMove={admin && !del ? keys => save(k, keys.map(i => l[+i])).then(ok => ok && toast("Order saved")) : undefined}
      action={del && admin ? it => <Button size="xs" variant="outline" onClick={async e => { e.stopPropagation(); const n = it.name; if (await save(k, [...get(k).filter(x => x !== n), n], l.filter((_, j) => j !== +it.key))) toast("Reason restored"); }}>Restore</Button> : undefined} />;
  }).filter(Boolean);
  const f = form, fl = f ? get(f.k) : [], cur = f && f.i != null ? fl[f.i] : "";
  return (
    <>
      <PageBreadcrumb pageTitle="Reasons" />
      <SegTabs className="mb-6" value={tab} onChange={setTab} items={[["general", "General"], ["deleted", "Deleted"]]} />
      {!admin && <p className="mb-6 rounded-xl border border-amber-500 bg-amber-50 p-4 text-sm text-gray-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-white/80">Only the owner or an admin can change reasons.</p>}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">{secs.length ? secs : <p className="text-sm text-gray-500">No deleted reasons.</p>}</div>
      {f && <NameDialog title={(f.i == null ? "Create " : "Edit ") + RS_KINDS.find(x => x[0] === f.k)![1]} name={cur} nameAr={ar[cur]} onClose={() => setForm(null)}
        onSave={async (n, nAr) => {
          if (fl.some((x, j) => j !== f.i && x.toLowerCase() === n.toLowerCase())) return "That reason is already on the list.";
          const next = fl.slice(); if (f.i == null) next.push(n); else next[f.i] = n;
          const map = { ...ar }; if (cur && cur !== n) delete map[cur]; if (nAr) map[n] = nAr; else delete map[n];
          if (!(await save(f.k, next, undefined, { reasonsAr: map }))) return "Couldn't save."; toast(f.i == null ? "Reason created" : "Reason saved"); return null;
        }}
        onDelete={f.i == null ? undefined : async () => { const ok = await save(f.k, fl.filter((_, j) => j !== f.i), [...getDel(f.k).filter(x => x !== cur), cur]); if (ok) toast("Reason deleted"); return ok; }} />}
    </>
  );
}

/* ---------- Tags ---------- */
const TAG_TYPES: [string, string, string][] = [
  ["customer", "Customer", "Create tags to help you filter and group customers easily, e.g. VIP Customers, Corporate."], ["branch", "Store", "Create tags to help you filter and group stores easily, e.g. Mall Stores, High Traffic."],
  ["inventory", "Inventory Product", "Create tags to help you filter and group inventory products easily, e.g. Weekly Stocktaking, Vegetables."], ["order", "Order", "Create tags to help you filter and group orders easily, e.g. Staff Meal, Driver Order."],
  ["supplier", "Supplier", "Create tags to help you filter and group suppliers easily, e.g. Cash Suppliers, High Quality."], ["user", "User", "Create tags to help you filter and group users easily, e.g. Supervisors, Night Shift."],
  ["product", "Item", "Create tags to help you filter and group items easily, e.g. Spicy, Best Seller."], ["device", "Device", "Create tags to help you filter and group devices easily, e.g. Main Cashier, Waiter."]];

export function TagsPage() {
  const sets = useCol("settings");
  const [tab, setTab] = useState("general"), [form, setForm] = useState<{ type: string; t?: any } | null>(null);
  if (!sets) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const doc: any = sets.find(x => x.id === "tags") || {}, all: any[] = doc.list || [], del = tab === "deleted";
  const list = (type: string) => all.filter(t => t.type === type && !!t.deleted === del).sort((a, b) => (a.sort ?? 9999) - (b.sort ?? 9999) || a.name.localeCompare(b.name));
  const save = async (l: any[]) => { try { await put("settings", "tags", { list: l, on: doc.on || {} }); return true; } catch { toast("Couldn't save. Only the owner or an admin can change tags.", "error"); return false; } };
  const secs = TAG_TYPES.map(([k, t, help]) => {
    const l = list(k); if (del && !l.length) return null;
    return <Section key={k} title={t + " Tag"} empty={help} items={l.map(x => ({ key: x.id, name: x.name, nameAr: x.nameAr }))}
      onNew={del ? undefined : () => setForm({ type: k })} onOpen={it => setForm({ type: k, t: all.find(x => x.id === it.key) })}
      onMove={del ? undefined : keys => { const pos = new Map(keys.map((id, i) => [id, i])); save(all.map(x => x.type === k && pos.has(x.id) ? { ...x, sort: pos.get(x.id) } : x)).then(ok => ok && toast("Order saved")); }}
      action={del ? () => <Badge variant="light" color="error">Deleted</Badge> : undefined} />;
  }).filter(Boolean);
  const f = form, tl = f ? TAG_TYPES.find(x => x[0] === f.type)![1] : "";
  return (
    <>
      <PageBreadcrumb pageTitle="Tags" />
      <SegTabs className="mb-6" value={tab} onChange={setTab} items={[["general", "General"], ["deleted", "Deleted"]]} />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">{secs.length ? secs : <p className="text-sm text-gray-500">No deleted tags.</p>}</div>
      {f && (f.t?.deleted
        ? <NameDialog title={f.t.name} name={f.t.name} nameAr={f.t.nameAr} readOnly onClose={() => setForm(null)}
            onRestore={async () => { if (await save(all.map(x => x.id === f.t.id ? { ...x, deleted: false } : x))) toast("Tag restored"); }} />
        : <NameDialog title={(f.t ? "Edit " : "Create ") + tl + " Tag"} name={f.t?.name || ""} nameAr={f.t?.nameAr} onClose={() => setForm(null)}
            onSave={async (n, ar) => {
              if (!f.t) {
                if (list(f.type).some(t => t.name.toLowerCase() === n.toLowerCase())) return "A tag with this name already exists.";
                if (!(await save([...all, { id: "tg_" + Date.now().toString(36), name: n, nameAr: ar || null, type: f.type }]))) return "Couldn't save."; toast("Tag created"); return null;
              }
              if (!(await save(all.map(x => x.id === f.t.id ? { ...x, name: n, nameAr: ar || null } : x)))) return "Couldn't save."; toast("Tag saved"); return null;
            }}
            onDelete={f.t ? async () => { const ok = await save(all.map(x => x.id === f.t.id ? { ...x, deleted: true } : x)); if (ok) toast("Tag deleted"); return ok; } : undefined} />)}
    </>
  );
}

// Catalog → Allergens: the list kept in settings "allergens" ({ list, ar }), as in the current portal. Renaming one renames it on every item and
// modifier option that has it; rows show how many items use it and can be dragged to change their order.
const DEF_ALLERGENS = ["Celery", "Cereals containing gluten", "Crustaceans", "Eggs", "Fish", "Lupin", "Milk", "Molluscs", "Mustard", "Tree nuts", "Peanuts", "Sesame", "Soy", "Sulphites"];
export function AllergensPage() {
  const sets = useCol("settings"), prods = useCol("products"), opts = useCol("modifier_options");
  const [form, setForm] = useState<{ a?: string } | null>(null);
  if (!sets || !prods || !opts) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const doc: any = sets.find(x => x.id === "allergens") || {}, list: string[] = Array.isArray(doc.list) ? doc.list : DEF_ALLERGENS, ar: Record<string, string> = { ...(doc.ar || {}) };
  const used = (a: string) => prods.filter(p => !p.deleted && (p.allergens || []).includes(a)).length + opts.filter(o => !o.deleted && (o.allergens || []).includes(a)).length;
  const save = async (l: string[], m: Record<string, string> = ar) => { const a2 = { ...m }; Object.keys(a2).forEach(k => { if (!l.includes(k) || !a2[k]) delete a2[k]; });
    try { await put("settings", "allergens", { list: l, ar: a2 }); return true; } catch { toast("Couldn't save", "error"); return false; } };
  const rename = async (from: string, to: string) => { for (const [col, rows] of [["products", prods], ["modifier_options", opts]] as const)
    for (const r of rows.filter(x => (x.allergens || []).includes(from))) await put(col, r.id, { allergens: r.allergens.map((x: string) => x === from ? to : x) }).catch(() => {}); };
  const a = form?.a;
  return (
    <>
      <PageBreadcrumb pageTitle="Allergens" />
      <div className="max-w-3xl"><Section title="Allergens" empty="Add the allergens your items can contain. They show on the item page and to customers."
        items={list.map(x => ({ key: x, name: x, nameAr: ar[x] }))} onNew={() => setForm({})} onOpen={it => setForm({ a: it.key })}
        onMove={keys => save(keys).then(ok => ok && toast("Order saved"))}
        action={it => { const n = used(it.key); return <span className="text-xs text-gray-500">{n} item{n === 1 ? "" : "s"}</span>; }} /></div>
      {form && <NameDialog title={a ?? "Create Allergen"} name={a || ""} nameAr={a ? ar[a] || "" : ""} onClose={() => setForm(null)}
        onSave={async (n, nar) => {
          if ((a == null || n !== a) && list.some(x => x.toLowerCase() === n.toLowerCase())) return "This allergen already exists.";
          if (a == null) { if (!(await save([...list, n], { ...ar, [n]: nar || "" }))) return "Couldn't save."; toast("Allergen created"); return null; }
          const m = { ...ar }; delete m[a]; m[n] = nar || ""; if (n !== a) await rename(a, n);
          if (!(await save(list.map(x => x === a ? n : x), m))) return "Couldn't save."; toast("Allergen saved"); return null; }}
        onDelete={a != null ? async () => { const ok = await save(list.filter(x => x !== a)); if (ok) toast("Allergen deleted"); return ok; } : undefined} />}
    </>
  );
}

// Catalog → Combos: not built in the current portal either (it shows "Coming next"), so this page says the same
export function CombosPage() {
  return <><PageBreadcrumb pageTitle="Combos" /><div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/3">
    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Coming next</h3><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This screen is part of the plan and will be built in a later step.</p></div></>;
}
