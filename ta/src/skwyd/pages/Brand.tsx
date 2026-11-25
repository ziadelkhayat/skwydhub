// A brand's page (Manage → Brands → a brand): its details and Edit Brand, and Settings with the portal's tabs (Receipt, Call Center,
// Cashier App, Display App, Kitchen, Inventory Transactions) saved to settings "brand_<id>", with the same defaults and checks.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, GearIcon, PencilIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { put } from "@/lib/db";
import { fmtDate } from "@/lib/util";
import { cn } from "@/utils";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { EditDialog, live, useS } from "../crud/CrudPage";
import { CRUD } from "../crud/configs";
import { EmptyState } from "../ui/EmptyState";
import { BOX, SEL } from "../ui/kit";
import { toast } from "../ui/toast";
import { APP_DEF, BRAND_DEF, BS_TABS, type Fld } from "./brandTabs";

const SOURCES_DEF = ["Phone", "Toters", "NokNok", "Talabat", "WhatsApp", "Walk-in"];
// a picture kept in the settings document, made at most 480px like the portal
const shrink = (file: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => {
  const s = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/png")); }; im.src = r.result as string; }; r.readAsDataURL(file); });

export default function BrandPage() {
  const s = useS(["brands", "branches", "settings", "users", "payment_methods", "order_sources"]), [sp, setSp] = useSearchParams(), nav = useNavigate(), { staff } = useAuth();
  const [edit, setEdit] = useState(false);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const b = s.brands.find(x => x.id === sp.get("id"));
  if (!b) return <><PageBreadcrumb pageTitle="Brands" /><EmptyState text="This brand wasn't found."><Button variant="outline" onClick={() => nav("/brands")}>Brands</Button></EmptyState></>;
  const brs = s.branches.filter(x => x.brandId === b.id && live(x)), settingsOpen = sp.get("settings") === "1";
  if (settingsOpen) return <Settings s={s} b={b} admin={!staff?.role || ["owner", "admin"].includes(staff.role)} back={() => { const n = new URLSearchParams(sp); n.delete("settings"); setSp(n); }} />;
  return <>
    <PageBreadcrumb pageTitle="Brands" current={b.name} />
    <div className="mb-6 flex flex-wrap items-center gap-3"><Button variant="outline" render={<Link to="/brands" />}><ArrowLeftIcon className="size-5" />Brands</Button><h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{b.name}</h2>
      <div className="ms-auto flex gap-3"><Button variant="outline" onClick={() => { const n = new URLSearchParams(sp); n.set("settings", "1"); setSp(n); scrollTo(0, 0); }}><GearIcon className="size-5" />Settings</Button><Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Brand</Button></div></div>
    <div className={BOX + " grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4"}>{[["Name", b.name], ["Name Localized", b.nameAr || "—"], ["Stores", String(brs.length)], ["Created", fmtDate(b.createdAt)]].map(([l, v]) =>
      <div key={l}><span className="block text-sm text-gray-500 dark:text-gray-400">{l}</span><b className="text-sm font-medium text-gray-900 dark:text-gray-50">{v}</b></div>)}</div>
    {edit && <EditDialog cfg={CRUD.brands} s={s} row={b} onClose={() => setEdit(false)} />}
  </>;
}

function Settings({ s, b, admin, back }: { s: Record<string, any[]>; b: any; admin: boolean; back: () => void }) {
  const co: any = s.settings.find(x => x.id === "company") || {}, app: any = s.settings.find(x => x.id === "app") || {}, row: any = s.settings.find(x => x.id === "brand_" + b.id) || {};
  const saved = { ...BRAND_DEF, requireTableGuests: !!app.requireTable, ...APP_DEF, ...app, webOrderRoute: co.webOrderRoute || "branch", webCcAutoAccept: !!co.webCcAutoAccept, ...row };
  saved.ccAcceptWeb = (row.webOrderRoute || co.webOrderRoute) === "callcenter";
  const isAdminRow = (u: any) => u.role === "owner" || u.role === "admin";
  const sources = (() => { const l = s.order_sources.filter(r => live(r) && String(r.name || "").toUpperCase() !== "POS" && !["WEB", "API", "WEBSITE"].includes(String(r.name || "").trim().toUpperCase())).sort((a, z) => (a.sort ?? 999) - (z.sort ?? 999) || String(a.name).localeCompare(String(z.name))).map(r => r.name); return l.length ? l : SOURCES_DEF; })();
  const tabs = BS_TABS({ users: s.users.filter(u => live(u) && !isAdminRow(u) && u.active !== false).map(u => [u.id, u.name]), pms: s.payment_methods.filter(m => live(m) && m.active !== false).map(m => [m.id, m.name]),
    stores: (x: any) => s.branches.filter(y => y.brandId === x.id).map(y => [y.id, y.name]), groups: [], sources, cur2: co.currency2 || "" });
  const [tab, setTab] = useState(tabs[0][0]), [draft, setDraft] = useState<Record<string, any>>({}), [seen, setSeen] = useState<Set<string>>(new Set([tabs[0][0]])), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const v = { ...saved, ...draft }, set = (k: string, x: any) => setDraft(o => ({ ...o, [k]: x })), T = tabs.find(t => t[0] === tab) || tabs[0];
  const curL = (t: string) => String(t ?? "").replace(/\(USD\)/g, "(" + (String(co.currencySymbol || "").trim() || co.currency || "USD") + ")");
  async function save() {
    setErr("");
    // like the portal: every field of the tabs that were opened is saved, with the changes made
    const d: Record<string, any> = {}; tabs.filter(t => seen.has(t[0])).forEach(t => t[3].forEach(f => { if (f.t !== "info" && (!f.show || f.show(v))) d[f.k] = v[f.k]; })); Object.assign(d, draft);
    if (d.presetTender && !/^\s*\d+(\.\d+)?\s*(,\s*\d+(\.\d+)?\s*)?$/.test(d.presetTender)) return setErr("Preset tendered amounts: up to two numbers separated by a comma, like 50,100");
    if (d.tipsPct && !/^\s*\d+(\.\d+)?(\s*,\s*\d+(\.\d+)?)*\s*$/.test(d.tipsPct)) return setErr("Tips percentages: numbers separated by commas, like 10,20,30");
    if ("ccAcceptWeb" in d) { d.webOrderRoute = d.ccAcceptWeb ? "callcenter" : "branch"; if (!d.ccAcceptWeb) d.webCcAutoAccept = false; delete d.ccAcceptWeb; }
    setBusy(true); try { await put("settings", "brand_" + b.id, d); setDraft({}); toast("Settings saved"); } catch { setErr("Couldn't save. Only the owner or an admin can change settings."); } finally { setBusy(false); }
  }
  const field = (f: Fld) => {
    if (f.show && !f.show(v)) return null;
    const lab = <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">{curL(f.l)}{f.req ? <span className="text-error-500"> *</span> : null}</label>;
    const help = f.n ? <p className="mb-2 text-xs text-gray-500 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: f.n }} /> : null;
    if (f.t === "chk") return <div key={f.k} className="flex items-start gap-3 border-b border-gray-100 py-4 dark:border-gray-800"><Switch size="sm" className="mt-0.5" disabled={!admin} checked={!!v[f.k]} onCheckedChange={x => set(f.k, x)} aria-label={f.l} /><div><b className="block text-sm font-medium text-gray-900 dark:text-gray-50">{curL(f.l)}</b>{help}</div></div>;
    let ctl: React.ReactNode;
    if (f.t === "info") ctl = <p className="text-sm text-gray-900 dark:text-gray-50">{f.v!()}</p>;
    else if (f.t === "radio") ctl = <div className="flex flex-wrap gap-2">{(f.o as [string, string][]).map(([k, t]) => <button key={k} type="button" disabled={!admin} onClick={() => set(f.k, k)}
      className={cn("rounded-lg border px-3.5 py-2 text-sm", String(v[f.k]) === k ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400")}>{t}</button>)}</div>;
    else if (f.t === "multi") { const o: [string, string][] = f.o(b), cur: string[] = v[f.k] || [];
      ctl = <>{o.length ? <div className="flex flex-wrap gap-x-5 gap-y-2">{o.map(([k, t]) => <label key={k} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" className="size-4 accent-brand-500" disabled={!admin} checked={cur.includes(k)} onChange={e => set(f.k, e.target.checked ? [...cur, k] : cur.filter(x => x !== k))} />{t}</label>)}</div> : <p className="text-sm text-gray-500">Nothing to pick yet.</p>}
        {f.none && <p className="mt-2 text-xs text-gray-500">Nothing ticked: {f.none}.</p>}</>; }
    else if (f.t === "select") ctl = <select className={SEL} disabled={!admin} value={String(v[f.k] || "")} onChange={e => set(f.k, e.target.value)}>{(f.o(b) as [string, string][]).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>;
    else if (f.t === "area") ctl = <Textarea rows={3} disabled={!admin} value={v[f.k] || ""} onChange={e => set(f.k, e.target.value)} />;
    else if (f.t === "img") ctl = <div className="flex flex-wrap items-center gap-3">{v[f.k] ? <img src={v[f.k]} alt="" className="h-16 max-w-40 rounded-lg border border-gray-200 object-contain dark:border-gray-800" /> : <span className="text-sm text-gray-500">No image</span>}
      {admin && <><label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Choose photo<input type="file" accept="image/*" hidden onChange={async e => { const fl = e.target.files?.[0]; if (fl) { try { set(f.k, await shrink(fl)); } catch { toast("Couldn't read the picture.", "error"); } } }} /></label>
        {v[f.k] && <Button size="sm" variant="outline" onClick={() => set(f.k, "")}>Remove</Button>}</>}</div>;
    else ctl = <Input className="h-9" type={f.t === "num" ? "number" : "text"} min={f.t === "num" ? 0 : undefined} disabled={!admin} placeholder={f.ph || ""} value={v[f.k] ?? ""} onChange={e => set(f.k, f.t === "num" ? (e.target.value === "" ? null : +e.target.value) : e.target.value)} />;
    return <div key={f.k} className="border-b border-gray-100 py-4 dark:border-gray-800">{lab}{help}{ctl}</div>;
  };
  return <>
    <PageBreadcrumb pageTitle="Brands" current={b.name + " · Settings"} />
    <div className="mb-6 flex flex-wrap items-center gap-3"><Button variant="outline" onClick={back}><ArrowLeftIcon className="size-5" />{b.name}</Button><h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{b.name} · Settings</h2></div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      <nav className={BOX + " self-start p-2"}>{tabs.map(([k, t]) => <button key={k} type="button" onClick={() => { setTab(k); setSeen(o => new Set(o).add(k)); }}
        className={cn("block w-full rounded-lg px-3 py-2.5 text-start text-sm", tab === k ? "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/3")}>{t}</button>)}</nav>
      <div className={BOX + " p-5 sm:p-6"}><h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">{T[2]}</h3>
        {!admin && <p className="mt-3 rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">Only the owner or an admin can change settings.</p>}
        <div>{T[3].map(field)}</div>
        {err && <p className="mt-4 text-sm text-red-500">{err}</p>}
        {admin && <div className="mt-6 flex justify-end"><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></div>}</div>
    </div>
  </>;
}
