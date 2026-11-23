// The admin's pages (same rules and RPCs as hub.html): Dashboard, Companies, a company's page (business, owner, plan, invoices),
// Invoices of every business, Price List and Settings.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, PlusIcon, SearchIcon, TrashBinIcon } from "@/icons";
import { cn } from "@/utils";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { askYes } from "../ui/confirm";
import { DateInput } from "../ui/DateInput";
import { BOX, F, SEL, TD, TH, TR } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";
import { CATEGORIES, COUNTRIES, CURRENCIES, dmy, endOf, fullPhone, initials, isoDay, MODULES, money, rpc, showInvoice, splitPhone, STATE_COLOR, STATE_LABEL, useAdmin } from "./data";

const H = ({ t, sub, children }: { t: string; sub?: string; children?: React.ReactNode }) => <div className="mb-6 flex flex-wrap items-end gap-3"><div className="flex-1"><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{t}</h2>{sub && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{sub}</p>}</div>{children}</div>;
const Kpi = ({ l, v }: { l: string; v: React.ReactNode }) => <div className={BOX + " p-5"}><span className="text-sm text-gray-500 dark:text-gray-400">{l}</span><b className="mt-2 block text-title-sm font-semibold text-gray-800 dark:text-white/90">{v}</b></div>;
const State = ({ c }: { c: any }) => { const s = c.sub || {}; return s.complimentary ? <Badge variant="light" color="light">Free</Badge> : <Badge variant="light" color={STATE_COLOR[s.state] || "light"}>{STATE_LABEL[s.state] || "—"}</Badge>; };
const Empty = ({ t }: { t: string }) => <p className="px-6 py-10 text-center text-sm text-gray-500">{t}</p>;
const mrrOf = (cs: any[]) => cs.filter(c => !c.sub?.complimentary && c.sub?.state === "active").reduce((a, c) => a + Number(c.quote?.total || 0) / (c.quote?.cycle === "yearly" ? 12 : 1), 0);

/* ---------- dashboard: the business at a glance ---------- */
export function AdminDashboard() {
  const { data } = useAdmin(), cs = data.companies || [], cur = data.settings?.currency || "USD", nav = useNavigate(), now = new Date(), hr = now.getHours();
  const count = (st: string) => cs.filter(c => !c.sub?.complimentary && c.sub?.state === st).length;
  const ending = cs.filter(c => !c.sub?.complimentary && ["trial", "grace"].includes(c.sub?.state) && c.sub?.daysLeft != null).sort((a, b) => a.sub.daysLeft - b.sub.daysLeft).slice(0, 6);
  const newest = cs.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 6);
  const busy = cs.filter(c => c.orders30).sort((a, b) => (b.orders30 || 0) - (a.orders30 || 0)).slice(0, 6);
  const List = ({ title, rows, cell }: { title: string; rows: any[]; cell: (c: any) => React.ReactNode }) => <div className={BOX}>
    <h3 className="border-b border-gray-200 px-6 py-4 text-base font-medium text-gray-800 dark:border-gray-800 dark:text-white/90">{title}</h3>
    {rows.length ? rows.map(c => <button key={c.id} type="button" onClick={() => nav("/company?id=" + c.id)} className="flex w-full items-center gap-3 px-6 py-3 text-start hover:bg-gray-50 dark:hover:bg-white/2">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-500 dark:bg-brand-500/15">{initials(c.name)}</span>
      <span className="min-w-0 flex-1"><b className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">{c.name}</b><span className="text-xs text-gray-500">{c.account_no}</span></span>{cell(c)}</button>) : <Empty t="Nothing yet." />}</div>;
  return <>
    <PageBreadcrumb pageTitle="Dashboard" />
    <H t={hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening"} sub={`${now.toLocaleDateString("en-GB", { weekday: "long" })} ${dmy(now)} · every restaurant on Skwyd Hub, their plans and what they owe.`} />
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Kpi l="Monthly Revenue" v={money(mrrOf(cs), cur)} /><Kpi l="Paying" v={cs.filter(c => !c.sub?.complimentary && c.sub?.state === "active").length} /><Kpi l="On Trial" v={count("trial")} />
      <Kpi l="Grace / Locked" v={`${count("grace")} / ${count("locked")}`} /><Kpi l="Open Invoices" v={money(cs.reduce((a, c) => a + Number(c.sub?.owed || 0), 0), cur)} /></div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <List title="Trials and grace ending soon" rows={ending} cell={c => <span className="flex items-center gap-2"><State c={c} /><span className="text-sm text-gray-500">{c.sub.daysLeft} {c.sub.daysLeft === 1 ? "day" : "days"}</span></span>} />
      <List title="Busiest (orders, 30 days)" rows={busy} cell={c => <b className="text-sm font-semibold text-gray-800 dark:text-white/90">{c.orders30}</b>} />
      <List title="Newest businesses" rows={newest} cell={c => <span className="text-sm text-gray-500">{dmy(c.created_at)}</span>} />
    </div></>;
}

/* ---------- companies ---------- */
export function Companies() {
  const { data } = useAdmin(), cs = data.companies || [], nav = useNavigate(), [q, setQ] = useState(""), [tab, setTab] = useState("all"), [nw, setNw] = useState(false);
  const s = q.trim().toLowerCase();
  const rows = cs.filter(c => (tab === "all" || (tab === "free" ? c.sub?.complimentary : !c.sub?.complimentary && c.sub?.state === tab)) && (!s || [c.name, c.account_no, c.email, c.phone, c.contact_name].some(v => String(v || "").toLowerCase().includes(s))));
  return <>
    <PageBreadcrumb pageTitle="Companies" />
    <div className={BOX}>
      <div className="flex flex-col gap-4 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3"><SegTabs value={tab} onChange={setTab} items={[["all", "All"], ["active", "Active"], ["trial", "Trial"], ["grace", "Grace Period"], ["locked", "Locked"], ["free", "Free"]]} />
          <span className="flex-1" /><Button onClick={() => setNw(true)}><PlusIcon className="size-5" />New Business</Button></div>
        <div className="flex flex-wrap items-center gap-3"><InputGroup className="h-11 w-full sm:w-72"><InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon><InputGroupInput placeholder="Search name, account, email, phone" value={q} onChange={e => setQ(e.target.value)} /></InputGroup>
          <span className="text-sm text-gray-500">{rows.length} of {cs.length}</span></div>
      </div>
      <div className="max-w-full overflow-x-auto border-t border-gray-100 dark:border-white/5">{rows.length ? <table className="w-full"><thead><tr className="border-b border-gray-100 dark:border-white/5">{["Company", "Account Number", "Owner", "Status", "Ends In", "POS Devices", "Price", "Owed", "Orders (30 Days)", "Joined"].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">{rows.map(c => { const x = c.sub || {}; return <tr key={c.id} className={TR} onClick={() => nav("/company?id=" + c.id)}>
          <td className={TD}><b className="block font-medium text-gray-800 dark:text-white/90">{c.name}</b><span className="text-xs text-gray-500">{c.subcategory || c.category || ""}</span></td><td className={TD}>{c.account_no || "—"}</td>
          <td className={TD}>{c.contact_name || "—"}<span className="block text-xs text-gray-500">{[c.email, c.phone].filter(Boolean).join(" · ")}</span></td><td className={TD}><State c={c} /></td>
          <td className={TD}>{x.complimentary ? "—" : x.daysLeft != null ? x.daysLeft + (x.daysLeft === 1 ? " Day" : " Days") : "—"}</td><td className={TD}>{x.posUsed ?? 0} / {x.complimentary ? "∞" : x.posDevices ?? 0}</td>
          <td className={TD}>{x.complimentary ? "—" : <>{money(c.quote?.total)}<span className="block text-xs text-gray-500">{c.quote?.cycle === "yearly" ? "Yearly" : "Monthly"}</span></>}</td>
          <td className={TD}>{Number(x.owed) ? money(x.owed) : "—"}</td><td className={TD}>{c.orders30 || 0}</td><td className={TD}>{dmy(c.created_at)}</td></tr>; })}</tbody></table> : <Empty t="No companies match." />}</div>
    </div>
    {nw && <NewBusiness onClose={() => setNw(false)} />}
  </>;
}

// a business that didn't sign up by itself: the company, its plan, and the owner's login
function NewBusiness({ onClose }: { onClose: () => void }) {
  const { data, reload } = useAdmin(), nav = useNavigate(), st = data.settings || {};
  const [v, setV] = useState<Record<string, any>>({ name: "", country: "Lebanon", currency: "USD", category: "", subcategory: "", firstName: "", lastName: "", dial: "Lebanon", phone: "", email: "", password: "", status: "trial", cycle: "monthly", posDevices: 2, warehouses: 1, paidUntil: "", modules: MODULES.map(m => m[0]), complimentary: false });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), set = (k: string, x: any) => setV(o => ({ ...o, [k]: x }));
  const save = async () => {
    for (const [k, l] of [["name", "Business name"], ["country", "Country"], ["currency", "Currency"], ["category", "Business category"], ["subcategory", "Business subcategory"], ["firstName", "Owner first name"], ["lastName", "Owner last name"], ["phone", "Phone"], ["email", "Email"], ["password", "Password"]] as const) if (!String(v[k]).trim()) return setErr(l + " is required.");
    if (v.password.length < 6) return setErr("The password needs at least 6 characters.");
    setBusy(true); setErr("");
    try {
      const name = (v.firstName.trim() + " " + v.lastName.trim()).trim();
      const r: any = await rpc("slick_pa_create_company", { p: { name: v.name.trim(), country: v.country, contactName: name, firstName: v.firstName.trim(), lastName: v.lastName.trim(), phone: fullPhone(v.dial, v.phone), currency: v.currency, category: v.category, subcategory: v.subcategory, email: v.email.trim(),
        status: v.status, cycle: v.cycle, posDevices: +v.posDevices || 0, warehouses: +v.warehouses || 0, complimentary: v.complimentary, paidUntil: endOf(v.paidUntil), modules: v.modules } });
      // the owner's login, with a separate client so the admin stays signed in
      const tmp = createClient("https://akrezmxgtorkuwxxctyk.supabase.co", "sb_publishable_tL62keD2HdovsMpI8XAkWg_TPdjaUVh", { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "skwyd-hub-new-owner" } });
      const su = await tmp.auth.signUp({ email: v.email.trim(), password: v.password, options: { emailRedirectTo: "https://dev.portal.skwydhub.com/", data: { name } } });
      await reload(); onClose(); nav("/company?id=" + r.id);
      if (su.error) toast("The business was created, but the owner's login wasn't: " + su.error.message, "error");
      else if (su.data?.user && !(su.data.user.identities || []).length) toast("This email already has a Skwyd Hub login: the owner signs in with their existing password.");
      else toast("Business created");
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  const subs = (CATEGORIES.find(x => x[0] === v.category) || ["", []])[1];
  return <Dialog open onOpenChange={x => !x && onClose()}><DialogContent className="max-h-[92dvh] w-full overflow-y-auto p-6 sm:max-w-2xl">
    <DialogHeader><DialogTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">New Business</DialogTitle></DialogHeader>
    <Sub t="Business" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <F l="Business Name" req><Input className="h-11" value={v.name} onChange={e => set("name", e.target.value)} /></F>
      <F l="Country" req><select className={SEL} value={v.country} onChange={e => { const c = COUNTRIES.find(x => x[0] === e.target.value); setV(o => ({ ...o, country: e.target.value, ...(c ? { dial: c[0], currency: c[2] } : {}) })); }}>{COUNTRIES.map(([n]) => <option key={n}>{n}</option>)}</select></F>
      <F l="Currency" req><select className={SEL} value={v.currency} onChange={e => set("currency", e.target.value)}>{CURRENCIES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></F>
      <F l="Business Category" req><select className={SEL} value={v.category} onChange={e => setV(o => ({ ...o, category: e.target.value, subcategory: "" }))}><option value="">Choose…</option>{CATEGORIES.map(([c]) => <option key={c}>{c}</option>)}</select></F>
      <F l="Business Subcategory" req><select className={SEL} disabled={!v.category} value={v.subcategory} onChange={e => set("subcategory", e.target.value)}><option value="">Choose…</option>{subs.map(x => <option key={x}>{x}</option>)}</select></F>
    </div>
    <Sub t="Owner" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <F l="Owner First Name" req><Input className="h-11" value={v.firstName} onChange={e => set("firstName", e.target.value)} /></F>
      <F l="Owner Last Name" req><Input className="h-11" value={v.lastName} onChange={e => set("lastName", e.target.value)} /></F>
      <div className="sm:col-span-2"><F l="Phone" req><div className="flex gap-2"><select aria-label="Country code" className={cn(SEL, "w-56 shrink-0")} value={v.dial} onChange={e => set("dial", e.target.value)}>{COUNTRIES.map(([n, d]) => <option key={n} value={n}>{n} ({d})</option>)}</select><Input className="h-11 flex-1" inputMode="tel" placeholder="70 123 456" value={v.phone} onChange={e => set("phone", e.target.value)} /></div></F></div>
      <F l="Email" req><Input className="h-11" type="email" autoComplete="off" value={v.email} onChange={e => set("email", e.target.value)} /></F>
      <F l="Password" req><Input className="h-11" type="password" autoComplete="new-password" value={v.password} onChange={e => set("password", e.target.value)} /></F>
    </div>
    <p className="mt-2 text-xs text-gray-500">The owner confirms their email once, then signs in at dev.portal.skwydhub.com with the account number, this email and this password.</p>
    <Sub t="Subscription" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <F l="Status"><select className={SEL} value={v.status} onChange={e => set("status", e.target.value)}><option value="trial">Trial ({st.trialDays ?? 14} Days)</option><option value="active">Active</option></select></F>
      <F l="Billing"><select className={SEL} value={v.cycle} onChange={e => set("cycle", e.target.value)}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></F>
      <F l="POS Devices"><Input className="h-11" type="number" min="0" value={v.posDevices} onChange={e => set("posDevices", e.target.value)} /></F>
      <F l="Warehouses"><Input className="h-11" type="number" min="0" value={v.warehouses} onChange={e => set("warehouses", e.target.value)} /></F>
      <F l="Paid Until"><DateInput value={v.paidUntil} onChange={x => set("paidUntil", x)} /></F>
      <label className="mt-7 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" className="size-4 accent-brand-500" checked={v.complimentary} onChange={e => set("complimentary", e.target.checked)} />Free (Never Billed)</label>
      <div className="sm:col-span-2"><Mods value={v.modules} set={x => set("modules", x)} /></div>
    </div>
    {err && <p className="mt-4 text-sm text-red-500">{err}</p>}
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Creating…" : "Create"}</Button></div>
  </DialogContent></Dialog>;
}
const Sub = ({ t }: { t: string }) => <h4 className="mt-6 mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">{t}</h4>;
const Mods = ({ value, set }: { value: string[]; set: (v: string[]) => void }) => <div><span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Modules</span>
  <div className="flex flex-wrap gap-2">{MODULES.map(([k, t]) => { const on = value.includes(k); return <button key={k} type="button" onClick={() => set(on ? value.filter(x => x !== k) : [...value, k])}
    className={cn("h-10 rounded-lg border px-3 text-sm font-medium", on ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400")}>{on ? "✓ " : ""}{t}</button>; })}</div></div>;

/* ---------- one company: summary, business & owner, plan, invoices ---------- */
export function CompanyPage() {
  const { data, reload } = useAdmin(), id = useSearchParams()[0].get("id") || "", c = (data.companies || []).find(x => x.id === id), [inv, setInv] = useState<any[] | null>(null), [tick, setTick] = useState(0);
  useEffect(() => { if (id) rpc<any[]>("slick_pa_invoices", { p_company: id }).then(setInv).catch(() => setInv([])); }, [id, tick]);
  if (!c) return <><PageBreadcrumb pageTitle="Companies" /><div className={BOX}><Empty t="This company wasn't found." /></div></>;
  const s = c.subscription || {}, x = c.sub || {}, cur = data.settings?.currency || "USD";
  const refresh = async () => { await reload(); setTick(t => t + 1); };
  const viewAs = async () => { const w = window.open("about:blank", "_blank");
    try { await rpc("slick_pa_view_as", { p_company: c.id }); if (w) w.location.href = "https://dev.portal.skwydhub.com/"; await reload(); } catch (e: any) { w?.close(); toast(e.message, "error"); } };
  return <>
    <PageBreadcrumb pageTitle="Companies" current={c.name} />
    <div className="mb-6 flex flex-wrap items-center gap-3"><Button variant="outline" render={<Link to="/companies" />}><ArrowLeftIcon className="size-5" />Companies</Button>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{c.name}</h2><State c={c} /><span className="flex-1" /><Button onClick={viewAs}>Open Dashboard</Button></div>
    <div className={BOX + " mb-6 grid grid-cols-2 gap-x-6 gap-y-5 p-5 lg:grid-cols-4"}>{([["Account Number", c.account_no || "—"], [s.status === "trial" ? "Trial Ends" : "Paid Until", dmy(s.status === "trial" ? s.trial_ends_at : s.paid_until)], ["Locks On", x.complimentary ? "Never" : dmy(x.lockAt)],
      ["POS Devices In Use", `${x.posUsed ?? 0} of ${x.complimentary ? "∞" : s.pos_devices ?? 0}`], ["Warehouses In Use", `${x.warehousesUsed ?? 0} of ${x.complimentary ? "∞" : s.warehouses ?? 1}`], ["Stores", String(x.branches ?? 0)], ["Next Invoice", money(c.quote?.total, cur)], ["Owed", Number(x.owed) ? money(x.owed, cur) : "—"]] as [string, string][]).map(([l, v]) =>
      <div key={l}><p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{l}</p><b className="text-sm font-medium text-gray-800 dark:text-white/90">{v}</b></div>)}</div>
    <PlanForm key={c.id + tick} c={c} onSaved={refresh} />
    <Invoices1 c={c} inv={inv} onChange={refresh} />
  </>;
}
function PlanForm({ c, onSaved }: { c: any; onSaved: () => Promise<void> }) {
  const { data } = useAdmin(), s = c.subscription || {}, ph = splitPhone(c.phone), cn0 = String(c.contact_name || "");
  const [v, setV] = useState<Record<string, any>>({ name: c.name || "", firstName: c.first_name ?? cn0.split(" ")[0] ?? "", lastName: c.last_name ?? cn0.split(" ").slice(1).join(" "), email: c.email || "", dial: ph.country, phone: ph.num, country: c.country || "Lebanon", currency: c.currency || "USD", category: c.category || "", subcategory: c.subcategory || "",
    status: s.status || "trial", cycle: s.cycle === "yearly" ? "yearly" : "monthly", posDevices: s.pos_devices ?? 1, warehouses: s.warehouses ?? 1, trialEndsAt: isoDay(s.trial_ends_at), paidUntil: isoDay(s.paid_until), graceDays: s.grace_days ?? "", discountPct: s.discount_pct ?? 0,
    modules: s.modules || [], locked: !!s.locked, complimentary: !!s.complimentary, notes: s.notes || "" });
  const [busy, setBusy] = useState(false), set = (k: string, x: any) => setV(o => ({ ...o, [k]: x })), subs = (CATEGORIES.find(x => x[0] === v.category) || ["", []])[1];
  const save = async () => { setBusy(true);
    try { await rpc("slick_pa_update_subscription", { p_company: c.id, p: { status: v.status, cycle: v.cycle, posDevices: +v.posDevices || 0, warehouses: +v.warehouses || 0, discountPct: +v.discountPct || 0, trialEndsAt: endOf(v.trialEndsAt), paidUntil: endOf(v.paidUntil),
      graceDays: v.graceDays === "" ? null : +v.graceDays, modules: v.modules, locked: v.locked, complimentary: v.complimentary, notes: v.notes,
      company: { name: v.name.trim(), contactName: (v.firstName.trim() + " " + v.lastName.trim()).trim(), firstName: v.firstName.trim(), lastName: v.lastName.trim(), email: v.email.trim(), phone: fullPhone(v.dial, v.phone), category: v.category, subcategory: v.subcategory, country: v.country, currency: v.currency } } });
      toast("Saved"); await onSaved(); } catch (e: any) { toast(e.message, "error"); } setBusy(false); };
  return <>
    <div className={BOX + " mb-6 p-5"}><h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Business & Owner</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <F l="Business Name"><Input className="h-11" value={v.name} onChange={e => set("name", e.target.value)} /></F>
        <F l="Owner First Name"><Input className="h-11" value={v.firstName} onChange={e => set("firstName", e.target.value)} /></F>
        <F l="Owner Last Name"><Input className="h-11" value={v.lastName} onChange={e => set("lastName", e.target.value)} /></F>
        <F l="Owner Email"><Input className="h-11" type="email" value={v.email} onChange={e => set("email", e.target.value)} /></F>
        <div className="sm:col-span-2"><F l="Owner Phone"><div className="flex gap-2"><select aria-label="Country code" className={cn(SEL, "w-52 shrink-0")} value={v.dial} onChange={e => set("dial", e.target.value)}>{COUNTRIES.map(([n, d]) => <option key={n} value={n}>{n} ({d})</option>)}</select><Input className="h-11 flex-1" inputMode="tel" value={v.phone} onChange={e => set("phone", e.target.value)} /></div></F></div>
        <F l="Country"><select className={SEL} value={v.country} onChange={e => set("country", e.target.value)}>{COUNTRIES.map(([n]) => <option key={n}>{n}</option>)}</select></F>
        <F l="Currency"><select className={SEL} value={v.currency} onChange={e => set("currency", e.target.value)}>{CURRENCIES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></F>
        <F l="Business Category"><select className={SEL} value={v.category} onChange={e => setV(o => ({ ...o, category: e.target.value, subcategory: "" }))}><option value="">Choose…</option>{CATEGORIES.map(([k]) => <option key={k}>{k}</option>)}</select></F>
        <F l="Business Subcategory"><select className={SEL} disabled={!v.category} value={v.subcategory} onChange={e => set("subcategory", e.target.value)}><option value="">Choose…</option>{subs.map(x => <option key={x}>{x}</option>)}</select></F>
      </div></div>
    <div className={BOX + " mb-6 p-5"}><h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Subscription</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <F l="Status"><select className={SEL} value={v.status} onChange={e => set("status", e.target.value)}><option value="trial">Trial</option><option value="active">Active</option><option value="cancelled">Cancelled</option></select></F>
        <F l="Billing"><select className={SEL} value={v.cycle} onChange={e => set("cycle", e.target.value)}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></F>
        <F l="POS Devices"><Input className="h-11" type="number" min="0" value={v.posDevices} onChange={e => set("posDevices", e.target.value)} /></F>
        <F l="Warehouses"><Input className="h-11" type="number" min="0" value={v.warehouses} onChange={e => set("warehouses", e.target.value)} /></F>
        <F l="Trial Ends"><DateInput value={v.trialEndsAt} onChange={x => set("trialEndsAt", x)} /></F>
        <F l="Paid Until"><DateInput value={v.paidUntil} onChange={x => set("paidUntil", x)} /></F>
        <F l="Grace Days"><Input className="h-11" type="number" min="0" placeholder={`Default (${data.settings?.graceDays ?? 7})`} value={v.graceDays} onChange={e => set("graceDays", e.target.value)} /></F>
        <F l="Discount %"><Input className="h-11" type="number" min="0" max="100" step="0.01" value={v.discountPct} onChange={e => set("discountPct", e.target.value)} /></F>
        <div className="sm:col-span-2 xl:col-span-4"><Mods value={v.modules} set={x => set("modules", x)} /></div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" className="size-4 accent-brand-500" checked={v.locked} onChange={e => set("locked", e.target.checked)} />Locked By Hand</label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" className="size-4 accent-brand-500" checked={v.complimentary} onChange={e => set("complimentary", e.target.checked)} />Free (Never Billed)</label>
        <div className="sm:col-span-2 xl:col-span-4"><F l="Notes"><Textarea rows={2} value={v.notes} onChange={e => set("notes", e.target.value)} /></F></div>
      </div>
      <div className="mt-5 flex justify-end"><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></div></div>
  </>;
}
const InvState = ({ i }: { i: any }) => { const over = i.status === "open" && new Date(i.due_at) < new Date();
  return <Badge variant="light" color={over ? "error" : i.status === "paid" ? "success" : i.status === "open" ? "warning" : "light"}>{over ? "Overdue" : String(i.status || "").replace(/^./, (m: string) => m.toUpperCase())}</Badge>; };
function Invoices1({ c, inv, onChange }: { c: any; inv: any[] | null; onChange: () => Promise<void> }) {
  const { data } = useAdmin(), [pay, setPay] = useState<any>(null), [nw, setNw] = useState(false);
  return <div className={BOX}>
    <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h3 className="flex-1 text-base font-medium text-gray-800 dark:text-white/90">Invoices</h3><Button size="sm" disabled={!!c.sub?.complimentary} onClick={() => setNw(true)}><PlusIcon className="size-4" />Create Invoice</Button></div>
    {inv === null ? <Empty t="Loading…" /> : !inv.length ? <Empty t="No invoices yet." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-gray-100 dark:border-white/5">{["Number", "Period", "Total", "Status", "Due", "Paid", ""].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-gray-100 dark:divide-white/5">{inv.map(i => <tr key={i.id}><td className={TD}><b className="font-medium text-gray-800 dark:text-white/90">{i.number}</b></td>
        <td className={TD}>{dmy(i.period_start)} → {dmy(i.period_end)}<span className="block text-xs text-gray-500">{(i.lines || []).map((l: any) => l.name + " × " + l.qty).join(" · ")}</span></td>
        <td className={TD}>{money(i.total, i.currency)}</td><td className={TD}><InvState i={i} /></td><td className={TD}>{dmy(i.due_at)}</td>
        <td className={TD}>{i.paid_at ? <>{dmy(i.paid_at)}<span className="block text-xs text-gray-500">{[i.method, i.reference].filter(Boolean).join(" · ")}</span></> : "—"}</td>
        <td className={TD + " text-end"}><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => showInvoice(i, data.settings, c).catch(e => toast(e.message, "error"))}>View</Button>
          {i.status === "open" && <><Button size="sm" variant="outline" onClick={() => setPay(i)}>Mark Paid</Button><Button size="sm" variant="outline" className="text-red-500" onClick={async () => { if (!(await askYes("Void this invoice? It will no longer be owed.", "Void", true))) return;
            try { await rpc("slick_pa_void_invoice", { p_invoice: i.id }); toast("Invoice voided"); await onChange(); } catch (e: any) { toast(e.message, "error"); } }}>Void</Button></>}</div></td></tr>)}</tbody></table></div>}
    {pay && <PayDialog i={pay} onClose={() => setPay(null)} onDone={async () => { setPay(null); await onChange(); }} />}
    {nw && <NewInvoice c={c} onClose={() => setNw(false)} onDone={async (x: any) => { setNw(false); await onChange(); if (x) showInvoice(x, data.settings, c).catch(() => {}); }} />}
  </div>;
}
function PayDialog({ i, onClose, onDone }: { i: any; onClose: () => void; onDone: () => Promise<void> }) {
  const [m, setM] = useState(""), [ref, setRef] = useState(""), [busy, setBusy] = useState(false);
  return <Dialog open onOpenChange={x => !x && onClose()}><DialogContent className="w-full p-6 sm:max-w-md"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">Mark {i.number} As Paid</DialogTitle></DialogHeader>
    <p className="mt-1 text-sm text-gray-500">{money(i.total, i.currency)}{i.company ? " · " + i.company : ""}</p>
    <div className="mt-4 space-y-4"><F l="Method" req><select className={SEL} value={m} onChange={e => setM(e.target.value)}><option value="">Choose…</option>{["Bank Transfer", "Whish", "OMT", "Cash", "Card", "Other"].map(x => <option key={x}>{x}</option>)}</select></F>
      <F l="Reference"><Input className="h-11" placeholder="Transfer or receipt number" value={ref} onChange={e => setRef(e.target.value)} /></F></div>
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!m || busy} onClick={async () => { setBusy(true);
      try { await rpc("slick_pa_mark_paid", { p_invoice: i.id, p_method: m, p_reference: ref.trim() || null }); toast("Marked as paid"); await onDone(); } catch (e: any) { toast(e.message, "error"); setBusy(false); } }}>Mark Paid</Button></div>
  </DialogContent></Dialog>;
}
function NewInvoice({ c, onClose, onDone }: { c: any; onClose: () => void; onDone: (inv: any) => Promise<void> }) {
  const [lines, setLines] = useState<{ name: string; amount: string }[]>([{ name: "", amount: "" }]), [due, setDue] = useState("7"), [notes, setNotes] = useState(""), [busy, setBusy] = useState(false);
  const yearly = (c.subscription?.cycle || "monthly") === "yearly";
  return <Dialog open onOpenChange={x => !x && onClose()}><DialogContent className="w-full p-6 sm:max-w-lg"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">New Invoice For {c.name}</DialogTitle></DialogHeader>
    <p className="mt-1 text-sm text-gray-500">It bills the plan for the next {yearly ? "year" : "month"} ({money(c.quote?.total || 0, c.quote?.currency)}). Add one-off charges if needed.</p>
    <div className="mt-4"><span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">One-Off Charges</span>
      <div className="space-y-2">{lines.map((l, k) => <div key={k} className="flex gap-2"><Input className="h-11 flex-1" placeholder="Setup fee" value={l.name} onChange={e => setLines(o => o.map((x, j) => j === k ? { ...x, name: e.target.value } : x))} />
        <Input className="h-11 w-32" type="number" step="0.01" placeholder="0.00" value={l.amount} onChange={e => setLines(o => o.map((x, j) => j === k ? { ...x, amount: e.target.value } : x))} />
        <Button variant="outline" size="icon" aria-label="Remove line" onClick={() => setLines(o => o.filter((_, j) => j !== k))}><TrashBinIcon className="size-4" /></Button></div>)}</div>
      <Button size="sm" variant="outline" className="mt-2" onClick={() => setLines(o => [...o, { name: "", amount: "" }])}><PlusIcon className="size-4" />Add Charge</Button></div>
    <div className="mt-4 grid grid-cols-3 gap-3"><F l="Due In (Days)"><Input className="h-11" type="number" min="0" value={due} onChange={e => setDue(e.target.value)} /></F><div className="col-span-2"><F l="Note On The Invoice"><Input className="h-11" placeholder="Includes setup and training" value={notes} onChange={e => setNotes(e.target.value)} /></F></div></div>
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={async () => {
      const extra = lines.map(l => ({ name: l.name.trim(), amount: +l.amount || 0 })).filter(x => x.name || x.amount); if (extra.some(x => !x.name || !x.amount)) return toast("Each one-off charge needs a name and an amount.", "error");
      setBusy(true); try { const x = await rpc("slick_pa_create_invoice", { p_company: c.id, p_due_days: +due || 0, p_extra: extra, p_notes: notes.trim() || null }); toast("Invoice created"); await onDone(x); } catch (e: any) { toast(e.message, "error"); setBusy(false); } }}>Create Invoice</Button></div>
  </DialogContent></Dialog>;
}

/* ---------- every invoice ---------- */
export function Invoices() {
  const { data } = useAdmin(), cur = data.settings?.currency || "USD", nav = useNavigate(), [all, setAll] = useState<any[] | null>(null), [err, setErr] = useState(""), [tab, setTab] = useState("all"), [q, setQ] = useState(""), [pay, setPay] = useState<any>(null), [tick, setTick] = useState(0);
  useEffect(() => { rpc<any[]>("slick_pa_all_invoices").then(x => setAll(Array.isArray(x) ? x : [])).catch(e => setErr(e.message)); }, [tick]);
  const now = new Date(), over = (i: any) => i.status === "open" && new Date(i.due_at) < now, sum = (l: any[]) => l.reduce((a, i) => a + Number(i.total || 0), 0), l = all || [];
  const month = l.filter(i => i.status === "paid" && new Date(i.paid_at).getMonth() === now.getMonth() && new Date(i.paid_at).getFullYear() === now.getFullYear());
  const s = q.trim().toLowerCase(), rows = l.filter(i => (tab === "all" || (tab === "overdue" ? over(i) : i.status === tab)) && (!s || [i.number, i.company, i.accountNo].some(v => String(v || "").toLowerCase().includes(s))));
  return <>
    <PageBreadcrumb pageTitle="Invoices" />
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4"><Kpi l="Open" v={money(sum(l.filter(i => i.status === "open")), cur)} /><Kpi l="Overdue" v={money(sum(l.filter(over)), cur)} /><Kpi l="Paid This Month" v={money(sum(month), cur)} /><Kpi l="Invoices" v={l.length} /></div>
    <div className={BOX}>
      <div className="flex flex-col gap-4 px-5 py-4 sm:px-6"><SegTabs value={tab} onChange={setTab} items={[["all", "All"], ["open", "Open"], ["overdue", "Overdue"], ["paid", "Paid"], ["void", "Void"]]} />
        <InputGroup className="h-11 w-full sm:w-72"><InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon><InputGroupInput placeholder="Search number or business" value={q} onChange={e => setQ(e.target.value)} /></InputGroup>
        <p className="text-xs text-gray-500">New invoices are created automatically {data.settings?.invoiceDaysBefore ?? 7} days before each period ends.</p></div>
      <div className="overflow-x-auto border-t border-gray-100 dark:border-white/5">{err ? <Empty t={err} /> : all === null ? <Empty t="Loading…" /> : !rows.length ? <Empty t="No invoices match." /> :
        <table className="w-full"><thead><tr className="border-b border-gray-100 dark:border-white/5">{["Number", "Business", "Period", "Due", "Total", "Status", ""].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">{rows.map(i => <tr key={i.id}><td className={TD}><b className="font-medium text-gray-800 dark:text-white/90">{i.number}</b>{i.auto && <span className="block text-xs text-gray-500">Automatic</span>}</td>
            <td className={TD}><button type="button" className="font-medium text-brand-500 hover:underline" onClick={() => nav("/company?id=" + i.company_id)}>{i.company}</button><span className="block text-xs text-gray-500">{i.accountNo}</span></td>
            <td className={TD}>{dmy(i.period_start)} → {dmy(i.period_end)}</td><td className={TD}>{dmy(i.due_at)}</td><td className={TD}>{money(i.total, i.currency)}</td><td className={TD}><InvState i={i} /></td>
            <td className={TD + " text-end"}><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => showInvoice(i, data.settings, (data.companies || []).find(x => x.id === i.company_id)).catch(e => toast(e.message, "error"))}>View</Button>
              {i.status === "open" && <Button size="sm" variant="outline" onClick={() => setPay(i)}>Mark Paid</Button>}</div></td></tr>)}</tbody></table>}</div>
    </div>
    {pay && <PayDialog i={pay} onClose={() => setPay(null)} onDone={async () => { setPay(null); setTick(t => t + 1); }} />}
  </>;
}

/* ---------- price list ---------- */
export function Prices() {
  const { data, reload } = useAdmin(), cur = data.settings?.currency || "USD", [ps, setPs] = useState<any[]>(() => (data.products || []).map(p => ({ ...p }))), [busy, setBusy] = useState(false);
  const UNIT: [string, string][] = [["device", "Per POS Device"], ["warehouse", "Per Warehouse"], ["branch", "Per Store"], ["company", "Per Company"]];
  const set = (k: number, f: string, v: any) => setPs(o => o.map((p, j) => j === k ? { ...p, [f]: v } : p));
  return <>
    <PageBreadcrumb pageTitle="Price List" />
    <div className={BOX}>
      <p className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">What each part of Skwyd Hub costs ({cur}). New invoices use these prices; a company's discount applies on top.</p>
      <div className="overflow-x-auto border-t border-gray-100 dark:border-white/5"><table className="w-full"><thead><tr className="border-b border-gray-100 dark:border-white/5">{["Name", "Charged", "Monthly", "Yearly", "Always Included", "Offered"].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">{ps.map((p, k) => <tr key={p.id}>
          <td className={TD}><Input className="h-10 min-w-48" value={p.name} onChange={e => set(k, "name", e.target.value)} /></td>
          <td className={TD}><select className={cn(SEL, "h-10 min-w-40")} value={p.unit} onChange={e => set(k, "unit", e.target.value)}>{UNIT.map(([u, t]) => <option key={u} value={u}>{t}</option>)}</select></td>
          <td className={TD}><Input className="h-10 w-28 text-end" type="number" min="0" step="0.01" value={p.monthly} onChange={e => set(k, "monthly", e.target.value)} /></td>
          <td className={TD}><Input className="h-10 w-28 text-end" type="number" min="0" step="0.01" value={p.yearly} onChange={e => set(k, "yearly", e.target.value)} /></td>
          <td className={TD}><input type="checkbox" className="size-4 accent-brand-500" aria-label={p.name + " always included"} checked={!!p.required} onChange={e => set(k, "required", e.target.checked)} /></td>
          <td className={TD}><input type="checkbox" className="size-4 accent-brand-500" aria-label={p.name + " offered"} checked={!!p.active} onChange={e => set(k, "active", e.target.checked)} /></td></tr>)}</tbody></table></div>
      <div className="flex justify-end border-t border-gray-100 px-6 py-4 dark:border-white/5"><Button disabled={busy} onClick={async () => { setBusy(true);
        try { await rpc("slick_pa_save_products", { p: ps.map((p, i) => ({ id: p.id, name: String(p.name).trim(), unit: p.unit, monthly: +p.monthly || 0, yearly: +p.yearly || 0, required: !!p.required, active: !!p.active, sort: i + 1 })) }); toast("Saved"); await reload(); } catch (e: any) { toast(e.message, "error"); } setBusy(false); }}>{busy ? "Saving…" : "Save"}</Button></div>
    </div></>;
}

/* ---------- settings: trials, grace, support contact, invoices ---------- */
export function AdminSettings() {
  const { data, reload } = useAdmin(), s = data.settings || {}, [busy, setBusy] = useState(false);
  const [v, setV] = useState<Record<string, any>>({ trialDays: s.trialDays ?? 14, graceDays: s.graceDays ?? 7, currency: s.currency || "USD", supportPhone: s.supportPhone || "", supportEmail: s.supportEmail || "", billingName: s.billingName || "", billingTaxNo: s.billingTaxNo || "",
    billingAddress: s.billingAddress || "", paymentInstructions: s.paymentInstructions || "", invoiceFooter: s.invoiceFooter || "", autoInvoice: s.autoInvoice !== false, invoiceDaysBefore: s.invoiceDaysBefore ?? 7 });
  const set = (k: string, x: any) => setV(o => ({ ...o, [k]: x }));
  return <>
    <PageBreadcrumb pageTitle="Settings" />
    <div className={BOX + " mb-6 p-5"}><h3 className="mb-1 text-base font-medium text-gray-800 dark:text-white/90">Trials & Payments</h3>
      <p className="mb-4 text-sm text-gray-500">After the trial or the paid period ends, the company has the grace period to pay. Then its back office, POS and online ordering lock until an invoice is paid. Its data is kept.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><F l="Free Trial (Days)"><Input className="h-11" type="number" min="0" value={v.trialDays} onChange={e => set("trialDays", e.target.value)} /></F>
        <F l="Grace Period (Days)"><Input className="h-11" type="number" min="0" value={v.graceDays} onChange={e => set("graceDays", e.target.value)} /></F>
        <F l="Currency"><select className={SEL} value={v.currency} onChange={e => set("currency", e.target.value)}>{["USD", "EUR", "LBP"].map(x => <option key={x}>{x}</option>)}</select></F>
        <F l="Support Phone"><Input className="h-11" value={v.supportPhone} onChange={e => set("supportPhone", e.target.value)} /></F>
        <F l="Support Email"><Input className="h-11" type="email" value={v.supportEmail} onChange={e => set("supportEmail", e.target.value)} /></F></div>
      <p className="mt-3 text-xs text-gray-500">Restaurants see the support phone and email on their Subscription page and lock screen.</p></div>
    <div className={BOX + " mb-6 p-5"}><h3 className="mb-1 text-base font-medium text-gray-800 dark:text-white/90">Invoices</h3>
      <p className="mb-4 text-sm text-gray-500">Every morning, each business whose trial or paid period ends within these days gets its next invoice, due the day the period ends.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><F l="Billing Name"><Input className="h-11" placeholder="Skwyd Hub S.A.R.L" value={v.billingName} onChange={e => set("billingName", e.target.value)} /></F>
        <F l="Tax Number"><Input className="h-11" value={v.billingTaxNo} onChange={e => set("billingTaxNo", e.target.value)} /></F>
        <div className="sm:col-span-2"><F l="Address"><Textarea rows={2} value={v.billingAddress} onChange={e => set("billingAddress", e.target.value)} /></F></div>
        <div className="sm:col-span-2"><F l="How To Pay"><Textarea rows={3} placeholder="Bank transfer to … · IBAN … · or Whish to …" value={v.paymentInstructions} onChange={e => set("paymentInstructions", e.target.value)} /></F></div>
        <div className="sm:col-span-2"><F l="Invoice Footer"><Input className="h-11" placeholder="Thank you for running your business on skwyd hub." value={v.invoiceFooter} onChange={e => set("invoiceFooter", e.target.value)} /></F></div>
        <F l="Create Invoices Automatically"><select className={SEL} value={v.autoInvoice ? "1" : "0"} onChange={e => set("autoInvoice", e.target.value === "1")}><option value="1">Yes</option><option value="0">No</option></select></F>
        <F l="Days Before The Period Ends"><Input className="h-11" type="number" min="0" max="60" value={v.invoiceDaysBefore} onChange={e => set("invoiceDaysBefore", e.target.value)} /></F></div></div>
    <div className="flex justify-end"><Button disabled={busy} onClick={async () => { setBusy(true);
      try { await rpc("slick_pa_save_settings", { p: { trialDays: +v.trialDays || 0, graceDays: +v.graceDays || 0, currency: v.currency, supportPhone: v.supportPhone.trim(), supportEmail: v.supportEmail.trim(), billingName: v.billingName.trim(), billingTaxNo: v.billingTaxNo.trim(), billingAddress: v.billingAddress.trim(),
        paymentInstructions: v.paymentInstructions.trim(), invoiceFooter: v.invoiceFooter.trim(), autoInvoice: v.autoInvoice, invoiceDaysBefore: Math.max(0, +v.invoiceDaysBefore || 0) } }); toast("Saved"); await reload(); } catch (e: any) { toast(e.message, "error"); } setBusy(false); }}>{busy ? "Saving…" : "Save"}</Button></div>
  </>;
}
