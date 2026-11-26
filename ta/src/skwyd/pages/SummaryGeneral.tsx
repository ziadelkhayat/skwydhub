// Summary › General, built from @tremor/react only: KPI cards with spark charts and delta badges, a callout with a marker bar,
// an area / bar chart with metric tabs, bar and line charts, a tracker, progress circles, donut charts with legends and lists,
// a category bar, bar lists, delta bars, a scatter chart, the Foodics-style report cards and an accordion.
import type { Row } from "@/lib/db";
import { money } from "@/lib/util";
import { RiBarChart2Line, RiInformationLine, RiLineChartLine } from "@remixicon/react";
import {
  Accordion, AccordionBody, AccordionHeader, AreaChart, BadgeDelta, BarChart, BarList, Callout, Card, CategoryBar, Col, DeltaBar, Divider, DonutChart, Flex, Grid, Icon,
  Legend, LineChart, List, ListItem, MarkerBar, Metric, ProgressCircle, ScatterChart, SparkAreaChart, Tab, TabGroup, TabList, Text, Title, Tracker, type Color, type DeltaType,
} from "@tremor/react";
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
const COLORS: Color[] = ["blue", "emerald", "violet", "amber", "cyan", "pink", "lime", "gray"];
const TYPE: Record<string, string> = { dinein: "In Store", fast: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery", other: "Other" };
const CH: Record<string, string> = { pos: "POS", callcenter: "Call Center", web: "Web", api: "API", other: "Other" };

const deltaOf = (v: number): DeltaType => v === 0 ? "unchanged" : v > .1 ? "increase" : v > 0 ? "moderateIncrease" : v < -.1 ? "decrease" : "moderateDecrease";
/** change against the compared period */
function Change({ v, invert }: { v: number | null; invert?: boolean }) {
  if (v == null || !isFinite(v)) return null;
  return <BadgeDelta deltaType={deltaOf(v)} isIncreasePositive={!invert} size="xs">{v > 0 ? "+" : ""}{(v * 100).toFixed(1)}%</BadgeDelta>;
}
/** a label with an info icon that explains it */
const Info = ({ t, tip }: { t: string; tip: string }) => <Flex justifyContent="start" className="gap-0.5"><Text>{t}</Text><Icon icon={RiInformationLine} size="xs" color="gray" tooltip={tip} /></Flex>;

/** merge a list into name → value, biggest first */
const groupBy = (list: any[], k: string, label: (x: any) => string) => {
  const m = new Map<string, number>(); for (const x of list || []) m.set(label(x), (m.get(label(x)) || 0) + (+x[k] || 0));
  return [...m.entries()].filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
};

export function SummaryGeneral({ D, P, cur, old, ch, series, perLabel, cmpLabel, byHour, stores, rpt }: GeneralProps) {
  const [mi, setMi] = useState(0), [look, setLook] = useState(0), [itemBy, setItemBy] = useState(0);
  const cmp = !!P;
  const M: { k: string; t: string; j: number; f: (v: number) => string; avg?: boolean; tip: string }[] = [
    { k: "net", t: "Net Sales", j: 1, f: money, tip: "Sales after discounts, without tax" },
    { k: "n", t: "Orders", j: 0, f: fmtN, tip: "Closed orders" },
    { k: "avg", t: "Average Ticket", j: 3, f: money, avg: true, tip: "Net sales ÷ orders" },
    { k: "pay", t: "Net Payments", j: 2, f: money, tip: "Money collected, tax included, returns taken off" }];
  const m = M[mi];
  const main = series(m.k, !!m.avg).map(p => ({ date: p.label, [perLabel]: p.value, ...(cmp ? { [cmpLabel]: p.previousValue } : {}) }));
  const cats = cmp ? [perLabel, cmpLabel] : [perLabel], axis = m.j === 0 ? fmtN : short;
  const types = groupBy(D.types, "n", x => TYPE[x.k] || x.k), pays = groupBy(D.payMethods, "v", x => String(x.k).replace(/^./, c => c.toUpperCase()));
  const chans = groupBy(D.channels, "n", x => CH[x.k] || x.k), chanT = chans.reduce((a, b) => a + b.value, 0) || 1;
  const nameOf = (id: string) => String(stores.find(s => s.id === id)?.name || "Other");
  const byStore = groupBy(D.branches, "net", x => nameOf(x.id));
  const items = (D.products || []).map((p: any) => ({ name: String(p.name), value: +(itemBy === 0 ? p.v : p.qty) || 0 })).filter((x: any) => x.value).sort((a: any, b: any) => b.value - a.value).slice(0, 8);
  // activity: one block per hour (a day) or per day; the darker the blue, the more orders
  const act = series("n"), peak = Math.max(1, ...act.map(a => a.value || 0));
  const shade = (v: number): Color => !v ? "gray" : v / peak > .75 ? "indigo" : v / peak > .5 ? "blue" : v / peak > .25 ? "sky" : "cyan";
  const gross = cur[1] + cur[6], rate = (a: number, b: number) => (b ? a / b : 0);
  const circles: [string, number, string, Color][] = [
    ["Discount rate", rate(cur[6], gross), "Discounts ÷ sales before discounts", "blue"],
    ["Return rate", rate(cur[8], cur[1] || 1), "Returns ÷ net sales", "amber"],
    ["Void rate", rate(cur[9], (cur[1] + cur[9]) || 1), "Voided amount ÷ sales and voids", "rose"]];
  const up = cmp ? ch(1) : null;
  const cards = [{ t: "Orders", j: 0, k: "n", f: fmtN, r: "sales" }, { t: "Net Sales", j: 1, k: "net", f: money, r: "sales" }, { t: "Net Payments", j: 2, k: "pay", f: money, r: "payments" },
    { t: "Return Amount", j: 8, k: "ret", f: money, r: "voids" }, { t: "Discount Amount", j: 6, k: "disc", f: money, r: "sales" }, { t: "Average Ticket", j: 3, k: "avg", f: money, r: "sales" }];
  const empty = !cur[0] && !cur[1];
  const big = Math.max(cur[1], old?.[1] || 0) || 1;

  return (
    <div className="space-y-6">
      {empty ? <Callout title="No sales in this period yet" color="gray">Pick another day, week or month, or check the Brand and Store filters.</Callout>
        : up != null && old ? <Callout title={`Net sales ${up >= 0 ? "up" : "down"} ${Math.abs(up * 100).toFixed(1)}% against ${cmpLabel}`} color={up >= 0 ? "emerald" : "amber"}>
            {money(cur[1])} this period against {money(old[1])}; {fmtN(cur[0])} orders against {fmtN(old[0])}.
            <MarkerBar className="mt-3" value={cur[1] / big * 100} minValue={0} maxValue={old[1] / big * 100} color={up >= 0 ? "emerald" : "amber"} markerTooltip="This period" rangeTooltip={cmpLabel} /></Callout> : null}

      {/* KPI cards: tap one to show it in the big chart */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-5">
        {M.map((x, i) => { const s = series(x.k, !!x.avg).map(p => ({ date: p.label, v: p.value || 0 }));
          return (
            <Card key={x.k} className="cursor-pointer" decoration="top" decorationColor={mi === i ? "blue" : "gray"} onClick={() => setMi(i)}>
              <Flex alignItems="start"><Info t={x.t} tip={x.tip} />{cmp && <Change v={ch(x.j)} />}</Flex>
              <Flex alignItems="end" className="mt-1 gap-4">
                <Metric className="whitespace-nowrap text-xl">{x.f(cur[x.j])}</Metric>
                <SparkAreaChart data={s} index="date" categories={["v"]} colors={[mi === i ? "blue" : "gray"]} className="h-10 w-20 shrink-0" />
              </Flex>
              {cmp && old && <Text className="mt-1 truncate">from {x.f(old[x.j])}</Text>}
            </Card>); })}
      </Grid>

      {/* the big chart: the number in tabs, area or bars in icon tabs */}
      <Card>
        <Flex className="flex-wrap gap-3">
          <div><Title>{m.t} {byHour ? "by hour" : "by day"}</Title><Text>{perLabel}{cmp ? ` against ${cmpLabel}` : ""}</Text></div>
          <Flex justifyContent="end" className="w-auto gap-2">
            <TabGroup index={mi} onIndexChange={setMi}><TabList variant="solid">{M.map(x => <Tab key={x.k}>{x.t}</Tab>)}</TabList></TabGroup>
            <TabGroup index={look} onIndexChange={setLook}><TabList variant="solid"><Tab icon={RiLineChartLine} aria-label="Area chart" /><Tab icon={RiBarChart2Line} aria-label="Bar chart" /></TabList></TabGroup>
          </Flex>
        </Flex>
        {look === 0
          ? <AreaChart className="mt-6 h-72" data={main} index="date" categories={cats} colors={["blue", "gray"]} valueFormatter={axis} showLegend={cmp} yAxisWidth={48} connectNulls curveType="monotone" />
          : <BarChart className="mt-6 h-72" data={main} index="date" categories={cats} colors={["blue", "gray"]} valueFormatter={axis} showLegend={cmp} yAxisWidth={48} />}
      </Card>

      <Grid numItemsLg={3} className="gap-5">
        <Col numColSpanLg={2}><Card className="h-full">
          <Title>Orders {byHour ? "by hour" : "by day"}</Title><Text>Closed orders</Text>
          <BarChart className="mt-6 h-64" data={series("n").map(p => ({ date: p.label, Orders: p.value || 0 }))} index="date" categories={["Orders"]} colors={["blue"]} valueFormatter={fmtN} showLegend={false} yAxisWidth={40} allowDecimals={false} />
        </Card></Col>
        <Card>
          <Title>Busiest {byHour ? "hours" : "days"}</Title><Text>Darker blue = more orders</Text>
          <Tracker className="mt-6" data={act.map(a => ({ color: shade(a.value || 0), tooltip: `${a.label} · ${fmtN(a.value || 0)} orders` }))} />
          <Flex className="mt-2"><Text>{act[0]?.label}</Text><Text>{act[act.length - 1]?.label}</Text></Flex>
          <Divider />
          <Grid numItems={3} className="gap-2">
            {circles.map(([t, v, tip, c]) => (
              <Flex key={t} flexDirection="col" className="gap-2">
                <ProgressCircle value={Math.min(100, v * 100)} radius={30} strokeWidth={6} color={c} tooltip={tip}><span className="text-xs font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">{pct(v)}</span></ProgressCircle>
                <Text className="text-center text-xs">{t}</Text>
              </Flex>))}
          </Grid>
        </Card>
      </Grid>

      {/* how people ordered and paid */}
      <Grid numItemsMd={2} numItemsLg={3} className="gap-5">
        {([["Order types", types, fmtN, "orders"], ["Payment methods", pays, money, "payments"]] as const).map(([t, l, f, u]) => (
          <Card key={t}>
            <Title>{t}</Title>
            {l.length ? <>
              <DonutChart className="mt-6 h-36" data={[...l]} index="name" category="value" colors={COLORS} valueFormatter={f} label={f(l.reduce((a, b) => a + b.value, 0))} showAnimation />
              <Legend className="mt-4" categories={l.map(x => x.name)} colors={COLORS.slice(0, l.length)} />
              <List className="mt-2">{l.map(x => <ListItem key={x.name}><span className="truncate">{x.name}</span><span className="tabular-nums">{f(x.value)}</span></ListItem>)}</List>
            </> : <Text className="mt-4">No {u} yet.</Text>}
          </Card>))}
        <Card>
          <Title>Channels</Title><Text>Share of orders</Text>
          {chans.length ? <>
            <CategoryBar className="mt-6" values={chans.map(c => Math.round(c.value / chanT * 1000) / 10)} colors={COLORS.slice(0, chans.length)} showLabels={false} />
            <Legend className="mt-4" categories={chans.map(c => c.name)} colors={COLORS.slice(0, chans.length)} />
            <List className="mt-2">{chans.map(c => <ListItem key={c.name}><span>{c.name}</span><span className="tabular-nums">{fmtN(c.value)} · {pct(c.value / chanT)}</span></ListItem>)}</List>
          </> : <Text className="mt-4">No orders yet.</Text>}
        </Card>
      </Grid>

      {/* stores and items */}
      <Grid numItemsLg={2} className="gap-5">
        <Card>
          <Title>Net sales by store</Title>
          {byStore.length ? <BarList className="mt-6" data={byStore} valueFormatter={money} /> : <Text className="mt-4">No sales yet.</Text>}
          {cmp && byStore.length > 0 && <List className="mt-6">{(D.branches || []).filter((b: any) => +b.net).map((b: any) => {
            const was = +((P.branches || []).find((x: any) => x.id === b.id)?.net || 0), c = was ? (+b.net - was) / was : 0;
            return <ListItem key={b.id} className="gap-4"><span className="w-28 shrink-0 truncate">{nameOf(b.id)}</span>
              <DeltaBar className="flex-1" value={Math.max(-100, Math.min(100, Math.round(c * 100)))} tooltip={(c * 100).toFixed(1) + "%"} /><span className="w-14 shrink-0 text-right tabular-nums">{(c * 100).toFixed(0)}%</span></ListItem>; })}</List>}
        </Card>
        <Card>
          <Flex><Title>Top items</Title>
            <TabGroup index={itemBy} onIndexChange={setItemBy} className="w-auto"><TabList variant="solid"><Tab>Sales</Tab><Tab>Quantity</Tab></TabList></TabGroup></Flex>
          {items.length ? <BarList className="mt-6" data={items} valueFormatter={itemBy === 0 ? money : fmtN} /> : <Text className="mt-4">No items sold yet.</Text>}
        </Card>
        {byStore.length > 1 && <Col numColSpanLg={2}><Card>
          <Title>Stores: orders and average ticket</Title><Text>Bubble size = net sales</Text>
          <ScatterChart className="mt-6 h-72" data={(D.branches || []).filter((b: any) => +b.n).map((b: any) => ({ store: nameOf(b.id), Orders: +b.n, "Average Ticket": +b.net / +b.n, "Net Sales": +b.net }))}
            category="store" x="Orders" y="Average Ticket" size="Net Sales" colors={COLORS} showLegend valueFormatter={{ x: fmtN, y: money, size: money }} />
        </Card></Col>}
      </Grid>

      <Divider>Reports</Divider>
      <Grid numItemsMd={2} numItemsLg={3} className="gap-5">
        {cards.map(c => {
          const s = series(c.k, c.k === "avg").map(p => ({ date: p.label, [c.t]: p.value, ...(cmp ? { Before: p.previousValue } : {}) }));
          return (
            <Card key={c.t}>
              <Flex><Flex justifyContent="start" className="gap-2"><Title className="text-sm">{c.t}</Title>{cmp && <Change v={ch(c.j)} invert={c.j === 8 || c.j === 6} />}</Flex>
                <a href={location.pathname + location.search + "#" + rpt(c.r)} target="_blank" rel="noopener" className="whitespace-nowrap text-tremor-default font-medium text-tremor-brand hover:underline">View Report</a></Flex>
              <Flex alignItems="baseline" className="mt-2"><Metric className="text-2xl">{c.f(cur[c.j])}</Metric>{cmp && old && <Text>from {c.f(old[c.j])}</Text>}</Flex>
              <LineChart className="mt-4 h-40" data={s} index="date" categories={cmp ? [c.t, "Before"] : [c.t]} colors={["blue", "gray"]} valueFormatter={c.j === 0 ? fmtN : short} showLegend={false} showYAxis={false} showGridLines={false} connectNulls />
            </Card>); })}
      </Grid>

      <Accordion>
        <AccordionHeader>More numbers</AccordionHeader>
        <AccordionBody>
          <Grid numItems={2} numItemsSm={3} numItemsLg={6} className="gap-6">
            {([["Active orders", fmtN(cur[4]), 4], ["Declined", fmtN(cur[5]), 5], ["Taxes", money(cur[7]), 7], ["Voids", money(cur[9]), 9], ["Delivery fees", money(+D.deliveryFees || 0), -1], ["Returns", money(cur[8]), 8]] as [string, string, number][]).map(([t, v, j]) => (
              <div key={t}><Flex justifyContent="start" className="gap-2"><Text>{t}</Text>{cmp && j >= 0 && <Change v={ch(j)} invert={j === 5 || j === 8 || j === 9} />}</Flex><Metric className="mt-1 text-lg">{v}</Metric></div>))}
          </Grid>
        </AccordionBody>
      </Accordion>
    </div>
  );
}
