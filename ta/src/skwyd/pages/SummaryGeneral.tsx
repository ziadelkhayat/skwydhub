// Summary › General, built only from Tremor (the copy-paste Tremor Raw components in components/tremor):
// a callout with a progress bar, KPI cards with spark charts and badges, an area / bar chart with metric tabs and a chart-type toggle,
// a combo chart, a tracker, progress circles, donut charts, a category bar, bar lists, the Foodics-style report cards and an accordion.
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/tremor/Accordion";
import { AreaChart } from "@/components/tremor/AreaChart";
import { Badge } from "@/components/tremor/Badge";
import { BarChart } from "@/components/tremor/BarChart";
import { BarList } from "@/components/tremor/BarList";
import { Callout } from "@/components/tremor/Callout";
import { Card } from "@/components/tremor/Card";
import { CategoryBar } from "@/components/tremor/CategoryBar";
import { ComboChart } from "@/components/tremor/ComboChart";
import { Divider } from "@/components/tremor/Divider";
import { DonutChart } from "@/components/tremor/DonutChart";
import { LineChart } from "@/components/tremor/LineChart";
import { ProgressBar } from "@/components/tremor/ProgressBar";
import { ProgressCircle } from "@/components/tremor/ProgressCircle";
import { SparkAreaChart } from "@/components/tremor/SparkChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/tremor/Toggle";
import { Tooltip } from "@/components/tremor/Tooltip";
import { Tracker } from "@/components/tremor/Tracker";
import { getColorClassName, type AvailableChartColorsKeys } from "@/components/tremor/lib/chartUtils";
import type { Row } from "@/lib/db";
import { money } from "@/lib/util";
import { RiArrowDownLine, RiArrowRightLine, RiArrowUpLine, RiBarChart2Line, RiInformationLine, RiLineChartLine } from "@remixicon/react";
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
const CH: Record<string, string> = { pos: "POS", callcenter: "Call Center", web: "Web", api: "API", other: "Other" };
const H3 = "font-semibold text-gray-900 dark:text-gray-50", SUB = "text-sm text-gray-500 dark:text-gray-500";

/** change against the compared period: a Tremor badge with an arrow */
function Change({ v, invert }: { v: number | null; invert?: boolean }) {
  if (v == null || !isFinite(v)) return null;
  const good = invert ? v <= 0 : v >= 0, Icon = v > 0 ? RiArrowUpLine : v < 0 ? RiArrowDownLine : RiArrowRightLine;
  return <Badge variant={v === 0 ? "neutral" : good ? "success" : "error"} className="gap-0.5 px-1.5"><Icon className="size-3.5" aria-hidden="true" />{(Math.abs(v) * 100).toFixed(1)}%</Badge>;
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

export function SummaryGeneral({ D, P, cur, old, ch, series, perLabel, cmpLabel, byHour, stores, rpt }: GeneralProps) {
  const [metric, setMetric] = useState("net"), [look, setLook] = useState("area"), [itemBy, setItemBy] = useState("v");
  const cmp = !!P;
  const M: Record<string, { t: string; j: number; f: (v: number) => string; avg?: boolean; tip: string }> = {
    net: { t: "Net Sales", j: 1, f: money, tip: "Sales after discounts, without tax" },
    n: { t: "Orders", j: 0, f: fmtN, tip: "Closed orders" },
    avg: { t: "Average Ticket", j: 3, f: money, avg: true, tip: "Net sales ÷ orders" },
    pay: { t: "Net Payments", j: 2, f: money, tip: "Money collected, tax included, returns taken off" },
  };
  const kpis = ["net", "n", "avg", "pay"], m = M[metric], axis = m.j === 0 ? fmtN : short;
  const main = series(metric, !!m.avg).map(p => ({ date: p.label, [perLabel]: p.value, ...(cmp ? { [cmpLabel]: p.previousValue } : {}) }));
  const cats = cmp ? [perLabel, cmpLabel] : [perLabel];
  const nets = series("net");
  const combo = series("n").map((p, i) => ({ date: p.label, Orders: p.value || 0, "Net Sales": nets[i]?.value || 0 }));
  const types = groupBy(D.types, "n", x => TYPE[x.k] || x.k), pays = groupBy(D.payMethods, "v", x => String(x.k).replace(/^./, c => c.toUpperCase()));
  const chans = groupBy(D.channels, "n", x => CH[x.k] || x.k), chanT = chans.reduce((a, b) => a + b.value, 0) || 1;
  const nameOf = (id: string) => String(stores.find(s => s.id === id)?.name || "Other");
  const byStore = groupBy(D.branches, "net", x => nameOf(x.id));
  const items = (D.products || []).map((p: any) => ({ name: String(p.name), value: +(itemBy === "v" ? p.v : p.qty) || 0 })).filter((x: any) => x.value).sort((a: any, b: any) => b.value - a.value).slice(0, 8);
  // activity: one block per hour (a day) or per day; the darker the blue, the more orders
  const act = series("n"), peak = Math.max(1, ...act.map(a => a.value || 0));
  const shade = (v: number) => !v ? "bg-gray-200 dark:bg-gray-800" : v / peak > .75 ? "bg-blue-700" : v / peak > .5 ? "bg-blue-500" : v / peak > .25 ? "bg-blue-400" : "bg-blue-300";
  const gross = cur[1] + cur[6], rate = (a: number, b: number) => (b ? a / b : 0);
  const circles: [string, number, string, "default" | "warning" | "error"][] = [
    ["Discount rate", rate(cur[6], gross), "Discounts ÷ sales before discounts", "default"],
    ["Return rate", rate(cur[8], cur[1] || 1), "Returns ÷ net sales", "warning"],
    ["Void rate", rate(cur[9], (cur[1] + cur[9]) || 1), "Voided amount ÷ sales and voids", "error"]];
  const up = cmp ? ch(1) : null;
  const cards = [{ t: "Orders", j: 0, k: "n", f: fmtN, r: "sales" }, { t: "Net Sales", j: 1, k: "net", f: money, r: "sales" }, { t: "Net Payments", j: 2, k: "pay", f: money, r: "payments" },
    { t: "Return Amount", j: 8, k: "ret", f: money, r: "voids" }, { t: "Discount Amount", j: 6, k: "disc", f: money, r: "sales" }, { t: "Average Ticket", j: 3, k: "avg", f: money, r: "sales" }];
  const empty = !cur[0] && !cur[1], big = Math.max(cur[1], old?.[1] || 0) || 1;

  return (
    <div className="space-y-6">
      {empty ? <Callout title="No sales in this period yet" variant="neutral">Pick another day, week or month, or check the Brand and Store filters.</Callout>
        : up != null && old ? <Callout title={`Net sales ${up >= 0 ? "up" : "down"} ${Math.abs(up * 100).toFixed(1)}% against ${cmpLabel}`} variant={up >= 0 ? "success" : "warning"}>
            {money(cur[1])} this period against {money(old[1])}; {fmtN(cur[0])} orders against {fmtN(old[0])}.
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center gap-3"><span className="w-24 shrink-0">This period</span><ProgressBar value={cur[1] / big * 100} variant={up >= 0 ? "success" : "warning"} /></div>
              <div className="flex items-center gap-3"><span className="w-24 shrink-0 truncate">{cmpLabel}</span><ProgressBar value={old[1] / big * 100} variant="neutral" /></div>
            </div></Callout> : null}

      {/* KPI cards: tap one to show it in the big chart */}
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(k => { const x = M[k], s = series(k, !!x.avg).map(p => ({ date: p.label, v: p.value || 0 }));
          return (
            <Card key={k} asChild className={"cursor-pointer p-5 text-left " + (metric === k ? "ring-2 ring-blue-500 dark:ring-blue-500" : "")}>
              <button type="button" onClick={() => setMetric(k)} aria-pressed={metric === k}>
                <dt className="flex items-center justify-between gap-2 text-sm font-medium text-gray-500"><Info t={x.t} tip={x.tip} />{cmp && <Change v={ch(x.j)} />}</dt>
                <dd className="mt-1 flex items-end justify-between gap-3">
                  <span className="whitespace-nowrap text-xl font-semibold text-gray-900 dark:text-gray-50">{x.f(cur[x.j])}</span>
                  <SparkAreaChart data={s} index="date" categories={["v"]} colors={[metric === k ? "blue" : "gray"]} fill="gradient" className="h-10 w-20 shrink-0" />
                </dd>
                {cmp && old && <p className="mt-1 truncate text-xs text-gray-500">from {x.f(old[x.j])}</p>}
              </button>
            </Card>); })}
      </dl>

      {/* the big chart: the number in tabs, area or bars in a toggle */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className={H3}>{m.t} {byHour ? "by hour" : "by day"}</h3><p className={SUB}>{perLabel}{cmp ? ` against ${cmpLabel}` : ""}</p></div>
          <div className="flex items-center gap-2">
            <Tabs value={metric} onValueChange={setMetric}><TabsList variant="solid">{kpis.map(k => <TabsTrigger key={k} value={k}>{M[k].t}</TabsTrigger>)}</TabsList></Tabs>
            <ToggleGroup type="single" value={look} onValueChange={v => v && setLook(v)} aria-label="Chart type">
              <ToggleGroupItem value="area" aria-label="Area chart"><RiLineChartLine className="size-4" /></ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Bar chart"><RiBarChart2Line className="size-4" /></ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {look === "area"
          ? <AreaChart className="mt-6 h-72" data={main} index="date" categories={cats} colors={["blue", "gray"]} valueFormatter={axis} showLegend={cmp} yAxisWidth={48} connectNulls />
          : <BarChart className="mt-6 h-72" data={main} index="date" categories={cats} colors={["blue", "gray"]} valueFormatter={axis} showLegend={cmp} yAxisWidth={48} />}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className={H3}>Orders and net sales</h3><p className={SUB}>Bars: orders · line: net sales</p>
          <ComboChart className="mt-6 h-64" data={combo} index="date" enableBiaxial
            barSeries={{ categories: ["Orders"], colors: ["blue"], valueFormatter: fmtN, yAxisWidth: 40, allowDecimals: false }}
            lineSeries={{ categories: ["Net Sales"], colors: ["emerald"], valueFormatter: short, yAxisWidth: 48, showYAxis: true }} />
        </Card>
        <Card>
          <h3 className={H3}>Busiest {byHour ? "hours" : "days"}</h3><p className={SUB}>Darker = more orders</p>
          <Tracker className="mt-6" hoverEffect data={act.map(a => ({ key: a.label, color: shade(a.value || 0), tooltip: `${a.label} · ${fmtN(a.value || 0)} orders` }))} />
          <div className="mt-2 flex justify-between text-xs text-gray-500"><span>{act[0]?.label}</span><span>{act[act.length - 1]?.label}</span></div>
          <Divider />
          <div className="grid grid-cols-3 gap-2">
            {circles.map(([t, v, tip, c]) => (
              <div key={t} className="flex flex-col items-center gap-2 text-center">
                <ProgressCircle value={Math.min(100, v * 100)} radius={28} strokeWidth={6} variant={c}><span className="text-xs font-medium text-gray-900 dark:text-gray-50">{pct(v)}</span></ProgressCircle>
                <span className="text-xs text-gray-500"><Info t={t} tip={tip} /></span>
              </div>))}
          </div>
        </Card>
      </div>

      {/* how people ordered and paid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {([["Order types", types, fmtN, "orders"], ["Payment methods", pays, money, "payments"]] as const).map(([t, l, f, u]) => (
          <Card key={t}>
            <h3 className={H3}>{t}</h3>
            {l.length ? <>
              <DonutChart className="mx-auto mt-6 h-36" data={[...l]} category="name" value="value" colors={COLORS} valueFormatter={f} showLabel label={f(l.reduce((a, b) => a + b.value, 0))} />
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

      {/* stores and items */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h3 className={H3}>Net sales by store</h3>
          {byStore.length ? <BarList className="mt-6" data={byStore} valueFormatter={money} /> : <p className={"mt-4 " + SUB}>No sales yet.</p>}
          {cmp && byStore.length > 0 && <ul className="mt-6 divide-y divide-gray-200 text-sm dark:divide-gray-800">{(D.branches || []).filter((b: any) => +b.net).map((b: any) => {
            const was = +((P.branches || []).find((x: any) => x.id === b.id)?.net || 0);
            return <li key={b.id} className="flex items-center justify-between gap-3 py-2"><span className="truncate text-gray-700 dark:text-gray-300">{nameOf(b.id)}</span>
              <span className="flex items-center gap-2 tabular-nums text-gray-500">from {money(was)} <Change v={was ? (+b.net - was) / was : null} /></span></li>; })}</ul>}
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-2"><h3 className={H3}>Top items</h3>
            <Tabs value={itemBy} onValueChange={setItemBy}><TabsList variant="solid"><TabsTrigger value="v">Sales</TabsTrigger><TabsTrigger value="q">Quantity</TabsTrigger></TabsList></Tabs></div>
          {items.length ? <BarList className="mt-6" data={items} valueFormatter={itemBy === "v" ? money : fmtN} /> : <p className={"mt-4 " + SUB}>No items sold yet.</p>}
        </Card>
      </div>

      <Divider>Reports</Divider>
      <dl className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(c => {
          const s = series(c.k, c.k === "avg").map(p => ({ date: p.label, [c.t]: p.value, ...(cmp ? { Before: p.previousValue } : {}) }));
          return (
            <Card key={c.t}>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">{c.t}{cmp && <Change v={ch(c.j)} invert={c.j === 8 || c.j === 6} />}</dt>
                <a href={location.pathname + location.search + "#" + rpt(c.r)} target="_blank" rel="noopener" className="whitespace-nowrap text-sm font-medium text-blue-600 hover:underline dark:text-blue-500">View Report</a>
              </div>
              <dd className="mt-2 flex items-baseline justify-between gap-2"><span className="whitespace-nowrap text-2xl font-medium text-gray-900 dark:text-gray-50">{c.f(cur[c.j])}</span>{cmp && old && <span className={SUB}>from {c.f(old[c.j])}</span>}</dd>
              <LineChart className="mt-4 h-40" data={s} index="date" categories={cmp ? [c.t, "Before"] : [c.t]} colors={["blue", "gray"]} valueFormatter={c.j === 0 ? fmtN : short} showLegend={false} showYAxis={false} showGridLines={false} tickGap={24} connectNulls />
            </Card>); })}
      </dl>

      <Accordion type="single" collapsible className="rounded-lg border border-gray-200 px-4 dark:border-gray-800">
        <AccordionItem value="more" className="border-b-0">
          <AccordionTrigger>More numbers</AccordionTrigger>
          <AccordionContent>
            <dl className="grid grid-cols-2 gap-6 pb-2 sm:grid-cols-3 lg:grid-cols-6">
              {([["Active orders", fmtN(cur[4]), 4], ["Declined", fmtN(cur[5]), 5], ["Taxes", money(cur[7]), 7], ["Voids", money(cur[9]), 9], ["Delivery fees", money(+D.deliveryFees || 0), -1], ["Returns", money(cur[8]), 8]] as [string, string, number][]).map(([t, v, j]) => (
                <div key={t}><dt className="flex items-center gap-2 text-sm text-gray-500">{t}{cmp && j >= 0 && <Change v={ch(j)} invert={j === 5 || j === 8 || j === 9} />}</dt><dd className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-50">{v}</dd></div>))}
            </dl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
