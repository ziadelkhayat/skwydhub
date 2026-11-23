// Summary: the same live numbers as the current portal (rpc skwyd_dashboard), in TailAdmin metric cards + statistics chart.
// Filters: brand, store, a business day / a week (Mon–Sun) / a month / custom dates, and comparing with another period of the same kind
// (the one before by default, or one picked by its date).
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { useTheme } from "@/contexts";
import { BanknoteUndoIcon, BoxIcon, CartIcon, ClockIcon, DollarIcon, OctagonAlertIcon, TagIcon, TicketIcon, UserDollarIcon, XIcon } from "@/icons";
import MetricCard from "@/pages/main/dashboard/ecommerce/components/metrics/metric-card";
import { useCol, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { money } from "@/lib/util";
import type { ApexOptions } from "apexcharts";
import { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { SegTabs } from "../ui/SegTabs";
import { DateInput, RangeInput } from "../ui/DateInput";
import { Button } from "@/components/ui/button";
import { SEL } from "../ui/kit";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function Dashboard() {
  const { theme } = useTheme(); useCol("settings");
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
  const step = (dir: number) => { const d = new Date(at + "T12:00:00"); if (days === "30") d.setMonth(d.getMonth() + dir, 1); else d.setDate(d.getDate() + dir * (days === "7" ? 7 : 1)); setAt(iso(d)); };
  const thisOne = (k: string) => iso(span(k, iso(new Date())).start) === iso(span(k, at).start);
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

  const labels = Array.from({ length: 24 }, (_, h) => (h % 12 || 12) + (h < 12 ? "am" : "pm"));
  const options: ApexOptions = {
    legend: { show: false }, colors: ["#465FFF", "#9CB9FF"],
    chart: { fontFamily: "Outfit, sans-serif", height: 310, type: "area", toolbar: { show: false } },
    stroke: { curve: "straight", width: [2, 2] }, fill: { type: "gradient", gradient: { opacityFrom: 0.55, opacityTo: 0 } },
    markers: { size: 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 6 } },
    grid: { borderColor: theme === "dark" ? "#1E2640" : "#F3F4F6", xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false }, tooltip: { enabled: true, shared: true, intersect: false },
    xaxis: { type: "category", categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, tickAmount: 8, labels: { style: { colors: "#6B7280" } } },
    yaxis: { labels: { style: { fontSize: "12px", colors: ["#6B7280"] }, formatter: v => (+v).toLocaleString() } },
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Summary" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {<div className="w-full sm:w-52"><select aria-label="Brand" className={SEL} value={brand} onChange={e => { setBrand(e.target.value); setStore(""); }}><option value="">All brands</option>{brands.map((b: Row) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
        <div className="w-full sm:w-52"><select aria-label="Store" className={SEL} value={store} onChange={e => setStore(e.target.value)}><option value="">All stores</option>{myStores.map((b: Row) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <SegTabs value={days} onChange={v => { setDays(v); setCmpAt(""); }} items={[["1", "Day"], ["7", "Week"], ["30", "Month"], ["c", "Dates"]]} />
        {days === "c" ? <div className="w-64"><RangeInput from={rng[0]} to={rng[1]} onChange={(a, b) => setRng([a, b])} /></div>
          : <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label={"Previous " + ({ "1": "day", "7": "week", "30": "month" } as any)[days]} onClick={() => step(-1)}>‹</Button>
            {days === "1" ? <div className="w-44" title="Business day"><DateInput value={at} onChange={v => setAt(v || iso(new Date()))} /></div>
              : <span className="flex h-11 min-w-44 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                {days === "30" ? per.start.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : fmtD(per.start) + " – " + fmtD(new Date(+per.start + 6 * 86400000))}</span>}
            <Button variant="outline" size="icon" aria-label={"Next " + ({ "1": "day", "7": "week", "30": "month" } as any)[days]} onClick={() => step(1)}>›</Button>
            {!thisOne(days) && <Button variant="outline" onClick={() => setAt(iso(new Date()))}>{({ "1": "Today", "7": "This Week", "30": "This Month" } as any)[days]}</Button>}
          </div>}
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"><input type="checkbox" className="size-4 accent-brand-500" checked={cmp} onChange={e => setCmp(e.target.checked)} />Compare</label>
        {cmp && <div className="flex items-center gap-2"><span className="text-sm text-gray-500">to</span><div className="w-44" title={days === "1" ? "Compare to this day" : days === "7" ? "Compare to the week of" : days === "30" ? "Compare to the month of" : "Compare from"}>
          <DateInput value={cmpAt || iso(cmpPer.start)} onChange={v => setCmpAt(v)} /></div></div>}
      </div>
      <p className="-mt-3 mb-5 text-sm text-gray-500 dark:text-gray-400">{per.n === 1 ? fmtD(per.start) : fmtD(per.start) + " → " + fmtD(new Date(+per.start + (per.n - 1) * 86400000))}{cmp ? ` · compared with ${per.n === 1 ? fmtD(prevStart) : fmtD(prevStart) + " → " + fmtD(prevEnd)}` : ""}</p>
      {err ? <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-red-500 dark:border-gray-800 dark:bg-white/3">Couldn't load the dashboard: {err}</p>
        : !D ? <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/3">Loading live numbers…</p>
        : <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-5">
            {cards.map(c => <MetricCard key={c.t} icon={c.i} title={c.t} value={c.v} change={c.ch} direction={c.dir} />)}
          </div>
          <div className="col-span-12 rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-5 sm:px-6 sm:pt-6 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Sales By Hour</h3>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{P ? "Net sales through the day, this period and the one before" : "Net sales and payments through the day"}</p>
            </div>
            <div className="custom-scrollbar max-w-full overflow-x-auto">
              <div className="min-w-250 xl:min-w-full">
                <ReactApexChart options={options} series={[{ name: "Net sales", data: hrs("net").map(v => +v.toFixed(2)) }, P ? { name: "Net sales (before)", data: hrsOf(P, "net").map(v => +v.toFixed(2)) } : { name: "Net payments", data: hrs("pay").map(v => +v.toFixed(2)) }]} type="area" height={310} />
              </div>
            </div>
          </div>
        </div>}
    </>
  );
}
