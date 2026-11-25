import { FilterSelect, inSel, selList } from "@/components/tremor/data-table/FilterSelect";
import { CategoryBarCard, ReportCard, ProgressBarCard, CAT_COLORS, changeBadge } from "@/components/tremor/overview/OverviewCards";
import { BarList } from "@/components/tremor/BarList";
// Summary: the same live numbers as the current portal (rpc skwyd_dashboard), laid out like the Tremor dashboard template Overview.
// Filters: brand, store, a business day / a week (Mon–Sun) / a month / custom dates, and comparing with another period of the same kind
// (the one before by default, or one picked by its date).
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { useCol, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { money } from "@/lib/util";
import { useEffect, useState } from "react";
import { PeriodPicker } from "../ui/PeriodPicker";
import { Label } from "@/components/tremor/Label";
import { Switch } from "@/components/ui/switch";
import { SegTabs } from "../ui/SegTabs";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const today = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };

export default function Dashboard() {
  useCol("settings");
  const brands = (useCol("brands") || []).filter((x: Row) => !x.deleted), stores = (useCol("branches") || []).filter((x: Row) => x.active !== false && !x.settings?.deletedAt);

  // Day / Week (Mon–Sun) / Month of one business date, "compared to" the period before, last year, or nothing
  const [kind, setKind] = useState<"1" | "7" | "30">("1"), [at, setAt] = useState<Date>(today);
  const [cmp, setCmp] = useState(false), [cmpAt, setCmpAt] = useState<Date | null>(null);
  const [brand, setBrand] = useState(""), [store, setStore] = useState("");
  const [D, setD] = useState<any>(null), [P, setP] = useState<any>(null), [err, setErr] = useState("");
  const myStores = stores.filter((x: Row) => inSel(brand, x.brandId));
  const span = (k: string, d0: Date) => { const d = new Date(d0); d.setHours(12, 0, 0, 0);
    if (k === "7") { d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return { start: d, n: 7 }; }
    if (k === "30") { const a = new Date(d.getFullYear(), d.getMonth(), 1, 12); return { start: a, n: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() }; }
    return { start: d, n: 1 }; };
  const per = span(kind, at);
  // compared with: the period picked on the second calendar, or the one just before
  const cmpPer = span(kind, cmpAt || new Date(+per.start - 86400000));
  const key = JSON.stringify([iso(per.start), per.n, brand, store, cmp, iso(cmpPer.start), cmpPer.n]);
  useEffect(() => { let off = false; setD(null); setP(null); setErr("");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Beirut";
    const br = store ? selList(store) : brand ? myStores.map((x: Row) => x.id) : null;
    const call = (start: Date, n: number) => sb.rpc("skwyd_dashboard", { p_day: iso(new Date(+start + (n - 1) * 86400000)), p_days: n, p_branches: br && br.length ? br : null, p_brand: brand && !brand.includes(",") ? brand : null, p_tz: tz });
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
      const v = (r: any) => !r ? 0 : k === "avg" ? (+r.n ? +r.net / +r.n : 0) : +r[k] || 0;
      return { label: fmtD(d), value: v(x), previousValue: pm ? v(y) : null }; }); };
  const fmtN = (v: number) => Math.round(v).toLocaleString();
  // the report cards; "View Report" opens the matching report, already filtered to this period, brand and store, in a new window
  const rpt = (r: string) => { const q = new URLSearchParams({ r, from: iso(per.start), to: iso(new Date(+per.start + (per.n - 1) * 86400000)), group: per.n === 1 ? "hour" : "day" });
    if (brand) q.set("brand", brand); if (store) q.set("store", store); return "/" + (r === "voids" ? "business-reports" : "sales-reports") + "?" + q; };
  const cards = [{ t: "Orders", j: 0, k: "n", f: fmtN, r: "sales" }, { t: "Net Sales", j: 1, k: "net", f: money, r: "sales" }, { t: "Net Payments", j: 2, k: "pay", f: money, r: "payments" },
    { t: "Return Amount", j: 8, k: "ret", f: money, r: "voids" }, { t: "Discount Amount", j: 6, k: "disc", f: money, r: "sales" }, { t: "Average Ticket", j: 3, k: "avg", f: money, r: "sales" }];

  // sticky filter bar, a report card per number (value + chart + View Report), then the breakdowns
  return (
    <>
      <PageBreadcrumb pageTitle="Summary" />
      <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 pb-4 pt-2 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10 lg:pt-4 dark:border-gray-800 dark:bg-gray-950">
        {<FilterSelect multiple title="Brand" value={brand} onChange={v => { setBrand(v); setStore(st => selList(st).filter(id => inSel(v, stores.find((x: Row) => x.id === id)?.brandId)).join(",")); }} all="All brands" options={brands.map(b => ({ value: String(b.id), label: String(b.name) }))} />}
        <FilterSelect multiple title="Store" value={store} onChange={v => setStore(v)} all="All stores" options={myStores.map(b => ({ value: String(b.id), label: String(b.name) }))} />
        <SegTabs value={kind} onChange={v => { setKind(v as any); setCmpAt(null); }} items={[["1", "Day"], ["7", "Week"], ["30", "Month"]]} />
        <PeriodPicker kind={kind} value={at} onChange={d => { setAt(d); setCmpAt(null); }} max={today()} />
        <Label className="flex h-[30px] cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><Switch checked={cmp} onCheckedChange={setCmp} aria-label="Compare" />Compare</Label>
        {cmp && <PeriodPicker kind={kind} value={cmpPer.start} onChange={d => setCmpAt(d)} max={today()} />}
      </div>
      {err ? <p className="mt-8 text-sm text-red-600">Couldn't load the summary: {err}</p>
        : !D ? <p className="mt-8 text-sm text-gray-500">Loading live numbers…</p>
        : <>
          <dl className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cards.map(c => <ReportCard key={c.t} title={c.t} value={c.f(cur[c.j])} previous={old ? c.f(old[c.j]) : undefined} change={ch(c.j)} compare={!!P} formatter={c.f} data={series(c.k, c.k === "avg")} href={rpt(c.r)} />)}
          </dl>
          <section aria-labelledby="breakdown">
            <h2 id="breakdown" className="mt-14 scroll-mt-10 text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50">Breakdown</h2>
            <div className="mt-6 grid grid-cols-1 gap-14 sm:grid-cols-2 xl:grid-cols-3">
              <ProgressBarCard title="Sales by store" change={ch(1)} value={money(cur[1])} valueDescription="net sales"
                data={(D.branches || []).filter((b: any) => +b.net).sort((a: any, b: any) => +b.net - +a.net).slice(0, 4).map((b: any) => ({ title: stores.find((x: Row) => x.id === b.id)?.name || "Other", current: money(+b.net), percentage: tot(D.branches, "net") ? +b.net / tot(D.branches, "net") * 100 : 0 }))}
                footer={<>{fmtN(cur[0])} orders · average ticket {money(cur[3])}</>} />
              <CategoryBarCard title="Orders" change={ch(0)} value={fmtN(cur[0])} valueDescription="closed orders" subtitle="By order type"
                data={cat(D.types, "n", x => TYPE[x.k] || x.k, fmtN)}
                footer={<>By channel: {cat(D.channels, "n", x => CH[x.k] || x.k, fmtN).map(x => `${x.title} ${x.value}`).join(" · ") || "—"}</>} />
              <CategoryBarCard title="Payments" change={ch(2)} value={money(cur[2])} valueDescription="collected" subtitle="By payment method"
                data={cat(D.payMethods, "v", x => String(x.k).replace(/^./, c => c.toUpperCase()), money)}
                footer={<>Tax {money(cur[7])} · voids {money(cur[9])}</>} />
              <div>
                <div className="flex items-center gap-x-2"><dt className="font-bold text-gray-900 sm:text-sm dark:text-gray-50">Top items</dt></div>
                <dd className="mt-2 text-sm text-gray-500">By sales this period</dd>
                {(D.products || []).length ? <BarList className="mt-4" data={(D.products || []).slice(0, 6).map((p: any) => ({ name: p.name, value: +p.v || 0 }))} valueFormatter={(v: number) => money(v)} />
                  : <p className="mt-4 text-sm text-gray-500">No items sold yet.</p>}
              </div>
            </div>
            <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-gray-200 pt-8 sm:grid-cols-4 dark:border-gray-800">
              {([["Active orders", fmtN(cur[4]), 4], ["Declined", fmtN(cur[5]), 5], ["Taxes", money(cur[7]), 7], ["Voids", money(cur[9]), 9]] as [string, string, number][]).map(([t, v, j]) => (
                <div key={t}><dt className="flex items-center gap-2 text-sm text-gray-500">{t}{P && changeBadge(ch(j))}</dt><dd className="mt-1 text-xl text-gray-900 dark:text-gray-50">{v}</dd></div>))}
            </dl>
          </section>
        </>}
    </>
  );
}
