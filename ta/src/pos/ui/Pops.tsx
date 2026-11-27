"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// What opens under a top button of the register (inside a Tremor Popover): Discount, Charges, Notes, Held orders (Retrieve) and Tags;
// and the reason picker (decline, reject an edit). Built from Tremor: buttons, checkboxes, tabs, inputs, a textarea, badges.
import { Button } from "@/components/tremor/Button";
import { Input } from "@/components/tremor/Input";
import { RadioCardGroup, RadioCardItem } from "@/components/tremor/RadioCardGroup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/tremor/Select";
import { Textarea } from "@/components/tremor/Textarea";
import { cx } from "@/components/tremor/utils";
import { useState } from "react";
import type { Data } from "../lib/db";
import { chargeList, dsCalc, dsHere, type Ctx, type Disc, type Line } from "../lib/pos";
import { Icon } from "./Icon";
import { NumPad, Sheet } from "./Pickers";
import { Chip, Keyboard, Label, Main, Panel, Pick, Seg } from "./Touch";

const typed = (k: string, s: string) => k === "c" ? "" : k === "b" ? s.slice(0, -1) : k === "." ? (s.includes(".") ? s : (s || "0") + ".") : s.length > 8 ? s : s === "0" ? k : s + k;
// nothing changed: the main button stays greyed out
const same = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));

// The windows of the register's top buttons open over the menu (the cart stays in view): big tiles, a big keypad, one main button at the top right.

// Discount: the whole order (saved discounts or a % / amount), or one item: tap a cart line while this is open to discount that item
export type DiscLine = { idx: number; name: string; qty: number; price: number; disc?: number; discPct?: number };
export function DiscountPop({ x, cart, cur, sym, allowPct, allowAmt, init, area, onDone, lines, onLineDone }: { x: Ctx; cart: Line[]; cur: (n: number) => string; sym: string; allowPct: boolean; allowAmt: boolean; init: Disc; area: { cartW: string };
  onDone: (d: Disc | undefined) => void; lines: DiscLine[]; onWhole?: () => void; onLineDone: (r: { idx: number; disc?: number; discPct?: number }[]) => void }) {
  const sets = dsHere(x), [setSel, setSetSel] = useState<any>(() => init?.setId ? sets.find(d => d.id === init.setId) || null : null);
  const [type, setType] = useState<"pct" | "amt">(init?.type === "amt" && !init.setId ? "amt" : allowPct ? "pct" : "amt"), [v, setV] = useState(init && !init.setId && init.value ? String(init.value) : init?.setVal ? String(init.setVal) : "");
  const [lt, setLt] = useState<"pct" | "amt">(allowPct ? "pct" : "amt"), [lv, setLv] = useState("");
  const one = lines.length === 1 ? lines[0] : null, key = lines.map(l => l.idx).join(","), [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) { setLastKey(key); setLt(one?.disc && !one.discPct && allowAmt ? "amt" : allowPct ? "pct" : "amt"); setLv(one?.discPct ? String(one.discPct) : one?.disc ? String(one.disc) : ""); }
  const sub = cart.reduce((a, l) => a + (+l.price || 0) * (+l.qty || 0) - (+(l.disc ?? 0) || 0), 0);
  const open = setSel?.open, typing = !setSel || open, pct = setSel ? setSel.type !== "fixed" : type === "pct";
  const save = setSel && !open ? dsCalc(x, cart, setSel, 0).amt : !(+v > 0) ? 0 : pct ? sub * Math.min(100, +v) / 100 : Math.min(sub, +v);
  const ok = setSel ? (!open || +v > 0) : +v > 0 && !(pct && +v > 100);
  const apply = () => onDone(setSel ? { type: "amt", value: 0, name: setSel.name, setId: setSel.id, ...(open ? { setVal: +v } : {}) } : { type, value: +v });
  // picked items: a % comes off each of them; an amount is shared between them by their totals
  const full = lines.reduce((a, l) => a + l.price * l.qty, 0), lx = +lv || 0, ld = lt === "pct" ? full * Math.min(100, lx) / 100 : Math.min(lx, full), lok = lx > 0 && !(lt === "pct" && lx > 100);
  const each = lines.map(l => { const f = l.price * l.qty, d = lt === "pct" ? f * Math.min(100, lx) / 100 : full ? ld * f / full : 0; return { ...l, f, d: +d.toFixed(2) }; });
  const pad = (val: string, isPct: boolean, setter: (f: (s: string) => string) => void, label: string) => <>
    <div className="flex h-20 items-center justify-between rounded-2xl border-2 border-blue-600 px-5 dark:border-blue-500"><span className="text-gray-500">{label}</span>
      <span className="text-4xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">{val === "" ? (isPct ? "0%" : sym + "0") : isPct ? val + "%" : sym + val}</span></div>
    <NumPad onKey={k => setter(s => typed(k, s))} dot /></>;
  if (lines.length) return (
    <Panel area={area} cartOpen title={<span className="flex min-w-0 items-center gap-2">Discount · <span className="truncate text-blue-700 dark:text-blue-400">{one ? one.name : lines.length + " items"}</span></span>} onClose={() => onDone(undefined)}
      action={<>{lines.some(l => l.disc) ? <Main variant="secondary" className="text-red-600 dark:text-red-500" onClick={() => onLineDone(lines.map(l => ({ idx: l.idx })))}>Remove</Main> : null}
        <Main disabled={!lok} onClick={() => onLineDone(each.map(e => lt === "pct" ? { idx: e.idx, discPct: Math.min(100, lx), disc: e.d } : { idx: e.idx, disc: e.d }))}>Apply</Main></>}>
      <div className="flex h-full gap-6">
        {/* the picked items: each with its total and what comes off it */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">{each.map(e => <div key={e.idx} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
            <span className="min-w-8 text-[17px] font-semibold text-blue-700 dark:text-blue-400">{e.qty}×</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[17px] font-medium text-gray-900 dark:text-gray-50">{e.name}</span>
              {e.disc && !(lx > 0) ? <span className="block text-sm text-emerald-600">Now −{cur(e.disc)}{e.discPct ? " (" + e.discPct + "%)" : ""}</span> : null}</span>
            <span className="text-right tabular-nums">{e.d > 0 ? <><span className="block text-sm text-gray-400 line-through">{cur(e.f)}</span><span className="block text-[17px] font-semibold text-gray-900 dark:text-gray-50">{cur(e.f - e.d)}</span></> : <span className="text-[17px] font-semibold text-gray-900 dark:text-gray-50">{cur(e.f)}</span>}</span>
          </div>)}</div>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-50 px-5 py-4 text-lg dark:bg-emerald-500/10"><span className="text-gray-700 dark:text-gray-300">{one ? "Item total" : "Items total"}</span>
            <b className="tabular-nums text-gray-900 dark:text-gray-50">{cur(full - ld)}{ld > 0 ? <span className="ms-1.5 font-medium text-emerald-600">(−{cur(ld)})</span> : null}</b></div>
        </div>
        <div className="w-[330px] shrink-0 space-y-2.5">
          {allowPct && allowAmt ? <Seg value={lt} onChange={k => { setLt(k); setLv(""); }} items={[["pct", "%"], ["amt", "Amount"]]} /> : null}
          {pad(lv, lt === "pct", setLv, one ? "This item" : lt === "pct" ? "Each item" : "Shared")}
        </div>
      </div>
    </Panel>);
  return (
    <Panel area={area} cartOpen title={<span className="flex items-center gap-2">Discount · <span className="text-blue-700 dark:text-blue-400">Whole order</span></span>} onClose={() => onDone(undefined)}
      action={<>{init ? <Main variant="secondary" className="text-red-600 dark:text-red-500" onClick={() => onDone(null)}>Remove</Main> : null}<Main disabled={!ok} onClick={apply}>Apply</Main></>}>
      <div className="flex h-full gap-6">
        <div className="w-[330px] shrink-0 space-y-2.5">
          {/* saved discounts in a dropdown on top; Custom = type a % or an amount */}
          {sets.length ? <Select value={setSel?.id || "_custom"} onValueChange={id => { setSetSel(id === "_custom" ? null : sets.find(d => d.id === id) || null); setV(""); }}>
            <SelectTrigger aria-label="Saved discount"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="_custom" className="py-3 text-[17px]">Custom discount</SelectItem>
              {sets.map(d => { const c = dsCalc(x, cart, d, 0), off = !d.open && !(c.amt > 0);
                return <SelectItem key={d.id} value={d.id} disabled={off} className="py-3 text-[17px]">{d.name}{d.open ? "" : off ? " · " + (c.why || "Not for this order") : " · −" + cur(c.amt)}</SelectItem>; })}</SelectContent></Select> : null}
          {typing ? <>
            {!setSel && allowPct && allowAmt ? <Seg value={type} onChange={k => { setType(k); setV(""); }} items={[["pct", "%"], ["amt", "Amount"]]} /> : null}
            {pad(v, pct, setV, setSel ? setSel.name : "Custom")}
          </> : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          {save > 0 ? <div className="mt-auto flex items-center justify-between rounded-2xl bg-emerald-50 px-5 py-4 text-lg dark:bg-emerald-500/10"><span className="text-gray-700 dark:text-gray-300">New total</span>
            <b className="tabular-nums text-gray-900 dark:text-gray-50">{cur(sub - save)} <span className="font-medium text-emerald-600">(−{cur(save)})</span></b></div> : null}
        </div>
      </div>
    </Panel>);
}

// Charges: a tile per charge (tap to add or remove); an open charge takes its amount on the keypad
export function ChargesPop({ x, cur, picked, open, area, onDone }: { x: Ctx; cur: (n: number) => string; picked: string[]; open: Record<string, number>; area: { cartW: string }; onDone: (v: { picked: string[]; open: Record<string, number> } | null) => void }) {
  const list = chargeList(x), [p, setP] = useState(picked), [o, setO] = useState(open), [ask, setAsk] = useState<string | null>(null), [v, setV] = useState("");
  const amt = (c: any) => c.type === "percent" ? c.value + "%" : c.type === "open" ? (o[c.id] ? cur(o[c.id]) : "You type the amount") : cur(+c.value || 0);
  const tap = (c: any) => { const on = p.includes(c.id); if (c.type === "open" && !on) { setAsk(c.id); setV(o[c.id] ? String(o[c.id]) : ""); return; } setAsk(null); setP(l => on ? l.filter(y => y !== c.id) : [...l, c.id]); };
  return (
    <Panel area={area} title="Charges" onClose={() => onDone(null)} action={<Main disabled={same(p, picked) && JSON.stringify(o) === JSON.stringify(open)} onClick={() => onDone({ picked: p, open: o })}>Apply</Main>}>
      <div className="flex h-full gap-6">
        <div className="min-w-0 flex-1">
          {!list.length ? <p className="text-gray-500">No charges for this order type. Add them in the back office under Manage → Charges.</p> : <>
            <div className={cx("grid gap-3", ask ? "grid-cols-2" : "grid-cols-3")}>{list.map(c => <Pick key={c.id} on={p.includes(c.id) || ask === c.id} onClick={() => tap(c)} title={<span className="flex items-center gap-2.5"><Icon name="dollar" className="size-6 text-blue-600 dark:text-blue-500" />{c.name}</span>} sub={amt(c)} />)}</div></>}
        </div>
        {ask ? <div className="w-[330px] shrink-0 space-y-2.5">
          <p className="py-3 text-lg font-semibold text-gray-900 dark:text-gray-50">{list.find(c => c.id === ask)?.name}</p>
          <div className="flex h-20 items-center justify-end rounded-2xl border-2 border-blue-600 px-5 text-4xl font-semibold tabular-nums text-gray-900 dark:border-blue-500 dark:text-gray-50">{v || "0"}</div>
          <NumPad onKey={k => setV(s => typed(k, s))} dot />
          <div className="flex gap-2.5 pt-1"><Main variant="secondary" className="flex-1" onClick={() => setAsk(null)}>Cancel</Main>
            <Main className="flex-1" disabled={!(+v > 0)} onClick={() => { setO(m => ({ ...m, [ask]: +v })); setP(l => [...new Set([...l, ask])]); setAsk(null); setV(""); }}>Add</Main></div>
        </div> : null}
      </div>
    </Panel>);
}

// Notes: the kitchen note or the receipt note, typed on the keyboard under it
export function NotesPop({ init, area, onDone }: { init: { receipt: string; kitchen: string }; area: { cartW: string }; onDone: (v: { receipt: string; kitchen: string } | null) => void }) {
  const [which, setWhich] = useState<"kitchen" | "receipt">("kitchen"), [n, setN] = useState(init), t = n[which];
  const key = (k: string) => setN(m => ({ ...m, [which]: k === "\b" ? m[which].slice(0, -1) : (m[which] + k).slice(0, 300) }));
  return (
    <Panel area={area} title="Notes" onClose={() => onDone(null)}
      action={<Main disabled={n.kitchen.trim() === (init.kitchen || "").trim() && n.receipt.trim() === (init.receipt || "").trim()} onClick={() => onDone({ kitchen: n.kitchen.trim(), receipt: n.receipt.trim() })}>Save</Main>} className="flex flex-col gap-4">
      <Seg value={which} onChange={setWhich} items={[["kitchen", <><Icon name="chef" className="size-5" />Kitchen note</>], ["receipt", <><Icon name="note" className="size-5" />Receipt note</>]]} />
      <div className="relative">
        <Textarea value={t} inputMode="none" onChange={e => setN(m => ({ ...m, [which]: e.target.value }))} placeholder="Type the note" aria-label={which === "kitchen" ? "Kitchen note" : "Receipt note"} className="min-h-24 text-lg" />
        {t ? <button type="button" onClick={() => setN(m => ({ ...m, [which]: "" }))} className="absolute right-2 top-2 rounded-lg px-3 py-2 text-[15px] font-medium text-red-600">Clear</button> : null}
      </div>
      <div className="mt-auto"><Keyboard onKey={key} /></div>
    </Panel>);
}

// Hold: name the order and park it on this register; the orders on hold are listed with Resume and Delete
export type Held = { id: string; n: number; at: string; total: number; data: any };
export function HeldPop({ held, cur, label, onPick, onDelete, onClose, onHold, defName, area }: { held: Held[]; cur: (n: number) => string; label: (h: Held) => string; onPick: (h: Held) => void; onDelete: (h: Held) => void; onClose: () => void;
  onHold?: (name: string) => void; defName?: string; area: { cartW: string } }) {
  const [sure, setSure] = useState(""), [name, setName] = useState(defName || "");
  const tm = (s: string) => new Date(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), ago = (s: string) => Math.max(0, Math.round((Date.now() - +new Date(s)) / 60000));
  const list = <div className="space-y-2.5">{held.map(h => { const lines: any[] = h.data?.cart || [], n = lines.reduce((a, l) => a + (+l.qty || 0), 0), m = ago(h.at);
    return <div key={h.id} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 ring-[1.5px] ring-inset ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">H{h.n}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-lg font-semibold text-gray-900 dark:text-gray-50">{h.data?.name || label(h)}</span>
        <span className="block truncate text-sm text-gray-500">{n} {n === 1 ? "item" : "items"} · {cur(h.total)} · {tm(h.at)}</span></span>
      <span className={cx("text-sm font-semibold", m >= 30 ? "text-red-600" : m >= 15 ? "text-amber-600" : "text-gray-500")}>{m} min</span>
      {sure === h.id ? <Main variant="destructive" onClick={() => { setSure(""); onDelete(h); }}>Delete</Main>
        : <Button variant="secondary" aria-label={"Delete H" + h.n} className="size-14 rounded-[14px] p-0" onClick={() => setSure(h.id)}><Icon name="trash" className="size-5 text-red-600" /></Button>}
      <Main onClick={() => onPick(h)}>Resume</Main></div>; })}</div>;
  return (
    <Panel area={area} title={onHold ? "Hold order" : "Orders on hold"} onClose={onClose}
      action={onHold ? <Main onClick={() => onHold(name.trim())}>Hold</Main> : null}>
      <div className="flex h-full gap-6">
        {onHold ? <div className="min-w-0 flex-1 space-y-4"><Label>Name this order</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Optional: table, name, phone…" aria-label="Order name" />
          <div className="flex flex-wrap gap-2.5">{[...new Set([defName, "Counter", "Phone order", "Waiting", "Kitchen"].filter(Boolean) as string[])].map(q => <Chip key={q} on={name === q} onClick={() => setName(name === q ? "" : q)}>{q}</Chip>)}</div></div> : null}
        <div className={onHold ? "w-[440px] shrink-0" : "min-w-0 flex-1"}>{onHold ? <Label>On hold ({held.length})</Label> : null}
          {!held.length ? <p className="text-gray-500">No orders on hold on this register.</p> : list}</div>
      </div>
    </Panel>);
}

// Order tags (Manage → Tags, type Order): picked on the register, saved on the order (settings "tags" on.order[orderId]).
export const tagDoc = (S: Data) => (S.settings.find(x => x.id === "tags") || {}) as any;
export const orderTags = (S: Data) => (tagDoc(S).list || []).filter((t: any) => t.type === "order" && !t.deleted) as { id: string; name: string; color?: string }[];
export function TagsPop({ S, init, area, onDone }: { S: Data; init: string[]; area: { cartW: string }; onDone: (ids: string[] | null) => void }) {
  const l = orderTags(S), [sel, setSel] = useState(init);
  return (
    <Panel area={area} title="Tags" onClose={() => onDone(null)} action={<Main disabled={same(sel, init)} onClick={() => onDone(sel)}>Save</Main>}>
      {!l.length ? <p className="text-gray-500">No order tags yet. Add them in the back office under Manage → Tags.</p> :
        <div className="grid grid-cols-3 gap-3">{l.map(t => { const on = sel.includes(t.id);
          return <Pick key={t.id} on={on} onClick={() => setSel(v => (on ? v.filter(y => y !== t.id) : [...v, t.id]))} title={<span className="flex items-center gap-2.5"><Icon name="tag" className="size-6 text-blue-600 dark:text-blue-500" />{t.name}</span>} />; })}</div>}
    </Panel>);
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
