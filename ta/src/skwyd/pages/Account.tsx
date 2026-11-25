import { Label } from "@/components/tremor/Label";
import { Card as TremorCard } from "@/components/tremor/Card";
import { cx } from "@/components/tremor/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
import { SelectNative } from "@/components/tremor/SelectNative";
// Account (My Profile and Business Details), Subscription and Marketplace: same fields, rules and data as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { put, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { DIALS, WORLD } from "@/lib/world";
import { cn } from "@/utils";
import { useEffect, useState } from "react";
import { live, useS } from "../crud/CrudPage";
import { pinHash } from "../crud/configs";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, SEL, TD, TH, TR } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

const ROLE_LBL: Record<string, string> = { owner: "Account Owner", admin: "Admin", agent: "Staff", cashier: "Cashier" };
const isAdminRow = (r: Row) => r.role === "owner" || r.role === "admin";
const ls = { get: (k: string) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
const dialSorted = DIALS.map(d => d[0]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b.length - a.length);
const ccSplit = (v: string, def = "+961") => { const t = String(v || "").trim(); if (t.startsWith("+")) { const d = t.replace(/[^\d+]/g, ""), m = dialSorted.find(c => d.startsWith(c)); if (m) return { cc: m, num: d.slice(m.length) }; } return { cc: def, num: t }; };
const fullPhone = (v: string, cc: string) => { let d = String(v || "").replace(/[^\d+]/g, ""); if (!d) return ""; if (d.startsWith("00")) d = "+" + d.slice(2); if (d.startsWith("+")) return d.replace(/(?!^)\+/g, ""); const n = d.replace(/\+/g, "").replace(/^0+/, ""); return n.length < 6 ? "" : cc + n; };
const Card = ({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) => title == null ? <TremorCard className={className}>{children}</TremorCard> : <><h3 className="mb-3 text-base font-medium text-gray-900 dark:text-gray-50">{title}</h3><TremorCard className={cx("mb-6", className)}>{children}</TremorCard></>;
const PhoneIn = ({ cc, num, setCc, setNum, dis }: { cc: string; num: string; setCc: (v: string) => void; setNum: (v: string) => void; dis?: boolean }) => (
  <div className="flex gap-2"><SelectNative aria-label="Country code" className={cn(SEL, "w-44 shrink-0")} disabled={dis} value={cc} onChange={e => setCc(e.target.value)}>{DIALS.map(([d, n]) => <option key={n} value={d}>{n} ({d})</option>)}</SelectNative>
    <Input className="h-9 flex-1" type="tel" inputMode="tel" disabled={dis} value={num} onChange={e => setNum(e.target.value)} placeholder="71123456" /></div>);

export function AccountPage() {
  const s = useS(["users", "settings", "brands"]), { staff, reload } = useAuth(), [tab, setTab] = useState("profile"), [pw, setPw] = useState(false);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const owner = staff?.role === "owner";
  return <>
    <PageBreadcrumb pageTitle="Account" />
    <div className="mb-6 flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{staff?.name || "Account"}</h2><Badge variant="light" color="primary">{owner ? "Account Owner" : ROLE_LBL[staff?.role || ""] || staff?.role || "User"}</Badge>
      <Button variant="outline" className="ms-auto" onClick={() => setPw(true)}>Change Password</Button></div>
    <div className="mb-6"><SegTabs value={tab} onChange={setTab} items={[["profile", "My Profile"], ["business", "Business Details"]]} /></div>
    {tab === "profile" ? <Profile s={s} reload={reload} /> : <Business s={s} />}
    {pw && <MyPw owner={owner} email={staff?.email || ""} onClose={() => setPw(false)} />}
  </>;
}

function Profile({ s, reload }: { s: Record<string, Row[]>; reload: () => Promise<void> }) {
  const { staff } = useAuth(), uid = staff?.userId || "", adm = ["owner", "admin"].includes(staff?.role || "");
  const me = s.users.find(u => live(u) && uid && u.userId === uid), adminRow = s.users.find(u => live(u) && isAdminRow(u) && uid && u.userId === uid);
  const ph = ccSplit(me?.phone || "");
  const [name, setName] = useState(staff?.name || ""), [cc, setCc] = useState(ph.cc), [num, setNum] = useState(ph.num), [lang, setLang] = useState(me?.language || ls.get("skwydLang") || "en");
  const savedPin = ls.get("skwyd_mypin_" + uid), [pin, setPin] = useState(adminRow?.pinHash ? (savedPin || "•••••") : ""), [locN, setLocN] = useState(me ? !!me.displayLocalized : ls.get("skwydLocN") === "1");
  const [err, setErr] = useState(""), [pinErr, setPinErr] = useState(""), [busy, setBusy] = useState(false);
  async function savePin(p: string) {
    if (!/^\d{5}$/.test(p)) { setPinErr("The PIN must be exactly 5 digits."); return false; }
    const id = adminRow?.id || "usr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    for (const u of s.users.filter(u => live(u) && u.id !== id && u.pinHash)) if (await pinHash(u.id, p) === u.pinHash || await pinHash(u.id, p.slice(0, 4)) === u.pinHash) { setPinErr("This PIN clashes with another user's PIN. Pick a different one (Generate)."); return false; }
    try { await put("users", id, { name: name.trim() || staff?.name || "Admin", email: String(staff?.email || "").toLowerCase() || null, role: staff?.role, roleIds: [], branchIds: [], userId: uid, active: true, pinHash: await pinHash(id, p) }); ls.set("skwyd_mypin_" + uid, p); setPinErr(""); return true; }
    catch (e: any) { setPinErr("Couldn't save the PIN" + (e?.message ? ": " + e.message : ".")); return false; }
  }
  async function save() {
    setErr(""); if (!name.trim()) return setErr("Enter your name."); if (!num.trim()) return setErr("Enter your phone number."); if (adm && !pin.trim()) return setErr("Enter your login PIN, or tap Generate.");
    setBusy(true);
    try {
      ls.set("skwydLang", lang); if (me && me.language !== lang) await put("users", me.id, { language: lang }).catch(() => {});
      const p = fullPhone(num.trim(), cc); if (me && (me.phone || "") !== p) await put("users", me.id, { phone: p || null }).catch(() => {});
      if (adm && pin && pin !== "•••••" && pin !== savedPin && !(await savePin(pin.trim()))) return;
      if (locN !== (me ? !!me.displayLocalized : ls.get("skwydLocN") === "1")) { ls.set("skwydLocN", locN ? "1" : "0"); if (me) await put("users", me.id, { displayLocalized: locN }).catch(() => {}); }
      const { error } = await sb.from("staff").update({ name: name.trim() }).eq("user_id", uid); if (error) throw error;
      await sb.from("staff_users").update({ name: name.trim() }).eq("user_id", uid); await reload(); toast("Account saved");
    } catch { setErr("Couldn't save your name. Only the owner can change account names; ask them under Employee Management → Employees."); } finally { setBusy(false); }
  }
  return <Card title="Profile">
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <F l="Name" req><Input className="h-9" value={name} onChange={e => setName(e.target.value)} /></F>
      <F l="Phone Number" req><PhoneIn cc={cc} num={num} setCc={setCc} setNum={setNum} /></F>
      <F l="Email"><Input className="h-9" value={staff?.email || ""} disabled /></F>
      {adm ? <F l="Login Pin" req><div className="flex gap-2"><Input className="h-9 flex-1 tracking-[.2em]" inputMode="numeric" maxLength={5} autoComplete="off" placeholder="5 digits" value={pin} onFocus={() => pin === "•••••" && setPin("")} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
        <Button variant="outline" className="h-9" onClick={() => setPin(String(Math.floor(10000 + Math.random() * 90000)))}>Generate</Button></div>{pinErr && <p className="mt-1.5 text-sm text-red-500">{pinErr}</p>}</F> : <span />}
      <F l="Language" req><SelectNative className={SEL} value={lang} onChange={e => setLang(e.target.value)}><option value="en">English</option><option value="ar">Arabic</option></SelectNative></F>
    </div>
    <Label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-gray-700 dark:text-gray-300"><Checkbox checked={locN} onCheckedChange={(chk: boolean) => setLocN(chk)} />Display Localized Names</Label>
    {err && <p className="mt-4 text-sm text-red-500">{err}</p>}
    <div className="mt-6 flex justify-end"><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></div>
  </Card>;
}

const BIZ_CATS: Record<string, string[]> = { "F&B": ["Food QSR", "Casual Dining", "Fine Dining", "Cafe", "Bakery & Pastry", "Cloud Kitchen", "Bar & Lounge", "Catering", "Food Truck"], "Retail": ["Grocery", "Butcher", "Supermarket", "Other retail"], "Services": ["Salon & Spa", "Laundry", "Other services"] };
const CUR_FIX: Record<string, string> = { Lebanon: "USD" };
const curOf = (country: string) => CUR_FIX[country] || WORLD.find(r => r[0] === country)?.[2] || "USD";
const tzOff = (z: string) => { try { const p = new Intl.DateTimeFormat("en-US", { timeZone: z, timeZoneName: "longOffset" }).formatToParts(new Date()).find(x => x.type === "timeZoneName")?.value || ""; const m = /GMT([+-]\d{2}):?(\d{2})?/.exec(p); return m ? m[1] + ":" + (m[2] || "00") : "+00:00"; } catch { return "+00:00"; } };
let TZ: [string, string][] | null = null;
const tzList = () => { if (TZ) return TZ; let all: string[] = []; try { all = (Intl as any).supportedValuesOf("timeZone"); } catch { /* old browser */ } if (!all.length) all = ["Asia/Beirut", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "UTC"]; if (!all.includes("UTC")) all.push("UTC");
  const mins = (o: string) => { const m = /([+-])(\d{2}):(\d{2})/.exec(o); return m ? (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +m[3]) : 0; };
  return TZ = all.map(z => [z, tzOff(z)] as [string, string]).sort((a, b) => mins(a[1]) - mins(b[1]) || a[0].localeCompare(b[0])); };
const curName = (c: string) => { try { return new Intl.DisplayNames(["en"], { type: "currency" }).of(c) + ` (${c})`; } catch { return c; } };

function Business({ s }: { s: Record<string, Row[]> }) {
  const { staff } = useAuth(), admin = !staff?.role || ["owner", "admin"].includes(staff.role), c: any = s.settings.find(x => x.id === "company") || {}, lk = !!c.country;
  const [v, setV] = useState<Record<string, any>>({ name: c.name || "", country: c.country || "Lebanon", currency: c.currency || curOf(c.country || "Lebanon"), bizCategory: c.bizCategory || "F&B", bizSubcategory: c.bizSubcategory || "", taxName: c.taxName || "", taxNumber: c.taxNumber || "",
    timeZone: c.timeZone || "Asia/Beirut", gmapsKey: c.gmapsKey || "", chargesBeforeDisc: c.chargesBeforeDisc !== false, localization: c.localization !== false });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), set = (k: string, x: any) => setV(o => ({ ...o, [k]: x }));
  const ph = ccSplit(c.ownerPhone || ""), subs = BIZ_CATS[v.bizCategory] || [], countries = (() => { const l = WORLD.map(r => r[0]); if (!l.includes(v.country)) l.unshift(v.country); return l; })();
  const curs = [...new Set([v.currency, ...WORLD.map(r => r[2]), "USD", "LBP"])].filter(Boolean).sort();
  async function save() {
    setErr(""); const name = c.name || v.name.trim(); if (!name) return setErr("Business name is required.");
    const data: any = { name, taxNumber: v.taxNumber.trim(), taxName: v.taxName.trim(), bizCategory: c.name ? c.bizCategory || v.bizCategory : v.bizCategory, bizSubcategory: c.name ? c.bizSubcategory || v.bizSubcategory : (v.bizSubcategory || subs[0] || ""), ownerEmail: null,
      email: c.email || "", ownerPhone: c.ownerPhone || "", logoUrl: null, localization: v.localization, chargesBeforeDisc: v.chargesBeforeDisc, timeZone: v.timeZone || "Asia/Beirut", gmapsKey: v.gmapsKey.trim(),
      country: c.country || v.country || "Lebanon", currency: lk ? c.currency || "USD" : v.currency || "USD", ...(c.accountNo ? { accountNo: c.accountNo } : {}), ...(c.ownerFirstName ? { ownerFirstName: c.ownerFirstName } : {}), ...(c.ownerLastName ? { ownerLastName: c.ownerLastName } : {}) };
    setBusy(true);
    try { await put("settings", "company", data);
      // the ordering pages read the Maps key from each brand's web ordering settings
      for (const b of s.brands.filter(live)) { const id = "online_" + b.id; if (s.settings.some(x => x.id === id)) await put("settings", id, { gmapsKey: data.gmapsKey }).catch(() => {}); }
      toast("Business saved"); } catch { setErr("Couldn't save. Only the owner or an admin can change this."); } finally { setBusy(false); }
  }
  const dis = !admin, sv = admin && <div className="mt-6 flex justify-end"><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></div>;
  return <>
    {!admin && <p className="mb-4 rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">Only the owner or an admin can change business details.</p>}
    <Card title="General"><div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <F l="Business Name" req={!c.name} help="The legal or trading name of the business that owns every brand and store."><Input className="h-9" value={c.name || v.name} disabled={!!c.name || dis} onChange={e => set("name", e.target.value)} /></F>
      <F l="Account Number"><Input className="h-9" value={c.accountNo || "—"} disabled /></F>
      <F l="Country"><SelectNative className={SEL} disabled={dis || lk} value={v.country} onChange={e => { set("country", e.target.value); if (!lk) set("currency", curOf(e.target.value)); }}>{countries.map(n => <option key={n}>{n}</option>)}</SelectNative></F>
      <F l="Currency"><SelectNative className={SEL} disabled={dis || lk} value={v.currency} onChange={e => set("currency", e.target.value)}>{curs.map(k => <option key={k} value={k}>{curName(k)}</option>)}</SelectNative></F>
      <F l="Business Category"><SelectNative className={SEL} disabled={!!c.name || dis} value={v.bizCategory} onChange={e => { set("bizCategory", e.target.value); set("bizSubcategory", ""); }}>{Object.keys(BIZ_CATS).map(k => <option key={k}>{k}</option>)}</SelectNative></F>
      <F l="Business Subcategory"><SelectNative className={SEL} disabled={!!c.name || dis} value={v.bizSubcategory || subs[0]} onChange={e => set("bizSubcategory", e.target.value)}>{subs.map(k => <option key={k}>{k}</option>)}</SelectNative></F>
      <F l="Tax Registration Name" help="The name registered with the tax authority, printed on invoices."><Input className="h-9" disabled={dis} value={v.taxName} onChange={e => set("taxName", e.target.value)} /></F>
      <F l="Tax Number" help="The VAT / tax registration number printed on invoices."><Input className="h-9" disabled={dis} value={v.taxNumber} onChange={e => set("taxNumber", e.target.value)} /></F>
    </div><p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{lk ? "Business name, account number, category, country and currency are set by skwyd hub and can't be changed here." : "Pick the country and currency carefully: once you save, they can't be changed."}</p>{sv}</Card>
    <Card title="Contact"><div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <F l="First Name"><Input className="h-9" value={c.ownerFirstName || ""} disabled /></F><F l="Last Name"><Input className="h-9" value={c.ownerLastName || ""} disabled /></F>
      <F l="Email"><Input className="h-9" value={c.email || ""} disabled /></F><F l="Owner Phone Number"><PhoneIn cc={ph.cc} num={ph.num} setCc={() => {}} setNum={() => {}} dis /></F>
    </div></Card>
    <Card title="Settings"><div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <F l="Time Zone" help="Used for business days, reports and order times."><SelectNative className={SEL} disabled={dis} value={v.timeZone} onChange={e => set("timeZone", e.target.value)}>{tzList().map(([z, o]) => <option key={z} value={z}>(UTC{o}) {z.replace(/_/g, " ")}</option>)}</SelectNative></F>
      <F l="Google Maps API Key" help="Optional. With a key, location search uses Google Places; without one it uses OpenStreetMap. Restrict the key to your website in Google Cloud."><Input className="h-9" disabled={dis} autoComplete="off" spellCheck={false} placeholder="Optional · AIza…" value={v.gmapsKey} onChange={e => set("gmapsKey", e.target.value)} /></F>
    </div>
    <div className="mt-5 space-y-3">{([["chargesBeforeDisc", "Apply charges on the order's subtotal without tax exclusive discounts", "On: percentage charges are worked out on the order before any discount. Off: on the order after discounts."], ["localization", "Enable Localization", "Shows the Name Localized fields everywhere, so menus, receipts and apps can show a second language."]] as const).map(([k, l, n]) =>
      <Label key={k} className="flex cursor-pointer items-start gap-3 text-sm text-gray-700 dark:text-gray-300"><Checkbox className="mt-0.5" disabled={dis} checked={!!v[k]} onCheckedChange={(chk: boolean) => set(k, chk)} /><span>{l}<span className="block text-xs text-gray-500">{n}</span></span></Label>)}</div>
    {err && <p className="mt-4 text-sm text-red-500">{err}</p>}{sv}</Card>
  </>;
}

// the account owner changes the password without the current one; everyone else confirms it first
function MyPw({ owner, email, onClose }: { owner: boolean; email: string; onClose: () => void }) {
  const [c0, setC0] = useState(""), [a, setA] = useState(""), [b, setB] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function save() {
    setErr(""); if (!owner && !c0) return setErr("Enter your current password."); if (a.length < 8) return setErr("Use at least 8 characters."); if (a !== b) return setErr("The two new passwords don't match.");
    setBusy(true);
    try { if (!owner) { const { error } = await sb.auth.signInWithPassword({ email, password: c0 }); if (error) return setErr("The current password is wrong."); }
      const { error } = await sb.auth.updateUser({ password: a }); if (error) return setErr(error.message); toast("Password changed"); onClose(); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={x => !x && onClose()}><DialogContent className="w-full p-6 sm:max-w-md"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">Change Password</DialogTitle></DialogHeader>
    <form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); save(); }}>
      {!owner && <F l="Current Password" req><Input type="password" className="h-9" autoComplete="current-password" value={c0} onChange={e => setC0(e.target.value)} autoFocus /></F>}
      <F l="New Password" req><Input type="password" className="h-9" autoComplete="new-password" value={a} onChange={e => setA(e.target.value)} autoFocus={owner} /></F>
      <F l="Confirm New Password" req><Input type="password" className="h-9" autoComplete="new-password" value={b} onChange={e => setB(e.target.value)} /></F>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Close</Button><Button type="submit" disabled={busy}>Save</Button></div></form></DialogContent></Dialog>;
}

/* ---------- Subscription: the Skwyd Hub plan (rpc slick_my_subscription), modules, plan lines and invoices ---------- */
const sDate = (v?: string) => { if (!v) return "—"; const d = new Date(v); return isNaN(+d) ? "—" : String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + d.getFullYear(); };
const sDays = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
let invP: Promise<any> | null = null;
const loadInv = () => (window as any).skwydInvoice ? Promise.resolve((window as any).skwydInvoice) : invP ||= new Promise((res, rej) => { const el = document.createElement("script"); el.src = new URL("../invoice-doc.js", location.href.split("#")[0]).href; el.onload = () => res((window as any).skwydInvoice); el.onerror = () => { invP = null; rej(new Error()); }; document.head.appendChild(el); });

export function SubscriptionPage() {
  const [sub, setSub] = useState<any>(undefined);
  useEffect(() => { sb.rpc("slick_my_subscription").then(({ data, error }) => setSub(error ? null : data || null)); }, []);
  if (sub === undefined) return <><PageBreadcrumb pageTitle="Subscription" /><p className="p-6 text-sm text-gray-500">Loading your plan…</p></>;
  if (!sub) return <><PageBreadcrumb pageTitle="Subscription" /><EmptyState text="Couldn't load your plan. Check your connection and reload." /></>;
  const s = sub, cur = s.billing?.currency || s.quote?.currency || "USD", m = (n: any, c?: string) => (c || cur) + " " + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const stName = s.complimentary ? "Free" : ({ trial: "Free Trial", active: "Active", grace: "Payment Overdue", locked: "Locked" } as any)[s.state] || "—";
  const stNote = s.complimentary ? "Included at no cost" : s.state === "trial" ? `${sDays(+s.daysLeft || 0)} left · ends ${sDate(s.trialEndsAt)}` : s.state === "active" ? `Renews ${sDate(s.paidUntil)}` : s.state === "grace" ? `Locks ${sDate(s.lockAt)}` : "";
  const co = s.company || {}, pkg = s.complimentary ? "Complimentary" : s.state === "trial" || s.status === "trial" ? "Free Trial" : s.cycle === "yearly" ? "Yearly" : "Monthly";
  const mods = (s.products || []).filter((p: any) => !p.required && p.unit !== "device" && p.unit !== "warehouse"), q = s.quote, b = s.billing || {};
  const unit = (l: any) => l.unit === "device" ? " per device" : l.unit === "warehouse" ? " per warehouse" : l.unit === "branch" ? " per store" : "";
  const contact = [b.supportPhone && <a key="p" className="text-blue-500" href={"tel:" + String(b.supportPhone).replace(/\s+/g, "")}>{b.supportPhone}</a>, b.supportEmail && <a key="e" className="text-blue-500" href={"mailto:" + b.supportEmail}>{b.supportEmail}</a>].filter(Boolean);
  const showInv = async (i: any) => { try { (await loadInv())(i, b, co); } catch { toast("Couldn't open the invoice.", "error"); } };
  const cards: [string, string, string][] = [["Plan", stName, stNote], ["POS Devices", `${+s.posUsed || 0} / ${s.complimentary ? "∞" : s.posDevices ?? "—"}`, "Activated registers"], ["Warehouses", `${+s.warehousesUsed || 0} / ${s.complimentary ? "∞" : s.warehouses ?? "—"}`, "Warehouses in use"],
    ["Amount Due", m(s.owed), +s.openInvoices ? `${s.openInvoices} open invoice${+s.openInvoices === 1 ? "" : "s"}` : "Nothing to pay"], ["Account Number", co.accountNo || "—", "Staff sign in with it"]];
  return <>
    <PageBreadcrumb pageTitle="Subscription" />
    {!s.complimentary && s.state === "grace" && <p className="mb-5 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400"><b>Payment overdue.</b> {+s.owed ? m(s.owed) + " is due. " : ""}Access locks in <b>{sDays(+s.daysLeft || 0)}</b>.</p>}
    {!s.complimentary && s.state === "trial" && <p className="mb-5 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Free trial: <b>{sDays(+s.daysLeft || 0)} left</b>. Your plan starts after the trial ends.</p>}
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">{cards.map(([l, v, n]) => <div key={l} className={BOX + " p-5"}><span className="text-sm text-gray-500 dark:text-gray-400">{l}</span><b className="mt-2 block text-xl font-semibold text-gray-900 dark:text-gray-50">{v}</b><span className="text-xs text-gray-500">{n}</span></div>)}</div>
    <Card title="General Information"><div className="grid grid-cols-1 gap-5 sm:grid-cols-3">{[["Account Package Type", pkg], ["Account Creation Date", co.createdAt ? sDate(co.createdAt) + " " + new Date(co.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"], ["Account Email", co.email || "—"]].map(([l, x]) =>
      <div key={l}><span className="block text-sm text-gray-500 dark:text-gray-400">{l}</span><b className="text-sm font-medium break-words text-gray-900 dark:text-gray-50">{x}</b></div>)}</div></Card>
    {mods.length > 0 && <Card title="Modules"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{mods.map((p: any) => { const on = s.complimentary || (s.modules || []).includes(p.id);
      return <div key={p.id} className={cn("flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm dark:border-gray-800", !on && "opacity-60")}><span className="text-gray-900 dark:text-gray-50">{p.name}</span><Badge variant="light" color={on ? "success" : "light"}>{on ? "Included" : "Not Included"}</Badge></div>; })}</div></Card>}
    {!s.complimentary && q && <Card title={`Your Plan · Billed ${q.cycle === "yearly" ? "Yearly" : "Monthly"}`}><div className="overflow-x-auto"><Table className="w-full"><TableHead><TableRow><TableHeaderCell className={TH}>Item</TableHeaderCell><TableHeaderCell className={TH + " text-end"}>Quantity</TableHeaderCell><TableHeaderCell className={TH + " text-end"}>Price</TableHeaderCell><TableHeaderCell className={TH + " text-end"}>Amount</TableHeaderCell></TableRow></TableHead><TableBody>
      {(q.lines || []).map((l: any, i: number) => <TableRow key={i} className={TR}><TableCell className={TD}>{l.name}</TableCell><TableCell className={TD + " text-end"}>{(+l.qty || 0).toLocaleString("en-US")}</TableCell><TableCell className={TD + " text-end"}>{m(l.price, q.currency)}<span className="text-xs text-gray-500">{unit(l)}</span></TableCell><TableCell className={TD + " text-end"}>{m(l.amount, q.currency)}</TableCell></TableRow>)}
      {+q.discount > 0 && <><TableRow><TableCell colSpan={3} className={TD + " text-end"}>Subtotal</TableCell><TableCell className={TD + " text-end"}>{m(q.subtotal, q.currency)}</TableCell></TableRow><TableRow><TableCell colSpan={3} className={TD + " text-end"}>Discount</TableCell><TableCell className={TD + " text-end"}>−{m(q.discount, q.currency)}</TableCell></TableRow></>}
      <TableRow><TableCell colSpan={3} className={TD + " text-end font-semibold text-gray-900 dark:text-gray-50"}>Total per {q.cycle === "yearly" ? "year" : "month"}</TableCell><TableCell className={TD + " text-end font-semibold text-gray-900 dark:text-gray-50"}>{m(q.total, q.currency)}</TableCell></TableRow></TableBody></Table></div></Card>}
    <h3 className="mb-3 text-base font-medium text-gray-900 dark:text-gray-50">Invoices</h3>
    <div className="space-y-3">{!(s.invoices || []).length ? <EmptyState text="No invoices yet." /> : <div className="overflow-x-auto"><Table className="w-full min-w-[760px]"><TableHead><TableRow>{["Invoice", "Period", "Due", "Total", "Status", "Paid", ""].map(h => <TableHeaderCell key={h} className={TH + (h === "Total" ? " text-end" : "")}>{h}</TableHeaderCell>)}</TableRow></TableHead><TableBody>
      {s.invoices.map((i: any) => <TableRow key={i.id} className={TR}><TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{i.number}</TableCell><TableCell className={TD}>{sDate(i.periodStart)} – {sDate(i.periodEnd)}</TableCell><TableCell className={TD}>{sDate(i.dueAt)}</TableCell><TableCell className={TD + " text-end"}>{m(i.total, i.currency)}</TableCell>
        <TableCell className={TD}>{i.status === "paid" ? <Badge variant="light" color="success">Paid</Badge> : new Date(i.dueAt) < new Date() ? <Badge variant="light" color="error">Overdue</Badge> : <Badge variant="light" color="warning">Open</Badge>}</TableCell>
        <TableCell className={TD}>{i.paidAt ? sDate(i.paidAt) + (i.method ? " · " + i.method[0].toUpperCase() + i.method.slice(1) : "") : "—"}</TableCell><TableCell className={TD + " text-end"}><Button size="xs" variant="outline" onClick={() => showInv(i)}>View</Button></TableCell></TableRow>)}</TableBody></Table></div>}</div>
    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">To pay an invoice, add POS devices or modules, or change your billing, contact {contact.length ? contact.reduce((a: any[], x, i) => i ? [...a, " · ", x] : [x], []) : "Skwyd Hub support"}. Card payments here are coming soon.</p>
  </>;
}

/* ---------- Marketplace: integrations are listed here one by one as they become available (none yet, as in the portal) ---------- */
export function MarketplacePage() {
  return <><PageBreadcrumb pageTitle="Marketplace" /><div className="space-y-3"><EmptyState text="No integrations yet" /></div></>;
}
