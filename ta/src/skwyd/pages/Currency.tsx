// Manage → Currency: main currency (locked after setup), symbol, decimals; optional secondary currency with its rate; quick tender amounts and
// rounding rules per currency. Same fields and rules as the current portal; everything is kept in the "company" settings document.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PlusIcon, TrashBinIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { put, useCol } from "@/lib/db";
import { cn } from "@/utils";
import { useEffect, useState } from "react";
import { askYes } from "../ui/confirm";
import { F, SEL } from "../ui/kit";
import { toast } from "../ui/toast";

const CUR_SYMS: Record<string, string[]> = { USD: ["$", "US$"], LBP: ["ل.ل", "L.L."], EUR: ["€"], AED: ["د.إ", "Dhs"], SAR: ["ر.س", "SR"], QAR: ["ر.ق", "QR"], KWD: ["د.ك", "KD"], BHD: ["د.ب", "BD"], OMR: ["ر.ع.", "RO"], JOD: ["د.أ", "JD"], SYP: ["ل.س", "£S"], IQD: ["ع.د", "ID"], EGP: ["ج.م", "E£"], TRY: ["₺", "TL"], GBP: ["£"], CAD: ["$", "C$", "CA$"], AUD: ["$", "A$", "AU$"], BRL: ["R$"], XOF: ["CFA", "F CFA"], NGN: ["₦"], CDF: ["FC"], INR: ["₹", "Rs"], PHP: ["₱"], LKR: ["Rs", "රු"], BDT: ["৳", "Tk"], ETB: ["Br"] };
const BASE: [string, string][] = [["USD", "US Dollar (USD)"], ["LBP", "Lebanese Pound (LBP)"], ["EUR", "Euro (EUR)"], ["AED", "UAE Dirham (AED)"], ["SAR", "Saudi Riyal (SAR)"], ["QAR", "Qatari Riyal (QAR)"], ["KWD", "Kuwaiti Dinar (KWD)"], ["BHD", "Bahraini Dinar (BHD)"], ["OMR", "Omani Rial (OMR)"], ["JOD", "Jordanian Dinar (JOD)"], ["SYP", "Syrian Pound (SYP)"], ["IQD", "Iraqi Dinar (IQD)"], ["EGP", "Egyptian Pound (EGP)"], ["TRY", "Turkish Lira (TRY)"], ["GBP", "British Pound (GBP)"], ["CAD", "Canadian Dollar (CAD)"], ["AUD", "Australian Dollar (AUD)"], ["BRL", "Brazilian Real (BRL)"], ["XOF", "West African CFA Franc (XOF)"], ["NGN", "Nigerian Naira (NGN)"], ["CDF", "Congolese Franc (CDF)"], ["INR", "Indian Rupee (INR)"], ["PHP", "Philippine Peso (PHP)"], ["LKR", "Sri Lankan Rupee (LKR)"], ["BDT", "Bangladeshi Taka (BDT)"], ["ETB", "Ethiopian Birr (ETB)"]];
// every currency in the world (ISO 4217), named in English; the ones above keep their place at the top
const CURRENCIES: [string, string][] = (() => { const out = BASE.slice(); try { const dn = new Intl.DisplayNames(["en"], { type: "currency" }), have = new Set(BASE.map(x => x[0])), more: [string, string][] = [];
  for (const k of ((Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf("currency") : [])) if (!have.has(k)) { const n = dn.of(k); if (n && n !== k) more.push([k, n + " (" + k + ")"]); }
  more.sort((a, b) => a[1].localeCompare(b[1])); out.push(...more); } catch { /* old browser */ } return out; })();
const intlSym = (cur: string) => { const o: string[] = []; for (const d of ["narrowSymbol", "symbol"]) { try { const p = new Intl.NumberFormat("en", { style: "currency", currency: cur, currencyDisplay: d as any }).formatToParts(1).find(x => x.type === "currency"); if (p && p.value !== cur && !o.includes(p.value)) o.push(p.value); } catch { /* unknown */ } } return o; };
const syms = (cur: string, v?: string) => { const l = [...new Set([...(CUR_SYMS[cur] || []), ...(CUR_SYMS[cur] ? [] : intlSym(cur)), cur])]; if (v && !l.includes(v)) l.push(v); return l; };
const curName = (c: string) => (CURRENCIES.find(x => x[0] === c)?.[1] || c).replace(/\s*\([A-Z]+\)$/, "");
type Rule = { from: any; to: any; up: boolean };

export default function CurrencyPage() {
  const sets = useCol("settings"), { staff } = useAuth();
  const admin = !staff?.role || staff.role === "owner" || staff.role === "admin";
  const [d, setD] = useState<any>(null), [on2, setOn2] = useState(false), [qt, setQt] = useState<Record<number, string[]>>({ 1: [], 2: [] }), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const co: any = sets?.find(x => x.id === "company") || {};
  useEffect(() => { if (!sets || d) return; setD({ currency: co.currency || "USD", currencySymbol: co.currencySymbol || "", priceDecimals: Math.min(2, co.priceDecimals ?? 2), currency2: co.currency2 || "", currencySymbol2: co.currencySymbol2 || "", rate2: co.rate2 ?? "", decimals2: co.decimals2 ?? 0 });
    setOn2(!!co.currency2); const sp = (v: any) => String(v || "").split(",").map(x => x.trim()).filter(Boolean); setQt({ 1: sp(co.quickTender), 2: sp(co.quickTender2) }); }, [sets]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const locked = !!co.country, set = (k: string, v: any) => setD((o: any) => ({ ...o, [k]: v }));
  const dec = (k: number) => k === 1 ? Math.min(2, +d.priceDecimals) : (+d.decimals2 || 0);
  function qtCheck(k: number) {
    const l = qt[k].map(x => String(x).trim()).filter(Boolean), dd = dec(k);
    if (l.length > 6) throw new Error("Up to 6 amounts.");
    for (const v of l) { if (!/^\d+(\.\d+)?$/.test(v) || !(+v > 0)) throw new Error(`"${v}" isn't a valid amount.`); if ((v.split(".")[1] || "").length > dd) throw new Error(`${v} has more than ${dd} decimal place${dd === 1 ? "" : "s"}.`); }
    if (new Set(l.map(Number)).size !== l.length) throw new Error("Remove the duplicate amounts.");
    return l.map(Number).join(",");
  }
  async function save() {
    const data: any = { currency: locked ? (co.currency || "USD") : (d.currency || "USD"), priceDecimals: +d.priceDecimals, currencySymbol: String(d.currencySymbol).slice(0, 6), currencySymbol2: String(d.currencySymbol2).slice(0, 6), currency2: d.currency2, rate2: d.rate2 === "" ? null : +d.rate2, decimals2: +d.decimals2 || 0 };
    if (!data.currencySymbol) return setErr("Choose the main currency symbol.");
    if (!on2) Object.assign(data, { currency2: "", currencySymbol2: "", rate2: null, decimals2: 0 });
    else if (!data.currency2) return setErr("Choose the secondary currency.");
    if (data.currency2 && data.currency2 === data.currency) return setErr("The secondary currency can't be the same as the main currency.");
    if (data.currency2 && !data.currencySymbol2) return setErr("Choose the secondary currency symbol.");
    if (data.currency2 && !(data.rate2 > 0)) return setErr("Enter the exchange rate for the second currency.");
    try { data.quickTender = qtCheck(1); if (on2) data.quickTender2 = qtCheck(2); } catch (e: any) { return setErr(e.message); }
    setErr(""); setBusy(true);
    try { await put("settings", "company", data); toast("Currency saved"); } catch { setErr("Couldn't save. Only the owner or an admin can change this."); }
    setBusy(false);
  }
  async function off2() {
    if (!co.currency2) { setOn2(false); return; }
    if (!(await askYes("Are you sure you want to deactivate the secondary currency? Its settings will be cleared and the POS and web ordering will stop showing it.", "Deactivate", true))) return;
    try { await put("settings", "company", { currency2: "", currencySymbol2: "", rate2: null, decimals2: 0, quickTender2: "" }); setOn2(false); setD((o: any) => ({ ...o, currency2: "", currencySymbol2: "", rate2: "", decimals2: 0 })); setQt(q => ({ ...q, 2: [] })); toast("Secondary currency deactivated"); }
    catch { toast("Couldn't save. Only the owner or an admin can change this.", "error"); }
  }
  const box = "rounded-lg border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-[#090E1A]";
  return (
    <>
      <PageBreadcrumb pageTitle="Currency" />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">The currency your menu prices are in, how many decimals they show, and an optional second currency.</p>
        {admin && <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button>}
      </div>
      {!admin && <p className="mb-6 rounded-md border border-amber-500 bg-amber-50 p-4 text-sm text-gray-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-white/80">Only the owner or an admin can change the currency.</p>}
      {err && <p className="mb-6 rounded-md border border-red-500 bg-red-50 p-4 text-sm text-gray-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-white/80">{err}</p>}
      <div className="space-y-6">
        <div className={box}>
          <h3 className="mb-5 text-lg font-semibold text-gray-900 dark:text-gray-50">Main Currency</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            <F l="Main currency" req help={locked ? "Set when the business was created. It can't be changed." : undefined}>
              <select className={SEL} disabled={!admin || locked} value={d.currency} onChange={e => setD((o: any) => ({ ...o, currency: e.target.value, currencySymbol: "", currency2: o.currency2 === e.target.value ? "" : o.currency2 }))}>{CURRENCIES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></F>
            <F l="Main currency symbol" req><select className={SEL} disabled={!admin} value={d.currencySymbol} onChange={e => set("currencySymbol", e.target.value)}><option value="">Choose…</option>{syms(d.currency, d.currencySymbol).map(s => <option key={s}>{s}</option>)}</select></F>
            <F l="Main currency decimals" req><select className={SEL} disabled={!admin} value={d.priceDecimals} onChange={e => set("priceDecimals", +e.target.value)}>{[0, 1, 2].map(n => <option key={n} value={n}>{n}</option>)}</select></F>
          </div>
          <p className="mt-3 text-xs text-gray-500">Menu prices, totals and reports are in the main currency.</p>
          <div className="mt-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-2"><QuickTender code={d.currency} list={qt[1]} set={l => setQt(q => ({ ...q, 1: l }))} admin={admin} />
            <Rounding k={1} code={d.currency} dec={dec(1)} saved={co.roundRules1 || []} admin={admin} /></div>
        </div>
        <div className={box}>
          <div className="mb-5 flex items-center justify-between gap-4"><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Secondary Currency</h3>
            {admin && (on2 ? <Button variant="outline" onClick={off2}>Deactivate</Button> : <Button onClick={() => setOn2(true)}>Activate</Button>)}</div>
          {!on2 ? <p className="text-sm text-gray-500 dark:text-gray-400">The secondary currency is off: the POS and web ordering show prices and totals in the main currency only. Activate it to add one.</p> : <>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
              <F l="Secondary currency" req><select className={SEL} disabled={!admin} value={d.currency2} onChange={e => setD((o: any) => ({ ...o, currency2: e.target.value, currencySymbol2: "" }))}><option value="">Choose…</option>{CURRENCIES.filter(([k]) => k !== d.currency).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></F>
              <F l="Secondary currency symbol" req><select className={SEL} disabled={!admin || !d.currency2} value={d.currencySymbol2} onChange={e => set("currencySymbol2", e.target.value)}><option value="">Choose…</option>{d.currency2 && syms(d.currency2, d.currencySymbol2).map(s => <option key={s}>{s}</option>)}</select></F>
              <F l={`Exchange rate (1 ${d.currency} =)`} req><Input className="h-9" type="number" min="0" step="any" disabled={!admin} placeholder="e.g. 89500" value={d.rate2} onChange={e => set("rate2", e.target.value)} /></F>
              <F l="Secondary currency decimals" req><select className={SEL} disabled={!admin} value={d.decimals2} onChange={e => set("decimals2", +e.target.value)}>{[0, 1, 2].map(n => <option key={n} value={n}>{n}</option>)}</select></F>
            </div>
            <p className="mt-3 text-xs text-gray-500">Shown next to totals in the POS, on receipts, in the call center and online. The cashier can take cash in either currency, or both, and the change is shown in both.</p>
            {d.currency2 && <div className="mt-6 grid grid-cols-1 items-start gap-4 xl:grid-cols-2"><QuickTender code={d.currency2} list={qt[2]} set={l => setQt(q => ({ ...q, 2: l }))} admin={admin} />
              <Rounding k={2} code={d.currency2} dec={dec(2)} saved={co.roundRules2 || []} admin={admin} /></div>}
          </>}
        </div>
      </div>
    </>
  );
}

/** the cash shortcut buttons the cashier taps (up to 6); saved with the page's Save */
function QuickTender({ code, list, set, admin }: { code: string; list: string[]; set: (l: string[]) => void; admin: boolean }) {
  return (
    <div className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-3 flex items-center gap-2"><span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-white/5 dark:text-gray-300">{code}</span>
        <b className="text-sm font-medium text-gray-900 dark:text-gray-50">Quick Tender · {curName(code)}</b><span className="ms-auto text-xs text-gray-500">{list.length} amount{list.length === 1 ? "" : "s"}</span></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{list.map((v, i) => (
        <div key={i} className="flex items-center gap-1"><span className="w-4 text-xs text-gray-400">{i + 1}</span>
          <Input className="h-10 flex-1" inputMode="decimal" disabled={!admin} aria-label={"Amount " + (i + 1)} value={v} onChange={e => set(list.map((x, j) => j === i ? e.target.value : x))} />
          {admin && <button type="button" aria-label="Remove amount" onClick={() => set(list.filter((_, j) => j !== i))} className="px-1 text-gray-400 hover:text-red-500">×</button>}</div>))}</div>
      {admin && <Button className="mt-3" size="sm" variant="outline" disabled={list.length >= 6} onClick={() => set([...list, ""])}><PlusIcon className="size-4" />Add Amount</Button>}
    </div>);
}

/** rounding rules: the deciding digit (last digit at the currency's decimals) rounds up or down; saved on its own */
function Rounding({ k, code, dec, saved, admin }: { k: number; code: string; dec: number; saved: Rule[]; admin: boolean }) {
  const [l, setL] = useState<Rule[]>(saved.map(r => ({ ...r }))), [err, setErr] = useState("");
  const dig = (d: number) => { const r = l.find(x => d >= +x.from && d <= +x.to); return r ? (r.up ? "up" : "down") : ""; };
  const ex = dec ? (12.37).toFixed(dec) : "1,237";
  async function save() {
    const n = l.map(r => ({ from: Math.round(+r.from), to: Math.round(+r.to), up: !!r.up }));
    for (const r of n) { if (!(r.from >= 0 && r.from <= 9 && r.to >= 0 && r.to <= 9)) return setErr("From and To are digits from 0 to 9."); if (r.from > r.to) return setErr("From can't be bigger than To."); }
    for (let d = 0; d <= 9; d++) if (n.filter(r => d >= r.from && d <= r.to).length > 1) return setErr(`The digit ${d} is in more than one rule.`);
    try { await put("settings", "company", { ["roundRules" + k]: n }); setErr(""); toast("Rounding rules saved"); } catch { setErr("Couldn't save. Only the owner or an admin can change this."); }
  }
  return (
    <div className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-3 flex items-center gap-2"><span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-white/5 dark:text-gray-300">{code}</span>
        <b className="text-sm font-medium text-gray-900 dark:text-gray-50">Rounding · {curName(code)}</b><span className="ms-auto text-xs text-gray-500">{l.length} rule{l.length === 1 ? "" : "s"}</span></div>
      <div className="mb-3 flex gap-1">{Array.from({ length: 10 }, (_, d) => { const x = dig(d); return <span key={d} className={cn("flex size-7 items-center justify-center rounded-md text-xs font-medium", x === "up" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : x === "down" ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400" : "bg-gray-100 text-gray-500 dark:bg-white/5")}>{d}</span>; })}</div>
      <div className="space-y-2">{!l.length ? <p className="text-sm text-gray-500">No rules: totals are not rounded.</p> : l.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">From<Input className="h-9 w-16" type="number" min={0} max={9} disabled={!admin} value={r.from} onChange={e => setL(l.map((x, j) => j === i ? { ...x, from: e.target.value } : x))} />
          to<Input className="h-9 w-16" type="number" min={0} max={9} disabled={!admin} value={r.to} onChange={e => setL(l.map((x, j) => j === i ? { ...x, to: e.target.value } : x))} />
          <label className="ms-2 flex items-center gap-2">Round up<Switch disabled={!admin} checked={!!r.up} onCheckedChange={v => setL(l.map((x, j) => j === i ? { ...x, up: !!v } : x))} /></label>
          {admin && <button type="button" aria-label="Delete" onClick={() => setL(l.filter((_, j) => j !== i))} className="ms-auto text-gray-400 hover:text-red-500"><TrashBinIcon className="size-4.5" /></button>}</div>))}</div>
      {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
      {admin && <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { const last = l[l.length - 1]; setL([...l, { from: last ? Math.min(9, +last.to + 1) : 0, to: 9, up: !!last }]); }}><PlusIcon className="size-4" />Add Rule</Button>
        {l.length > 0 && <Button size="sm" variant="ghost" onClick={() => setL([])}>Clear All</Button>}<Button size="sm" className="ms-auto" onClick={save}>Save Rules</Button></div>}
      <p className="mt-3 text-xs text-gray-500">The deciding digit is the last digit of the amount at this currency's {dec} decimal place{dec === 1 ? "" : "s"}. Round down sets it to 0; round up sets it to 0 and adds one to the digit before it. For example {ex}: the deciding digit is 7.</p>
    </div>);
}
