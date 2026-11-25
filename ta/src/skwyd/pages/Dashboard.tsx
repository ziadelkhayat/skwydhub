// Summary: the same live numbers as the current portal (rpc skwyd_dashboard), in TailAdmin metric cards + statistics chart.
// Filters: brand, store, a business day / a week (Mon–Sun) / a month / custom dates, and comparing with another period of the same kind
// (the one before by default, or one picked by its date).
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { BanknoteUndoIcon, BoxIcon, CartIcon, ClockIcon, DollarIcon, OctagonAlertIcon, TagIcon, TicketIcon, UserDollarIcon, XIcon } from "@/icons";
import MetricCard from "../ui/MetricCard";
import { useCol, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { money } from "@/lib/util";
import { useEffect, useState } from "react";
import { Card } from "@/components/tremor/Card";
import { AreaChart } from "@/components/tremor/AreaChart";
import { SegTabs } from "../ui/SegTabs";
import { DateInput, RangeInput } from "../ui/DateInput";
import { Switch } from "@/components/ui/switch";
import { SEL } from "../ui/kit";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function Dashboard() {
  useCol("settings");
  const brands = (useCol("brands") || []).filter((x: Row) => !x.deleted), stores = (useCol("branches") || []).filter((x: Row) => x.active !== false && !x.settings?.deletedAt);
  const [days, setDays] = useState("1"), [rng, setRng] = useState<[string, string]>(["", ""]), [at, setAt] = useState(iso(new Date())), [cmpAt, setCmpAt] = useState("");
  const [brand, setBrand] = useState(""), [store, setStore] = useState(""), [cmp, setCmp] = useState(false);
  const [D, setD] = useState<any>(null), [P, setP] = useState<any>(null), [err, setErr] = useState("");
  const myStores = stores.filter((x: Row) => !brand || x.brandId === brand);
  // the period: the business day picked, the week (Monday to Sunday) or the month it falls in, or the dates picked
  const span = (kind: string, d0: string) => { const d = new Date((d0 || iso(new Date())) + "T12:00:00");
    if (kind === "7") { d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return { start: d, n: 7 }; }
    if (kind === "30") { const a = new Date(d.getFullYear(), d.getMonth(), 1, 12), n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return { start: a, n }; }
    return { start: d, n: 1 }; };
  const per = (() => { if (days === "c" && rng[0]) { const a = new Date(rng[0] + "T12:00:00"), b = new Date((rng[1] || rng[0]) + "T12:00:00"); return { start: a, n: Math.round((+b - +a) / 86400000) + 1 }; }
    return span(days === "c" ? "1" : days, at); })();
  // compared with: the period of the same kind containing the date picked, or (no date picked) the one just before
  const cmpPer = (() => { if (cmpAt) return days === "c" ? { start: new Date(cmpAt + "T12:00:00"), n: per.n } : span(days, cmpAt);
    const b = new Date(per.start); b.setDate(b.getDate() - 1); return days === "c" ? { start: new Date(+per.start - per.n * 86400000), n: per.n } : span(days, iso(b)); })();
  const key = JSON.stringify([iso(per.start), per.n, brand, store, cmp, iso(cmpPer.start), cmpPer.n]);
  useEffect(() => { let off = false; setD(null); setP(null); setErr("");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Beirut";
    const br = store ? [store] : brand ? myStores.map((x: Row) => x.id) : null;
    const call = (start: Date, n: number) => sb.rpc("skwyd_dashboard", { p_day: iso(start), p_days: n, p_branches: br && br.length ? br : null, p_brand: brand || null, p_tz: tz });
    Promise.all([call(per.start, per.n), cmp ? call(cmpPer.start, cmpPer.n) : Promise.resolve(null)]).then(([a, b]: any[]) => { if (off) return; const e = a.error || b?.error; if (e) setErr(e.message); else { setD(a.data || {}); setP(b ? b.data || {} : null); } });
    return () => { off = true; }; }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const hrsOf = (X: any, k: string) => { const a = Array(24).fill(0); (X?.hours || []).forEach((h: any) => { a[+h.h] = +h[k] || 0; }); return a; };
  const hrs = (k: string) => hrsOf(D, k);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  // the numbers of one period, as values (for the comparison) and as text
  const nums = (X: any) => { const k = +X.orders || sum(hrsOf(X, "n")), ns = +X.net || sum(hrsOf(X, "net")), ps = +X.payments || sum(hrsOf(X, "pay"));
    return [k, ns, ps, k ? ns / k : 0, +(X.active?.n ?? X.open ?? 0), +(X.declined?.n ?? 0), +X.discount || 0, +X.tax || 0, +(X.returns?.v || X.refunds?.v || 0), +(X.voids?.v || 0)]; };
  const META: [string, boolean, React.ReactNode][] = [["Orders", false, <CartIcon />], ["Net sales", true, <DollarIcon />], ["Net payments", true, <UserDollarIcon />], ["Average ticket", true, <TicketIcon />], ["Active orders", false, <ClockIcon />],
    ["Declined", false, <XIcon />], ["Discounts", true, <TagIcon />], ["Tax", true, <BoxIcon />], ["Returns", true, <BanknoteUndoIcon />], ["Voids", true, <OctagonAlertIcon />]];
  const cur = D ? nums(D) : [], old = P ? nums(P) : null;
  const cards = D ? META.map(([t, isMoney, i], j) => { const v = cur[j], o = old?.[j]; const ch = old == null || o == null ? undefined : o ? ((v - o) / Math.abs(o) * 100).toFixed(1) + "%" : v ? "New" : "0%";
    return { t, i, v: isMoney ? money(v) : Math.round(v).toLocaleString(), ch, dir: (old && v < (o ?? 0) ? "down" : "up") as "up" | "down" }; }) : [];
  const fmtD = (d: Date) => iso(d).split("-").reverse().join("-");
  const prevStart = cmpPer.start, prevEnd = new Date(+cmpPer.start + (cmpPer.n - 1) * 86400000);

  const labels = Array.from({ length: 24 }, (_, h) => (h % 12 || 12) + (h < 12 ? " AM" : " PM"));

  return (
    <>
      <PageBreadcrumb pageTitle="Summary" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {<div className="w-full sm:w-52"><select aria-label="Brand" className={SEL} value={brand} onChange={e => { setBrand(e.target.value); setStore(""); }}><option value="">All brands</option>{brands.map((b: Row) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
        <div className="w-full sm:w-52"><select aria-label="Store" className={SEL} value={store} onChange={e => setStore(e.target.value)}><option value="">All stores</option>{myStores.map((b: Row) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        {/* as in Foodics: the period kind, one date (the day, or any day in the week or month), and Compare */}
        <SegTabs value={days === "c" ? "" : days} onChange={v => { setDays(v); setCmpAt(""); }} items={[["1", "Day"], ["7", "Week"], ["30", "Month"]]} />
        {/* the same business-date box as Orders: it shows the period; picking dates sets that period (Day / Week / Month pick it again from the first date) */}
        <div className="w-64"><RangeInput key={iso(per.start) + per.n} from={iso(per.start)} to={per.n > 1 ? iso(new Date(+per.start + (per.n - 1) * 86400000)) : ""} onChange={(a, b) => { if (!a) { setDays("1"); setAt(iso(new Date())); return; } if (a === b && days !== "c") { setAt(a); return; } setRng([a, b]); setDays("c"); setAt(a); }} /></div>
        <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><Switch checked={cmp} onCheckedChange={setCmp} aria-label="Compare" />Compare</label>
        {cmp && <div className="flex items-center gap-2"><span className="text-sm text-gray-500">with</span><div className="w-44" title={days === "1" ? "Compare with this day" : days === "7" ? "Compare with the week of" : "Compare with the month of"}>
          <DateInput value={cmpAt || iso(cmpPer.start)} onChange={v => setCmpAt(v)} /></div></div>}
      </div>
      <p className="-mt-3 mb-5 text-sm text-gray-500 dark:text-gray-400">{per.n === 1 ? fmtD(per.start) : fmtD(per.start) + " → " + fmtD(new Date(+per.start + (per.n - 1) * 86400000))}{cmp ? ` · compared with ${per.n === 1 ? fmtD(prevStart) : fmtD(prevStart) + " → " + fmtD(prevEnd)}` : ""}</p>
      {err ? <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-red-500 dark:border-gray-800 dark:bg-[#090E1A]">Couldn't load the dashboard: {err}</p>
        : !D ? <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-[#090E1A]">Loading live numbers…</p>
        : <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-5">
            {cards.map(c => <MetricCard key={c.t} icon={c.i} title={c.t} value={c.v} change={c.ch} direction={c.dir} />)}
          </div>
          <Card className="col-span-12">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">Sales By Hour</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{P ? "Net sales through the day, this period and the one before" : "Net sales and payments through the day"}</p>
            </div>
            {(() => {
              const a = hrs("net"), b = P ? hrsOf(P, "net") : hrs("pay"), k1 = "Net sales", k2 = P ? "Net sales (before)" : "Net payments";
              const data = labels.map((l, h) => ({ hour: l, [k1]: +a[h].toFixed(2), [k2]: +b[h].toFixed(2) }));
              return <AreaChart className="h-72" data={data} index="hour" categories={[k1, k2]} colors={["blue", "cyan"]} valueFormatter={v => v.toLocaleString()} showLegend yAxisWidth={56} />;
            })()}
          </Card>
        </div>}
    </>
  );
}
