"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// What opens under a top button of the register (inside a Tremor Popover): Discount, Charges, Notes, Held orders (Retrieve) and Tags;
// and the reason picker (decline, reject an edit). Built from Tremor: buttons, checkboxes, tabs, inputs, a textarea, badges.
import { Button } from "@/components/tremor/Button";
import { Input } from "@/components/tremor/Input";
import { RadioCardGroup, RadioCardItem } from "@/components/tremor/RadioCardGroup";
import { Textarea } from "@/components/tremor/Textarea";
import { cx } from "@/components/tremor/utils";
import { useState } from "react";
import type { Data } from "../lib/db";
import { chargeList, dsCalc, dsHere, type Ctx, type Disc, type Line } from "../lib/pos";
import { Icon } from "./Icon";
import { NumPad, Sheet } from "./Pickers";
import { Chip, Label, Main, Panel, Pick, Seg } from "./Touch";

const typed = (k: string, s: string) => k === "c" ? "" : k === "b" ? s.slice(0, -1) : k === "." ? (s.includes(".") ? s : (s || "0") + ".") : s.length > 8 ? s : s === "0" ? k : s + k;
// The windows of the register's top buttons open over the menu (the cart stays in view): big tiles, a big keypad, one main button at the top right.

// Discount: the saved discounts as tiles (greyed out when the order doesn't qualify), a % / amount keypad on the right
export function DiscountPop({ x, cart, cur, sym, allowPct, allowAmt, init, area, onDone }: { x: Ctx; cart: Line[]; cur: (n: number) => string; sym: string; allowPct: boolean; allowAmt: boolean; init: Disc; area: { cartW: string }; onDone: (d: Disc | undefined) => void }) {
  const sets = dsHere(x), [setSel, setSetSel] = useState<any>(() => init?.setId ? sets.find(d => d.id === init.setId) || null : null);
  const [type, setType] = useState<"pct" | "amt">(init?.type === "amt" && !init.setId ? "amt" : allowPct ? "pct" : "amt"), [v, setV] = useState(init && !init.setId && init.value ? String(init.value) : init?.setVal ? String(init.setVal) : "");
  const sub = cart.reduce((a, l) => a + (+l.price || 0) * (+l.qty || 0) - (+(l.disc ?? 0) || 0), 0);
  const open = setSel?.open, typing = !setSel || open, pct = setSel ? setSel.type !== "fixed" : type === "pct";
  const save = setSel && !open ? dsCalc(x, cart, setSel, 0).amt : !(+v > 0) ? 0 : pct ? sub * Math.min(100, +v) / 100 : Math.min(sub, +v);
  const ok = setSel ? (!open || +v > 0) : +v > 0 && !(pct && +v > 100);
  const apply = () => onDone(setSel ? { type: "amt", value: 0, name: setSel.name, setId: setSel.id, ...(open ? { setVal: +v } : {}) } : { type, value: +v });
  return (
    <Panel area={area} title="Discount" sub="The whole order · tap a cart line instead to discount one item" onClose={() => onDone(undefined)}
      action={<>{init ? <Main variant="secondary" className="text-red-600 dark:text-red-500" onClick={() => onDone(null)}>Remove</Main> : null}<Main disabled={!ok} onClick={apply}>Apply</Main></>}>
      <div className="flex h-full gap-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <Label>Saved discounts</Label>
          {!sets.length ? <p className="text-gray-500">No saved discounts. Add them in the back office.</p> : null}
          <div className="grid grid-cols-2 gap-3">
            {sets.map(d => { const c = dsCalc(x, cart, d, 0), off = !d.open && !(c.amt > 0);
              return <Pick key={d.id} on={setSel?.id === d.id} disabled={off} onClick={() => { setSetSel(setSel?.id === d.id ? null : d); setV(""); }} title={d.name}
                sub={d.open ? (d.type === "fixed" ? "You type the amount" : "You type the %") : off ? c.why || "Not for this order" : "−" + cur(c.amt)} />; })}
          </div>
          {save > 0 ? <div className="mt-auto flex items-center justify-between rounded-2xl bg-emerald-50 px-5 py-4 text-lg dark:bg-emerald-500/10"><span className="text-gray-700 dark:text-gray-300">New total</span>
            <b className="tabular-nums text-gray-900 dark:text-gray-50">{cur(sub - save)} <span className="font-medium text-emerald-600">(−{cur(save)})</span></b></div> : null}
        </div>
        {typing ? <div className="w-[330px] shrink-0 space-y-2.5">
          {setSel ? <p className="py-3 text-lg font-semibold text-gray-900 dark:text-gray-50">{setSel.name}</p> : allowPct && allowAmt ? <Seg value={type} onChange={k => { setType(k); setV(""); }} items={[["pct", "%"], ["amt", "Amount"]]} /> : null}
          <div className="flex h-20 items-center justify-between rounded-2xl border-2 border-blue-600 px-5 dark:border-blue-500"><span className="text-gray-500">{setSel ? "Value" : "Custom"}</span>
            <span className="text-4xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">{v === "" ? (pct ? "0%" : sym + "0") : pct ? v + "%" : sym + v}</span></div>
          <NumPad onKey={k => setV(s => typed(k, s))} dot />
        </div> : null}
      </div>
    </Panel>);
}

// Charges: a tile per charge (tap to add or remove); an open charge takes its amount on the keypad
export function ChargesPop({ x, cur, picked, open, area, onDone }: { x: Ctx; cur: (n: number) => string; picked: string[]; open: Record<string, number>; area: { cartW: string }; onDone: (v: { picked: string[]; open: Record<string, number> } | null) => void }) {
  const list = chargeList(x), [p, setP] = useState(picked), [o, setO] = useState(open), [ask, setAsk] = useState<string | null>(null), [v, setV] = useState("");
  const amt = (c: any) => c.type === "percent" ? c.value + "%" : c.type === "open" ? (o[c.id] ? cur(o[c.id]) : "You type the amount") : cur(+c.value || 0);
  const tap = (c: any) => { const on = p.includes(c.id); if (c.type === "open" && !on) { setAsk(c.id); setV(o[c.id] ? String(o[c.id]) : ""); return; } setAsk(null); setP(l => on ? l.filter(y => y !== c.id) : [...l, c.id]); };
  return (
    <Panel area={area} title="Charges" sub="Added on top of the order" onClose={() => onDone(null)} action={<Main onClick={() => onDone({ picked: p, open: o })}>Apply</Main>}>
      <div className="flex h-full gap-6">
        <div className="min-w-0 flex-1">
          {!list.length ? <p className="text-gray-500">No charges for this order type. Add them in the back office under Manage → Charges.</p> : <>
            <Label>Charges · {p.length} on</Label>
            <div className="grid grid-cols-2 gap-3">{list.map(c => <Pick key={c.id} on={p.includes(c.id) || ask === c.id} onClick={() => tap(c)} title={c.name} sub={amt(c)} />)}</div></>}
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

// Notes: the kitchen note or the receipt note, typed or built from quick notes (Manage → Reasons → quick notes, or the defaults)
export const QUICK_NOTES = ["No onions", "Extra spicy", "Not spicy", "No MSG", "Sauce on the side", "Extra sauce", "Cutlery", "No cutlery", "Takeaway bags", "Birthday", "Allergy: ask the cashier", "Rush"];
export function NotesPop({ init, quick = QUICK_NOTES, area, onDone }: { init: { receipt: string; kitchen: string }; quick?: string[]; area: { cartW: string }; onDone: (v: { receipt: string; kitchen: string } | null) => void }) {
  const [which, setWhich] = useState<"kitchen" | "receipt">("kitchen"), [n, setN] = useState(init);
  const t = n[which], parts = t.split(" · ").map(z => z.trim()).filter(Boolean);
  const toggle = (q: string) => setN(m => ({ ...m, [which]: (parts.includes(q) ? parts.filter(z => z !== q) : [...parts, q]).join(" · ") }));
  return (
    <Panel area={area} title="Notes" sub={which === "kitchen" ? "Printed on the kitchen ticket" : "Printed on the customer's receipt"} onClose={() => onDone(null)}
      action={<Main onClick={() => onDone({ kitchen: n.kitchen.trim(), receipt: n.receipt.trim() })}>Save</Main>} className="space-y-5">
      <Seg value={which} onChange={setWhich} items={[["kitchen", "Kitchen note"], ["receipt", "Receipt note"]]} />
      <Textarea value={t} onChange={e => setN(m => ({ ...m, [which]: e.target.value }))} placeholder="Tap quick notes below, or type" aria-label={which === "kitchen" ? "Kitchen note" : "Receipt note"} className="min-h-28 text-lg" />
      <div><Label>Quick notes · tap to add or remove</Label>
        <div className="flex flex-wrap gap-2.5">{quick.map(q => <Chip key={q} on={parts.includes(q)} onClick={() => toggle(q)}>{q}</Chip>)}</div></div>
      {t ? <Main variant="secondary" onClick={() => setN(m => ({ ...m, [which]: "" }))}>Clear this note</Main> : null}
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
    <Panel area={area} title={onHold ? "Hold order" : "Orders on hold"} sub={onHold ? "Park this order and start a new one" : held.length + " on this register"} onClose={onClose}
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
    <Panel area={area} title="Tags" sub="Pick any · they show on the order and the kitchen ticket" onClose={() => onDone(null)} action={<Main onClick={() => onDone(sel)}>Save</Main>}>
      {!l.length ? <p className="text-gray-500">No order tags yet. Add them in the back office under Manage → Tags.</p> :
        <div className="grid grid-cols-3 gap-3">{l.map(t => { const on = sel.includes(t.id);
          return <Pick key={t.id} on={on} onClick={() => setSel(v => (on ? v.filter(y => y !== t.id) : [...v, t.id]))} title={<span className="flex items-center gap-2.5"><Icon name="tag" className="size-5 text-gray-400" />{t.name}</span>} />; })}</div>}
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
