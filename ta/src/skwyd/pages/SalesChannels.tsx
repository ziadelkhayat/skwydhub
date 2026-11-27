import { inBS, useBrandStore } from "../ui/BrandStore";
import { inSel } from "@/components/tremor/data-table/FilterSelect";
import { PageHead } from "../ui/Record";
import { Label } from "@/components/tremor/Label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
import { SelectNative } from "@/components/tremor/SelectNative";
// Catalog → Sales Channels: brands → stores → their sales channels (POS, Call Center, Web Ordering, marketplaces; settings "sales_channels").
// A channel opens its menu: categories (with sub-categories), the items in each, on/off and price per order type, stock, modifiers per item,
// Copy From another channel, drag to sort. Every switch asks which other channels and stores get the same change, then saves straight away.
// Same keys and rules as the current portal (inactiveBranchIds "store", "store:channel", "store:channel:type"; customPrices; modifier link opts).
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Input as TInput } from "@/components/tremor/Input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/tremor/Drawer";
import { Switch } from "@/components/ui/switch";
import { ArrowLeftIcon, ChevronDownIcon, PlusIcon } from "@/icons";
import { put, remove, type Row } from "@/lib/db";
import { money } from "@/lib/util";
import { cn } from "@/utils";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { EmptyState } from "../ui/EmptyState";
import { ImageField } from "../ui/ImageField";
import { BOX, F, SEL } from "../ui/kit";
import { toast } from "../ui/toast";

type Ch = { id: string; kind: string; code?: string; name: string; branchId?: string; brandId?: string; types?: string[]; deleted?: boolean; virtual?: boolean; [k: string]: any };
const SC_KINDS: [string, string, string[]][] = [["pos", "POS", ["dinein", "pickup", "delivery"]], ["callcenter", "Call Center", ["pickup", "delivery"]], ["online", "Web Ordering", ["dinein", "pickup", "delivery"]], ["integration", "Marketplace", ["pickup", "delivery"]]];
const SC_ALLOWED: Record<string, string[]> = { pos: ["dinein", "pickup", "delivery"], callcenter: ["pickup", "delivery"], online: ["dinein", "pickup", "delivery"], integration: ["pickup", "delivery", "dinein"] };
const OTYPES: [string, string][] = [["dinein", "In Store"], ["pickup", "Pickup"], ["delivery", "Delivery"]];
const bySort = (a: Row, b: Row) => (a.sort ?? 9999) - (b.sort ?? 9999) || String(a.name || "").localeCompare(String(b.name || ""));
const scCode = (c: Ch) => c.code || c.kind;
const catPar = (c?: Row) => { const r = String(c?.reference || ""); return r.startsWith("sub:") ? r.slice(4) : ""; };
const catAt = (c: Row, b: string) => { if (!b) return true; const ia = c.inactiveBranchIds || []; if (ia.includes("x:" + b)) return false; const only = ia.filter((k: string) => String(k).startsWith("only:")); return !only.length || only.includes("only:" + b); };
const offAt = (arr: any[], b: string, ch: string) => !!b && ((arr || []).includes(b) || (arr || []).includes(b + ":" + ch));
const typeOff = (arr: any[], b: string, ch: string, t: string) => offAt(arr, b, ch) || (arr || []).includes(b + ":" + ch + ":" + (t === "takeaway" ? "pickup" : t));
const same = (a: any, b: any) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
const bmKey = (c?: Row) => String(c?.name || "").trim().toLowerCase();

/** everything that depends on the data: channels per store, categories per channel, items, the order types each channel sells */
function model(s: S) {
  const doc: any = s.settings.find(x => x.id === "sales_channels") || {}, list: Ch[] = doc.list || [];
  const brandOf = (b: string) => s.branches.find(x => x.id === b)?.brandId || "";
  const inScope = (c: Ch, b: string) => c.kind === "online" ? (c.brandId || "") === brandOf(b) : c.branchId === b;
  // POS, Call Center and Web Ordering start existing; once deleted (saved as deleted) they stay gone until created again
  const scFor = (b: string, withDeleted = false): Ch[] => { const mine = list.filter(c => inScope(c, b)), saved = mine.filter(c => withDeleted || !c.deleted);
    const base = SC_KINDS.slice(0, 3).filter(([k]) => !mine.some(c => c.kind === k)).map(([k, t, ty]) => k === "online" ? { id: "brand|" + brandOf(b) + "|online", kind: k, code: k, name: t, brandId: brandOf(b), types: ty, virtual: true } : { id: b + "|" + k, kind: k, code: k, name: t, branchId: b, types: ty, virtual: true });
    const rank = (c: Ch) => { const i = SC_KINDS.findIndex(k => k[0] === c.kind); return i < 0 ? 9 : i; };
    return [...base, ...saved].sort((a, c) => rank(a) - rank(c) || String(a.name).localeCompare(String(c.name))); };
  const codesOf = (b: string) => scFor(b).map(scCode);
  const chTypes = (b: string, c: string) => { const r = scFor(b).find(x => scCode(x) === c); return (r?.types?.length ? OTYPES.map(x => x[0]).filter(t => r.types!.includes(t)) : null) || SC_KINDS.find(k => k[0] === c)?.[2] || ["pickup", "delivery"]; };
  const chCats = (ch: string, b: string) => s.categories.filter(c => live(c) && c.channel === ch && catAt(c, b)).sort(bySort);
  const prod = (id: string) => { const p = s.products.find(x => x.id === id); return p && live(p) ? p : null; };
  const varParent = (id: string) => s.products.find(x => live(x) && (x.variants || []).some((v: any) => v.productId === id));
  const varKids = (p: Row) => (p?.variants || []).map((v: any) => s.products.find(x => x.id === v.productId && live(x))).filter(Boolean) as Row[];
  const root = (id: string) => varParent(id)?.id || id;
  const catProds = (c: Row) => { const seen = new Set<string>(), out: Row[] = []; (c.productIds || []).forEach((id: string) => { const p = prod(root(id)); if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p); } }); return out; };
  const subIds = (id: string) => s.categories.filter(c => live(c) && catPar(c) === id).map(c => c.id);
  const modName = (id: string) => s.modifiers.find(m => m.id === id)?.name || "—";
  const modOptions = (id: string) => s.modifier_options.filter(o => live(o) && o.modifierId === id).sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999) || a.name.localeCompare(b.name));
  const links = (p: Row) => (p.modifiers || []).filter((l: any) => s.modifiers.some(m => m.id === l.modifierId && live(m)));
  // per order type inside a channel: "store:channel:type" (all of a channel's types off = "store:channel"; every channel off = "store")
  const typeModel = (ia: any[], b: string) => { const m: Record<string, Set<string>> = {}; codesOf(b).forEach(c => m[c] = new Set(OTYPES.map(x => x[0]).filter(t => typeOff(ia, b, c, t)))); return m; };
  const typeList = (ia: any[], b: string, m: Record<string, Set<string>>) => { const rest = (ia || []).filter(x => x !== b && !String(x).startsWith(b + ":")), all = (c: string) => chTypes(b, c).every(t => m[c].has(t)), AC = codesOf(b);
    if (AC.every(all)) return [...rest, b]; return [...rest, ...AC.flatMap(c => all(c) ? [b + ":" + c] : [...m[c]].filter(t => chTypes(b, c).includes(t)).map(t => b + ":" + c + ":" + t))]; };
  const offSetOf = (ia: any[], b: string) => new Set(codesOf(b).filter(c => offAt(ia, b, c)));
  const chList = (ia: any[], b: string, off: Set<string>) => { const rest = (ia || []).filter(x => x !== b && !String(x).startsWith(b + ":")), AC = codesOf(b); return off.size === AC.length ? [...rest, b] : [...rest, ...AC.filter(c => off.has(c)).map(c => b + ":" + c)]; };
  const priceKey = (b: string, ch: string) => ch === "pos" ? b : b + ":" + ch;
  return { list, brandOf, inScope, scFor, codesOf, chTypes, chCats, prod, varParent, varKids, root, catProds, subIds, modName, modOptions, links, typeModel, typeList, offSetOf, chList, priceKey };
}
type M = ReturnType<typeof model>;

/** writes a set of menu changes to one store and some of its channels (the same as the portal's bmApplyWork) */
async function applyWork(s: S, M: M, work: Record<string, any>, b: string, mchs: string[]) {
  for (const [id, d] of Object.entries(work)) {
    if (id.startsWith("mg:") || id.startsWith("mo:")) {
      const [pid, xid] = id.slice(3).split("|"), r = s.products.find(x => x.id === pid); if (!r) continue;
      const mods = JSON.parse(JSON.stringify(r.modifiers || []));
      if (id.startsWith("mg:")) { const l = mods.find((x: any) => x.modifierId === xid); if (!l) continue;
        mchs.forEach(c => OTYPES.forEach(([t]) => { const v = d["to_" + t]; if (v == null) return; const k = b + ":" + c + ":" + t, off = new Set(l.offTypes || []); if (v) off.delete(k); else off.add(k); l.offTypes = [...off]; })); }
      else { const o = s.modifier_options.find(x => x.id === xid); if (!o) continue; const l = mods.find((x: any) => x.modifierId === o.modifierId); if (!l) continue;
        const st = (l.opts ||= {})[xid] ||= {};
        mchs.forEach(c => { const k = b + ":" + c;
          if (d.on != null) { const off = new Set(st.off || []); if (d.on) off.delete(k); else off.add(k); st.off = [...off]; }
          OTYPES.forEach(([t]) => { const v = d["tp_" + t]; if (v == null) return; st.price ||= {}; if (v === "") delete st.price[k + ":" + t]; else st.price[k + ":" + t] = +v; });
          OTYPES.forEach(([t]) => { const v = d["to_" + t]; if (v == null) return; const off = new Set(st.off || []); if (v) off.delete(k + ":" + t); else off.add(k + ":" + t); st.off = [...off]; }); });
        if (d.stock != null) { const os = new Set(st.oos || []); if (d.stock) os.delete(b); else os.add(b); st.oos = [...os]; } }
      await put("products", pid, { modifiers: mods }); r.modifiers = mods; continue;
    }
    if (id.startsWith("cat:")) { const c = s.categories.find(x => x.id === id.slice(4)); if (!c) continue;
      const off = M.offSetOf(c.inactiveBranchIds, b); mchs.forEach(x => d.on ? off.delete(x) : off.add(x)); const next = M.chList(c.inactiveBranchIds, b, off);
      if (!same(next, c.inactiveBranchIds)) { await put("categories", c.id, { inactiveBranchIds: next }); c.inactiveBranchIds = next; } continue; }
    const r = s.products.find(x => x.id === id); if (!r) continue; const ch: any = {};
    if (OTYPES.some(([t]) => d["t_" + t] != null)) {
      const m = M.typeModel(r.inactiveBranchIds, b); OTYPES.forEach(([t]) => { if (d["t_" + t] == null) return; mchs.forEach(c => d["t_" + t] ? m[c].delete(t) : m[c].add(t)); });
      mchs.forEach(c => OTYPES.forEach(([t]) => { if (!M.chTypes(b, c).includes(t)) m[c].add(t); }));
      const next = M.typeList(r.inactiveBranchIds, b, m); if (!same(next, r.inactiveBranchIds)) ch.inactiveBranchIds = next;
      if (OTYPES.some(([t]) => d["t_" + t]) && r.branchIds?.length && !r.branchIds.includes(b)) ch.branchIds = [...r.branchIds, b]; }
    if (d.stock != null) { const os = new Set(r.outOfStockBranchIds || []); if (d.stock === os.has(b)) { if (d.stock) os.delete(b); else os.add(b); ch.outOfStockBranchIds = [...os]; } }
    if (d.price != null) { const k = M.priceKey(b, mchs[0]), cp = { ...(ch.customPrices || r.customPrices || {}) }; if (d.price === "") delete cp[k]; else cp[k] = +d.price; ch.customPrices = cp; }
    OTYPES.forEach(([t]) => { if (d["tp_" + t] == null) return; const cp = { ...(ch.customPrices || r.customPrices || {}) };
      mchs.forEach(c => { const k = b + ":" + c + ":" + t; if (d["tp_" + t] === "") delete cp[k]; else cp[k] = +d["tp_" + t]; }); if (!same(cp, r.customPrices || {})) ch.customPrices = cp; });
    if (Object.keys(ch).length) { await put("products", id, ch); Object.assign(r, ch); }
  }
}

export default function SalesChannelsPage() {
  const s = useS(["branches", "brands", "categories", "products", "modifiers", "modifier_options", "settings"]), [sp, setSp] = useSearchParams();
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const M = model(s), b = sp.get("b") || "", code = sp.get("ch") || "";
  const ch = b && code ? M.scFor(b).find(c => scCode(c) === code) : null;
  const go = (bb: string, cc: string) => { const n = new URLSearchParams(); if (bb && cc) { n.set("b", bb); n.set("ch", cc); } setSp(n); scrollTo(0, 0); };
  return ch ? <ChannelPage key={b + code} s={s} M={M} b={b} ch={ch} back={() => go("", "")} go={go} /> : <Tree s={s} M={M} open={go} />;
}

/* ---------- the first page: brands → stores → channels ---------- */
function Tree({ s, M, open }: { s: S; M: M; open: (b: string, c: string) => void }) {
  const [ex, setEx] = useState<Set<string>>(new Set()), [dlg, setDlg] = useState<string | null>(null), F = useBrandStore();
  const list = s.branches.filter(b => live(b) && b.active !== false && inBS(s.branches, F.brand, F.store, b.id)), brands = s.brands.filter(b => live(b) && (!F.brand || inSel(F.brand, b.id)));
  const tog = (k: string) => setEx(o => { const n = new Set(o); if (n.has(k)) { n.delete(k); if (k.startsWith("b:")) list.filter(b => b.brandId === k.slice(2)).forEach(b => n.delete(b.id)); } else n.add(k); return n; });
  const Chev = ({ on }: { on: boolean }) => <ChevronDownIcon className={cn("size-4 text-gray-400 transition-transform", !on && "-rotate-90 rtl:rotate-90")} />;
  const brRow = (b: Row) => { const cs = M.scFor(b.id), on = ex.has(b.id); return <div key={b.id} className="border-t border-gray-200 dark:border-gray-800">
    <button type="button" onClick={() => tog(b.id)} className="flex w-full items-center gap-3 px-5 py-3 ps-10 text-start text-sm hover:bg-gray-50 dark:hover:bg-white/3"><Chev on={on} /><b className="font-medium text-gray-900 dark:text-gray-50">{b.name}</b><span className="text-gray-500">{cs.length} channel{cs.length === 1 ? "" : "s"}</span></button>
    {on && <div className="pb-2">{cs.map(c => <button key={c.id} type="button" onClick={() => open(b.id, scCode(c))} className="flex w-full border-t border-gray-100 dark:border-gray-800 items-center gap-3 px-5 py-2.5 ps-16 text-start text-sm hover:bg-gray-50 dark:hover:bg-white/3">
      <span className="min-w-0 flex-1"><b className="block font-medium text-gray-900 dark:text-gray-50">{c.name}</b><span className="text-xs text-gray-500">{(SC_KINDS.find(k => k[0] === c.kind) || SC_KINDS[3])[1]} · {[...new Set((c.types || []).map(t => t === "fast" ? "dinein" : t))].map(t => (OTYPES.find(x => x[0] === t) || [t, t])[1]).join(", ")}</span></span><span className="text-gray-400">›</span></button>)}
      <div className="py-1.5 ps-14"><Button variant="ghost" onClick={() => setDlg(b.id)} className="gap-2 text-blue-600 dark:text-blue-500"><PlusIcon className="size-4" />Create Sales Channel</Button></div></div>}</div>; };
  const loose = list.filter(b => !b.brandId || !brands.some(x => x.id === b.brandId));
  return <>
    <PageBreadcrumb pageTitle="Sales Channels" />
    <div className={BOX + " divide-y divide-gray-100 overflow-hidden dark:divide-white/5"}>
      {!list.length ? <EmptyState text="No active stores." /> : <>
        {brands.map(bd => { const bs = list.filter(b => b.brandId === bd.id), on = ex.has("b:" + bd.id); return <div key={bd.id}>
          <button type="button" onClick={() => tog("b:" + bd.id)} className="flex w-full items-center gap-3 px-5 py-4 text-start hover:bg-gray-50 dark:hover:bg-white/3"><Chev on={on} /><b className="font-semibold text-gray-900 dark:text-gray-50">{bd.name}</b><span className="text-sm text-gray-500">{bs.length} store{bs.length === 1 ? "" : "s"}</span></button>
          {on && (bs.length ? bs.map(brRow) : <p className="px-5 pb-3 ps-10 text-sm text-gray-500">No stores in this brand.</p>)}</div>; })}
        {loose.map(brRow)}</>}
    </div>
    {dlg && <ScDialog s={s} M={M} b={dlg} code="" onClose={() => setDlg(null)} onSaved={c => open(dlg, c)} />}
  </>;
}

/* ---------- create or edit a sales channel of a store ---------- */
function ScDialog({ s, M, b, code, onClose, onSaved, onDeleted }: { s: S; M: M; b: string; code: string; onClose: () => void; onSaved: (code: string) => void; onDeleted?: () => void }) {
  const mine = M.scFor(b), cur = code ? mine.find(c => scCode(c) === code) : null;
  const avail = SC_KINDS.filter(([k]) => k === "integration" || !mine.some(c => c.kind === k));
  const [kind, setKind] = useState(cur?.kind || ""), [name, setName] = useState(cur?.name || ""), [types, setTypes] = useState<string[]>(cur ? [...new Set((cur.types || []).map(t => t === "fast" ? "dinein" : t))] : []), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const saveList = async (fn: (l: Ch[]) => Ch[]) => { const all = M.list.filter(c => !M.inScope(c, b)), mineAll = M.scFor(b, true).map(c => { const x = { ...c }; delete x.virtual; return x; });
    try { await put("settings", "sales_channels", { list: [...all, ...fn(mineAll)] }); return true; } catch { toast("Couldn't save. Only the owner or an admin can change sales channels.", "error"); return false; } };
  async function save() {
    setErr(""); if (!kind) return setErr("Choose the type."); if (!name.trim()) return setErr("Enter a name."); if (!types.length) return setErr("Pick at least one order type."); if (types.some(t => !SC_ALLOWED[kind].includes(t))) return setErr("This channel can't sell one of these order types.");
    const newCode = code || (kind === "integration" ? "int_" + Date.now().toString(36) : kind), nm = name.trim();
    const rec: Ch = kind === "online" ? { id: "brand|" + M.brandOf(b) + "|online", kind, code: newCode, name: nm, brandId: M.brandOf(b), types } : { id: b + "|" + newCode, kind, code: newCode, name: nm, branchId: b, types, fastSet: true };
    setBusy(true);
    const ok = await saveList(l => code ? l.map(c => scCode(c) === code && !c.deleted ? { ...c, name: nm, types, fastSet: true } : c) : [...l.filter(c => !(c.deleted && c.kind === kind && kind !== "integration")), { ...rec, createdAt: new Date().toISOString() }]);
    // a new channel starts from scratch: the shared categories of that channel leave this store's menu
    if (ok && !code && kind !== "online") for (const c of s.categories.filter(c => live(c) && c.channel === newCode && catAt(c, b))) await put("categories", c.id, { inactiveBranchIds: [...(c.inactiveBranchIds || []).filter((k: string) => k !== "only:" + b), "x:" + b] }).catch(() => {});
    setBusy(false); if (ok) { toast(code ? "Sales channel saved" : "Sales channel created"); onClose(); onSaved(newCode); }
  }
  async function del() { if (!(await askYes("Delete this sales channel? Its menu is no longer used.", "Delete", true))) return;
    if (await saveList(l => l.map(c => scCode(c) === code && !c.deleted ? { ...c, deleted: true } : c))) { toast("Sales channel deleted"); onClose(); onDeleted?.(); } }
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-full p-6 sm:max-w-md"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{cur ? "Sales Channel" : "Create Sales Channel"}</DialogTitle></DialogHeader>
    <div className="mt-4 space-y-4">
      <F l="Type" help={cur ? undefined : "POS and Call Center exist once per store, Web Ordering once per brand. Add as many marketplaces (delivery apps…) as you need."}>
        <SelectNative className={SEL} disabled={!!cur} value={kind} onChange={e => { setKind(e.target.value); setTypes([]); }}>{!cur && <option value="">Choose…</option>}{(cur ? SC_KINDS.filter(k => k[0] === cur.kind) : avail).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</SelectNative></F>
      <F l="Name" req><Input className="h-9" value={name} placeholder="e.g. Toters" onChange={e => setName(e.target.value)} /></F>
      <F l="Order Types" req>{!kind ? <p className="text-sm text-gray-500">Choose the type first</p> : <div className="flex flex-wrap gap-4">{OTYPES.filter(([t]) => SC_ALLOWED[kind].includes(t)).map(([t, tl]) =>
        <Label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><Checkbox checked={types.includes(t)} onCheckedChange={(chk: boolean) => setTypes(o => chk ? [...o, t] : o.filter(x => x !== t))} />{tl}</Label>)}</div>}</F>
      {err && <p className="text-sm text-red-500">{err}</p>}
    </div>
    <div className="mt-6 flex gap-3">{cur && <Button variant="destructive" onClick={del}>Delete</Button>}<Button className="ms-auto" disabled={busy} onClick={save}>Save</Button></div></DialogContent></Dialog>;
}

/* ---------- one channel's menu ---------- */
const CB = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => <Checkbox aria-label={label} className="shrink-0" checked={on} onCheckedChange={(chk: boolean) => set(chk)} onClick={e => e.stopPropagation()} />;
const Acts = ({ items }: { items: [string, () => void, boolean?][] }) => <DropdownMenu><DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>Actions<ChevronDownIcon className="size-4" /></DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="w-44 p-2">{items.map(([t, f, d]) => <DropdownMenuItem key={t} className={d ? "text-error-500" : ""} onClick={f}>{t}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
function ChannelPage({ s, M, b, ch, back, go }: { s: S; M: M; b: string; ch: Ch; back: () => void; go: (b: string, c: string) => void }) {
  const code = scCode(ch), br = s.branches.find(x => x.id === b), types = OTYPES.filter(([t]) => M.chTypes(b, code).includes(t));
  const [cat0, setCat] = useState(""), [cq, setCq] = useState(""), [q, setQ] = useState(""), [cex, setCex] = useState<Set<string>>(new Set()), [csel, setCsel] = useState<Set<string>>(new Set()), [isel, setIsel] = useState<Set<string>>(new Set());
  const [item, setItem] = useState(""), [edit, setEdit] = useState<false | null | Row>(false), [adding, setAdding] = useState(false), [scEdit, setScEdit] = useState(false), [busy, setBusy] = useState(""), [ask, setAsk] = useState<null | ((v: Record<string, string[]> | null) => void)>(null);
  const [drag, setDrag] = useState<{ k: string; cat?: string } | null>(null);
  const cats = M.chCats(code, b), top = (c: Row) => !catPar(c) || !cats.some(x => x.id === catPar(c));
  const rowsOf = (cq0: string) => { const out: { c: Row; sub: boolean }[] = [], m = (c: Row) => !cq0 || c.name.toLowerCase().includes(cq0);
    cats.filter(top).forEach(t => { const ss = cats.filter(c => catPar(c) === t.id && !top(c)), ms = m(t) ? ss : ss.filter(m); if (m(t) || ms.length) { out.push({ c: t, sub: false }); ms.forEach(c => out.push({ c, sub: true })); } }); return out; };
  const cat = cats.some(c => c.id === cat0) ? cat0 : cats[0]?.id || "", cur = cats.find(c => c.id === cat);
  const catOn = (c: Row) => !offAt(c.inactiveBranchIds, b, code);
  const all = (() => { const seen = new Set<string>(), out: Row[] = []; cats.forEach(c => M.catProds(c).forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); out.push(p); } })); return out; })();
  const inCur = cur ? M.catProds(cur) : [], qq = q.trim().toLowerCase(), rows = inCur.filter(p => !qq || p.name.toLowerCase().includes(qq) || M.varKids(p).some(k => k.name.toLowerCase().includes(qq)));
  const st = (r: Row) => { const ia = r.inactiveBranchIds || [], inB = !r.branchIds?.length || r.branchIds.includes(b), cps = r.customPrices || {}, cp = cps[M.priceKey(b, code)];
    const typesOn = Object.fromEntries(types.map(([t]) => [t, inB && !typeOff(ia, b, code, t)])) as Record<string, boolean>;
    const tprices = Object.fromEntries(types.map(([t]) => { const v = cps[b + ":" + code + ":" + t]; return [t, v != null && v !== "" ? String(v) : ""]; })) as Record<string, string>;
    return { on: Object.values(typesOn).some(Boolean), types: typesOn, tprices, stock: !(r.outOfStockBranchIds || []).includes(b), price: cp != null && cp !== "" ? String(cp) : "", fallback: code !== "pos" && cps[b] != null && cps[b] !== "" ? +cps[b] : +r.price || 0 }; };
  const optSt = (p: Row, o: Row) => { const k = b + ":" + code, sx = (((p.modifiers || []).find((l: any) => l.modifierId === o.modifierId)?.opts) || {})[o.id] || {};
    return { on: !(sx.off || []).includes(k), stock: !(sx.oos || []).includes(b), types: Object.fromEntries(types.map(([t]) => [t, !(sx.off || []).includes(k + ":" + t)])) as Record<string, boolean>,
      tprices: Object.fromEntries(types.map(([t]) => { const v = (sx.price || {})[k + ":" + t]; return [t, v != null && v !== "" ? String(v) : ""]; })) as Record<string, string> }; };
  const grpTypes = (l: any) => Object.fromEntries(types.map(([t]) => [t, !(l.offTypes || []).includes(b + ":" + code + ":" + t)])) as Record<string, boolean>;

  // every change saves straight away; a switch (on / off) first asks which other channels and stores get it too
  async function change(work: Record<string, any>) {
    const isSwitch = Object.values(work).some((d: any) => Object.keys(d).some(k => k === "on" || /^(t_|to_)/.test(k)));
    let map: Record<string, string[]> | null = { [b]: [code] };
    if (isSwitch) { map = await new Promise(res => setAsk(() => res)); setAsk(null); if (!map) return; }
    setBusy("Saving…");
    try { for (const [bb, chs] of Object.entries(map)) { const codes = M.codesOf(bb).filter(c => chs.includes(c)); if (codes.length) await applyWork(s, M, work, bb, [...new Set(codes)]); } setBusy(""); }
    catch { setBusy(""); toast("Couldn't save. Only the owner or an admin can change the menu.", "error"); }
  }
  const setTypesOf = (ids: string[], on: boolean) => change(Object.fromEntries(ids.map(id => [id, Object.fromEntries(types.map(([t]) => ["t_" + t, on]))])));
  // the order set in one channel is copied to the others: categories match by name, items by the item itself
  async function saveCatOrder(ids: string[]) { try {
    for (const [k, id] of ids.entries()) { const r = s.categories.find(x => x.id === id); if (r && r.sort !== (k + 1) * 10) await put("categories", id, { sort: (k + 1) * 10 }); }
    const rank = new Map(ids.map((id, i) => [bmKey(s.categories.find(x => x.id === id)), i]));
    for (const c2 of M.codesOf(b)) { if (c2 === code) continue; const l = M.chCats(c2, b), sorted = l.map((c, i) => [c, rank.has(bmKey(c)) ? rank.get(bmKey(c))! : 1e6 + i] as [Row, number]).sort((a, z) => a[1] - z[1]).map(x => x[0]);
      for (const [k, c] of sorted.entries()) if (c.sort !== (k + 1) * 10) await put("categories", c.id, { sort: (k + 1) * 10 }); }
    toast("Category order saved on all sales channels"); } catch { toast("Couldn't save the new order", "error"); } }
  async function saveItemOrder(c: Row, ids: string[]) { try {
    const rest = [...new Set<string>((c.productIds || []).map(M.root))].filter(id => !ids.includes(id)), next = [...ids, ...rest]; await put("categories", c.id, { productIds: next });
    const rank = new Map(next.map((id, i) => [id, i]));
    for (const c2 of M.codesOf(b)) { if (c2 === code) continue; const o = M.chCats(c2, b).find(x => bmKey(x) === bmKey(c)); if (!o) continue;
      const curL = [...new Set<string>((o.productIds || []).map(M.root))], n2 = curL.map((id, i) => [id, rank.has(id) ? rank.get(id)! : 1e6 + i] as [string, number]).sort((a, z) => a[1] - z[1]).map(x => x[0]);
      if (n2.join() !== curL.join()) await put("categories", o.id, { productIds: n2 }); }
    toast("Item order saved on all sales channels"); } catch { toast("Couldn't save the new order", "error"); } }
  const dropOn = (k: string, cat2?: string) => { const d = drag; setDrag(null); if (!d || d.k === k) return;
    if (d.k.startsWith("c:") && k.startsWith("c:")) { const ids = cats.map(c => c.id), from = d.k.slice(2), to = k.slice(2);
      const i = ids.indexOf(from), j = ids.indexOf(to); if (i < 0 || j < 0) return; ids.splice(i, 1); ids.splice(ids.indexOf(to) + (i < j ? 1 : 0), 0, from); return saveCatOrder(ids); }
    if (d.k.startsWith("p:") && k.startsWith("p:") && d.cat === cat2 && cur) { const ids = inCur.map(p => p.id), from = d.k.slice(2), to = k.slice(2), i = ids.indexOf(from), j = ids.indexOf(to); if (i < 0 || j < 0) return;
      ids.splice(i, 1); ids.splice(ids.indexOf(to) + (i < j ? 1 : 0), 0, from); return saveItemOrder(cur, ids); } };
  const dnd = (k: string, cat2?: string) => ({ draggable: !cq && !qq, onDragStart: () => setDrag({ k, cat: cat2 }), onDragEnd: () => setDrag(null), onDragOver: (e: React.DragEvent) => { if (drag && drag.k[0] === k[0]) e.preventDefault(); }, onDrop: (e: React.DragEvent) => { e.preventDefault(); dropOn(k, cat2); } });

  async function delCats(ids0: string[]) { const ids = [...new Set([...ids0, ...ids0.flatMap(M.subIds)])], nSub = ids.length - ids0.length;
    if (!(await askYes(`Delete ${ids0.length} categor${ids0.length === 1 ? "y" : "ies"}${nSub ? ` and ${nSub} sub-categor${nSub === 1 ? "y" : "ies"} inside` : ""} from the ${ch.name} menu?`, "Delete", true))) return;
    try { for (const id of ids) await remove("categories", id); setCsel(new Set()); } catch { toast("Couldn't delete. Only the owner or an admin can change the menu.", "error"); } }
  async function copyFrom(src: string) {
    const srcCh = M.scFor(b).find(c => scCode(c) === src); if (!srcCh) return;
    if (!(await askYes(`Replace the ${ch.name} menu at ${br?.name} with the ${srcCh.name} menu? Items, order types and prices are copied.`, "Copy"))) return;
    setBusy("Copying…"); let n = 0;
    try {
      for (const r of all) { const ia = r.inactiveBranchIds || [], m = M.typeModel(ia, b), srcOn = new Set(M.chTypes(b, src).filter(t => !typeOff(ia, b, src, t) && (!r.branchIds?.length || r.branchIds.includes(b))));
        m[code] = new Set(OTYPES.map(x => x[0]).filter(t => !M.chTypes(b, code).includes(t) || (M.chTypes(b, src).includes(t) ? !srcOn.has(t) : m[code].has(t))));
        const c2: any = {}, next = M.typeList(ia, b, m); if (!same(next, ia)) c2.inactiveBranchIds = next;
        const cps = r.customPrices || {}, spr = cps[M.priceKey(b, src)] ?? (src !== "pos" ? cps[b] : undefined), cp = { ...cps }, k = M.priceKey(b, code);
        if (spr == null || spr === "") delete cp[k]; else cp[k] = +spr;
        OTYPES.forEach(([t]) => { const v = cps[b + ":" + src + ":" + t], kk = b + ":" + code + ":" + t; if (v == null || v === "" || !M.chTypes(b, code).includes(t)) delete cp[kk]; else cp[kk] = +v; });
        if (!same(cp, cps)) c2.customPrices = cp; if (Object.keys(c2).length) { await put("products", r.id, c2); n++; } }
      // the other channel's categories replace this channel's
      for (const c of cats) { const ia = c.inactiveBranchIds || [];
        if (ia.includes("only:" + b) && ia.filter((k: string) => String(k).startsWith("only:")).length === 1) await remove("categories", c.id);
        else await put("categories", c.id, { inactiveBranchIds: [...ia.filter((k: string) => k !== "only:" + b), "x:" + b] }); }
      const srcCats = M.chCats(src, b), nid: Record<string, string> = {}, stamp = Date.now().toString(36); srcCats.forEach((c, k) => nid[c.id] = "cat_" + code + "_" + stamp + k);
      for (const c of [...srcCats.filter(x => !catPar(x)), ...srcCats.filter(x => catPar(x))]) await put("categories", nid[c.id], { name: c.name, nameAr: c.nameAr || null, brandId: c.brandId || null, imageUrl: catPar(c) ? null : c.imageUrl || null, sort: c.sort, channel: code, productIds: [...(c.productIds || [])], reference: catPar(c) && nid[catPar(c)] ? "sub:" + nid[catPar(c)] : null,
        inactiveBranchIds: [...(c.inactiveBranchIds || []).filter((x: string) => !/^(only|x):/.test(x)).map((x: string) => x.endsWith(":" + src) ? x.slice(0, -src.length) + code : x), ...(code === "online" ? [] : ["only:" + b])] });
      toast(n ? `Copied ${srcCh.name} · ${n} item${n === 1 ? "" : "s"} changed` : "Copied " + srcCh.name);
    } catch { toast("Couldn't copy. Only the owner or an admin can change the menu.", "error"); } finally { setBusy(""); }
  }

  const others = M.scFor(b).filter(c => scCode(c) !== code);
  const nCatTop = rowsOf("").filter(x => !x.sub).map(x => x.c), nCatOn = nCatTop.filter(catOn).length;
  const vis = rowsOf(cq.trim().toLowerCase()).filter(({ c, sub }) => !sub || cq || cex.has(catPar(c)));
  const PriceIn = ({ v, ph, dis, onSet, label }: { v: string; ph: number; dis?: boolean; onSet: (v: string) => void; label: string }) =>
    <Input key={v} aria-label={label} inputMode="decimal" defaultValue={v} placeholder={String(ph)} disabled={dis} className={cn("h-9 w-24 text-end", v !== "" && "border-blue-300 bg-blue-25 dark:bg-blue-500/10")} onBlur={e => { const x = e.target.value.trim(); if (x !== v) onSet(x); }} onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />;

  return <>
    <PageBreadcrumb pageTitle="Sales Channels" current={ch.name + (br ? " · " + br.name : "")} />
    <PageHead back={<><Button variant="outline" size="sm" onClick={back}><ArrowLeftIcon className="size-4" />Sales Channels</Button></>} title={<>{ch.name}</>} badges={<><span className="text-sm text-gray-500">{ch.kind === "online" ? (s.brands.find(x => x.id === ch.brandId)?.name || "") + " / all stores" : [s.brands.find(x => x.id === br?.brandId)?.name, br?.name].filter(Boolean).join(" / ")}</span>
      {busy && <Badge variant="light" color="warning">{busy}</Badge>}</>} actions={<>
        {others.length > 0 && <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" />}>Copy From<ChevronDownIcon className="size-4" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 p-2">{others.map(c => <DropdownMenuItem key={c.id} onClick={() => copyFrom(scCode(c))}>{c.name}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}
        <Button variant="outline" onClick={() => setScEdit(true)}>Settings</Button></>} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* categories */}
      <aside className={BOX + " flex min-h-0 flex-col self-start overflow-hidden"}>
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800"><b className="font-medium whitespace-nowrap text-gray-900 dark:text-gray-50">Categories</b><span className="text-xs whitespace-nowrap text-gray-500">{nCatOn} of {nCatTop.length}</span>
          <Button size="sm" className="ms-auto" onClick={() => setEdit(null)}><PlusIcon className="size-4" />Add Category</Button></div>
        {cats.length > 0 && <div className="space-y-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <TInput type="search" className="h-10" inputClassName="h-9 py-1.5" placeholder="Search categories" value={cq} onChange={e => setCq(e.target.value)} />
          <div className="flex items-center gap-2"><Label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><CB label="Select all categories" on={!!vis.length && vis.every(x => csel.has(x.c.id))} set={v => setCsel(v ? new Set(vis.map(x => x.c.id)) : new Set())} />{csel.size ? <b>{csel.size} Selected</b> : "Select All"}</Label>
            <span className="ms-auto"><Acts items={[["Activate", () => csel.size ? change(Object.fromEntries([...csel].map(id => ["cat:" + id, { on: true }]))).then(() => setCsel(new Set())) : toast("Select categories first")],
              ["Deactivate", () => csel.size ? change(Object.fromEntries([...csel].map(id => ["cat:" + id, { on: false }]))).then(() => setCsel(new Set())) : toast("Select categories first")], ["Delete", () => csel.size ? delCats([...csel]) : toast("Select categories first"), true]]} /></span></div></div>}
        <div className="custom-scrollbar max-h-[65dvh] overflow-y-auto">{!cats.length ? <p className="px-4 py-6 text-center text-sm text-gray-500"><b className="block text-gray-900 dark:text-gray-50">No categories yet</b>Add the first category of the {ch.name} menu.</p>
          : !vis.length ? <p className="px-4 py-6 text-center text-sm text-gray-500">No categories match.</p>
          : vis.map(({ c, sub }) => { const on = catOn(c), nSub = cats.filter(x => catPar(x) === c.id).length; return (
            <div key={c.id} {...dnd("c:" + c.id)} onClick={() => { setCat(c.id); setIsel(new Set()); if (!sub && nSub) setCex(o => new Set(o).add(c.id)); }}
              className={cn("flex cursor-pointer items-center gap-2.5 border-b border-gray-100 px-4 py-2.5 text-sm dark:border-gray-800", sub && "ps-10", c.id === cat ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-white/3", !on && "opacity-60", drag?.k === "c:" + c.id && "opacity-40")}>
              <CB label={"Select " + c.name} on={csel.has(c.id)} set={v => setCsel(o => { const n = new Set(o); if (v) n.add(c.id); else n.delete(c.id); return n; })} />
              {!cq && <span className="cursor-grab text-gray-400 select-none" aria-hidden>⋮⋮</span>}
              <span onClick={e => e.stopPropagation()}><Switch size="sm" checked={on} aria-label={"Show " + c.name} onCheckedChange={v => change({ ["cat:" + c.id]: { on: v } })} /></span>
              {!sub && <span className="size-8 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">{c.imageUrl && <img src={c.imageUrl} alt="" className="size-full object-cover" />}</span>}
              <span className="min-w-0 flex-1"><b className="block truncate font-medium text-gray-900 dark:text-gray-50">{c.name}</b>{!sub && nSub > 0 && <span className="text-xs text-gray-500">{nSub} sub-categor{nSub === 1 ? "y" : "ies"}</span>}</span>
              {!sub && nSub > 0 && <button type="button" aria-label={cex.has(c.id) ? "Hide sub-categories" : "Show sub-categories"} onClick={e => { e.stopPropagation(); setCex(o => { const n = new Set(o); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; }); }}><ChevronDownIcon className={cn("size-4 text-gray-400", !(cq || cex.has(c.id)) && "-rotate-90 rtl:rotate-90")} /></button>}
              <span onClick={e => e.stopPropagation()}><DropdownMenu><DropdownMenuTrigger className="rounded px-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Category actions">⋯</DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 p-2"><DropdownMenuItem onClick={() => setEdit(c)}>Edit</DropdownMenuItem><DropdownMenuItem className="text-error-500" onClick={() => delCats([c.id])}>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></span>
            </div>); })}</div>
      </aside>
      {/* the chosen category's items */}
      <section className={BOX + " min-w-0 self-start overflow-hidden"}>
        {!cur ? <div className="px-6 py-14 text-center"><b className="block text-gray-900 dark:text-gray-50">Start the {ch.name} menu</b><p className="mt-1 text-sm text-gray-500">Add a category on the left, then add products to it.</p><Button className="mt-4" onClick={() => setEdit(null)}><PlusIcon className="size-4" />Add Category</Button></div> : <>
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800"><b className="font-medium text-gray-900 dark:text-gray-50">{(p => p ? p.name + " › " : "")(cats.find(x => x.id === catPar(cur)))}{cur.name}</b><span className="text-xs text-gray-500">{inCur.filter(p => st(p).on).length} of {inCur.length}</span>
            <Button size="sm" className="ms-auto" onClick={() => setAdding(true)}><PlusIcon className="size-4" />Add Products</Button></div>
          {!inCur.length ? <div className="px-6 py-14 text-center"><b className="block text-gray-900 dark:text-gray-50">No products in {cur.name}</b><p className="mt-1 text-sm text-gray-500">Pick the products this category shows on the {ch.name} menu.</p><Button className="mt-4" onClick={() => setAdding(true)}><PlusIcon className="size-4" />Add Products</Button></div> : <>
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <Label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><CB label="Select all items" on={!!rows.length && rows.every(p => isel.has(p.id))} set={v => setIsel(v ? new Set(rows.map(p => p.id)) : new Set())} />{isel.size ? <b>{isel.size} Selected</b> : "Select All"}</Label>
              <Acts items={[["Activate", () => isel.size ? setTypesOf([...isel].flatMap(id => { const p = M.prod(id); return p ? [p.id, ...M.varKids(p).map(k => k.id)] : []; }), true).then(() => setIsel(new Set())) : toast("Select items first")],
                ["Deactivate", () => isel.size ? setTypesOf([...isel].flatMap(id => { const p = M.prod(id); return p ? [p.id, ...M.varKids(p).map(k => k.id)] : []; }), false).then(() => setIsel(new Set())) : toast("Select items first")],
                ["Delete", async () => { const ids = [...isel]; if (!ids.length) return toast("Select items first"); if (!(await askYes(`Delete ${ids.length} item${ids.length === 1 ? "" : "s"} from ${cur.name}? ${ids.length === 1 ? "It stays" : "They stay"} in Catalog → Items.`, "Delete", true))) return;
                  try { await put("categories", cur.id, { productIds: (cur.productIds || []).filter((x: string) => !ids.includes(M.root(x))) }); setIsel(new Set()); } catch { toast("Couldn't save.", "error"); } }, true]]} />
              <TInput type="search" className="ms-auto h-10 w-full sm:w-64" inputClassName="h-9 py-1.5" placeholder="Search items" value={q} onChange={e => setQ(e.target.value)} /></div>
            <div className="overflow-x-auto"><Table className="w-full min-w-[640px] text-sm"><TableHead><TableRow className="border-b border-gray-100 text-xs text-gray-500 dark:border-gray-800"><TableHeaderCell className="w-24" /><TableHeaderCell className="px-3 py-2.5 text-start font-medium">Product</TableHeaderCell>{types.map(([t, tl]) => <TableHeaderCell key={t} className="px-3 py-2.5 text-start font-medium">{tl}</TableHeaderCell>)}<TableHeaderCell /></TableRow></TableHead>
              <TableBody>{!rows.length ? <TableRow><TableCell colSpan={types.length + 3} className="px-4 py-8 text-center text-gray-500">No products match.</TableCell></TableRow> : rows.flatMap(r => [r, ...M.varKids(r).map(k => Object.assign(Object.create(null), k, { __par: r }))]).map((r: any) => {
                const par = r.__par as Row | undefined, x = st(r), vk = par ? [] : M.varKids(r), nm = par ? ((par.variants || []).find((v: any) => v.productId === r.id)?.name || r.name) : r.name, base = x.price !== "" ? +x.price : x.fallback;
                return <TableRow key={r.id} {...(par ? {} : dnd("p:" + r.id, cur.id))} className={cn("border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/2", !x.on && "opacity-60")}>
                  <TableCell className="px-3 py-2.5"><div className="flex items-center gap-2">{par ? <span className="ps-10" /> : <><CB label={"Select " + nm} on={isel.has(r.id)} set={v => setIsel(o => { const n = new Set(o); if (v) n.add(r.id); else n.delete(r.id); return n; })} />{!qq && <span className="cursor-grab text-gray-400 select-none" aria-hidden>⋮⋮</span>}</>}
                    <span onClick={e => e.stopPropagation()}><Switch size="sm" checked={x.on} aria-label={nm + " on the " + ch.name + " menu"} onCheckedChange={v => setTypesOf([r.id], v)} /></span></div></TableCell>
                  <TableCell className="min-w-48 px-3 py-2.5"><div className="flex items-center gap-3">{par ? <span className="text-gray-400">↳</span> : <span className="size-9 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">{r.imageUrl && <img src={r.imageUrl} alt="" className="size-full object-cover" />}</span>}
                    <span><b className="block font-medium text-gray-900 dark:text-gray-50">{nm}{!x.stock && <Badge variant="light" color="error" size="sm" className="ms-2">Sold out</Badge>}
                      {!par && M.links(r).length > 0 && <Button variant="secondary" onClick={e => { e.stopPropagation(); setItem(r.id); }} className="ms-2 px-2 py-0.5 text-xs">{M.links(r).length} modifier{M.links(r).length === 1 ? "" : "s"} ›</Button>}</b><span className="text-xs text-gray-500">{vk.length ? `${vk.length} variants below` : money(base) + " · " + (Object.values(x.tprices).some(Boolean) ? "order type prices" : types.every(([t]) => x.types[t]) ? "all types" : types.filter(([t]) => x.types[t]).map(([, tl]) => tl).join(", ") || "off")}</span></span></div></TableCell>
                  {types.map(([t, tl]) => <TableCell key={t} className="px-3 py-2.5" onClick={e => e.stopPropagation()}>{!vk.length && <div className="flex items-center gap-2"><Switch size="sm" checked={x.types[t]} aria-label={`${nm} as ${tl}`} onCheckedChange={v => change({ [r.id]: { ["t_" + t]: v } })} />
                    <PriceIn v={x.tprices[t]} ph={base} dis={!x.types[t]} label={`${nm} ${tl} price`} onSet={v => change({ [r.id]: { ["tp_" + t]: v } })} /></div>}</TableCell>)}
                  <TableCell className="px-3 py-2.5 text-end" onClick={e => e.stopPropagation()}><DropdownMenu><DropdownMenuTrigger className="rounded px-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Product actions">⋯</DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-2">
                      <DropdownMenuItem onClick={() => change({ [r.id]: { stock: !x.stock } })}>{x.stock ? `Sold out at ${br?.name || "this store"}` : "Back in stock"}</DropdownMenuItem>
                      {Object.values(x.tprices).some(Boolean) && <DropdownMenuItem onClick={() => change({ [r.id]: Object.fromEntries(types.map(([t]) => ["tp_" + t, ""])) })}>Same price for all</DropdownMenuItem>}
                      {!par && M.links(r).length > 0 && <DropdownMenuItem onClick={() => setItem(r.id)}>Modifiers</DropdownMenuItem>}
                      {!par && <DropdownMenuItem className="text-error-500" onClick={async () => { if (!(await askYes(`Remove the item "${r.name}" from the category "${cur.name}" in the ${ch.name} menu?`, "Remove", true))) return;
                      try { await put("categories", cur.id, { productIds: (cur.productIds || []).filter((x2: string) => M.root(x2) !== r.id) }); toast("Removed from " + cur.name); } catch { toast("Couldn't save.", "error"); } }}>Remove</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell></TableRow>; })}</TableBody></Table></div></>}</>}
      </section>
    </div>

    {item && (() => { const r = s.products.find(x => x.id === item && live(x)); if (!r) return null; const ls = M.links(r);
      const rule = (l: any) => { const mn = +l.min || 0, mx = +l.max || 0; return mn && mx && mn === mx ? `Choose ${mn}` : mn && mx ? `Choose ${mn} to ${mx}` : mn ? `At least ${mn}` : mx ? `Up to ${mx}` : "Optional"; };
      return <Drawer open onOpenChange={v => !v && setItem("")}><DrawerContent className="w-full overflow-y-auto sm:max-w-3xl">
        <DrawerHeader className="p-0"><DrawerTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{r.name}</DrawerTitle><span className="text-sm text-gray-500">{[s.brands.find(x => x.id === br?.brandId)?.name, br?.name, ch.name].filter(Boolean).join(" / ")}</span></DrawerHeader>
        {!ls.length ? <p className="text-sm text-gray-500">This item has no modifiers.</p> : <div className="overflow-x-auto"><Table className="w-full min-w-[560px] text-sm"><TableBody>{ls.map((l: any) => { const os = M.modOptions(l.modifierId), gt = grpTypes(l), gOn = types.some(([t]) => gt[t]);
          return [<TableRow key={l.modifierId} className={cn("border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#090E1A]", !gOn && "opacity-60")}><TableCell className="px-3 py-2.5"><div className="flex flex-wrap items-center gap-2">
            <Switch size="sm" checked={gOn} aria-label={M.modName(l.modifierId) + " on this menu"} onCheckedChange={v => change({ ["mg:" + r.id + "|" + l.modifierId]: Object.fromEntries(types.map(([t]) => ["to_" + t, v])) })} />
            <b className="font-medium text-gray-900 dark:text-gray-50">{M.modName(l.modifierId)}</b><Badge variant="light" color="light">{rule(l)}</Badge>{+l.free > 0 && <Badge variant="light" color="light">{l.free} free</Badge>}<span className="text-xs text-gray-500">{os.filter(o => optSt(r, o).on).length}/{os.length} on</span></div></TableCell>
            {types.map(([t, tl]) => <TableCell key={t} className="px-3 py-2.5"><Label className="flex items-center gap-2 text-xs text-gray-500"><Switch size="sm" checked={gt[t]} aria-label={`${M.modName(l.modifierId)} for ${tl}`} onCheckedChange={v => change({ ["mg:" + r.id + "|" + l.modifierId]: { ["to_" + t]: v } })} />{tl}</Label></TableCell>)}</TableRow>,
            ...os.map(o => { const x = optSt(r, o), ob = +o.price || 0; return <TableRow key={o.id} className={cn("border-b border-gray-200 dark:border-gray-800", !x.on && "opacity-60")}>
              <TableCell className="px-3 py-2"><div className="flex items-center gap-3 ps-4"><Switch size="sm" checked={x.on} aria-label={o.name} onCheckedChange={v => change({ ["mo:" + r.id + "|" + o.id]: { on: v, ...Object.fromEntries(types.map(([t]) => ["to_" + t, v])) } })} />
                <span><b className="block font-medium text-gray-900 dark:text-gray-50">{o.name}</b><span className="text-xs text-gray-500">{ob ? money(ob) : "Free"}</span></span>
                <Label className="ms-auto flex items-center gap-2 text-xs text-gray-500"><Switch size="sm" checked={x.stock} aria-label={o.name + " in stock"} onCheckedChange={v => change({ ["mo:" + r.id + "|" + o.id]: { stock: v } })} />{x.stock ? "In stock" : "Sold out"}</Label></div></TableCell>
              {types.map(([t, tl]) => <TableCell key={t} className="px-3 py-2"><div className="flex items-center gap-2"><Switch size="sm" checked={x.types[t]} aria-label={`${o.name} for ${tl}`} onCheckedChange={v => { const on2 = types.some(([y]) => y === t ? v : x.types[y]); change({ ["mo:" + r.id + "|" + o.id]: { ["to_" + t]: v, on: on2 } }); }} />
                <PriceIn v={x.tprices[t]} ph={ob} dis={!x.types[t]} label={`${o.name} ${tl} price`} onSet={v => change({ ["mo:" + r.id + "|" + o.id]: { ["tp_" + t]: v } })} /></div></TableCell>)}</TableRow>; })]; })}</TableBody></Table></div>}
      </DrawerContent></Drawer>; })()}

    {edit !== false && <CatDialog s={s} M={M} b={b} code={code} c={edit} cats={cats} onClose={() => setEdit(false)} onNew={id => setCat(id)} />}
    {adding && cur && <AddItems s={s} M={M} c={cur} onClose={() => setAdding(false)} />}
    {scEdit && <ScDialog s={s} M={M} b={b} code={code} onClose={() => setScEdit(false)} onSaved={c => go(b, c)} onDeleted={back} />}
    {ask && <ScopeAsk s={s} M={M} b={b} code={code} onDone={v => ask(v)} />}
  </>;
}

/* ---------- a channel category: name, localized name, parent (a sub-category sits under it), picture ---------- */
function CatDialog({ s, M, b, code, c, cats, onClose, onNew }: { s: S; M: M; b: string; code: string; c: Row | null; cats: Row[]; onClose: () => void; onNew: (id: string) => void }) {
  const [name, setName] = useState(c?.name || ""), [nameAr, setNameAr] = useState(c?.nameAr || ""), [par, setPar] = useState(catPar(c || undefined)), [img, setImg] = useState(c?.imageUrl || ""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const hasSubs = !!c && M.subIds(c.id).length > 0, parents = cats.filter(x => !catPar(x) && x.id !== c?.id);
  async function save() {
    setErr(""); if (!name.trim()) return setErr("Enter a name.");
    const data: any = { name: name.trim(), nameAr: nameAr.trim() || null, imageUrl: par ? null : img || null };
    let id = c?.id || "";
    if (c) { if (par) { const p = s.categories.find(x => x.id === par); if (!p || par === c.id) return setErr("Choose another category."); if (catPar(p)) return setErr("Choose a main category."); if (hasSubs) return setErr("This category has sub-categories, so it can't go under another category."); data.reference = "sub:" + p.id; }
      else if (catPar(c)) data.reference = null; }
    else if (par) { const p = s.categories.find(x => x.id === par); if (!p) return setErr("Choose the category."); const mine = s.categories.filter(x => live(x) && catPar(x) === p.id);
      Object.assign(data, { channel: p.channel, reference: "sub:" + p.id, productIds: [], inactiveBranchIds: (p.inactiveBranchIds || []).filter((k: string) => String(k).startsWith("only:")), brandId: p.brandId || null, sort: Math.max(0, ...mine.map(x => +x.sort || 0)) + 10 }); id = "cat_" + p.channel + "_" + Date.now().toString(36); }
    else { const mine = s.categories.filter(x => live(x) && x.channel === code); Object.assign(data, { channel: code, productIds: [], sort: Math.max(0, ...mine.map(x => +x.sort || 0)) + 10, ...(code !== "online" ? { inactiveBranchIds: ["only:" + b] } : {}) }); id = "cat_" + code + "_" + Date.now().toString(36); }
    setBusy(true); try { await put("categories", id, data); toast(c ? "Category saved" : "Category added"); if (!c) onNew(id); onClose(); } catch { setErr("Couldn't save. Only the owner or an admin can change the menu."); } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-full p-6 sm:max-w-lg"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{c ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
    <div className="mt-4 space-y-4"><F l="Name" req><Input className="h-9" value={name} onChange={e => setName(e.target.value)} autoFocus /></F><F l="Name Localized"><Input className="h-9" dir="auto" value={nameAr} onChange={e => setNameAr(e.target.value)} /></F>
      {!hasSubs && <F l="Parent Category"><SelectNative className={SEL} value={par} onChange={e => setPar(e.target.value)}><option value="">None (main category)</option>{parents.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectNative></F>}
      {!par && <F l="Image"><ImageField value={img} onChange={setImg} /></F>}
      {err && <p className="text-sm text-red-500">{err}</p>}</div>
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>Save</Button></div></DialogContent></Dialog>;
}

/* ---------- pick the items of a channel category: ticked = in it ---------- */
function AddItems({ s, M, c, onClose }: { s: S; M: M; c: Row; onClose: () => void }) {
  const have = new Set<string>((c.productIds || []).map(M.root)), kidIds = new Set(s.products.filter(live).flatMap(x => (x.variants || []).map((v: any) => v.productId).filter(Boolean)));
  const prods = s.products.filter(p => live(p) && !kidIds.has(p.id)), [on, setOn] = useState<Set<string>>(new Set(have)), [q, setQ] = useState(""), [busy, setBusy] = useState(false), qq = q.trim().toLowerCase();
  const catName = (id: string) => s.categories.find(x => x.id === id)?.name || "—", groups: Record<string, Row[]> = {}; prods.filter(p => !qq || (p.name + " " + (p.sku || "")).toLowerCase().includes(qq)).forEach(p => (groups[catName(p.categoryId)] ||= []).push(p));
  const add = [...on].filter(x => !have.has(x)), rm = [...have].filter(x => !on.has(x));
  const priceOf = (p: Row) => { const k = M.varKids(p); return k.length ? "From " + money(Math.min(...k.map(x => +x.price || 0))) : p.pricingMethod === "open" ? "Open price" : money(p.price); };
  async function save() { setBusy(true); const ids = [...(c.productIds || []).filter((x: string) => on.has(M.root(x))), ...add];
    try { await put("categories", c.id, { productIds: ids }); toast(`${add.length} item${add.length === 1 ? "" : "s"} added to ${c.name}`); onClose(); } catch { toast("Couldn't save.", "error"); } finally { setBusy(false); } }
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-full p-6 sm:max-w-3xl"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">Items in {c.name}</DialogTitle></DialogHeader>
    <TInput type="search" className="mt-3" inputClassName="h-9 py-1.5" placeholder="Search products" value={q} onChange={e => setQ(e.target.value)} autoFocus />
    <div className="mt-3 space-y-5">{!Object.keys(groups).length ? <p className="py-8 text-center text-sm text-gray-500">No products.</p> : Object.keys(groups).sort().map(g => { const ps = groups[g].sort(bySort), allOn = ps.every(p => on.has(p.id));
      return <div key={g}><div className="mb-2 flex items-center justify-between"><b className="text-sm font-medium text-gray-900 dark:text-gray-50">{g}</b><Button type="button" variant="link" className="" onClick={() => setOn(o => { const n = new Set(o); ps.forEach(p => allOn ? n.delete(p.id) : n.add(p.id)); return n; })}>{allOn ? "Clear" : "Select all"}</Button></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{ps.map(p => <Label key={p.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-2 text-sm", on.has(p.id) ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-gray-200 dark:border-gray-800")}>
          <Checkbox checked={on.has(p.id)} onCheckedChange={(chk: boolean) => setOn(o => { const n = new Set(o); if (chk) n.add(p.id); else n.delete(p.id); return n; })} />
          <span className="size-9 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">{p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" className="size-full object-cover" />}</span>
          <span className="min-w-0"><b className="block truncate font-medium text-gray-900 dark:text-gray-50">{p.name}</b><span className="text-xs text-gray-500">{priceOf(p)}</span></span></Label>)}</div></div>; })}</div>
    <div className="mt-4 flex items-center gap-3"><span className="text-sm text-gray-500">{on.size} in this category{add.length ? ` · ${add.length} to add` : ""}{rm.length ? ` · ${rm.length} to remove` : ""}</span><Button className="ms-auto" disabled={busy || !(add.length || rm.length)} onClick={save}>Save</Button></div></DialogContent></Dialog>;
}

/* ---------- where a switch applies: this channel always; tick other channels of this store or other stores ---------- */
function ScopeAsk({ s, M, b, code, onDone }: { s: S; M: M; b: string; code: string; onDone: (v: Record<string, string[]> | null) => void }) {
  const [pick, setPick] = useState<Record<string, Set<string>>>({});
  const brs = s.branches.filter(x => live(x) && x.active !== false).map(x => ({ x, chs: [...new Map(M.scFor(x.id).map(c => [scCode(c), c.name])).entries()].filter(([c]) => !(x.id === b && c === code)) })).filter(g => g.chs.length);
  const tog = (bid: string, c: string, v: boolean) => setPick(o => { const n = { ...o, [bid]: new Set(o[bid] || []) }; if (v) n[bid].add(c); else n[bid].delete(c); return n; });
  const go = () => { const map: Record<string, string[]> = { [b]: [code] }; Object.entries(pick).forEach(([bid, set]) => set.forEach(c => (map[bid] ||= []).push(c))); onDone(map); };
  return <Dialog open onOpenChange={v => !v && onDone(null)}><DialogContent className="w-full p-6 sm:max-w-xl"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">Where should this change apply?</DialogTitle></DialogHeader>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This sales channel gets it. Tick any other channels that should get the same change.</p>
    <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">{!brs.length ? <p className="py-3 text-sm text-gray-500">No other sales channels</p> : brs.map(({ x, chs }) =>
      <div key={x.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3"><b className="w-40 text-sm font-medium text-gray-900 dark:text-gray-50">{x.name}</b>{chs.map(([c, n]) =>
        <Label key={c} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><Checkbox checked={!!pick[x.id]?.has(c)} onCheckedChange={(chk: boolean) => tog(x.id, c, chk)} />{n}</Label>)}</div>)}</div>
    <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => onDone(null)}>Cancel</Button><Button onClick={go} autoFocus>Save</Button></div></DialogContent></Dialog>;
}
