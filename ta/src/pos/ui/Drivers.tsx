"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// Delivery: pick the driver (they accept in the Driver app; only drivers clocked in at this store), and Drivers · Today with the cash each one still owes (Receive Cash).
import { Badge } from "@/components/tremor/Badge";
import { Button } from "@/components/tremor/Button";
import { Card } from "@/components/tremor/Card";
import { Table, TableBody, TableCell, TableRow } from "@/components/tremor/Table";
import { cx } from "@/components/tremor/utils";
import { useState } from "react";
import type { Row } from "../lib/db";
import { bizDate, isAdminUser, live, money, userPerms, type Ctx } from "../lib/pos";
import { useStore } from "../lib/store";
import { Full, Head } from "./Boards";
import { Sheet } from "./Pickers";

export const DRV_ST: Record<string, string> = { assigned: "waiting for the driver", accepted: "accepted", declined: "declined", picked: "on the way", delivered: "delivered" };
// drivers: this store's employees whose role has "Use Driver App" (or the job title Driver); if none, everyone working here
export function driverList(x: Ctx) {
  const here = x.S.users.filter(u => live(u) && u.active !== false && !isAdminUser(u) && (!(u.branchIds || []).length || u.branchIds.includes(x.device.branchId)));
  const d = here.filter(u => userPerms(x.S, u).includes("drv_app") || /driver|delivery|rider/i.test(u.jobTitle || "")); return (d.length ? d : here).sort((a, b) => String(a.name).localeCompare(b.name));
}
// clocked in at this store now (Time Clock: settings "timeclock".open[userId] = { at, branchId })
export const clockedIn = (x: Ctx, u: Row) => { const c = ((x.S.settings.find(y => y.id === "timeclock") || {}) as any).open?.[u.id]; return !!c && (!c.branchId || c.branchId === x.device.branchId); };
const owes = (o: Row) => o.type === "delivery" && o.driverId && o.status === "closed" && (o.payment?.type || o.payment?.method) === "cash" && !o.driverSettledAt;

export function DriverPick({ x, o, onDone }: { x: Ctx; o: Row; onDone: (msg?: string) => void }) {
  const { write } = useStore(), l = [...driverList(x)].sort((a, b) => +clockedIn(x, b) - +clockedIn(x, a));
  const set = (u: Row | null) => { const now = new Date().toISOString();
    write("orders", o.id, { driverId: u ? u.id : null, driverName: u ? u.name : null, driverStatus: u ? "assigned" : null, driverAssignedAt: u ? now : null, driverAcceptedAt: null, updatedAt: now });
    onDone(u ? `Sent to ${u.name} · waiting for them to accept` : "Driver removed"); };
  return (
    <Sheet title="Driver" width={640} onClose={() => onDone()} footer={o.driverId ? <Button variant="secondary" onClick={() => set(null)}>Remove Driver</Button> : undefined}>
      {!l.length ? <p className="text-sm text-gray-500">No employees at this store yet. Add drivers in the back office: Employee Management → Employees, with the job title Driver.</p> :
        <div className="grid grid-cols-3 gap-2.5">{l.map(u => { const on = o.driverId === u.id, ok = clockedIn(x, u); return (
          <Card key={u.id} asChild className={cx("p-3 text-left", on ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-500/10" : ok ? "hover:bg-gray-50 dark:hover:bg-gray-900" : "opacity-50")}>
            <button type="button" disabled={!ok} onClick={() => set(u)}><span className="block truncate font-semibold text-gray-900 dark:text-gray-50">{u.name}</span>
              <Badge variant={ok ? "success" : "neutral"} className="mt-1">{ok ? "Clocked in" : "Not clocked in"}</Badge></button></Card>); })}</div>}
    </Sheet>);
}

// in the menu's place on the register (the cart stays on the left), or full screen
const Wrap = ({ area, children }: { area?: { cartW: string }; children: React.ReactNode }) => area ? <div className="fixed inset-y-0 right-0 z-20 flex flex-col overflow-hidden rounded-s-[22px] bg-gray-50 dark:bg-gray-950" style={{ left: area.cartW }}>{children}</div> : <Full>{children}</Full>;
export function DriversDialog({ x, onOpen, onClose, area }: { x: Ctx; onOpen: (o: Row) => void; onClose: () => void; area?: { cartW: string } }) {
  const { write, cashier, device } = useStore(), [ask, setAsk] = useState<string | null>(null);
  const day = bizDate(x), mine = x.S.orders.filter(o => o.branchId === x.device.branchId && o.type === "delivery" && bizDate(x, o.createdAt) === day && !["void", "declined"].includes(o.status));
  const by: Record<string, { name: string; l: Row[] }> = {}; mine.filter(o => o.driverId).forEach(o => { (by[o.driverId] ||= { name: o.driverName, l: [] }).l.push(o); });
  driverList(x).forEach(u => { if (!by[u.id]) by[u.id] = { name: u.name, l: [] }; });
  const none = mine.filter(o => !o.driverId && o.status !== "closed"), tot = (l: Row[]) => l.reduce((s, o) => s + (+o.total || 0), 0);
  const receive = (id: string) => { const l = x.S.orders.filter(o => o.driverId === id && o.branchId === x.device.branchId && owes(o)), now = new Date().toISOString();
    l.forEach(o => write("orders", o.id, { driverSettledAt: now, driverSettledBy: cashier?.name || device!.name, updatedAt: now })); setAsk(null); };
  const lines = (l: Row[]) => !l.length ? <p className="py-3 text-sm text-gray-500">No orders yet.</p> : <Table><TableBody>{l.map(o =>
    <TableRow key={o.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900" onClick={() => onOpen(o)}>
      <TableCell className="font-semibold text-gray-900 dark:text-gray-50">{o.no || o.ref || "—"}</TableCell><TableCell className="max-w-40 truncate">{o.customerName || "—"}</TableCell>
      <TableCell><Badge variant={o.status === "closed" ? "success" : "default"}>{o.status === "closed" ? (o.driverSettledAt ? "Cash received" : "Delivered") : DRV_ST[o.driverStatus] || (o.dispatchedAt ? "Dispatched" : "Preparing")}</Badge></TableCell>
      <TableCell className="text-right font-medium text-gray-900 dark:text-gray-50">{money(x.S, o.total)}</TableCell></TableRow>)}</TableBody></Table>;
  return (
    <Wrap area={area}><Head title="Drivers · Today" back="Back" onClose={onClose} />
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        {[["Delivery orders", String(mine.length)], ["Total", money(x.S, tot(mine))], ["Without a driver", String(none.length)], ["Drivers", String(Object.keys(by).length)]].map(([l, v]) =>
          <Card key={l} className="p-4"><p className="text-sm text-gray-500">{l}</p><p className="text-xl font-semibold text-gray-900 dark:text-gray-50">{v}</p></Card>)}
      </div>
      <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4">
        {Object.entries(by).sort((a, b) => b[1].l.length - a[1].l.length || String(a[1].name).localeCompare(b[1].name)).map(([id, d]) => { const owe = d.l.filter(owes), amt = tot(owe);
          return <Card key={id} className="p-4">
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate font-semibold text-gray-900 dark:text-gray-50">{d.name} <span className="text-sm font-normal text-gray-500">· {d.l.length} order{d.l.length === 1 ? "" : "s"} · {money(x.S, tot(d.l))}</span></p>
              {owe.length ? (ask === id ? <><span className="text-sm text-gray-700 dark:text-gray-300">Receive {money(x.S, amt)}?</span><Button variant="secondary" onClick={() => setAsk(null)}>No</Button><Button onClick={() => receive(id)}>Receive</Button></>
                : <Button variant="secondary" onClick={() => setAsk(id)}>Receive Cash · {money(x.S, amt)}</Button>) : null}
            </div>
            {lines(d.l)}
          </Card>; })}
        {none.length ? <Card className="border-amber-300 p-4 dark:border-amber-700"><p className="font-semibold text-gray-900 dark:text-gray-50">Waiting for a driver</p>{lines(none)}</Card> : null}
      </div>
    </Wrap>);
}
