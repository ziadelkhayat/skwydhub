"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// Manager approval (PIN), Void / Return, Reports and Devices (printers), from Tremor.
import { Badge } from "@/components/tremor/Badge";
import { Button } from "@/components/tremor/Button";
import { Callout } from "@/components/tremor/Callout";
import { Card } from "@/components/tremor/Card";
import { Checkbox } from "@/components/tremor/Checkbox";
import { Input } from "@/components/tremor/Input";
import { Label } from "@/components/tremor/Label";
import { RadioCardGroup, RadioCardItem } from "@/components/tremor/RadioCardGroup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/tremor/Select";
import { Switch } from "@/components/tremor/Switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/tremor/Table";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { useState } from "react";
import type { Row } from "../lib/db";
import { afterVoid, bizDate, isAdminUser, lineNet, live, money, openShift, pinUser, refundOf, retLeft, userPerms, vrReasons, type Ctx } from "../lib/pos";
import { appSet, printers, printJob, type Printer } from "../lib/print";
import { useStore } from "../lib/store";
import { Dots, Keypad } from "./Keypad";
import { Sheet, Stepper } from "./Pickers";
import { Main, Panel, Seg } from "./Touch";

// a manager whose role allows this, or an owner/admin, types their PIN
export function Approve({ title, perm, S, onDone }: { title: string; perm: string; S: any; onDone: (u: Row | null) => void }) {
  const [pin, setPin] = useState(""), [err, setErr] = useState("");
  const press = async (k: string) => {
    const next = k === "c" ? "" : k === "b" ? pin.slice(0, -1) : pin.length < 5 ? pin + k : pin; setPin(next); setErr("");
    if (next.length < 4) return;
    const u = await pinUser(S.users.filter((x: Row) => live(x) && x.active !== false && x.pinHash), next);
    if (!u) { if (next.length === 5) { setPin(""); setErr("Wrong PIN. Try again."); } return; }
    setPin(""); if (isAdminUser(u) || userPerms(S, u).includes(perm)) onDone(u); else setErr(`${u.name}'s role can't approve this.`);
  };
  return (
    <Sheet title={title} width={400} onClose={() => onDone(null)}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-center text-sm text-gray-500">A manager whose role allows this, or an admin, types their PIN.</p>
        <Dots n={pin.length} /><p className="min-h-5 text-sm text-red-600 dark:text-red-500">{err}</p><Keypad onKey={press} />
      </div>
    </Sheet>);
}

// Void an open order (or some of its items) or return a done one: the reason, where the food goes, then a manager's PIN.
// A return is a new refund ticket today, so an ended day never changes. Needs the connection (stock is moved on the server).
// on the register (sel given): the whole check by default; tapping items in the cart picks them (their quantities are changed here)
export function VoidReturnDialog({ x, o, onDone, area, sel, setSel }: { x: Ctx; o: Row; onDone: (msg?: string) => void; area?: { cartW: string }; sel?: number[]; setSel?: (f: (q: number[]) => number[]) => void }) {
  const { S, write, sb, cashier, device, branch, online } = useStore();
  const kind: "void" | "return" = o.status === "closed" ? "return" : "void", a = appSet(S, branch?.brandId), reasons = vrReasons(a);
  const max: number[] = (o.items || []).map((i: any, ix: number) => (kind === "return" ? retLeft(o, ix) : +i.qty));
  const [mode0, setMode] = useState<"all" | "items">("all"), [qs0, setQs0] = useState<number[]>(max.map(() => 0));
  const qs = sel ? max.map((_, i) => Math.min(max[i], sel[i] || 0)) : qs0, setQs = setSel || setQs0, mode = sel ? (qs.some(q => q > 0) ? "items" : "all") : mode0;
  const [reason, setReason] = useState(""), [other, setOther] = useState(""), [stock, setStock] = useState<"stock" | "waste">(a.stockAction === "waste" ? "waste" : "stock"), [err, setErr] = useState(""), [appr, setAppr] = useState(false);
  const picked = mode === "all" ? max : qs, why = reason === "_other" ? other.trim() : reason;
  const go = () => {
    if (a.reasonRequired !== false && !why) return setErr("Pick a reason.");
    if (!picked.some(q => q > 0)) return setErr("Pick at least one item.");
    if (kind === "return" && !openShift(x)) return setErr("Open the till first: the refund is paid from this register.");
    if (!online) return setErr("Voids and returns need the internet connection.");
    setAppr(true);
  };
  const save = async (ok: Row) => {
    const now = new Date().toISOString(), by = cashier?.name || device!.name, st = a.stockAction === "ask" || !a.stockAction ? stock : a.stockAction;
    const idx: number[] = [], chosen = (o.items || []).map((i: any, ix: number) => { const q = picked[ix] || 0; if (q > 0) idx.push(ix); return { ...i, qty: q, ...(+i.disc ? { disc: +(i.disc * q / i.qty).toFixed(2) } : {}) }; }).filter((i: any) => i.qty > 0);
    const full = (o.items || []).every((_: any, ix: number) => (picked[ix] || 0) >= max[ix]);
    if (kind === "void") {
      write("orders", o.id, full ? { status: "void", voidReason: why, voidedAt: now, voidedBy: by, updatedAt: now, approvedBy: ok.name, stockAction: st }
        : { ...afterVoid(x, o, picked), updatedAt: now, approvedBy: ok.name, stockAction: st, voidedItems: [...(o.voidedItems || []), ...chosen.map((c: any) => ({ ...c, reason: why, stock: st, voidedAt: now, voidedBy: by, approvedBy: ok.name }))] });
    } else {
      const gross = (o.items || []).reduce((s: number, i: any) => s + (+i.price || 0) * (+i.qty || 1) - (+i.disc || 0), 0), share = gross ? (+o.total || 0) / gross : 1, dshare = gross ? 1 - Math.min(+o.discount || 0, gross) / gross : 1;
      const ret = chosen.map((c: any, k: number) => { const orig = o.items[idx[k]] || c, unit = ((+orig.price || 0) * (+orig.qty || 1) - (+orig.disc || 0)) / (+orig.qty || 1);
        return { ...c, ix: idx[k], refund: +(unit * c.qty * share).toFixed(2), reason: why, stock: st, returnedAt: now, returnedBy: by, approvedBy: ok.name }; });
      const refund = refundOf(o, picked), rgross = ret.reduce((s: number, r: any) => s + (+r.price || 0) * (+r.qty || 1) - (+r.disc || 0), 0), rdisc = +(rgross * (1 - dshare)).toFixed(2);
      write("orders", "ref_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), { channel: o.channel, source: o.source, type: o.type, status: "refund", refundOf: o.id, brandId: o.brandId || branch?.brandId || null, branchId: device!.branchId, deviceId: device!.id,
        shiftId: openShift(x)?.id || null, agent: by, customerName: o.customerName || "", phone: o.phone || "", items: ret.map(({ ix: _i, refund: _r, returnedAt: _a, returnedBy: _b, approvedBy: _p, reason: _w, stock: _s, ...it }: any) => it),
        subtotal: -(+rgross.toFixed(2)), discount: -rdisc, total: -refund, tax: -(+((+o.tax || 0) * (o.total ? refund / o.total : 0)).toFixed(2)),
        payment: { method: o.payment?.method || "Cash", type: o.payment?.type || "cash", methodId: o.payment?.methodId || null, tendered: -refund, change: 0 },
        returnReason: why, stockAction: st, approvedBy: ok.name, returnedBy: by, invoiceRef: o.invoiceNo || null, createdAt: now, updatedAt: now }, "set");
      write("orders", o.id, { updatedAt: now, returnedItems: [...(o.returnedItems || []), ...ret], refundTotal: +((+o.refundTotal || 0) + refund).toFixed(2) });
    }
    // stock: a void before the sale used the food → waste takes it out; a return → back to stock puts it back
    const mv = kind === "void" ? (st === "waste" ? "waste" : null) : (st === "stock" ? "restock" : null);
    if (mv && sb) { const r = await sb.rpc("skwyd_stock_items", { p_order: o.id, p_items: chosen, p_mode: mv }); if (r.error) console.warn("stock", r.error); }
    onDone(kind === "void" ? `Voided · approved by ${ok.name}` : `Refund ticket created · ${money(S, refundOf(o, picked))} · approved by ${ok.name}`);
  };
  if (appr) return <Approve title={kind === "void" ? "Approve void" : "Approve return"} perm={kind === "void" ? "pos_void" : "pos_return"} S={S} onDone={u => (u ? void save(u) : setAppr(false))} />;
  const title = (kind === "void" ? "Void " : "Return ") + (mode === "items" ? "items" : "order");
  // on the register the title says what goes: the whole order, or each picked item with its quantity
  const pickedIx = qs.map((q, i) => (q > 0 ? i : -1)).filter(i => i >= 0);
  const what = mode === "all" ? "Whole order" : pickedIx.length === 1 ? o.items[pickedIx[0]].name : pickedIx.length + " items";
  const head = <span className="flex min-w-0 items-center gap-2">{kind === "void" ? "Void" : "Return"} · <span className="truncate text-blue-700 dark:text-blue-400">{what}</span></span>;
  const body = (
    <>
      <div className="space-y-5 text-[16px]">
        {err && area ? <p className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{err}</p> : null}
        {sel ? null
          : <Seg value={mode} onChange={setMode} items={[["all", "Whole order"], ["items", "Choose items"]]} />}
        {mode === "all" ? sel ? (kind === "return" ? <p className="text-lg text-gray-700 dark:text-gray-300">Refund {money(S, refundOf(o, max))}</p> : null) : <p className="text-sm text-gray-700 dark:text-gray-300">{kind === "void" ? "The whole order will be voided and removed from sales." : `The whole order will be returned and ${money(S, refundOf(o, max))} refunded.`}</p> :
          <div><Table><TableBody>{(o.items || []).map((i: any, ix: number) => sel && !qs[ix] ? null : (
            <TableRow key={ix}><TableCell><p className="font-medium text-gray-900 dark:text-gray-50">{i.name}</p>{i.mods ? <p className="text-xs">{i.mods}</p> : null}</TableCell>
              <TableCell className="text-right"><div className="inline-flex"><Stepper n={qs[ix]} lessOff={!qs[ix]} onLess={() => setQs(q => q.map((v, j) => (j === ix ? Math.max(0, v - 1) : v)))} onMore={() => setQs(q => q.map((v, j) => (j === ix ? Math.min(max[ix], v + 1) : v)))} /></div></TableCell></TableRow>))}</TableBody></Table>
            {kind === "return" ? <div className="flex justify-between pt-3"><span className="font-medium text-gray-900 dark:text-gray-50">Refund</span><span className="font-bold text-gray-900 dark:text-gray-50">{money(S, refundOf(o, qs))}</span></div> : null}</div>}
        <div className="space-y-2"><Label>Reason{a.reasonRequired !== false ? " *" : ""}</Label>
          <RadioCardGroup value={reason} onValueChange={setReason} className="grid-cols-3">{[...reasons, "_other"].map(r => <RadioCardItem key={r} value={r} className="py-4 text-[16px] font-medium">{r === "_other" ? "Other…" : r}</RadioCardItem>)}</RadioCardGroup>
          {reason === "_other" ? <Input autoFocus value={other} onChange={e => setOther(e.target.value)} placeholder="Write the reason" aria-label="Reason" /> : null}
        </div>
        {a.stockAction === "ask" || !a.stockAction ? <RadioCardGroup value={stock} onValueChange={v => setStock(v as any)} className="grid-cols-2">
          <RadioCardItem value="stock" className="py-4 text-[16px] font-medium">Return to stock</RadioCardItem><RadioCardItem value="waste" className="py-4 text-[16px] font-medium">Waste</RadioCardItem></RadioCardGroup>
          : <p className="text-sm text-gray-500">Items go {a.stockAction === "waste" ? "to waste" : "back to stock"}.</p>}
      </div>
    </>);
  const lineAmt = (ix: number, q: number) => { const i = o.items[ix]; return (+i.price || 0) * q - (+i.disc || 0) * (q / (+i.qty || 1)); };
  const shown = mode === "all" ? max.map((m, i) => (m > 0 ? i : -1)).filter(i => i >= 0) : pickedIx;
  const amt = kind === "return" ? refundOf(o, picked) : shown.reduce((a2, ix) => a2 + lineAmt(ix, picked[ix]), 0);
  const regBody = (
    <div className="flex h-full gap-6">
      <div className="flex min-w-0 flex-1 flex-col">
        {err ? <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{err}</p> : null}
          {a.stockAction === "ask" || !a.stockAction ? <div className="mb-3"><Seg value={stock} onChange={setStock} items={[["stock", "To stock"], ["waste", "Waste"]]} /></div> : <p className="mb-3 text-sm text-gray-500">Items go {a.stockAction === "waste" ? "to waste" : "back to stock"}.</p>}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">{mode === "all" ? null : shown.map(ix => { const i = o.items[ix];
          return <div key={ix} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
            <span className="min-w-0 flex-1"><span className="block truncate text-[17px] font-medium text-gray-900 dark:text-gray-50">{i.name}</span>{i.mods ? <span className="block truncate text-sm text-gray-500">{i.mods}</span> : null}</span>
            {mode === "items" ? <Stepper n={qs[ix]} lessOff={qs[ix] <= 1} onLess={() => setQs(q => q.map((v, j) => (j === ix ? Math.max(1, v - 1) : v)))} onMore={() => setQs(q => q.map((v, j) => (j === ix ? Math.min(max[ix], v + 1) : v)))} /> : null}
            <span className="w-20 text-right text-[17px] font-semibold tabular-nums text-gray-900 dark:text-gray-50">{money(S, lineAmt(ix, picked[ix]))}</span>
          </div>; })}</div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-red-50 px-5 py-4 text-lg dark:bg-red-500/10"><span className="text-gray-700 dark:text-gray-300">{kind === "return" ? "Return" : "Void"}</span>
          <b className="tabular-nums text-red-700 dark:text-red-400">{money(S, amt)}</b></div>
      </div>
      <div className="w-[330px] shrink-0 space-y-3 overflow-y-auto">
        <Select value={reason} onValueChange={setReason}><SelectTrigger aria-label="Reason"><SelectValue placeholder={"Reason" + (a.reasonRequired !== false ? " *" : "")} /></SelectTrigger>
          <SelectContent>{[...reasons, "_other"].map(r => <SelectItem key={r} value={r} className="py-3 text-[17px]">{r === "_other" ? "Other…" : r}</SelectItem>)}</SelectContent></Select>
        {reason === "_other" ? <Input autoFocus value={other} onChange={e => setOther(e.target.value)} placeholder="Write the reason" aria-label="Reason" /> : null}
      </div>
    </div>);
  return area
    ? <Panel area={area} cartOpen={!!sel} className={sel ? "flex flex-col" : undefined} title={sel ? head : title} onClose={() => onDone()} action={<Main variant="destructive" onClick={go}>{kind === "void" ? "Void" : "Return"}</Main>}>{sel ? regBody : body}</Panel>
    : <Sheet title={title} width={660} onClose={() => onDone()} footer={<><span className="flex-1 text-sm text-red-600 dark:text-red-500">{err}</span><Button variant="secondary" onClick={() => onDone()}>Cancel</Button><Button variant="destructive" onClick={go}>{kind === "void" ? "Void" : "Return"}</Button></>}>{body}</Sheet>;
}

// Functions → Reports: this shift, today on this register, or today at the whole store. Shown like an 80 mm receipt, and printed on the receipt printer.
type RP = "shift" | "device" | "branch";
const RP_L: Record<RP, string> = { shift: "This shift", device: "Today · this register", branch: "Today · whole store" };
const TYP: Record<string, string> = { dinein: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery" };
function reportText(x: Ctx, rp: RP, branchName: string) {
  const S = x.S, today = bizDate(x), dev = x.device, sh = openShift(x) || [...S.shifts].filter(s => s.deviceId === dev.id).sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt)))[0];
  const inScope = (o: Row) => o.branchId === dev.branchId && (rp === "shift" ? !!sh && o.shiftId === sh.id : bizDate(x, o.createdAt) === today && (rp === "branch" || o.deviceId === dev.id));
  const all = S.orders.filter(inScope), sales = all.filter(o => o.status === "closed"), refunds = all.filter(o => o.status === "refund");
  const voids = S.orders.filter(o => o.branchId === dev.branchId && o.status === "void" && (rp === "shift" ? !!sh && o.shiftId === sh.id : bizDate(x, o.voidedAt || o.updatedAt || o.createdAt) === today && (rp === "branch" || o.deviceId === dev.id)));
  const sum = (l: Row[], f: (o: Row) => any) => +l.reduce((s, o) => s + (+f(o) || 0), 0).toFixed(2);
  const grp = (l: any[], key: (o: any) => string, val: (o: any) => number, cnt: (o: any) => number = () => 1) => { const m = new Map<string, { n: number; v: number }>(); l.forEach(o => { const k = key(o) || "—", c = m.get(k) || { n: 0, v: 0 }; c.n += cnt(o); c.v += +val(o) || 0; m.set(k, c); }); return [...m.entries()].sort((a, b) => b[1].v - a[1].v); };
  const items = sales.flatMap(o => o.items || []), catOf = (i: any) => S.categories.find(c => c.id === S.products.find(p => p.id === i.productId)?.categoryId)?.name || "Other";
  const gross = sum(sales, o => o.total), ref = -sum(refunds, o => o.total), W = 32;
  const row = (a: string, b: string, n?: number) => { const mid = n != null ? String(n).padStart(4) + " " : ""; return (a.slice(0, W - b.length - mid.length - 1)).padEnd(W - b.length - mid.length) + mid + b; };
  const ctr = (t: string) => t.slice(0, W).padStart((W + Math.min(W, t.length)) / 2), m = (n: number) => n.toFixed(2);
  const sec = (h: string, rows: [string, { n: number; v: number }][]) => ["", h.toUpperCase(), "-".repeat(W), ...(rows.length ? rows.map(([k, c]) => row(k, m(c.v), c.n)) : ["Nothing yet"])];
  const dt = (d: Date | string) => { const z = new Date(d); return z.toLocaleDateString("en-GB").replace(/\//g, "-") + " " + z.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };
  const head = rp === "shift" ? (sh ? `Shift ${dt(sh.openedAt)}${sh.cashier ? " · " + sh.cashier : ""}${sh.closedAt ? " · closed" : " · open"}` : "The till hasn't been opened on this register yet.") : "Business date " + today.split("-").reverse().join("-");
  return [ctr(branchName), ctr("Report · " + RP_L[rp]), ctr(dev.name || ""), head, "Printed " + dt(new Date()), "", "SUMMARY", "-".repeat(W),
    row("Orders", String(sales.length)), row("Gross sales", m(gross)), row("Returns", m(-ref)), row("Net sales (after returns)", m(gross - ref)), row("Tax", m(sum(sales, o => o.tax) + sum(refunds, o => o.tax))),
    row("Discounts", m(sum(sales, o => o.discount))), row("Charges", m(sum(sales, o => o.chargesTotal))), row("Average order", m(sales.length ? gross / sales.length : 0)), row("Voided orders", m(sum(voids, o => o.total)), voids.length),
    ...sec("Payments", grp([...sales, ...refunds], o => o.payment?.method, o => o.total)), ...sec("Order types", grp(sales, o => TYP[o.type] || o.type, o => o.total)),
    ...sec("Channels", grp(sales, o => (o.channel === "pos" ? "POS" : o.channel === "callcenter" ? "Call center" : "API"), o => o.total)),
    ...sec("Categories", grp(items, catOf, lineNet, i => +i.qty || 0)), ...sec("Top items", grp(items, i => i.name, lineNet, i => +i.qty || 0).sort((a, b) => b[1].n - a[1].n).slice(0, 15)),
    ...sec("Employees", grp(sales, o => o.handledBy || o.agent, o => o.total)), ...sec("Drivers", grp(sales.filter(o => o.type === "delivery" && o.driverName), o => o.driverName, o => o.total)),
    "", ctr("— End of report —")].join("\n");
}
export function ReportsDialog({ x, onClose, say }: { x: Ctx; onClose: () => void; say: (s: string) => void }) {
  const { branch, device } = useStore(), [rp, setRp] = useState<RP>("shift"), text = reportText(x, rp, branch?.name || "");
  const print = async () => { const r = await printJob(x.S, device!, "receipt", () => text); say(r.bad.length ? r.bad[0] : r.preview != null ? "No printer in the browser" : "Printed"); };
  return (
    <Sheet title="Reports" width={640} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={print}>Print</Button></>}>
      <Tabs value={rp} onValueChange={v => setRp(v as RP)} className="mb-3"><TabsList variant="solid" className="w-full">{(Object.keys(RP_L) as RP[]).map(k => <TabsTrigger key={k} value={k} className="flex-1">{RP_L[k]}</TabsTrigger>)}</TabsList></Tabs>
      <div className="flex max-h-[60dvh] justify-center overflow-y-auto rounded-md bg-gray-50 p-4 dark:bg-gray-900"><pre className="font-mono text-[13px] leading-[18px] text-gray-900 dark:text-gray-50">{text}</pre></div>
    </Sheet>);
}

// Functions → Devices: this register's printers, kept in the device's settings.
const KIND: [Printer["kind"], string][] = [["receipt", "Receipt"], ["kitchen", "Kitchen"], ["order", "Order"]];
const CONN: [string, string][] = [["network", "Network (IP)"], ["bluetooth", "Bluetooth"], ["usb", "USB"], ["builtin", "Built-in"]];
export function PrintersDialog({ x, onClose }: { x: Ctx; onClose: () => void }) {
  const { write, device } = useStore(), list = printers(device!), [ed, setEd] = useState<Printer | null>(null), [err, setErr] = useState("");
  const save = (l: Printer[]) => write("devices", device!.id, { settings: { ...(device!.settings || {}), printers: l } });
  const cats = x.S.categories.filter(c => live(c) && c.channel === "pos"), useCats = cats.length ? cats : x.S.categories.filter(c => live(c) && !c.channel);
  if (ed) {
    const set = (k: keyof Printer, v: any) => { setEd({ ...ed, [k]: v }); setErr(""); }, isNew = !list.some(p => p.id === ed.id);
    const ok = () => { if (!ed.name.trim()) return setErr("Enter a name."); if (ed.conn === "network" && !/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(String(ed.ip || "").trim())) return setErr("Enter the printer's IP address, e.g. 192.168.1.50");
      save(isNew ? [...list, ed] : list.map(p => (p.id === ed.id ? ed : p))); setEd(null); };
    return (
      <Sheet title={isNew ? "Add Device" : "Edit Device"} width={660} onClose={() => setEd(null)} footer={<>
        {!isNew ? <Button variant="destructive" onClick={() => { save(list.filter(p => p.id !== ed.id)); setEd(null); }}>Delete</Button> : null}
        <span className="flex-1 text-sm text-red-600 dark:text-red-500">{err}</span><Button variant="secondary" onClick={() => setEd(null)}>Cancel</Button><Button onClick={ok}>Save</Button></>}>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="pr-name">Name *</Label><Input id="pr-name" value={ed.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Kitchen hot line" /></div>
          <div className="space-y-1.5"><Label>Type</Label><RadioCardGroup value={ed.kind} onValueChange={k => set("kind", k)} className="grid-cols-3">{KIND.map(([k, t]) => <RadioCardItem key={k} value={k} className="py-2.5 text-sm font-medium">{t}</RadioCardItem>)}</RadioCardGroup></div>
          <div className="space-y-1.5"><Label>Connection</Label><RadioCardGroup value={ed.conn} onValueChange={k => set("conn", k)} className="grid-cols-4">{CONN.map(([k, t]) => <RadioCardItem key={k} value={k} className="py-2.5 text-sm font-medium">{t}</RadioCardItem>)}</RadioCardGroup></div>
          {ed.conn === "network" ? <div className="space-y-1.5"><Label htmlFor="pr-ip">IP address</Label><Input id="pr-ip" value={ed.ip || ""} onChange={e => set("ip", e.target.value)} inputMode="decimal" placeholder="e.g. 192.168.1.50" /></div>
            : <Callout title="Only network printers print from this app for now." variant="warning" />}
          <div className="space-y-1.5"><Label>Copies</Label><RadioCardGroup value={String(ed.copies || 1)} onValueChange={k => set("copies", +k)} className="grid-cols-3">{["1", "2", "3"].map(k => <RadioCardItem key={k} value={k} className="py-2.5 text-sm font-medium">{k}</RadioCardItem>)}</RadioCardGroup></div>
          {ed.kind === "kitchen" ? <div className="space-y-2"><Label>Categories it prints (none = all)</Label>
            <div className="grid grid-cols-3 gap-2">{useCats.map(c => { const on = (ed.cats || []).includes(c.id); return (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
                <Checkbox checked={on} onCheckedChange={() => set("cats", on ? (ed.cats || []).filter(y => y !== c.id) : [...(ed.cats || []), c.id])} />{c.name}</label>); })}</div></div> : null}
          <div className="flex items-center gap-2"><Switch id="pr-on" checked={ed.on !== false} onCheckedChange={v => set("on", v)} /><Label htmlFor="pr-on">Active</Label></div>
        </div>
      </Sheet>);
  }
  return (
    <Sheet title="Devices" width={720} onClose={onClose} footer={<Button onClick={() => setEd({ id: "pr_" + Date.now().toString(36), name: "", kind: "receipt", conn: "network", ip: "", copies: 1, on: true, cats: [] })}>Add Device</Button>}>
      {!list.length ? <p className="py-6 text-center text-sm text-gray-500">No devices yet</p> :
        <div className="space-y-2">{list.map(p => (
          <Card key={p.id} asChild className={"flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900 " + (p.on === false ? "opacity-55" : "")}>
            <button type="button" onClick={() => setEd({ ...p })}><Badge>{KIND.find(k => k[0] === p.kind)?.[1] || p.kind}</Badge><span className="flex-1 font-semibold text-gray-900 dark:text-gray-50">{p.name}</span>
              <span className="text-sm text-gray-500">{CONN.find(c => c[0] === p.conn)?.[1] || p.conn}{p.ip ? " · " + p.ip : ""}{(p.copies || 1) > 1 ? " · " + p.copies + " copies" : ""}</span></button></Card>))}</div>}
    </Sheet>);
}
