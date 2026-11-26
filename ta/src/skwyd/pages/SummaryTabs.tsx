// Summary tabs besides General: Brands, Stores, Inventory and Call Center (like the Foodics dashboard tabs).
// They follow the Summary's Brand / Store filters, and the period (Day / Week / Month) where a period makes sense.
import { Badge } from "@/components/tremor/Badge";
import { BarChart } from "@/components/tremor/BarChart";
import { BarList } from "@/components/tremor/BarList";
import { Callout } from "@/components/tremor/Callout";
import { Card } from "@/components/tremor/Card";
import { DonutChart } from "@/components/tremor/DonutChart";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/tremor/Table";
import { Tracker } from "@/components/tremor/Tracker";
import { useCol, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDateTime, money, openWin } from "@/lib/util";
import { useEffect, useState } from "react";
import { live } from "../crud/CrudPage";
import { EmptyState } from "../ui/EmptyState";
import { moveType, unitCost } from "./InvReports";

const n0 = (v: number) => Math.round(+v || 0).toLocaleString();
const dt = (v: any) => (v ? fmtDateTime(v) : "—");

/** KPI tiles (title + big number), as in the Foodics dashboard tabs */
function Tiles({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className={"grid grid-cols-1 gap-5 sm:grid-cols-2 " + (items.length > 3 ? "xl:grid-cols-4" : "lg:grid-cols-3")}>
      {items.map(([l, v]) => <Card key={l} className="p-5"><dt className="text-sm font-medium text-gray-500">{l}</dt><dd className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">{v}</dd></Card>)}
    </dl>
  );
}

/** a titled table section; cells are already formatted */
function StatTable({ title, cols, rows, empty, onRow }: { title: string; cols: [string, boolean?][]; rows: React.ReactNode[][]; empty: string; onRow?: (i: number) => void }) {
  return (
    <section className="mt-12">
      <h3 className="font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
      {!rows.length ? <div className="mt-4"><EmptyState text={empty} /></div> : (
        <Card className="mt-4 p-0"><TableRoot>
          <Table>
            <TableHead><TableRow>{cols.map(([c, num]) => <TableHeaderCell key={c} className={num ? "text-right" : ""}>{c}</TableHeaderCell>)}</TableRow></TableHead>
            <TableBody>
              {rows.map((r, i) => <TableRow key={i} className={onRow ? "cursor-pointer hover:bg-gray-50 hover:dark:bg-gray-900" : ""} onClick={onRow ? () => onRow(i) : undefined}>
                {r.map((c, j) => <TableCell key={j} className={(cols[j]?.[1] ? "text-right tabular-nums" : "") + (j === 0 ? " font-medium text-gray-900 dark:text-gray-50" : "")}>{c}</TableCell>)}</TableRow>)}
            </TableBody>
          </Table>
        </TableRoot></Card>)}
    </section>
  );
}

/** live numbers per store (skwyd_store_live), refreshed every minute */
export function useStoreLive(br: string[] | null, brand: string, on: boolean) {
  const [L, setL] = useState<any[] | null>(null), key = JSON.stringify([br, brand, on]);
  useEffect(() => { if (!on) return; let off = false;
    const load = () => sb.rpc("skwyd_store_live", { p_branches: br && br.length ? br : null, p_brand: brand && !brand.includes(",") ? brand : null }).then(({ data }) => { if (!off) setL(data || []); });
    void load(); const t = setInterval(load, 60000); return () => { off = true; clearInterval(t); }; }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return L;
}

const sum = (l: any[], k: string) => l.reduce((x, y) => x + (+y[k] || 0), 0);

/** Brands: the period's sales of each brand, and its live active orders */
export function BrandsTab({ D, L, stores, brands, brand }: { D: any; L: any[] | null; stores: Row[]; brands: Row[]; brand: string }) {
  const brandOf = (id: string) => stores.find(s => s.id === id)?.brandId || "";
  const list = brands.filter(b => !b.deleted && (!brand || brand.split(",").includes(String(b.id)))).map(b => {
    const br = (D.branches || []).filter((x: any) => brandOf(x.id) === b.id), lv = (L || []).filter(x => brandOf(x.id) === b.id);
    const n = sum(br, "n"), net = sum(br, "net");
    return { b, stores: stores.filter(s => s.brandId === b.id).length, n, net, avg: n ? net / n : 0, disc: sum(br, "disc"), act: sum(lv, "active"), amt: sum(lv, "amount") };
  }).sort((a, b) => b.net - a.net);
  const N = sum(list, "n"), NET = sum(list, "net");
  return (<>
    <Tiles items={[["Brands", n0(list.length)], ["Orders", n0(N)], ["Net Sales", money(NET)], ["Average Ticket", money(N ? NET / N : 0)]]} />
    {list.some(x => x.net) && <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card><h3 className="font-semibold text-gray-900 dark:text-gray-50">Share of net sales</h3>
        <DonutChart className="mx-auto mt-6 h-44" data={list.filter(x => x.net).map(x => ({ name: String(x.b.name), value: x.net }))} category="name" value="value" valueFormatter={money} showLabel label={money(NET)} /></Card>
      <Card className="lg:col-span-2"><h3 className="font-semibold text-gray-900 dark:text-gray-50">Orders and average ticket by brand</h3>
        <BarChart className="mt-6 h-52" data={list.map(x => ({ brand: String(x.b.name), Orders: x.n, "Active Orders": L ? x.act : 0 }))} index="brand" categories={["Orders", "Active Orders"]} colors={["blue", "amber"]} valueFormatter={n0} allowDecimals={false} /></Card>
    </div>}
    <StatTable title="Brands Statistics" empty="No brands yet."
      cols={[["Brand"], ["Stores", true], ["Orders", true], ["Net Sales", true], ["Average Ticket", true], ["Discounts", true], ["Active Orders", true], ["Active Orders Amount", true]]}
      rows={list.map(x => [x.b.name, n0(x.stores), n0(x.n), money(x.net), money(x.avg), money(x.disc), L ? n0(x.act) : "…", L ? money(x.amt) : "…"])}
      onRow={i => openWin("/brand?id=" + list[i].b.id)} />
  </>);
}

/** Stores: live active orders, tables, cashiers and tills of each store */
export function StoresTab({ L, stores }: { L: any[] | null; stores: Row[] }) {
  if (!L) return <p className="text-sm text-gray-500">Loading live numbers…</p>;
  const rows = L.map(x => ({ x, s: stores.find(s => s.id === x.id) })).filter(r => r.s).sort((a, b) => b.x.active - a.x.active || String(a.s!.name).localeCompare(String(b.s!.name)));
  const ls = rows.map(r => r.x);
  return (<>
    <Tiles items={[["Active Orders Count", n0(sum(ls, "active"))], ["Active Orders Amount", money(sum(ls, "amount"))], ["Occupied Tables", n0(sum(ls, "tables"))], ["Offline Cashiers", n0(sum(ls, "offline"))]]} />
    <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card><h3 className="font-semibold text-gray-900 dark:text-gray-50">Cashiers online</h3><p className="text-sm text-gray-500">One block per store</p>
        <Tracker className="mt-6" hoverEffect data={rows.map(({ x, s }) => ({ key: String(s!.id), color: !x.cashiers ? "bg-gray-300 dark:bg-gray-700" : x.offline ? (x.offline >= x.cashiers ? "bg-red-500" : "bg-amber-500") : "bg-emerald-500", tooltip: `${s!.name}: ${x.cashiers - x.offline}/${x.cashiers} online` }))} />
        <div className="mt-3 flex flex-wrap gap-2"><Badge variant="success">All online</Badge><Badge variant="warning">Some offline</Badge><Badge variant="error">All offline</Badge></div></Card>
      <Card className="lg:col-span-2"><h3 className="font-semibold text-gray-900 dark:text-gray-50">Active orders by store</h3>
        <BarChart className="mt-6 h-52" data={rows.map(({ x, s }) => ({ store: String(s!.name), "Active Orders": +x.active, Tables: +x.tables }))} index="store" categories={["Active Orders", "Tables"]} colors={["blue", "violet"]} valueFormatter={n0} allowDecimals={false} /></Card>
    </div>
    <StatTable title="Stores Statistics" empty="No stores yet."
      cols={[["Store"], ["Active Orders", true], ["Active Orders Amount", true], ["Occupied Tables", true], ["Offline Cashiers", true], ["Open Tills", true], ["Last Sync"], ["Last Order"]]}
      rows={rows.map(({ x, s }) => [<>{s!.name}{s!.reference ? <span className="ms-1 text-gray-500">({s!.reference})</span> : null}</>, n0(x.active), money(x.amount), n0(x.tables), `${n0(x.offline)}/${n0(x.cashiers)}`, n0(x.tills), dt(x.sync), dt(x.last)])}
      onRow={i => openWin("/store?id=" + rows[i].s!.id)} />
  </>);
}

// the inventory document page of a document
const docRoute = (d: Row) => d.kind === "purchase" ? (d.reason === "po" ? "po" : "purchase-orders") : d.kind === "torder" ? "transfer-orders" : d.kind === "transfer" ? "transfers"
  : d.kind === "quantity" ? "quantity-adjustments" : d.kind === "cost" ? "cost-adjustments" : d.kind === "spot" ? (d.reason === "count" ? "inventory-count" : "spot-check") : d.kind === "production" ? "production" : "";
const KIND: Record<string, string> = { po: "Purchase Order", "purchase-orders": "Purchasing", "transfer-orders": "Transfer Order", transfers: "Transfer", "quantity-adjustments": "Quantity Adjustment", "cost-adjustments": "Cost Adjustment", "inventory-count": "Inventory Count", "spot-check": "Spot Check", production: "Production" };

/** Inventory: pending documents, stock below its minimum, and the period's most wasted and consumed items */
export function InventoryTab({ locIds, from, to }: { locIds: string[] | null; from: string; to: string }) {
  const docs = (useCol("inv_docs") || []).filter(live), items = useCol("inv_items") || [], stores = useCol("branches") || [], whs = useCol("warehouses") || [];
  const [stock, setStock] = useState<any[] | null>(null), [hist, setHist] = useState<any[] | null>(null);
  useEffect(() => { void sb.rpc("skwyd_stock_all").then(({ data }) => setStock(data || [])); }, []);
  useEffect(() => { setHist(null); void sb.rpc("skwyd_inv_history", { p_from: from + "T00:00:00", p_to: to + "T23:59:59.999", p_loc: null, p_item: null }).then(({ data }) => setHist(data || [])); }, [from, to]);
  const has = (id?: string) => !locIds || (!!id && locIds.includes(id)), locName = (id?: string) => stores.find(s => s.id === id)?.name || whs.find(w => w.id === id)?.name || "—";
  const inPer = (d: Row) => { const t = String(d.receivedAt || d.submittedAt || d.createdAt || "").slice(0, 10); return t >= from && t <= to; };
  const mine = docs.filter(d => has(d.locationId) || has(d.destId)), uc = unitCost(items), itemOf = (id: string) => items.find(i => i.id === id);
  const pending = mine.filter(d => d.status === "pending" && docRoute(d)).sort((a, b) => String(b.submittedAt || b.createdAt).localeCompare(String(a.submittedAt || a.createdAt)));
  const low = (stock || []).filter(r => has(r.location_id)).map(r => ({ r, it: itemOf(r.item_id) })).filter(({ r, it }) => it && live(it) && +it.minLevel > 0 && +r.qty < +it.minLevel);
  const top = (type: string) => { const m = new Map<string, number>(); (hist || []).filter(r => has(r.branch_id) && moveType(r) === type).forEach(r => m.set(r.item_id, (m.get(r.item_id) || 0) + Math.abs(+r.delta || 0) * (+uc(itemOf(r.item_id)) || 0)));
    return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => ({ name: String(itemOf(id)?.name || "—"), value: v })); };
  const wasted = top("Waste"), used = top("Sale");
  return (<>
    <Tiles items={[["Pending Purchase Orders", n0(mine.filter(d => d.kind === "purchase" && d.reason === "po" && d.status === "pending").length)],
      ["Completed Transfers", n0(mine.filter(d => d.kind === "transfer" && d.status === "closed" && inPer(d)).length)],
      ["Purchasing", n0(mine.filter(d => d.kind === "purchase" && d.reason !== "po" && d.status === "closed" && inPer(d)).length)]]} />
    {pending.length > 0 && <Callout className="mt-8" title={`${pending.length} transaction${pending.length > 1 ? "s are" : " is"} waiting`} variant="warning">Open one below to review and submit or receive it.</Callout>}
    <StatTable title="Pending Transactions" empty="No transactions are waiting." cols={[["Location"], ["Reference"], ["Type"], ["Date"]]}
      rows={pending.slice(0, 50).map(d => [locName(d.locationId), d.ref || "—", KIND[docRoute(d)] || "", dt(d.submittedAt || d.createdAt)])}
      onRow={i => openWin(`/${docRoute(pending[i])}?id=${pending[i].id}`)} />
    <StatTable title="Items Reached Low Level" empty={stock ? "Set a minimum level for your inventory items to know when they're low in stock." : "Loading stock…"}
      cols={[["Item"], ["Location"], ["Quantity", true], ["Minimum", true]]}
      rows={low.slice(0, 50).map(({ r, it }) => [it!.name, locName(r.location_id), `${(+r.qty).toLocaleString()} ${it!.storageUnit || ""}`, `${(+it!.minLevel).toLocaleString()} ${it!.storageUnit || ""}`])}
      onRow={i => openWin("/inv-item?id=" + low[i].it!.id)} />
    <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
      {([["Top Wasted Items by Cost", wasted, "Your most wasted items will appear here."], ["Top Consumed Items by Cost", used, "Your most consumed items will appear here."]] as const).map(([t, l, e]) => (
        <section key={t}><h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{t}</h2>
          <Card className="mt-4">{!hist ? <p className="text-sm text-gray-500">Loading…</p> : l.length ? <BarList data={[...l]} valueFormatter={(v: number) => money(v)} /> : <EmptyState text={e} />}</Card></section>))}
    </div>
  </>);
}

/** Call Center: the period's call center orders by agent and by store, and the live active ones */
export function CallCenterTab({ D, L, stores }: { D: any; L: any[] | null; stores: Row[] }) {
  const cc = D.callcenter || {}, agents = (cc.byAgent || []) as any[], byB = (cc.byBranch || []) as any[], st = cc.byStatus || {};
  const ids = [...new Set([...byB.map(b => b.id), ...(L || []).filter(x => +x.cc).map(x => x.id)])];
  const rows = ids.map(id => ({ s: stores.find(s => s.id === id), b: byB.find(x => x.id === id) || {}, a: +(L || []).find(x => x.id === id)?.cc || 0 })).filter(r => r.s).sort((a, b) => (+b.b.net || 0) - (+a.b.net || 0));
  const net = sum(agents, "net");
  return (<>
    <Tiles items={[["Active Orders", L ? n0(sum(L, "cc")) : "…"], ["Done Orders", n0(sum(agents, "n"))], ["Net Sales", money(net)], ["Declined Orders", n0(+st.declined || 0)]]} />
    {Object.keys(st).length > 0 && <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card><h3 className="font-semibold text-gray-900 dark:text-gray-50">Orders by status</h3>
        <DonutChart className="mx-auto mt-6 h-40" variant="pie" data={Object.entries(st).map(([k, v]) => ({ name: ({ closed: "Done", declined: "Declined", active: "Active", pending: "Pending", void: "Void", refund: "Returned" } as any)[k] || k, value: +(v as any) }))} category="name" value="value" valueFormatter={n0} colors={["emerald", "red", "blue", "amber", "gray", "violet"]} /></Card>
      <Card><h3 className="font-semibold text-gray-900 dark:text-gray-50">From call to done</h3><p className="text-sm text-gray-500">Taken, accepted and done</p>
        {(() => { const all = Object.values(st).reduce((a: number, b: any) => a + +b, 0) as number, dec = +st.declined || 0, pend = +st.pending || 0, done = +st.closed || 0;
          return <BarList className="mt-6" data={[{ name: "Taken", value: all }, { name: "Accepted", value: all - pend - dec }, { name: "Done", value: done }]} valueFormatter={(v: number) => `${n0(v)} · ${all ? Math.round(v / all * 100) : 0}%`} sortOrder="none" />; })()}</Card>
      <Card className="lg:col-span-2"><h3 className="font-semibold text-gray-900 dark:text-gray-50">Net sales by agent</h3>
        {agents.length ? <BarList className="mt-6" data={agents.map(a => ({ name: a.k === "-" ? "—" : String(a.k), value: +a.net || 0 }))} valueFormatter={money} /> : <EmptyState text="No agents yet." />}</Card>
    </div>}
    <StatTable title="Agents Performance" empty="No call center orders in this period." cols={[["Agent"], ["Orders", true], ["Net Sales", true], ["Average Order Price", true]]}
      rows={agents.map(a => [a.k === "-" ? "—" : a.k, n0(a.n), money(a.net), money(+a.n ? a.net / a.n : 0)])} />
    <StatTable title="Stores Statistics" empty="No call center orders in this period." cols={[["Store"], ["Active Orders", true], ["Done Orders", true], ["Net Sales", true]]}
      rows={rows.map(r => [r.s!.name, n0(r.a), n0(r.b.n), money(+r.b.net || 0)])} />
  </>);
}
