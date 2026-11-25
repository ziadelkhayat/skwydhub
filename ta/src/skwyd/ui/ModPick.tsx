// The item window of the call center in the TailAdmin look: variants (Size: Small / Large) and modifiers (Sauce: choose 1, Toppings: up to 6).
// Same rules and answer as the shared modpick.js: min / max count every option picked, "free" options cost nothing, a repeatable option
// takes − n +, default options start picked; Add gives { options, unitPrice, mods, note }.
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MinusIcon, PlusIcon } from "@/icons";
import { cn } from "@/utils";
import { useState } from "react";
import { createRoot } from "react-dom/client";

type Opt = { id: string; modifierId: string; name: string; price: number; oos?: boolean };
type Link = { modifierId: string; min?: number; max?: number; free?: number; multi?: boolean; defaults?: string[] };
export type PickIn = { name: string; basePrice: number; links: Link[]; groups: Record<string, { name: string }>; options: Opt[]; money: (n: number) => string; askNote?: boolean;
  // editing a cart line: what was picked, its note, its discount and quantity (the discount is then asked too)
  edit?: { initial: { id: string; modifierId?: string }[]; note?: string; qty: number; disc?: { kind: "pct" | "amt"; v: string } } };
export type PickOut = { options: { id: string; modifierId: string; name: string; price: number }[]; unitPrice: number; mods: string; note?: string; disc?: { kind: "pct" | "amt"; v: number } };

// open a window outside the page's tree and wait for its answer
function host<T>(render: (done: (v: T | null) => void) => React.ReactNode) {
  return new Promise<T | null>(resolve => { const el = document.createElement("div"); document.body.appendChild(el); const root = createRoot(el);
    const done = (v: T | null) => { resolve(v); setTimeout(() => { root.unmount(); el.remove(); }, 0); }; root.render(render(done)); });
}
const rule = (l: Link) => { const mn = +(l.min || 0), mx = +(l.max || 0); return mn && mx && mn === mx ? `Choose ${mn}` : mn && mx ? `Choose ${mn} to ${mx}` : mn ? `Choose at least ${mn}` : mx ? `Up to ${mx}` : "Optional"; };

export function pickMods(o: PickIn): Promise<PickOut | null> {
  const links = (o.links || []).map(l => ({ ...l, opts: (o.options || []).filter(x => x.modifierId === l.modifierId) })).filter(l => l.opts.length);
  if (!links.length && !o.askNote && !o.edit) return Promise.resolve({ options: [], unitPrice: +o.basePrice || 0, mods: "" });
  return host<PickOut>(done => <ModWin o={o} links={links} done={done} />);
}
function ModWin({ o, links, done }: { o: PickIn; links: (Link & { opts: Opt[] })[]; done: (v: PickOut | null) => void }) {
  const [sel, setSel] = useState<Record<string, number>[]>(() => links.map(l => { const m: Record<string, number> = {}; let n = 0;
    if (o.edit) { o.edit.initial.forEach(x => { if (l.opts.some(y => y.id === x.id) && (!x.modifierId || x.modifierId === l.modifierId)) m[x.id] = (m[x.id] || 0) + 1; }); return m; }
    (l.defaults || []).forEach(id => { if (l.opts.some(y => y.id === id) && !(+(l.max || 0) > 0 && n >= +l.max!)) { m[id] = 1; n++; } }); return m; }));
  const [note, setNote] = useState(o.edit?.note || ""), [err, setErr] = useState(""), [open, setOpen] = useState(true);
  const [dk, setDk] = useState<"pct" | "amt">(o.edit?.disc?.kind || "pct"), [dv, setDv] = useState(o.edit?.disc?.v || "");
  const cnt = (gi: number) => Object.values(sel[gi]).reduce((a, n) => a + n, 0);
  const units = (gi: number) => links[gi].opts.flatMap(x => Array(sel[gi][x.id] || 0).fill(x) as Opt[]);
  const price = () => { let t = +o.basePrice || 0; links.forEach((l, gi) => { let free = +(l.free || 0); units(gi).forEach(x => { if (free > 0) free--; else t += +x.price || 0; }); }); return t; };
  const set = (gi: number, id: string, n: number) => setSel(s => s.map((m, j) => { if (j !== gi) return m; const c = { ...m }; if (n <= 0) delete c[id]; else c[id] = n; return c; }));
  const tap = (gi: number, x: Opt) => { const l = links[gi], mx = +(l.max || 0), on = (sel[gi][x.id] || 0) > 0; setErr("");
    if (mx === 1) return setSel(s => s.map((m, j) => j === gi ? (on ? {} : { [x.id]: 1 }) : m));
    if (l.multi) { if (x.oos || (mx > 0 && cnt(gi) >= mx)) return; return set(gi, x.id, (sel[gi][x.id] || 0) + 1); }
    if (on) return set(gi, x.id, 0); if (x.oos || (mx > 0 && cnt(gi) >= mx)) return; set(gi, x.id, 1); };
  const close = (v: PickOut | null) => { setOpen(false); done(v); };
  const ok = () => {
    const bad = links.findIndex((l, gi) => cnt(gi) < +(l.min || 0)); if (bad >= 0) return setErr(`${o.groups?.[links[bad].modifierId]?.name || "Options"}: ${rule(links[bad]).toLowerCase()}`);
    const chosen: PickOut["options"] = []; links.forEach((l, gi) => { let free = +(l.free || 0); units(gi).forEach(x => { const charge = free > 0 ? 0 : +x.price || 0; if (free > 0) free--; chosen.push({ id: x.id, modifierId: l.modifierId, name: x.name, price: charge }); }); });
    const tally: { name: string; n: number }[] = []; chosen.forEach(x => { const t = tally.find(y => y.name === x.name); if (t) t.n++; else tally.push({ name: x.name, n: 1 }); });
    close({ options: chosen, unitPrice: +price().toFixed(2), mods: tally.map(t => (t.n > 1 ? t.n + "× " : "") + t.name).join(", "), ...(o.askNote || o.edit ? { note: note.trim() } : {}), ...(o.edit ? { disc: { kind: dk, v: Math.max(0, +dv || 0) } } : {}) });
  };
  return <Dialog open={open} onOpenChange={v => !v && close(null)}>
    <DialogContent className="flex max-h-[90dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
      <DialogHeader className="border-b border-gray-200 px-6 py-4 dark:border-gray-800"><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{o.name}</DialogTitle></DialogHeader>
      <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {links.map((l, gi) => { const mx = +(l.max || 0), full = mx > 0 && cnt(gi) >= mx, need = +(l.min || 0) > cnt(gi);
          return <section key={l.modifierId}>
            <div className="mb-3 flex flex-wrap items-center gap-2"><h4 className="text-base font-semibold text-gray-900 dark:text-gray-50">{o.groups?.[l.modifierId]?.name || "Options"}</h4>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", +(l.min || 0) ? (need ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" : "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400") : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400")}>{rule(l)}</span>
              {+(l.free || 0) > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">{l.free} free</span>}
              {mx > 1 && <span className="ms-auto text-xs text-gray-500">{cnt(gi)} / {mx}</span>}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{l.opts.map(x => { const n = sel[gi][x.id] || 0, on = n > 0, dis = !on && (x.oos || (full && mx !== 1));
              return <div key={x.id} role="button" tabIndex={dis ? -1 : 0} aria-pressed={on} aria-disabled={dis} onClick={() => !dis && tap(gi, x)} onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && !dis) { e.preventDefault(); tap(gi, x); } }}
                className={cn("relative flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border bg-white p-3 text-center transition select-none dark:bg-gray-900",
                  on ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500 dark:bg-blue-500/10" : "border-gray-200 hover:border-blue-300 dark:border-gray-800", dis && "cursor-not-allowed opacity-45")}>
                {on && <span className="absolute end-2 top-2 flex size-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-semibold text-white">{l.multi && mx !== 1 ? n : "✓"}</span>}
                <b className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-50">{x.name}</b>
                <span className="mt-0.5 text-xs text-gray-500">{x.oos ? <span className="text-amber-600">Out of stock</span> : +x.price ? "+" + o.money(+x.price) : "Free"}</span>
                {l.multi && mx !== 1 && on && <span className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Button size="icon-xs" variant="outline" aria-label={"Less " + x.name} onClick={() => set(gi, x.id, n - 1)}><MinusIcon className="size-3.5" /></Button>
                  <span className="w-5 text-sm font-semibold text-gray-900 dark:text-gray-50">{n}</span>
                  <Button size="icon-xs" variant="outline" aria-label={"More " + x.name} disabled={full || x.oos} onClick={() => set(gi, x.id, n + 1)}><PlusIcon className="size-3.5" /></Button></span>}
              </div>; })}</div>
          </section>; })}
        {(o.askNote || o.edit) && <section><h4 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-50">Item Note</h4><Textarea rows={2} placeholder="e.g. no onions" value={note} onChange={e => setNote(e.target.value)} /></section>}
        {o.edit && (() => { const line = price() * o.edit.qty, n = Math.max(0, +dv || 0), d = dk === "pct" ? line * Math.min(100, n) / 100 : Math.min(n, line);
          return <section><h4 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-50">Item Discount</h4>
            <div className="flex gap-2"><div className="flex shrink-0 rounded-lg border border-gray-300 p-0.5 dark:border-gray-700">{([["pct", "%"], ["amt", "Amount"]] as const).map(([k, t]) => <button key={k} type="button" onClick={() => setDk(k)} className={cn("h-9 rounded-md px-3 text-sm", dk === k ? "bg-blue-500 text-white" : "text-gray-600 dark:text-gray-400")}>{t}</button>)}</div>
              <input type="number" min="0" step="any" value={dv} placeholder="0" aria-label="Item discount" onChange={e => setDv(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-blue-300 focus:ring-3 focus:ring-blue-500/10 focus:outline-none dark:border-gray-700 dark:text-gray-50" /></div>
            <p className="mt-1.5 text-xs text-gray-500">{o.edit.qty} × {o.money(price())}{d > 0 ? ` − ${o.money(d)} = ${o.money(line - d)}` : ` = ${o.money(line)}`}</p></section>; })()}
      </div>
      <div className="flex items-center gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        <span className="flex-1 text-sm text-red-500">{err}</span>
        <Button variant="outline" onClick={() => close(null)}>Cancel</Button><Button onClick={ok}>{o.edit ? "Save" : `Add · ${o.money(price())}`}</Button>
      </div>
    </DialogContent></Dialog>;
}

// variants: pick one size before the modifiers
export function pickVariant<V extends { name: string; price: number }>(o: { name: string; setName: string; variants: V[]; money: (n: number) => string }): Promise<V | null> {
  const list = (o.variants || []).filter(v => v && v.name); if (list.length < 2) return Promise.resolve(list[0] || null);
  return host<V>(done => <VarWin o={o} list={list} done={done} />);
}
function VarWin<V extends { name: string; price: number }>({ o, list, done }: { o: { name: string; setName: string; money: (n: number) => string }; list: V[]; done: (v: V | null) => void }) {
  const [open, setOpen] = useState(true), close = (v: V | null) => { setOpen(false); done(v); };
  return <Dialog open={open} onOpenChange={v => !v && close(null)}><DialogContent className="w-full p-0 sm:max-w-xl">
    <DialogHeader className="border-b border-gray-200 px-6 py-4 dark:border-gray-800"><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{o.name}</DialogTitle></DialogHeader>
    <div className="px-6 py-5"><h4 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-50">{o.setName}</h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{list.map((v, i) => <button key={i} type="button" onClick={() => close(v)} className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-3 text-center transition hover:border-blue-500 hover:bg-blue-50/60 dark:border-gray-800 dark:bg-gray-900">
        <b className="text-sm font-medium text-gray-900 dark:text-gray-50">{v.name}</b><span className="mt-0.5 text-xs text-gray-500">{o.money(+v.price || 0)}</span></button>)}</div></div>
    <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-800"><Button variant="outline" onClick={() => close(null)}>Cancel</Button></div>
  </DialogContent></Dialog>;
}
