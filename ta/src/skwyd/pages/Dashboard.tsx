import { FilterSelect, inSel, selList } from "@/components/tremor/data-table/FilterSelect";
// Summary: the same live numbers as the current portal (rpc skwyd_dashboard), laid out like the Tremor dashboard template Overview.
// Filters: brand, store, a business day / a week (Mon–Sun) / a month / custom dates, and comparing with another period of the same kind
// (the one before by default, or one picked by its date).
import { useCol, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { PeriodPicker } from "../ui/PeriodPicker";
import { Switch, Tab, TabGroup, TabList } from "@tremor/react";
import { SummaryGeneral } from "./SummaryGeneral";
import { BrandsTab, CallCenterTab, InventoryTab, StoresTab, useStoreLive } from "./SummaryTabs";
import { useSearchParams } from "react-router";

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
  // tabs: General, Brands, Stores, Inventory, Call Center (?tab= in the address)
  const [sp, setSp] = useSearchParams(), tab = sp.get("tab") || "general";
  const TABS: [string, string][] = [["general", "General"], ["brands", "Brands"], ["stores", "Stores"], ["inventory", "Inventory"], ["callcenter", "Call Center"]];
  const brIds = store ? selList(store) : brand ? myStores.map((x: Row) => String(x.id)) : null;
  const L = useStoreLive(brIds, brand, tab === "brands" || tab === "stores" || tab === "callcenter");
  const whs = useCol("warehouses") || [];
  const locIds = store ? selList(store) : brand ? [...myStores.map((x: Row) => String(x.id)), ...whs.filter((w: Row) => !w.brandId || inSel(brand, w.brandId)).map((w: Row) => String(w.id))] : null;
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
    const br = brIds;
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
  const bucket = per.n === 1 ? "hour" : "day";
  const series = (k: string, avg = false) => {
    if (bucket === "hour") { const a = hrs(k === "avg" ? "net" : k), n = hrs("n"), b = P ? hrsOf(P, k === "avg" ? "net" : k) : null, pn = P ? hrsOf(P, "n") : null;
      return labels.map((l, h) => ({ label: l, value: avg ? (n[h] ? a[h] / n[h] : null) : a[h], previousValue: b ? (avg ? (pn![h] ? b[h] / pn![h] : null) : b[h]) : null })); }
    const day = (X: any) => { const m = new Map<string, any>(); (X?.days || []).forEach((d: any) => m.set(String(d.d).slice(0, 10), d)); return m; };
    const dm = day(D), pm = P ? day(P) : null;
    return Array.from({ length: per.n }, (_, i) => { const d = new Date(+per.start + i * 86400000), pd = new Date(+cmpPer.start + i * 86400000), x = dm.get(iso(d)), y = pm?.get(iso(pd));
      const v = (r: any) => !r ? 0 : k === "avg" ? (+r.n ? +r.net / +r.n : 0) : +r[k] || 0;
      return { label: fmtD(d), value: v(x), previousValue: pm ? v(y) : null }; }); };
  // the report cards; "View Report" opens the matching report, already filtered to this period, brand and store, in a new window
  const rpt = (r: string) => { const q = new URLSearchParams({ r, from: iso(per.start), to: iso(new Date(+per.start + (per.n - 1) * 86400000)), group: per.n === 1 ? "hour" : "day" });
    if (brand) q.set("brand", brand); if (store) q.set("store", store); return "/" + (r === "voids" ? "business-reports" : "sales-reports") + "?" + q; };

  // sticky filter bar, a report card per number (value + chart + View Report), then the breakdowns
  return (
    <>
      <TabGroup className="mb-4" index={Math.max(0, TABS.findIndex(t => t[0] === tab))} onIndexChange={i => setSp(i === 0 ? {} : { tab: TABS[i][0] })}>
        <TabList variant="line">{TABS.map(([k, l]) => <Tab key={k}>{l}</Tab>)}</TabList>
      </TabGroup>
      <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 pb-4 pt-2 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10 lg:pt-4 dark:border-gray-800 dark:bg-gray-950">
        {<FilterSelect multiple title="Brand" value={brand} onChange={v => { setBrand(v); setStore(st => selList(st).filter(id => inSel(v, stores.find((x: Row) => x.id === id)?.brandId)).join(",")); }} all="All brands" options={brands.map(b => ({ value: String(b.id), label: String(b.name) }))} />}
        <FilterSelect multiple title="Store" value={store} onChange={v => setStore(v)} all="All stores" options={myStores.map(b => ({ value: String(b.id), label: String(b.name) }))} />
        {tab !== "stores" && <><TabGroup className="w-auto" index={["1", "7", "30"].indexOf(kind)} onIndexChange={i => { setKind((["1", "7", "30"] as const)[i]); setCmpAt(null); }}>
          <TabList variant="solid">{["Day", "Week", "Month"].map(l => <Tab key={l}>{l}</Tab>)}</TabList></TabGroup>
        <PeriodPicker kind={kind} value={at} onChange={d => { setAt(d); setCmpAt(null); }} max={today()} />
        {tab === "general" && <label className="flex cursor-pointer items-center gap-2 text-tremor-default text-tremor-content-emphasis dark:text-dark-tremor-content-emphasis"><Switch checked={cmp} onChange={setCmp} aria-label="Compare" />Compare</label>}
        {cmp && tab === "general" && <PeriodPicker kind={kind} value={cmpPer.start} onChange={d => setCmpAt(d)} max={today()} />}</>}
      </div>
      {tab === "stores" ? <div className="mt-8"><StoresTab L={L} stores={myStores.filter((x: Row) => !store || inSel(store, x.id))} /></div>
        : tab === "inventory" ? <div className="mt-8"><InventoryTab locIds={locIds} from={iso(per.start)} to={iso(new Date(+per.start + (per.n - 1) * 86400000))} /></div>
        : err ? <p className="mt-8 text-sm text-red-600">Couldn't load the summary: {err}</p>
        : !D ? <p className="mt-8 text-sm text-gray-500">Loading live numbers…</p>
        : tab === "brands" ? <div className="mt-8"><BrandsTab D={D} L={L} stores={stores} brands={brands} brand={brand} /></div>
        : tab === "callcenter" ? <div className="mt-8"><CallCenterTab D={D} L={L} stores={stores} /></div>
        : <div className="mt-8"><SummaryGeneral D={D} P={P} cur={cur} old={old} ch={ch} series={series} byHour={per.n === 1} stores={stores} rpt={rpt}
            perLabel={per.n === 1 ? fmtD(per.start) : fmtD(per.start) + " – " + fmtD(new Date(+per.start + (per.n - 1) * 86400000))}
            cmpLabel={per.n === 1 ? fmtD(cmpPer.start) : fmtD(cmpPer.start) + " – " + fmtD(new Date(+cmpPer.start + (cmpPer.n - 1) * 86400000))} /></div>}
    </>
  );
}
