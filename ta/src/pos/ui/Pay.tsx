"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// Payment, split check, open / close till and end of day, from Tremor: dialogs, radio cards, tabs, buttons, a keypad.
import { Button } from "@/components/tremor/Button";
import { Callout } from "@/components/tremor/Callout";
import { Card } from "@/components/tremor/Card";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { cx } from "@/components/tremor/utils";
import { useEffect, useState } from "react";
import { bizDate, chg2, CUR2, DEC, due2, expectedCash, money, money2, newId, normPhone, num2, openDay, openShift, payMethods, phoneVariants, quickTender, shiftSales, type Ctx, type PayMethod } from "../lib/pos";
import { useStore } from "../lib/store";
import { Icon } from "./Icon";
import { NumPad, Sheet, Stepper } from "./Pickers";

const pad = (set: (f: (s: string) => string) => void) => (k: string) => set(s => k === "c" ? "" : k === "b" ? s.slice(0, -1) : k === "." ? (s.includes(".") ? s : (s || "0") + ".") : s.length > 10 ? s : s === "0" ? k : s + k);
const Stat = ({ l, v }: { l: string; v: string }) => <Card className="p-3"><p className="text-xs text-gray-500">{l}</p><p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{v}</p></Card>;

export type Paid = { method: string; type: string; methodId: string; tendered: number; change: number; tendered1?: number; tendered2?: number; currency2?: string; rate2?: number; decimals2?: number; haId?: string };
export function PayDialog({ x, total, onDone, title, onSplit, phone }: { x: Ctx; total: number; onDone: (p: Paid | null) => void; title?: string; onSplit?: () => void; phone?: string }) {
  const { sb } = useStore();
  // House Account: charged to the customer's account, paid later (the customer needs it enabled in the back office)
  const pms = [...payMethods(x), ...(String(phone || "").replace(/\D/g, "").length >= 6 ? [{ id: "house", name: "House Account", type: "house" }] : [])], [pm, setPm] = useState<PayMethod>(pms[0]), [busy, setBusy] = useState(false), c2 = CUR2(x.S);
  // cash can be given in the main currency, the second one, or both: one amount per currency, one pad for the one selected
  const [cur, setCur] = useState<1 | 2>(1), [v1, setV1] = useState(""), [v2, setV2] = useState(""), [touched, setTouched] = useState(false);
  const m = (n: number) => money(x.S, n), cash = pm.type === "cash";
  const [ha, setHa] = useState<{ id: string; name: string; balance: number; limit: number | null } | null | "none" | "err" | "load">(null);
  useEffect(() => { if (pm.type !== "house" || !sb) return; setHa("load"); (async () => {
    try { const ph = normPhone(String(phone)); const { data: l, error } = await sb.from("customers").select("id,name,house_account,house_limit").in("phone", phoneVariants(ph)).is("deleted_at", null).limit(1); if (error) throw error;
      const c = l?.[0]; if (!c || !c.house_account) return setHa("none");
      const { data: tx } = await sb.from("house_account_txns").select("kind,amount").eq("customer_id", c.id);
      setHa({ id: c.id, name: c.name, balance: +(tx || []).reduce((a: number, t: any) => a + (t.kind === "payment" ? +t.amount : -t.amount), 0).toFixed(2), limit: c.house_limit == null ? null : +c.house_limit });
    } catch { setHa("err"); } })(); }, [pm.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const haOk = pm.type !== "house" || (typeof ha === "object" && !!ha && !(ha.limit != null && ha.balance - total < -ha.limit - 0.001));
  const a1 = touched ? +v1 || 0 : (v2 ? 0 : total), a2 = c2 ? +v2 || 0 : 0, paid = a1 + (c2 && a2 ? a2 / c2.rate : 0);
  const short = cash && paid < total - 0.0005 && !(c2 && a2 && a2 >= due2(x.S, Math.max(0, total - a1)) - 1e-9), change = Math.max(0, paid - total);
  const key = (k: string) => { setTouched(true); pad(cur === 1 ? setV1 : setV2)(k); };
  const quick = cur === 2 && c2 ? [due2(x.S, total), ...quickTender(x.S, 2)] : [total, ...quickTender(x.S, 1)];
  const done = () => { if (short) return; setBusy(true);
    onDone({ method: pm.name, type: pm.type, methodId: pm.id, tendered: +(cash ? paid : total).toFixed(2), change: +(cash ? change : 0).toFixed(2),
      ...(cash && c2 && a2 ? { tendered1: a1, tendered2: a2, currency2: c2.code, rate2: c2.rate, decimals2: c2.dec } : {}), ...(pm.type === "house" && ha && typeof ha === "object" ? { haId: ha.id } : {}) }); };
  const box = (which: 1 | 2) => { const on = cur === which, v = which === 1 ? (touched ? v1 : v2 ? "" : String(total)) : v2;
    return <Card key={which} asChild className={cx("flex-1 p-3 text-left", on && "border-blue-500 ring-1 ring-blue-500 dark:border-blue-500")}><button type="button" onClick={() => setCur(which)}>
      <span className="block text-xs text-gray-500">{which === 1 ? "Main currency" : c2!.code}</span><span className="block text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">{v === "" ? "0" : which === 1 ? m(+v) : c2!.code + " " + num2(+v, c2!.dec)}</span></button></Card>; };
  return (
    <Sheet title={title || "Payment"} width={860} onClose={() => onDone(null)} footer={<>
      {onSplit ? <Button variant="secondary" className="h-11" onClick={onSplit}>Split Check</Button> : null}
      <span className="flex-1" />
      <Button variant="secondary" className="h-11" onClick={() => onDone(null)}>Cancel</Button>
      <Button className="h-11 px-6" disabled={busy || short || !haOk} onClick={done}>Complete Sale</Button></>}>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div><p className="text-sm text-gray-500">Amount due</p><p className="text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-50">{m(total)}</p>{money2(x.S, total) ? <p className="text-sm text-gray-500">≈ {money2(x.S, total)}</p> : null}</div>
          <div className="space-y-2" role="radiogroup" aria-label="Payment method">
            {pms.map(z => { const on = z.id === pm.id; return (
              <Card key={z.id} asChild className={cx("flex h-14 items-center gap-3 px-4 text-left", on ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-gray-900")}>
                <button type="button" role="radio" aria-checked={on} onClick={() => { setPm(z); setV1(""); setV2(""); setTouched(false); }}>
                  <Icon name={z.type === "cash" ? "till" : z.type === "card" ? "card" : z.type === "house" ? "user" : "more"} className={cx("size-5", on ? "text-blue-600 dark:text-blue-500" : "text-gray-400")} />
                  <span className={cx("font-medium", on ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-gray-50")}>{z.name}</span></button></Card>); })}
          </div>
        </div>
        <div className="space-y-3">
          {cash ? <>
            <p className="text-sm text-gray-500">Cash received</p>
            <div className="flex gap-2">{box(1)}{c2 ? box(2) : null}</div>
            {c2 ? <p className="text-xs text-gray-500">Due {cur === 2 ? c2.code + " " + num2(due2(x.S, total), c2.dec) + " ≈ " + m(total) : m(total) + " ≈ " + money2(x.S, total)}</p> : null}
            <div className="grid grid-cols-2 gap-2">{[...new Set(quick)].slice(0, 4).map((q, i) => <Button key={q} variant="secondary" className="text-sm"
              onClick={() => { setTouched(true); if (cur === 2) { setV2(String(q)); if (i === 0) setV1(""); } else { setV1(String(q)); if (i === 0) setV2(""); } }}>{i === 0 ? "Exact" : cur === 2 ? num2(q, c2!.dec) : m(q)}</Button>)}</div>
            <NumPad onKey={key} dot />
            <div className="flex items-start justify-between pt-1"><span className="font-medium text-gray-900 dark:text-gray-50">{short ? "Remaining" : "Change"}</span>
              <div className="text-right"><p className={cx("text-xl font-bold tabular-nums", short ? "text-red-600" : change ? "text-emerald-600" : "text-gray-900 dark:text-gray-50")}>{m(short ? total - paid : change)}</p>
                {c2 ? <p className="text-xs text-gray-500">= {c2.code} {num2(short ? due2(x.S, total - paid) : chg2(x.S, change), c2.dec)}</p> : null}</div></div>
          </> : pm.type === "house" ? (ha === "load" || !ha ? <Callout title="Checking the house account…" variant="neutral" />
              : ha === "none" ? <Callout title="No house account" variant="error">Enable it for this customer in the back office (Customers).</Callout>
              : ha === "err" ? <Callout title="Couldn't check the house account" variant="error">The house account needs a connection.</Callout>
              : <Callout title={`Charge to ${ha.name || "the customer"}'s house account`} variant={haOk ? "default" : "error"}>Balance {m(ha.balance)} → {m(ha.balance - total)}{ha.limit != null ? " · limit " + m(ha.limit) : ""}{!haOk ? ". Over the credit limit." : ""}</Callout>)
            : <Callout title="Take the payment on the card machine" variant="default">Then complete the sale.</Callout>}
        </div>
      </div>
    </Sheet>);
}

export function ChangeShown({ amount, title, money: m, second, onClose }: { amount: number; title: string; money: (n: number) => string; second?: string; onClose: () => void }) {
  return (
    <Sheet title={title} width={420} onClose={onClose} footer={<Button className="h-12 w-full text-base" onClick={onClose}>New Order</Button>}>
      <div className="flex flex-col items-center gap-1 py-4"><p className="text-sm text-gray-500">Change</p><p className="text-5xl font-bold tabular-nums text-emerald-600">{m(amount)}</p>{second ? <p className="text-lg text-gray-500">= {second}</p> : null}</div>
    </Sheet>);
}

// Split check (pos.html openSplit): equally between N, or by amount (the last part takes the rest). Each part is then paid on its own.
export function splitParts(total: number, dec: number, mode: "eq" | "amt", n: number, amts: number[]) {
  const r = (v: number) => +(+v).toFixed(dec);
  if (mode === "eq") { const a = Math.floor(total / n * Math.pow(10, dec)) / Math.pow(10, dec); return Array.from({ length: n }, (_, g) => (g < n - 1 ? a : r(total - a * (n - 1)))); }
  const out = Array.from({ length: n - 1 }, (_, g) => r(amts[g] || 0)); out.push(r(total - out.reduce((a, b) => a + b, 0))); return out;
}
export function SplitDialog({ x, total, cur, onDone }: { x: Ctx; total: number; cur: (n: number) => string; onDone: (parts: number[] | null) => void }) {
  const [mode, setMode] = useState<"eq" | "amt">("eq"), [n, setN] = useState(2), [amts, setAmts] = useState<string[]>([]), [sel, setSel] = useState(0);
  const parts = splitParts(total, DEC(x.S), mode, n, amts.map(v => +v || 0)), ok = parts.every(a => a > 0.004);
  const key = (k: string) => setAmts(l => { const c = [...l]; const s = c[sel] || ""; c[sel] = k === "c" ? "" : k === "b" ? s.slice(0, -1) : k === "." ? (s.includes(".") ? s : (s || "0") + ".") : s.length > 8 ? s : s === "0" ? k : s + k; return c; });
  return (
    <Sheet title="Split Check" width={620} onClose={() => onDone(null)} footer={<><Button variant="secondary" onClick={() => onDone(null)}>Cancel</Button><Button disabled={!ok} onClick={() => onDone(parts)}>Pay Parts</Button></>}>
      <div className="space-y-4">
        <Tabs value={mode} onValueChange={v => setMode(v as any)}><TabsList variant="solid" className="w-full"><TabsTrigger value="eq" className="flex-1">Equally</TabsTrigger><TabsTrigger value="amt" className="flex-1">By amount</TabsTrigger></TabsList></Tabs>
        <div className="flex items-center justify-between"><span className="font-medium text-gray-900 dark:text-gray-50">Parts</span>
          <Stepper n={n} onLess={() => { setN(v => v - 1); setSel(0); }} onMore={() => setN(v => Math.min(10, v + 1))} lessOff={n <= 2} /></div>
        <div className="grid grid-cols-3 gap-2">{parts.map((a, g) => { const ed = mode === "amt" && g < n - 1, on = ed && sel === g; return (
          <Card key={g} asChild className={cx("p-3 text-left", on && "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-500/10", a < 0 && "border-red-500")}>
            <button type="button" disabled={!ed} onClick={() => setSel(g)}><span className="block text-xs text-gray-500">Part {g + 1}{mode === "amt" && g === n - 1 ? " · rest" : ""}</span>
              <span className={cx("block font-semibold tabular-nums", a < 0 ? "text-red-600" : "text-gray-900 dark:text-gray-50")}>{cur(a)}</span></button></Card>); })}</div>
        {mode === "amt" ? <NumPad onKey={key} dot /> : null}
      </div>
    </Sheet>);
}

// Open Till (opening cash) and Close Till (expected cash, counted cash, difference), as in pos.html.
export function TillDialog({ x, onDone }: { x: Ctx; onDone: (msg?: string) => void }) {
  const { write, cashier, device } = useStore();
  const sh = openShift(x), [v, setV] = useState("");
  const cur = (n: number) => money(x.S, n), now = () => new Date().toISOString();
  const open = () => { write("shifts", newId("sh"), { deviceId: device!.id, branchId: device!.branchId, cashier: cashier?.name || device!.name, openingCash: +(+v || 0).toFixed(2), openedAt: now() }, "set"); onDone("Till opened"); };
  const close = () => {
    const sales = shiftSales(x, sh!), exp = +expectedCash(x, sh!).toFixed(2), counted = v === "" ? exp : +(+v).toFixed(2);
    write("shifts", sh!.id, { closedAt: now(), orders: sales.filter(o => o.status === "closed").length, sales: +sales.reduce((a, o) => a + (+o.total || 0), 0).toFixed(2), expectedCash: exp, countedCash: counted, difference: +(counted - exp).toFixed(2) });
    onDone(Math.abs(counted - exp) < 0.01 ? "Till closed · drawer balanced" : "Till closed · difference " + cur(counted - exp));
  };
  const sales = sh ? shiftSales(x, sh) : [];
  return (
    <Sheet title={sh ? "Close Till" : "Open Till"} width={380} onClose={() => onDone()} footer={<><Button variant="secondary" onClick={() => onDone()}>Cancel</Button><Button onClick={sh ? close : open}>{sh ? "Close Till" : "Open Till"}</Button></>}>
      {/* one centred column: (the shift's figures,) the amount, the keypad */}
      <div className="mx-auto w-full max-w-[380px] space-y-3">
        <div className="space-y-3">
          {sh ? <>
            <p className="text-sm text-gray-500">Opened by {sh.cashier || "—"} at {new Date(sh.openedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
            <div className="grid grid-cols-2 gap-2">
              {[["Orders", String(sales.filter(o => o.status === "closed").length)], ["Net sales", cur(sales.reduce((a, o) => a + (+o.total || 0) - (+o.tax || 0), 0))], ["Opening cash", cur(+sh.openingCash || 0)], ["Expected cash", cur(expectedCash(x, sh))]].map(([l, r]) => <Stat key={l} l={l} v={r} />)}
            </div>
            <p className="pt-2 text-sm text-gray-500">Count the cash in the drawer</p>
          </> : <p className="text-center text-[15px] text-gray-500">Enter the till amount</p>}
          <div className="flex h-20 items-center justify-center rounded-2xl border-2 border-blue-500 text-4xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">{v === "" ? (sh ? cur(expectedCash(x, sh)) : cur(0)) : cur(+v)}</div>
        </div>
        <NumPad onKey={pad(setV)} dot />
      </div>
    </Sheet>);
}

// End of day (pos.html openDayEnd / doDayEnd): one per store per business day, after every till is closed. Active orders carry on into the next day.
const fmtDay = (d: string) => d.split("-").reverse().join("-");
export function endDayBlock(x: Ctx) {
  const shifts = x.S.shifts.filter(s => s.branchId === x.device.branchId && !s.closedAt);
  if (shifts.length) return shifts.length === 1 ? "Till still open. Close it before ending the day" : shifts.length + " tills still open. Close them before ending the day";
  return "";
}
export function EndDayDialog({ x, onDone }: { x: Ctx; onDone: (msg?: string) => void }) {
  const { write, cashier, device, branch } = useStore();
  const day = openDay(x), sales = x.S.orders.filter(o => o.branchId === x.device.branchId && (o.status === "closed" || o.status === "refund") && bizDate(x, o.status === "closed" ? o.closedAt || o.createdAt : o.createdAt) === day);
  const act = x.S.orders.filter(o => o.branchId === x.device.branchId && ["pending", "active"].includes(o.status)).length;
  const end = () => {
    write("day_closes", "dc_" + device!.branchId + "_" + day, { branchId: device!.branchId, businessDate: day, closedAt: new Date().toISOString(), closedBy: cashier?.name || device!.name, deviceId: device!.id, orders: sales.length, sales: +sales.reduce((a, o) => a + (+o.total || 0), 0).toFixed(2) }, "set");
    onDone("Day ended · " + fmtDay(day));
  };
  return (
    <Sheet title={"End day · " + fmtDay(day)} width={540} onClose={() => onDone()} footer={<><Button variant="secondary" onClick={() => onDone()}>Cancel</Button><Button onClick={end}>End day</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[["Orders", String(sales.length)], ["Net sales", money(x.S, sales.reduce((a, o) => a + (+o.total || 0) - (+o.tax || 0), 0))], ["Payments", money(x.S, sales.reduce((a, o) => a + (+o.total || 0), 0))]].map(([l, v]) => <Stat key={l} l={l} v={v} />)}
        </div>
        <p className="text-sm text-gray-500">Ending the day closes {fmtDay(day)} for {branch?.name || "this store"}. Every device at the store then starts the next business day.</p>
        {act ? <Callout title={act === 1 ? "1 order is still active" : act + " orders are still active"} variant="warning">{act === 1 ? "It stays open and counts in the next day's report when it's closed." : "They stay open and count in the next day's report when they're closed."}</Callout> : null}
      </div>
    </Sheet>);
}
