// Summary › General, built only from Tremor Raw. Every number appears once:
// 1. (comparing) a callout with the net sales of both periods
// 2. the report cards: Net Sales, Orders, Average Ticket, Net Payments, Returns, Discounts, each with its value, its change, a chart and View Report
// 3. activity: the busiest hours / days, the rates, and the counts that have no chart (active, declined, voids, taxes, delivery fees)
// 4. how people ordered and paid: order types, payment methods, channels
// 5. where and what: net sales by store, top items
import { AreaChart } from "@/components/tremor/AreaChart";
import { Badge } from "@/components/tremor/Badge";
import { BarList } from "@/components/tremor/BarList";
import { Callout } from "@/components/tremor/Callout";
import { Card } from "@/components/tremor/Card";
import { CategoryBar } from "@/components/tremor/CategoryBar";
import { Divider } from "@/components/tremor/Divider";
import { DonutChart } from "@/components/tremor/DonutChart";
import { ProgressBar } from "@/components/tremor/ProgressBar";
import { ProgressCircle } from "@/components/tremor/ProgressCircle";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { Tooltip } from "@/components/tremor/Tooltip";
import { Tracker } from "@/components/tremor/Tracker";
import { getColorClassName, type AvailableChartColorsKeys } from "@/components/tremor/lib/chartUtils";
import type { Row } from "@/lib/db";
import { money } from "@/lib/util";
import { RiArrowDownLine, RiArrowRightLine, RiArrowRightUpLine, RiArrowUpLine, RiInformationLine } from "@remixicon/react";
import { useState } from "react";

type Pt = { label: string; value: number | null; previousValue?: number | null };
export type GeneralProps = {
  D: any; P: any; cur: number[]; old: number[] | null; ch: (j: number) => number | null;
  series: (k: string, avg?: boolean) => Pt[]; perLabel: string; cmpLabel: string; byHour: boolean;
  stores: Row[]; rpt: (r: string) => string;
};

const fmtN = (v: number) => Math.round(+v || 0).toLocaleString();
const short = (v: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(+v || 0);   // chart axes
const pct = (v: number) => (v * 100).toFixed(1) + "%";
const COLORS: AvailableChartColorsKeys[] = ["blue", "emerald", "violet", "amber", "cyan", "pink", "lime", "gray"];
const TYPE: Record<string, string> = { dinein: "In Store", fast: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery", other: "Other" };
const CH: Record<string, string> = { pos: "POS", callcenter: "Call Center", online: "Web Ordering", web: "Web Ordering", marketplace: "Marketplace", api: "API", other: "Other" };
const H3 = "font-semibold text-gray-900 dark:text-gray-50", SUB = "text-sm text-gray-500 dark:text-gray-500";

/** change against the compared period: a Tremor badge with an arrow (green when it's good news) */
function Change({ v, invert }: { v: number | null; invert?: boolean }) {
  if (v == null || !isFinite(v)) return null;
  const flat = Math.abs(v) < 0.0005, good = invert ? v <= 0 : v >= 0, Icon = flat ? RiArrowRightLine : v > 0 ? RiArrowUpLine : RiArrowDownLine;
  return <Badge variant={flat ? "neutral" : good ? "success" : "error"} className="gap-0.5 px-1.5"><Icon className="size-3.5" aria-hidden="true" />{(Math.abs(v) * 100).toFixed(1)}%</Badge>;
}
/** a label with an info icon that explains it */
const Info = ({ t, tip }: { t: string; tip: string }) => (
  <span className="flex items-center gap-1">{t}<Tooltip content={tip}><RiInformationLine className="size-4 shrink-0 text-gray-400" aria-label={tip} /></Tooltip></span>);
/** a coloured dot + name + value list (the charts' legend) */
const Legend = ({ l, f }: { l: { name: string; value: number }[]; f: (v: number) => string }) => (
  <ul className="mt-4 divide-y divide-gray-200 text-sm dark:divide-gray-800">{l.map((x, i) => (
    <li key={x.name} className="flex items-center justify-between gap-2 py-2">
      <span className="flex min-w-0 items-center gap-2 text-gray-700 dark:text-gray-300"><span className={"size-2.5 shrink-0 rounded-xs " + getColorClassName(COLORS[i % COLORS.length], "bg")} aria-hidden="true" /><span className="truncate">{x.name}</span></span>
      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-50">{f(x.value)}</span></li>))}</ul>);
/** merge a list into name → value, biggest first */
const groupBy = (list: any[], k: string, label: (x: any) => string) => {
  const m = new Map<string, number>(); for (const x of list || []) m.set(label(x), (m.get(label(x)) || 0) + (+x[k] || 0));
  return [...m.entries()].filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
};
const sumOf = (l: { value: number }[]) => l.reduce((a, b) => a + b.value, 0);

export function SummaryGeneral({ D, P, cur, old, ch, series, perLabel, cmpLabel, byHour, stores, rpt }: GeneralProps) {
  const [itemBy, setItemBy] = useState("v");
  const cmp = !!P && !!old;

  // the report cards: [title, index in cur, series key, format, report, explanation, lower is better]
  const cards: { t: string; j: number; k: string; f: (v: number) => string; r: string; tip: string; inv?: boolean }[] = [
    { t: "Net Sales", j: 1, k: "net", f: money, r: "sales", tip: "Sales after discounts and returns, without tax" },
    { t: "Orders", j: 0, k: "n", f: fmtN, r: "sales", tip: "Closed orders" },
    { t: "Average Ticket", j: 3, k: "avg", f: money, r: "sales", tip: "Net sales ÷ orders" },
    { t: "Net Payments", j: 2, k: "pay", f: money, r: "payments", tip: "Money collected, tax included, returns taken off" },
    { t: "Returns", j: 8, k: "ret", f: money, r: "voids", tip: "Money given back on returns", inv: true },
    { t: "Discounts", j: 6, k: "disc", f: money, r: "sales", tip: "Discounts given on closed orders", inv: true }];

  const types = groupBy(D.types, "n", x => TYPE[x.k] || x.k), pays = groupBy(D.payMethods, "v", x => String(x.k).replace(/^./, c => c.toUpperCase()));
  const chans = groupBy(D.channels, "n", x => CH[x.k] || x.k), chanT = sumOf(chans) || 1;
  const nameOf = (id: string) => String(stores.find(s => s.id === id)?.name || "Other");
  const byStore = groupBy(D.branches, "net", x => nameOf(x.id));
  const items = (D.products || []).map((p: any) => ({ name: String(p.name), value: +(itemBy === "v" ? p.v : p.qty) || 0 })).filter((x: any) => x.value).sort((a: any, b: any) => b.value - a.value).slice(0, 8);
  // activity: one block per hour (a day) or per day; the darker the blue, the more orders
  const act = series("n"), peak = Math.max(1, ...act.map(a => a.value || 0)), top = act.reduce((b, a) => ((a.value || 0) > (b.value || 0) ? a : b), act[0] || { label: "", value: 0 });
  const shade = (v: number) => !v ? "bg-gray-200 dark:bg-gray-800" : v / peak > .75 ? "bg-blue-700" : v / peak > .5 ? "bg-blue-500" : v / peak > .25 ? "bg-blue-400" : "bg-blue-300";
  const rate = (a: number, b: number) => (b ? a / b : 0);
  const circles: [string, number, string, "default" | "warning" | "error"][] = [
    ["Discount rate", rate(cur[6], cur[1] + cur[6]), "Discounts ÷ sales before discounts", "default"],
    ["Return rate", rate(cur[8], cur[2] + cur[8]), "Returns ÷ payments before returns", "warning"],
    ["Void rate", rate(cur[9], cur[2] + cur[8] + cur[9]), "Voided amount ÷ payments and voids", "error"]];
  const counts: [string, string, number, string, boolean?][] = [
    ["Active orders", fmtN(cur[4]), 4, "Orders still open in this period"], ["Declined", fmtN(cur[5]), 5, "Web and call center orders the store declined", true],
    ["Voids", money(cur[9]), 9, "Voided orders and items", true], ["Taxes", money(cur[7]), 7, "Tax collected, returns taken off"], ["Delivery fees", money(+D.deliveryFees || 0), -1, "Delivery fees on closed orders"]];
  const up = cmp ? ch(1) : null, empty = !cur[0] && !cur[1], big = Math.max(cur[1], old?.[1] || 0) || 1;

  return (
    <div className="space-y-8">
      {empty ? <Callout title="No sales in this period yet" variant="neutral">Pick another day, week or month, or check the Brand and Store filters.</Callout>
        : up != null && old ? <Callout variant={Math.abs(up) < 0.0005 || up > 0 ? "success" : "warning"}
            title={Math.abs(up) < 0.0005 ? `Net sales unchanged against ${cmpLabel}` : `Net sales ${up > 0 ? "up" : "down"} ${Math.abs(up * 100).toFixed(1)}% against ${cmpLabel}`}>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center gap-3"><span className="w-40 shrink-0 truncate">{perLabel}</span><ProgressBar value={cur[1] / big * 100} variant={up >= 0 ? "success" : "warning"} /><span className="w-28 shrink-0 text-right tabular-nums">{money(cur[1])}</span></div>
              <div className="flex items-center gap-3"><span className="w-40 shrink-0 truncate">{cmpLabel}</span><ProgressBar value={old[1] / big * 100} variant="neutral" /><span className="w-28 shrink-0 text-right tabular-nums">{money(old[1])}</span></div>
            </div></Callout> : null}

      {/* the report cards: each number once, with its chart and its report (opens in a new window) */}
      <dl className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(c => {
          const data = series(c.k, c.k === "avg").map(p => ({ date: p.label, [perLabel]: p.value, ...(cmp ? { [cmpLabel]: p.previousValue } : {}) }));
          return (
            <Card key={c.t} className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sm font-medium text-gray-500"><Info t={c.t} tip={c.tip} /></dt>
                <a href={location.pathname + location.search + "#" + rpt(c.r)} target="_blank" rel="noopener" className="flex items-center gap-0.5 whitespace-nowrap text-sm font-medium text-blue-600 hover:underline dark:text-blue-500">View Report<RiArrowRightUpLine className="size-4" aria-hidden="true" /></a>
              </div>
              <dd className="mt-1 flex items-center gap-2"><span className="whitespace-nowrap text-2xl font-semibold text-gray-900 dark:text-gray-50">{c.f(cur[c.j])}</span>{cmp && <Change v={ch(c.j)} invert={c.inv} />}</dd>
              {cmp && <p className="truncate text-xs text-gray-500">from {c.f(old![c.j])} on {cmpLabel}</p>}
              <AreaChart className="mt-4 h-36" data={data} index="date" categories={cmp ? [cmpLabel, perLabel] : [perLabel]} colors={cmp ? ["gray", "blue"] : ["blue"]}
                valueFormatter={c.j === 0 ? fmtN : c.f} showLegend={false} showYAxis={false} showGridLines={false} tickGap={28} fill="gradient" connectNulls />
            </Card>); })}
      </dl>

      {/* activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className={H3}>Busiest {byHour ? "hours" : "days"}</h3>
          <p className={SUB}>{top?.value ? `Most orders ${byHour ? "at" : "on"} ${top.label} (${fmtN(top.value)})` : "No orders yet"} · darker = more orders</p>
          <Tracker className="mt-6 h-10" hoverEffect data={act.map(a => ({ key: a.label, color: shade(a.value || 0), tooltip: `${a.label} · ${fmtN(a.value || 0)} orders` }))} />
          <div className="mt-2 flex justify-between text-xs text-gray-500"><span>{act[0]?.label}</span><span>{act[Math.floor(act.length / 2)]?.label}</span><span>{act[act.length - 1]?.label}</span></div>
          <Divider />
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-5">
            {counts.map(([t, v, j, tip, inv]) => (
              <div key={t}>
                <dt className="text-xs text-gray-500"><Info t={t} tip={tip} /></dt>
                <dd className="mt-1 flex flex-wrap items-center gap-1.5"><span className="text-base font-semibold text-gray-900 dark:text-gray-50">{v}</span>{cmp && j >= 0 && <Change v={ch(j)} invert={inv} />}</dd>
              </div>))}
          </dl>
        </Card>
        <Card>
          <h3 className={H3}>Rates</h3><p className={SUB}>Share of this period's sales</p>
          <ul className="mt-6 space-y-5">
            {circles.map(([t, v, tip, c]) => (
              <li key={t} className="flex items-center gap-4">
                <ProgressCircle value={Math.min(100, v * 100)} radius={22} strokeWidth={5} variant={c} />
                <div><p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{pct(v)}</p><p className="text-xs text-gray-500"><Info t={t} tip={tip} /></p></div>
              </li>))}
          </ul>
        </Card>
      </div>

      {/* how people ordered and paid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {([["Order types", types, fmtN, "orders"], ["Payment methods", pays, money, "payments"]] as const).map(([t, l, f, u]) => (
          <Card key={t}>
            <h3 className={H3}>{t}</h3>
            {l.length ? <>
              <DonutChart className="mx-auto mt-6 h-36" data={[...l]} category="name" value="value" colors={COLORS} valueFormatter={f} showLabel
                label={f === money ? money(sumOf([...l])).replace(/[\d,]+(\.\d+)?/, short(sumOf([...l]))) : f(sumOf([...l]))} />
              <Legend l={[...l]} f={f} />
            </> : <p className={"mt-4 " + SUB}>No {u} yet.</p>}
          </Card>))}
        <Card>
          <h3 className={H3}>Channels</h3><p className={SUB}>Share of orders</p>
          {chans.length ? <>
            <CategoryBar className="mt-6" values={chans.map(c => Math.round(c.value / chanT * 1000) / 10)} colors={COLORS.slice(0, chans.length)} showLabels={false} />
            <Legend l={chans} f={v => `${fmtN(v)} · ${pct(v / chanT)}`} />
          </> : <p className={"mt-4 " + SUB}>No orders yet.</p>}
        </Card>
      </div>

      {/* where and what */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h3 className={H3}>Net sales by store</h3>
          {/* comparing: one list with this period's amount, the compared one and the change */}
          {!byStore.length && !(cmp && (P.branches || []).length) ? <p className={"mt-4 " + SUB}>No sales yet.</p>
            : !cmp ? <BarList className="mt-6" data={byStore} valueFormatter={money} />
            : <ul className="mt-4 divide-y divide-gray-200 text-sm dark:divide-gray-800">{[...new Set([...(D.branches || []), ...(P.branches || [])].map((b: any) => String(b.id)))].map(id => {
                const now = +((D.branches || []).find((x: any) => String(x.id) === id)?.net || 0), was = +((P.branches || []).find((x: any) => String(x.id) === id)?.net || 0);
                return { id, now, was }; }).sort((a, b) => b.now - a.now).map(({ id, now, was }) => (
                <li key={id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate font-medium text-gray-900 dark:text-gray-50">{nameOf(id)}</span>
                  <span className="flex items-center gap-3 tabular-nums"><span className="text-gray-500">from {money(was)}</span><span className="font-medium text-gray-900 dark:text-gray-50">{money(now)}</span><Change v={was ? (now - was) / was : null} /></span>
                </li>))}</ul>}
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-2"><h3 className={H3}>Top items</h3>
            <Tabs value={itemBy} onValueChange={setItemBy}><TabsList variant="solid"><TabsTrigger value="v">Sales</TabsTrigger><TabsTrigger value="q">Quantity</TabsTrigger></TabsList></Tabs></div>
          {items.length ? <BarList className="mt-6" data={items} valueFormatter={itemBy === "v" ? money : fmtN} /> : <p className={"mt-4 " + SUB}>No items sold yet.</p>}
        </Card>
      </div>
    </div>
  );
}
