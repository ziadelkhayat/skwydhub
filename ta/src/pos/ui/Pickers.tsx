"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The windows the register opens over the sale, from Tremor: modifiers, variants, a number (open price, table…), a cart line's note / discount.
// Same rules as modpick.js: min/max per modifier, free options, repeatable options, a note on the item.
import { Badge } from "@/components/tremor/Badge";
import { Button } from "@/components/tremor/Button";
import { Card } from "@/components/tremor/Card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/tremor/Dialog";
import { Input } from "@/components/tremor/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/tremor/Tabs";
import { Textarea } from "@/components/tremor/Textarea";
import { cx } from "@/components/tremor/utils";
import { useContext, useState, type ReactNode } from "react";
import { modRule, type ModData, type ModOpt } from "../lib/pos";
import { Icon } from "./Icon";
import { AreaCtx, Keyboard, Panel } from "./Touch";

/** a Tremor dialog that answers once */
export function Sheet({ title, onClose, width = 680, children, footer, back }: { title: string; onClose: () => void; width?: number; children: ReactNode; footer?: ReactNode; back?: string }) {
  // on the register: in the menu's place, in the same rounded window as Discount
  const area = useContext(AreaCtx);
  if (area) return (
    <Panel area={area} title={title} onClose={onClose} back={back} className="flex flex-col">
      <div className="mx-auto w-full" style={{ maxWidth: Math.max(width, 420) }}>{children}</div>
      {footer ? <div className="mx-auto mt-auto flex w-full items-center justify-center gap-3 pt-6 [&>button]:h-14 [&>button]:min-w-36 [&>button]:rounded-[14px] [&>button]:px-7 [&>button]:text-[17px]" style={{ maxWidth: Math.max(width, 420) }}>{footer}</div> : null}
    </Panel>);
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto" style={{ maxWidth: width, ["--pos-w" as any]: width + 64 + "px" }}>
        <DialogHeader><DialogTitle className="truncate">{title}</DialogTitle></DialogHeader>
        <div className="mt-4">{children}</div>
        {footer ? <DialogFooter className="mt-6 items-center gap-2">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

/** a − n + stepper from Tremor buttons */
export const Stepper = ({ n, onLess, onMore, lessOff }: { n: number; onLess: () => void; onMore: () => void; lessOff?: boolean; big?: boolean }) => (
  <div className="flex items-center rounded-xl bg-gray-100 text-blue-700 dark:bg-gray-900 dark:text-blue-400">
    <Button variant="ghost" aria-label="One less" disabled={lessOff} onClick={onLess} className="size-12"><Icon name="minus" className="size-4" /></Button>
    <span className="min-w-8 text-center font-semibold tabular-nums text-gray-900 dark:text-gray-50">{n}</span>
    <Button variant="ghost" aria-label="One more" onClick={onMore} className="size-12"><Icon name="plus" className="size-4" /></Button>
  </div>);

export type Picked = { options: { id: string; modifierId: string; name: string; price: number }[]; unitPrice: number; mods: string; note: string; qty?: number };
// edit: a cart line being changed (its options start picked, its note filled in, the button says Save)
// area: the options open in the menu's place on the register, big for touch, the cart stays in view
export function ModPicker({ name, basePrice, data, money, onDone, edit, area, onRemove }: { name: string; basePrice: number; data: ModData; money: (n: number) => string; onDone: (r: Picked | null) => void; onRemove?: () => void;
  edit?: { options: { id: string; modifierId?: string }[]; note?: string; qty?: number }; area?: { cartW: string } }) {
  const links = data.links.map(l => ({ ...l, opts: data.options.filter(o => o.modifierId === l.modifierId) }));
  const [sel, setSel] = useState<Record<string, number>[]>(() => links.map(l => { const m: Record<string, number> = {};
    if (edit) { edit.options.forEach(o => { if (l.opts.some(y => y.id === o.id) && (!o.modifierId || o.modifierId === l.modifierId)) m[o.id] = (m[o.id] || 0) + 1; }); return m; }
    (l.defaults || []).forEach(id => { if (l.opts.some(o => o.id === id)) m[id] = 1; }); return m; }));
  const [note, setNote] = useState(edit?.note || ""), [err, setErr] = useState(""), [qty, setQty] = useState(edit?.qty || 1);
  const cnt = (gi: number) => Object.values(sel[gi]).reduce((a, n) => a + n, 0);
  const units = (gi: number) => links[gi].opts.flatMap(o => Array(sel[gi][o.id] || 0).fill(o) as ModOpt[]);
  const price = () => { let t = basePrice; links.forEach((l, gi) => { let free = +(l.free || 0); units(gi).forEach(o => { if (free > 0) free--; else t += o.price; }); }); return t; };
  const tap = (gi: number, o: ModOpt, d = 1) => {
    const l = links[gi], mx = +(l.max || 0), n = (sel[gi][o.id] || 0);
    setSel(s => s.map((m, j) => {
      if (j !== gi) return m;
      if (mx === 1) return n ? {} : { [o.id]: 1 };
      if (!l.multi) { if (n) { const { [o.id]: _, ...rest } = m; return rest; } return mx && cnt(gi) >= mx ? m : { ...m, [o.id]: 1 }; }
      const v = n + d; if (d > 0 && mx && cnt(gi) >= mx) return m;
      if (v <= 0) { const { [o.id]: _, ...rest } = m; return rest; } return { ...m, [o.id]: v };
    }));
    setErr("");
  };
  const ok = () => {
    const bad = links.findIndex((l, gi) => cnt(gi) < +(l.min || 0));
    if (bad >= 0) return setErr(`${data.groups[links[bad].modifierId]?.name || "Options"}: ${modRule(links[bad]).toLowerCase()}`);
    const chosen: Picked["options"] = []; links.forEach((l, gi) => { let free = +(l.free || 0); units(gi).forEach(o => { const c = free > 0 ? 0 : o.price; if (free > 0) free--; chosen.push({ id: o.id, modifierId: l.modifierId, name: o.name, price: c }); }); });
    const tally: { name: string; n: number }[] = []; chosen.forEach(o => { const t = tally.find(y => y.name === o.name); if (t) t.n++; else tally.push({ name: o.name, n: 1 }); });
    onDone({ options: chosen, unitPrice: +price().toFixed(2), mods: tally.map(t => (t.n > 1 ? t.n + "× " : "") + t.name).join(", "), note: note.trim(), qty });
  };
  const groups = links.map((l, gi) => (
    <section key={l.modifierId} className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{data.groups[l.modifierId]?.name || "Options"}</h3>
        <Badge variant={+(l.min || 0) ? "error" : "neutral"}>{modRule(l)}</Badge>
        {+(l.free || 0) ? <span className="text-sm text-gray-500">{l.free} free</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {l.opts.map(o => { const n = sel[gi][o.id] || 0, mx = +(l.max || 0), full = mx > 1 && cnt(gi) >= mx && !n, dis = o.oos || full, rep = l.multi && mx !== 1;
          return (
            <Card key={o.id} asChild className={cx("relative flex min-h-[88px] flex-col justify-center rounded-2xl p-4 text-left", n ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-gray-900", dis && !n && "opacity-45")}>
              <button type="button" disabled={dis && !n} onClick={() => tap(gi, o)} aria-label={o.name + (n ? ", " + n + " picked" : "")}>
                <span className={cx("line-clamp-2 text-[17px] font-medium text-gray-900 dark:text-gray-50", n && "pe-9")}>{o.name}</span>
                <span className={cx("text-[15px]", o.oos ? "text-amber-600" : "text-gray-500")}>{o.oos ? "Out of stock" : o.price ? "+" + money(o.price) : "Free"}</span>
                {n ? <span className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white dark:bg-blue-500">{rep ? n : <Icon name="check" className="size-4" />}</span> : null}
                {n && rep ? <span role="button" tabIndex={0} aria-label={"One less " + o.name} onClick={e => { e.stopPropagation(); tap(gi, o, -1); }}
                  className="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-950"><Icon name="minus" className="size-3.5" /></span> : null}
              </button>
            </Card>); })}
      </div>
    </section>));
  if (area) return (
    // the options open in the menu's place, in the same rounded window as Discount; the cart stays in view
    <Panel area={area} title={name} onClose={() => onDone(null)} className="flex flex-col p-0"
      action={<>{onRemove ? <Button variant="secondary" className="h-14 shrink-0 gap-2 rounded-[14px] px-5 text-[17px] text-red-600 dark:text-red-500" onClick={onRemove}><Icon name="trash" className="size-5" />Remove item</Button> : null}
        <Button className="h-14 shrink-0 rounded-[14px] px-7 text-[17px]" onClick={ok}>{(edit ? "Save · " : "Add · ") + money(price() * qty)}</Button></>}>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">{groups}</div>
      {err ? <p className="px-5 pb-2 text-[15px] text-red-600 dark:text-red-500">{err}</p> : null}
      <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Note for this item" aria-label="Item note" className="flex-1" />
        <Stepper n={qty} big onLess={() => setQty(q => Math.max(1, q - 1))} onMore={() => setQty(q => Math.min(99, q + 1))} lessOff={qty <= 1} />
      </div>
    </Panel>);
  return (
    <Sheet title={name} onClose={() => onDone(null)} footer={<>
      <span className="flex-1 text-sm text-red-600 dark:text-red-500">{err}</span>
      <Button variant="secondary" onClick={() => onDone(null)}>Cancel</Button>
      <Button onClick={ok}>{(edit ? "Save · " : "Add · ") + money(price())}</Button></>}>
      {groups}
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-50">Item note</h3>
      <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="No onions, extra spicy…" />
    </Sheet>);
}

export function VariantPicker({ name, setName, list, money, onDone }: { name: string; setName?: string; list: { name: string; price: number; id: string; oos?: boolean }[]; money: (n: number) => string; onDone: (id: string | null) => void }) {
  return (
    <Sheet title={name} onClose={() => onDone(null)} width={620}>
      <div className="mb-3 flex items-center gap-2"><h3 className="font-semibold text-gray-900 dark:text-gray-50">{setName || "Choose a variant"}</h3><Badge variant="neutral">Choose 1</Badge></div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {list.map(v => <Card key={v.id} asChild className={cx("flex h-28 flex-col justify-between rounded-2xl p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-900", v.oos && "opacity-45")}>
          <button type="button" disabled={v.oos} onClick={() => onDone(v.id)}>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">{v.name}</span><span className={cx("text-[17px] font-medium", v.oos ? "text-amber-600" : "text-blue-600 dark:text-blue-500")}>{v.oos ? "Out of stock" : money(v.price)}</span>
          </button></Card>)}
      </div>
    </Sheet>);
}

/** a keypad of Tremor buttons */
export function NumPad({ onKey, dot }: { onKey: (k: string) => void; dot?: boolean }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", dot ? "." : "c", "0", "b"];
  // finger-sized keys: 76px high, soft tinted
  return <div className="grid grid-cols-3 gap-2.5">{keys.map(k => <button type="button" key={k} aria-label={k === "c" ? "Clear" : k === "b" ? "Delete" : k} onClick={() => onKey(k)}
    className={cx("flex h-[76px] items-center justify-center rounded-2xl text-[28px] font-semibold", k === "c" || k === "b" ? "text-gray-700 active:bg-gray-100 dark:text-gray-300 dark:active:bg-gray-900" : "bg-blue-50 text-blue-700 active:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400")}>
    {k === "b" ? <Icon name="del" className="size-7" /> : k === "c" ? <span className="text-base font-medium">Clear</span> : k}</button>)}</div>;
}

// a number typed on the pad: open price, table, guests, opening cash…
export function NumberAsk({ title, initial = "", money, onDone, back }: { title: string; initial?: string; money?: (n: number) => string; onDone: (v: number | null) => void; back?: string }) {
  const [v, setV] = useState(initial);
  const key = (k: string) => setV(s => k === "c" ? "" : k === "b" ? s.slice(0, -1) : k === "." ? (s.includes(".") ? s : (s || "0") + ".") : s.length > 9 ? s : s === "0" ? k : s + k);
  return (
    <Sheet title={title} back={back} onClose={() => onDone(null)} width={380} footer={<>
      <Button variant="secondary" className="flex-1" onClick={() => onDone(null)}>Cancel</Button>
      <Button className="flex-1" disabled={v === "" || isNaN(+v)} onClick={() => onDone(+v)}>OK</Button></>}>
      <div className="mb-4 flex h-20 items-center justify-center rounded-2xl border-2 border-blue-500 text-4xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">{v === "" ? " " : money && !v.endsWith(".") ? money(+v) : v}</div>
      <NumPad onKey={key} dot={!!money} />
    </Sheet>);
}

// a cart line's note (printed on the kitchen ticket) and its discount, as a % (follows the quantity) or an amount
// area: the cart's place on the register: the cart column turns into this line's editor; part: "note" or "disc" only
export type LineEdit = { note: string; disc?: number; discPct?: number; qty?: number; remove?: boolean };
export function LineExtras({ name, unit, qty, note, disc, discPct, money, canPct, canAmt, onDone, area, minQty = 0, part, noDisc }: { name: string; unit: number; qty: number; note?: string; disc?: number; discPct?: number; money: (n: number) => string; canPct: boolean; canAmt: boolean;
  onDone: (r: LineEdit | null) => void; area?: { cartW: string }; minQty?: number; part?: "note" | "disc"; noDisc?: boolean }) {
  const [n, setN] = useState(note || ""), [kind, setKind] = useState<"pct" | "amt">(disc && !discPct && canAmt ? "amt" : canPct ? "pct" : "amt"), [v, setV] = useState(discPct ? String(discPct) : disc ? String(disc) : "");
  const [q, setQ] = useState(qty);
  const full = unit * (area ? q : qty), x = Math.max(0, +v.replace(",", ".") || 0), d = kind === "pct" ? full * Math.min(100, x) / 100 : Math.min(x, full), allowed = kind === "pct" ? canPct : canAmt;
  const save = () => { if (x > 0 && !allowed) return; const base: LineEdit = { note: n.trim(), ...(area && q !== qty ? { qty: q } : {}) };
    onDone(x > 0 ? (kind === "pct" ? { ...base, discPct: Math.min(100, x), disc: +d.toFixed(2) } : { ...base, disc: +d.toFixed(2) }) : base); };
  const key = (k: string) => setV(s => k === "b" ? s.slice(0, -1) : k === "c" ? "" : k === "." ? (s.includes(".") ? s : (s || "0") + ".") : s.length > 7 ? s : s === "0" ? k : s + k);
  const discount = !canPct && !canAmt ? <p className="text-sm text-gray-500">Your role doesn't allow discounts.</p> : <>
    <Tabs value={kind} onValueChange={k => { setKind(k as any); setV(""); }}>
      <TabsList variant="solid" className="w-full">{canPct && <TabsTrigger value="pct" className="flex-1">%</TabsTrigger>}{canAmt && <TabsTrigger value="amt" className="flex-1">Amount</TabsTrigger>}</TabsList></Tabs>
    <div className="flex h-12 items-center justify-between rounded-md border border-gray-300 px-3 dark:border-gray-800"><span className="text-sm text-gray-500">Item discount</span><span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-50">{v || "0"}{kind === "pct" ? " %" : ""}</span></div>
    <NumPad onKey={key} dot={kind === "amt"} /></>;
  if (area) return (
    // in the menu's place like Discount: the quantity, the item's note on the keyboard, and Remove
    <Panel area={area} title={name} onClose={() => onDone(null)} className="flex flex-col gap-4"
      action={<>{!part && !minQty ? <Button variant="secondary" className="h-14 shrink-0 gap-2 rounded-[14px] px-5 text-[17px] text-red-600 dark:text-red-500" onClick={() => onDone({ note: n.trim(), remove: true })}><Icon name="trash" className="size-5" />Remove item</Button> : null}
        <Button className="h-14 shrink-0 rounded-[14px] px-7 text-[17px]" onClick={save}>Save · {money(full - d)}</Button></>}>
      {!part && <div className="flex items-center gap-3">
        <div className="flex items-center rounded-2xl bg-gray-100 dark:bg-gray-900">
          <Button variant="ghost" aria-label="One less" disabled={q <= Math.max(1, minQty)} onClick={() => setQ(z => Math.max(Math.max(1, minQty), z - 1))} className="size-16 rounded-2xl text-blue-700 dark:text-blue-400"><Icon name="minus" className="size-7" /></Button>
          <span className="min-w-14 text-center text-3xl font-semibold tabular-nums text-gray-900 dark:text-gray-50">{q}</span>
          <Button variant="ghost" aria-label="One more" onClick={() => setQ(z => Math.min(999, z + 1))} className="size-16 rounded-2xl text-blue-700 dark:text-blue-400"><Icon name="plus" className="size-7" /></Button></div>
      </div>}
      {part !== "disc" && <div className="relative"><Textarea value={n} inputMode="none" onChange={e => setN(e.target.value)} placeholder="Item note: no onions, extra spicy…" aria-label="Item note" className="min-h-20 text-lg" />
        {n ? <button type="button" onClick={() => setN("")} className="absolute right-2 top-2 rounded-lg px-3 py-2 text-[15px] font-medium text-red-600">Clear</button> : null}</div>}
      {part === "note" || noDisc ? null : discount}
      {part !== "disc" && <div className="mt-auto"><Keyboard onKey={k => setN(m => k === "\b" ? m.slice(0, -1) : (m + k).slice(0, 200))} /></div>}
    </Panel>);
  return (
    <Sheet title={qty + " × " + name} onClose={() => onDone(null)} footer={<><Button variant="secondary" onClick={() => onDone(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-50">Item note</h3>
        <Textarea value={n} onChange={e => setN(e.target.value)} placeholder="No onions, extra spicy…" aria-label="Item note" />
        <h3 className="pt-2 font-semibold text-gray-900 dark:text-gray-50">Item discount</h3>
        {discount}
        <p className="text-sm text-gray-500">{d > 0 ? `${money(full)} − ${money(d)} = ${money(full - d)}` : `Line total ${money(full)}`}</p>
      </div>
    </Sheet>);
}
