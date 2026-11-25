import { CategoryBarCard, ChartCard, ProgressBarCard, CAT_COLORS, changeBadge } from "@/components/tremor/overview/OverviewCards";
import { BarList } from "@/components/tremor/BarList";
import { SelectNative } from "@/components/tremor/SelectNative";
// Summary: the same live numbers as the current portal (rpc skwyd_dashboard), laid out like the Tremor dashboard template Overview.
// Filters: brand, store, a business day / a week (Mon–Sun) / a month / custom dates, and comparing with another period of the same kind
// (the one before by default, or one picked by its date).
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { useCol, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { money } from "@/lib/util";
import { useEffect, useState } from "react";
import { DateRangePicker } from "@/components/tremor/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/tremor/Select";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function Dashboard() {
  useCol("settings");
  const brands = (useCol("brands") || []).filter((x: Row) => !x.deleted), stores = (useCol("branches") || []).filter((x: Row) => x.active !== false && !x.settings?.deletedAt);
  // Tremor template Overview filter: a date range (with presets) "compared to" the previous period, last year, or nothing
  const today = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
  const [range, setRange] = useState<{ from?: Date; to?: Date } | undefined>(() => ({ from: today(), to: today() }));
  const [period, setPeriod] = useState<"previous-period" | "last-year" | "no-comparison">("no-comparison");
  const [brand, setBrand] = useState(""), [store, setStore] = useState("");
  const cmp = period !== "no-comparison";
  const [D, setD] = useState<any>(null), [P, setP] = useState<any>(null), [err, setErr] = useState("");
  const myStores = stores.filter((x: Row) => !brand || x.brandId === brand);
  const noon = (d: Date) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; };
  const per = (() => { const a = noon(range?.from || today()), b = noon(range?.to || range?.from || today()); return { start: a, n: Math.max(1, Math.round((+b - +a) / 86400000) + 1) }; })();
  const cmpPer = period === "last-year" ? { start: (() => { const x = new Date(per.start); x.setFullYear(x.getFullYear() - 1); return x; })(), n: per.n }
    : { start: new Date(+per.start - per.n * 86400000), n: per.n };
  const day0 = (o: number) => { const d = today(); d.setDate(d.getDate() + o); return d; };
  const monday = () => { const d = today(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  const presets = [
    { label: "Today", dateRange: { from: today(), to: today() } },
    { label: "Yesterday", dateRange: { from: day0(-1), to: day0(-1) } },
    { label: "This week", dateRange: { from: monday(), to: today() } },
    { label: "Last 7 days", dateRange: { from: day0(-6), to: today() } },
    { label: "This month", dateRange: { from: (() => { const d = today(); d.setDate(1); return d; })(), to: today() } },
    { label: "Last 30 days", dateRange: { from: day0(-29), to: today() } },
    { label: "Last month", dateRange: { from: (() => { const d = today(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d; })(), to: (() => { const d = today(); d.setDate(0); return d; })() } },
    { label: "This year", dateRange: { from: (() => { const d = today(); d.setMonth(0, 1); return d; })(), to: today() } },
  ];
  const key = JSON.stringify([iso(per.start), per.n, brand, store, cmp, iso(cmpPer.start), cmpPer.n]);
  useEffect(() => { let off = false; setD(null); setP(null); setErr("");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Beirut";
    const br = store ? [store] : brand ? myStores.map((x: Row) => x.id) : null;
    const call = (start: Date, n: number) => sb.rpc("skwyd_dashboard", { p_day: iso(new Date(+start + (n - 1) * 86400000)), p_days: n, p_branches: br && br.length ? br : null, p_brand: brand || null, p_tz: tz });
    Promise.all([call(per.start, per.n), cmp ? call(cmpPer.start, cmpPer.n) : Promise.resolve(null)]).then(([a, b]: any[]) => { if (off) return; const e = a.error || b?.error; if (e) setErr(e.message); else { setD(a.data || {}); setP(b ? b.data || {} : null); } });
    return () => { off = true; }; }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const hrsOf = (X: any, k: string) => { const a = Array(24).fill(0); (X?.hours || []).forEach((h: any) => { a[+h.h] = +h[k] || 0; }); return a; };
  const hrs = (k: string) => hrsOf(D, k);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  // the numbers of one period, as values (for the comparison) and as text
  const nums = (X: any) => { const k = +X.orders || sum(hrsOf(X, "n")), ns = +X.net || sum(hrsOf(X, "net")), ps = +X.payments || sum(hrsOf(X, "pay"));
    return [k, ns, ps, k ? ns / k : 0, +(X.active?.n ?? X.open ?? 0), +(X.declined?.n ?? 0), +X.discount || 0, +X.tax || 0, +(X.returns?.v || X.refunds?.v || 0), +(X.voids?.v || 0)]; };
  const cur = D ? nums(D) : [], old = P ? nums(P) : null;
  const fmtD = (d: Date) => iso(d).split("-").reverse().join("-");

  const labels = Array.from({ length: 24 }, (_, h) => (h % 12 || 12) + (h < 12 ? " AM" : " PM"));
  const ch = (j: number) => (old && old[j] ? (cur[j] - old[j]) / Math.abs(old[j]) : null);
  const tot = (l: any[], k: string) => l.reduce((x, y) => x + (+y[k] || 0), 0);
  const TYPE: Record<string, string> = { dinein: "In Store", fast: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery", other: "Other" };
  const CH: Record<string, string> = { pos: "POS", callcenter: "Call Center", web: "Web", api: "API", other: "Other" };
  const cat = (list: any[], k: string, label: (x: any) => string, fmt: (v: number) => string) => {
    const merged = new Map<string, number>(); for (const x of list || []) merged.set(label(x), (merged.get(label(x)) || 0) + (+x[k] || 0));
    const all = [...merged.entries()].filter(([, v]) => v).sort((a, b) => b[1] - a[1]), T = all.reduce((x, [, v]) => x + v, 0) || 1;
    return all.map(([t, v], i) => ({ title: t, value: fmt(v), percentage: v / T * 100, color: CAT_COLORS[i % CAT_COLORS.length] })); };
  const bucket = per.n === 1 ? "hour" : "day";
  const series = (k: string, avg = false) => {
    if (bucket === "hour") { const a = hrs(k === "avg" ? "net" : k), n = hrs("n"), b = P ? hrsOf(P, k === "avg" ? "net" : k) : null, pn = P ? hrsOf(P, "n") : null;
      return labels.map((l, h) => ({ label: l, value: avg ? (n[h] ? a[h] / n[h] : null) : a[h], previousValue: b ? (avg ? (pn![h] ? b[h] / pn![h] : null) : b[h]) : null })); }
    const day = (X: any) => { const m = new Map<string, any>(); (X?.days || []).forEach((d: any) => m.set(String(d.d).slice(0, 10), d)); return m; };
    const dm = day(D), pm = P ? day(P) : null;
    return Array.from({ length: per.n }, (_, i) => { const d = new Date(+per.start + i * 86400000), pd = new Date(+cmpPer.start + i * 86400000), x = dm.get(iso(d)), y = pm?.get(iso(pd));
      const v = (r: any) => !r ? 0 : k === "avg" ? (+r.n ? +r.net / +r.n : 0) : +r[k === "pay" ? "net" : k] || 0;
      return { label: fmtD(d), value: v(x), previousValue: pm ? v(y) : null }; }); };
  const fmtN = (v: number) => Math.round(v).toLocaleString();

  // Tremor dashboard template "Overview": sticky filter bar, summary cards (progress / category bars), then a chart card per number
  return (
    <>
      <PageBreadcrumb pageTitle="Summary" />
      <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 pb-4 pt-2 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10 lg:pt-4 dark:border-gray-800 dark:bg-gray-950">
        {brands.length > 1 && <SelectNative aria-label="Brand" className="h-[30px] py-1 text-sm sm:w-44" value={brand} onChange={e => { setBrand(e.target.value); setStore(""); }}><option value="">All brands</option>{brands.map((b: Row) => <option key={b.id} value={b.id}>{b.name}</option>)}</SelectNative>}
        <SelectNative aria-label="Store" className="h-[30px] py-1 text-sm sm:w-44" value={store} onChange={e => setStore(e.target.value)}><option value="">All stores</option>{myStores.map((b: Row) => <option key={b.id} value={b.id}>{b.name}</option>)}</SelectNative>
        <DateRangePicker value={range as any} onChange={r => setRange(r ? { from: r.from, to: r.to || r.from } : { from: today(), to: today() })} presets={presets as any}
          toDate={today()} enableYearNavigation align="start" className="h-[30px] w-full py-1 sm:w-fit" />
        <span className="hidden text-sm font-medium text-gray-500 sm:block">compared to</span>
        <Select value={period} onValueChange={v => setPeriod(v as any)}>
          <SelectTrigger className="h-[30px] w-full py-1 sm:w-fit"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="previous-period">Previous period</SelectItem>
            <SelectItem value="last-year">Last year</SelectItem>
            <SelectItem value="no-comparison">No comparison</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {err ? <p className="mt-8 text-sm text-red-600">Couldn't load the summary: {err}</p>
        : !D ? <p className="mt-8 text-sm text-gray-500">Loading live numbers…</p>
        : <>
          <section aria-labelledby="period-summary">
            <h2 id="period-summary" className="mt-8 scroll-mt-10 text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50">This period</h2>
            <div className="mt-4 grid grid-cols-1 gap-14 sm:mt-8 sm:grid-cols-2 lg:mt-10 xl:grid-cols-3">
              <ProgressBarCard title="Sales by store" change={ch(1)} value={money(cur[1])} valueDescription="net sales"
                data={(D.branches || []).filter((b: any) => +b.net).sort((a: any, b: any) => +b.net - +a.net).slice(0, 4).map((b: any) => ({ title: stores.find((x: Row) => x.id === b.id)?.name || "Other", current: money(+b.net), percentage: tot(D.branches, "net") ? +b.net / tot(D.branches, "net") * 100 : 0 }))}
                footer={<>{fmtN(cur[0])} orders · average ticket {money(cur[3])}</>} />
              <CategoryBarCard title="Orders" change={ch(0)} value={fmtN(cur[0])} valueDescription="closed orders" subtitle="By order type"
                data={cat(D.types, "n", x => TYPE[x.k] || x.k, fmtN)}
                footer={<>By channel: {cat(D.channels, "n", x => CH[x.k] || x.k, fmtN).map(x => `${x.title} ${x.value}`).join(" · ") || "—"}</>} />
              <CategoryBarCard title="Payments" change={ch(2)} value={money(cur[2])} valueDescription="collected" subtitle="By payment method"
                data={cat(D.payMethods, "v", x => String(x.k).replace(/^./, c => c.toUpperCase()), money)}
                footer={<>Tax {money(cur[7])} · discounts {money(cur[6])} · returns {money(cur[8])} · voids {money(cur[9])}</>} />
            </div>
          </section>
          <section aria-labelledby="overview">
            <h2 id="overview" className="mt-16 scroll-mt-8 text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50">Overview</h2>
            <dl className="mt-10 grid grid-cols-1 gap-14 md:grid-cols-2 xl:grid-cols-3">
              <ChartCard title="Net sales" value={money(cur[1])} previous={old ? money(old[1]) : undefined} change={ch(1)} compare={!!P} formatter={v => money(v)} data={series("net")} />
              <ChartCard title="Orders" value={fmtN(cur[0])} previous={old ? fmtN(old[0]) : undefined} change={ch(0)} compare={!!P} formatter={fmtN} data={series("n")} />
              <ChartCard title="Average ticket" value={money(cur[3])} previous={old ? money(old[3]) : undefined} change={ch(3)} compare={!!P} formatter={v => money(v)} data={series("avg", true)} />
              {bucket === "hour" && <ChartCard title="Net payments" value={money(cur[2])} previous={old ? money(old[2]) : undefined} change={ch(2)} compare={!!P} formatter={v => money(v)} data={series("pay")} />}
              {bucket === "hour" && <ChartCard title="Discounts" value={money(cur[6])} previous={old ? money(old[6]) : undefined} change={ch(6)} compare={!!P} formatter={v => money(v)} data={series("disc")} />}
              <div>
                <div className="flex items-center gap-x-2"><dt className="font-bold text-gray-900 sm:text-sm dark:text-gray-50">Top items</dt></div>
                <dd className="mt-2 text-sm text-gray-500">By sales this period</dd>
                {(D.products || []).length ? <BarList className="mt-4" data={(D.products || []).slice(0, 6).map((p: any) => ({ name: p.name, value: +p.v || 0 }))} valueFormatter={(v: number) => money(v)} />
                  : <p className="mt-4 text-sm text-gray-500">No items sold yet.</p>}
              </div>
            </dl>
            <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-gray-200 pt-8 sm:grid-cols-4 dark:border-gray-800">
              {([["Active orders", fmtN(cur[4]), 4], ["Declined", fmtN(cur[5]), 5], ["Returns", money(cur[8]), 8], ["Voids", money(cur[9]), 9]] as [string, string, number][]).map(([t, v, j]) => (
                <div key={t}><dt className="flex items-center gap-2 text-sm text-gray-500">{t}{P && changeBadge(ch(j))}</dt><dd className="mt-1 text-xl text-gray-900 dark:text-gray-50">{v}</dd></div>))}
            </dl>
          </section>
        </>}
    </>
  );
}
