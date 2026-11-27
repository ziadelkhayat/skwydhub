"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// What opens under a top button of the register (inside a Tremor Popover): Discount, Charges, Notes, Held orders (Retrieve) and Tags;
// and the reason picker (decline, reject an edit). Built from Tremor: buttons, checkboxes, tabs, inputs, a textarea, badges.
import { Badge } from "@/components/tremor/Badge";
import { Button } from "@/components/tremor/Button";
import { Checkbox } from "@/components/tremor/Checkbox";
import { Divider } from "@/components/tremor/Divider";
import { Input } from "@/components/tremor/Input";
import { RadioCardGroup, RadioCardItem } from "@/components/tremor/RadioCardGroup";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { Textarea } from "@/components/tremor/Textarea";
import { cx } from "@/components/tremor/utils";
import { useState } from "react";
import type { Data } from "../lib/db";
import { chargeList, dsCalc, dsHere, type Ctx, type Disc, type Line } from "../lib/pos";
import { Icon } from "./Icon";
import { NumPad, Sheet } from "./Pickers";

const typed = (k: string, s: string) => k === "c" ? "" : k === "b" ? s.slice(0, -1) : k === "." ? (s.includes(".") ? s : (s || "0") + ".") : s.length > 8 ? s : s === "0" ? k : s + k;
const Head = ({ t, n, onClose }: { t: string; n?: string; onClose?: () => void }) => (
  <div className="flex items-center gap-2 px-1 pb-2"><p className="flex-1 font-semibold text-gray-900 dark:text-gray-50">{t}</p>{n ? <span className="text-sm text-gray-500">{n}</span> : null}
    {onClose ? <Button variant="ghost" className="p-1.5" aria-label="Close" onClick={onClose}><Icon name="x" className="size-4" /></Button> : null}</div>);
const Rowb = ({ onClick, disabled, children, className }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string }) =>
  <button type="button" disabled={disabled} onClick={onClick} className={cx("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-gray-50 disabled:opacity-45 dark:hover:bg-gray-900", className)}>{children}</button>;

// Discount: the saved discounts on the left (one tap applies; greyed out when the order doesn't qualify), a % / amount pad on the right
export function DiscountPop({ x, cart, cur, sym, allowPct, allowAmt, init, onDone }: { x: Ctx; cart: Line[]; cur: (n: number) => string; sym: string; allowPct: boolean; allowAmt: boolean; init: Disc; onDone: (d: Disc | undefined) => void }) {
  const sets = dsHere(x), [openSet, setOpenSet] = useState<any>(null);
  const [type, setType] = useState<"pct" | "amt">(init?.type === "amt" && !init.setId ? "amt" : allowPct ? "pct" : "amt"), [v, setV] = useState(init && !init.setId && init.value ? String(init.value) : "");
  const sub = cart.reduce((a, l) => a + (+l.price || 0) * (+l.qty || 0) - (+(l.disc ?? 0) || 0), 0), pct = openSet ? openSet.type !== "fixed" : type === "pct";
  const save = !(+v > 0) ? 0 : pct ? sub * Math.min(100, +v) / 100 : Math.min(sub, +v);
  return (
    <div className="flex gap-3">
      <div className="max-h-[420px] min-w-0 flex-1 overflow-y-auto">
        <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Saved</p>
        {!sets.length ? <p className="p-3 text-sm text-gray-500">No saved discounts. Add them in the back office.</p> : null}
        {sets.map(d => { const c = dsCalc(x, cart, d, 0), on = openSet?.id === d.id || init?.setId === d.id, off = !d.open && !(c.amt > 0);
          return <Rowb key={d.id} disabled={off} className={on ? "bg-blue-50 dark:bg-blue-500/10" : ""} onClick={() => { if (d.open) { setOpenSet(d); setV(""); } else onDone({ type: "amt", value: 0, name: d.name, setId: d.id }); }}>
            <span className="min-w-0 flex-1"><span className={cx("block truncate text-sm font-medium", on ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-gray-50")}>{d.name}</span>
              <span className="block truncate text-xs text-gray-500">{d.open ? (d.type === "fixed" ? "You type the amount" : "You type the %") : c.why || ""}</span></span>
            {!d.open && c.amt > 0 ? <Badge variant="success">−{cur(c.amt)}</Badge> : null}</Rowb>; })}
        {init ? <Rowb onClick={() => onDone(null)}><Icon name="x" className="size-4 text-red-600" /><span className="text-sm font-medium text-red-600">Remove Discount</span></Rowb> : null}
      </div>
      <Divider className="my-0 h-auto w-px self-stretch border-l" />
      <div className="w-60 space-y-2">
        {openSet ? <p className="font-semibold text-gray-900 dark:text-gray-50">{openSet.name}</p> : allowPct && allowAmt ? <Tabs value={type} onValueChange={k => setType(k as any)}><TabsList variant="solid" className="w-full"><TabsTrigger value="pct" className="flex-1">%</TabsTrigger><TabsTrigger value="amt" className="flex-1">Amount</TabsTrigger></TabsList></Tabs> : null}
        <div className="flex h-12 items-center justify-end rounded-md border border-gray-300 px-3 text-xl tabular-nums text-gray-900 dark:border-gray-800 dark:text-gray-50">{v === "" ? " " : pct ? v + " %" : sym + " " + v}</div>
        <NumPad onKey={k => setV(s => typed(k, s))} dot />
        <Button className="w-full" disabled={!(+v > 0) || (pct && +v > 100)} onClick={() => onDone(openSet ? { type: "amt", value: 0, name: openSet.name, setId: openSet.id, setVal: +v } : { type, value: +v })}>{save > 0 ? "Apply · new total " + cur(sub - save) : "Apply"}</Button>
      </div>
    </div>);
}

// Charges: a tick per charge with its amount; an open charge asks its amount first
export function ChargesPop({ x, cur, picked, open, onDone }: { x: Ctx; cur: (n: number) => string; picked: string[]; open: Record<string, number>; onDone: (v: { picked: string[]; open: Record<string, number> } | null) => void }) {
  const list = chargeList(x), [p, setP] = useState(picked), [o, setO] = useState(open), [ask, setAsk] = useState<string | null>(null), [v, setV] = useState("");
  if (ask) return (
    <div className="space-y-3 p-1">
      <div className="flex items-center"><p className="flex-1 font-semibold text-gray-900 dark:text-gray-50">{list.find(c => c.id === ask)?.name}</p><Button variant="ghost" onClick={() => setAsk(null)}>Back</Button></div>
      <Input autoFocus value={v} onChange={e => setV(e.target.value)} inputMode="decimal" placeholder="Amount" aria-label="Amount" className="[&>input]:text-right [&>input]:text-lg" />
      <Button className="w-full" disabled={!(+v > 0)} onClick={() => { setO(m => ({ ...m, [ask]: +v })); setP(l => [...new Set([...l, ask])]); setAsk(null); setV(""); }}>OK</Button>
    </div>);
  return (
    <div>
      <Head t="Charges" />
      {!list.length ? <p className="p-3 text-sm text-gray-500">No charges for this order type. Add them in the back office under Manage → Charges.</p> :
        <ul className="max-h-96 divide-y divide-gray-200 overflow-y-auto border-t border-gray-200 dark:divide-gray-800 dark:border-gray-800">{list.map(c => { const on = p.includes(c.id);
          return <li key={c.id}><label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 hover:bg-gray-50 dark:hover:bg-gray-900">
            <span className="flex-1 truncate font-medium text-gray-900 dark:text-gray-50">{c.name}</span>
            <span className="text-sm text-gray-500">{c.type === "percent" ? c.value + "%" : c.type === "open" ? (o[c.id] ? cur(o[c.id]) : "Open amount") : cur(+c.value || 0)}</span>
            <Checkbox checked={on} onCheckedChange={() => on ? setP(l => l.filter(y => y !== c.id)) : c.type === "open" ? (setAsk(c.id), setV(o[c.id] ? String(o[c.id]) : "")) : setP(l => [...l, c.id])} aria-label={c.name} />
          </label></li>; })}</ul>}
      <Button className="mt-3 h-12 w-full" onClick={() => onDone({ picked: p, open: o })}>Done</Button>
    </div>);
}

// Notes: Kitchen Note or Receipt Note, then a box to type it
export function NotesPop({ init, onDone }: { init: { receipt: string; kitchen: string }; onDone: (v: { receipt: string; kitchen: string } | null) => void }) {
  const [which, setWhich] = useState<"kitchen" | "receipt" | null>(null), [t, setT] = useState("");
  if (which) return (
    <div className="space-y-3 p-1">
      <div className="flex items-center"><p className="flex-1 font-semibold text-gray-900 dark:text-gray-50">{which === "kitchen" ? "Kitchen Note" : "Receipt Note"}</p><Button variant="ghost" onClick={() => setWhich(null)}>Back</Button></div>
      <Textarea autoFocus value={t} onChange={e => setT(e.target.value)} className="min-h-24" aria-label={which === "kitchen" ? "Kitchen note" : "Receipt note"} />
      <p className="text-xs text-gray-500">{which === "kitchen" ? "Printed on the kitchen ticket" : "Printed on the customer's receipt"}</p>
      <div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setT("")}>Clear</Button><Button className="flex-1" onClick={() => onDone({ ...init, [which]: t.trim() })}>Save</Button></div>
    </div>);
  const R2 = ({ k, ic, l, help }: { k: "kitchen" | "receipt"; ic: string; l: string; help: string }) => (
    <Rowb onClick={() => { setWhich(k); setT(init[k] || ""); }}><span className="flex size-9 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500"><Icon name={ic} className="size-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-gray-900 dark:text-gray-50">{l}</span><span className="block truncate text-xs text-gray-500">{init[k] || help}</span></span></Rowb>);
  return <div>{R2({ k: "kitchen", ic: "chef", l: "Kitchen Note", help: "Printed on the kitchen ticket" })}{R2({ k: "receipt", ic: "note", l: "Receipt Note", help: "Printed for the customer" })}</div>;
}

// Held orders (Retrieve)
export type Held = { id: string; n: number; at: string; total: number; data: any };
export function HeldPop({ held, cur, label, onPick, onDelete, onClose }: { held: Held[]; cur: (n: number) => string; label: (h: Held) => string; onPick: (h: Held) => void; onDelete: (h: Held) => void; onClose: () => void }) {
  const [sure, setSure] = useState("");
  const tm = (s: string) => new Date(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <div>
      <Head t="Held Orders" n={String(held.length)} onClose={onClose} />
      {!held.length ? <p className="p-3 text-sm text-gray-500">No held orders on this register.</p> :
        <ul className="max-h-[60dvh] divide-y divide-gray-200 overflow-y-auto border-t border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {held.map(h => { const lines: any[] = h.data?.cart || [], n = lines.reduce((a, l) => a + (+l.qty || 0), 0);
            return <li key={h.id} className="flex items-center gap-3 px-2 py-2.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-500">H{h.n}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{label(h)} · {n} {n === 1 ? "item" : "items"}</span>
                <span className="block truncate text-xs text-gray-500">{lines.map(l => (+l.qty > 1 ? l.qty + "× " : "") + l.name).join(", ")}</span></span>
              <span className="text-right"><span className="block text-sm font-semibold text-gray-900 dark:text-gray-50">{cur(h.total)}</span><span className="block text-xs text-gray-500">{tm(h.at)}</span></span>
              {sure === h.id ? <Button variant="destructive" onClick={() => { setSure(""); onDelete(h); }}>Delete</Button>
                : <Button variant="secondary" aria-label={"Delete H" + h.n} className="p-2.5" onClick={() => setSure(h.id)}><Icon name="trash" className="size-4 text-red-600" /></Button>}
              <Button onClick={() => onPick(h)}>Retrieve</Button>
            </li>; })}</ul>}
    </div>);
}

// Order tags (Manage → Tags, type Order): picked on the register, saved on the order (settings "tags" on.order[orderId]).
export const tagDoc = (S: Data) => (S.settings.find(x => x.id === "tags") || {}) as any;
export const orderTags = (S: Data) => (tagDoc(S).list || []).filter((t: any) => t.type === "order" && !t.deleted) as { id: string; name: string }[];
export function TagsPop({ S, init, onDone }: { S: Data; init: string[]; onDone: (ids: string[] | null) => void }) {
  const l = orderTags(S), [sel, setSel] = useState(init), [q, setQ] = useState(""), shown = l.filter(t => !q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <Head t="Tags" />
      {!l.length ? <p className="p-3 text-sm text-gray-500">No order tags yet. Add them in the back office under Manage → Tags.</p> : <>
        {l.length > 8 ? <Input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search tags" className="mb-2" /> : null}
        <ul className="max-h-96 divide-y divide-gray-200 overflow-y-auto border-t border-gray-200 dark:divide-gray-800 dark:border-gray-800">{shown.map(t => { const on = sel.includes(t.id);
          return <li key={t.id}><label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 hover:bg-gray-50 dark:hover:bg-gray-900">
            <Icon name="tag" className="size-4 text-gray-400" /><span className="flex-1 font-medium text-gray-900 dark:text-gray-50">{t.name}</span>
            <Checkbox checked={on} onCheckedChange={() => setSel(v => (on ? v.filter(y => y !== t.id) : [...v, t.id]))} aria-label={t.name} /></label></li>; })}</ul></>}
      <Button className="mt-3 h-12 w-full" onClick={() => onDone(sel)}>Done</Button>
    </div>);
}

// a reason picked from a list (Manage → Reasons), or written
export function ReasonAsk({ title, reasons, ok = "OK", onDone }: { title: string; reasons: string[]; ok?: string; onDone: (r: string | null) => void }) {
  const [r, setR] = useState(""), [other, setOther] = useState(""), why = r === "_other" ? other.trim() : r;
  return (
    <Sheet title={title} width={560} onClose={() => onDone(null)} footer={<><Button variant="secondary" onClick={() => onDone(null)}>Cancel</Button><Button disabled={!why} onClick={() => onDone(why)}>{ok}</Button></>}>
      <RadioCardGroup value={r} onValueChange={setR} className="grid-cols-2">
        {[...reasons, "_other"].map(z => <RadioCardItem key={z} value={z} className="py-3 text-sm font-medium">{z === "_other" ? "Other…" : z}</RadioCardItem>)}
      </RadioCardGroup>
      {r === "_other" ? <Input autoFocus value={other} onChange={e => setOther(e.target.value)} placeholder="Write the reason" aria-label="Reason" className="mt-3" /> : null}
    </Sheet>);
}
