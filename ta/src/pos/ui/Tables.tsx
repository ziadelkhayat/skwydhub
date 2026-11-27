"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// Tables (pos.html openTables): the store's tables by section (Manage → Store → Sections & Tables), free or occupied
// with the open order's amount and time. A free table starts an In Store order on it; an occupied one opens its order. Hold one to move it.
import { Button } from "@/components/tremor/Button";
import { Callout } from "@/components/tremor/Callout";
import { Card } from "@/components/tremor/Card";
import { cx } from "@/components/tremor/utils";
import { useEffect, useState } from "react";
import type { Row } from "../lib/db";
import { money, orderFields, totals, type Ctx } from "../lib/pos";
import { useStore } from "../lib/store";
import { useHold } from "./hold";
import { Icon } from "./Icon";
import { Chip, Main, Panel } from "./Touch";

export const tblParts = (n: any) => String(n || "").split("+").map(x => x.trim()).filter(Boolean);   // merged tables are saved as "3+4"
export const tblLbl = (n: any) => { const l = tblParts(n); if (!l.length) return String(n || ""); return l.every(x => /^\d+$/.test(x)) ? (l.length > 1 ? "Tables " : "Table ") + l.join(" + ") : l.join(" + "); };

// a table's colour shows how long it has been open
const AGE = [{ l: "Free", c: "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950", t: "text-emerald-600" }, { l: "Under 15 min", c: "border-emerald-400 portal:border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10", t: "text-emerald-700 dark:text-emerald-400" },
  { l: "15 – 30 min", c: "border-amber-400 portal:border-amber-400 bg-amber-50 dark:bg-amber-500/10", t: "text-amber-700 dark:text-amber-400" }, { l: "30 min – 1 hour", c: "border-orange-500 portal:border-orange-500 bg-orange-50 dark:bg-orange-500/10", t: "text-orange-700 dark:text-orange-400" },
  { l: "Over 1 hour", c: "border-red-500 portal:border-red-500 bg-red-50 dark:bg-red-500/10", t: "text-red-700 dark:text-red-400" }], MERGED = { l: "Merged", c: "border-violet-500 portal:border-violet-500 bg-violet-50 dark:bg-violet-500/10", t: "text-violet-700 dark:text-violet-400" };
export function TablesDialog({ x, onFree, onOpen, onClose, area }: { x: Ctx; onFree: (name: string) => void; onOpen: (o: Row) => void; onClose: () => void; area: { cartW: string } }) {
  const { write } = useStore(), [tm, setTm] = useState<{ mode: "move" | "merge"; from?: string } | null>(null), [msg, setMsg] = useState(""), [confirm, setConfirm] = useState<string | null>(null);
  const press = useHold();
  const cfg = ((x.S.settings.find(s => s.id === "tables") || {}) as any)[x.device.branchId] || [];
  const open = x.S.orders.filter(o => o.branchId === x.device.branchId && ["active", "pending"].includes(o.status) && o.type === "dinein" && String(o.table || "").trim());
  const known = new Set(cfg.map((t: any) => String(t.name).trim()));
  const all: { name: string; section?: string }[] = [...cfg.filter((t: any) => String(t?.name || "").trim()).map((t: any) => ({ ...t, name: String(t.name).trim() })),
    ...[...new Set(open.flatMap(o => tblParts(o.table)))].filter(k => !known.has(k)).map(k => ({ name: k, section: "Other" }))];
  const orders = (k: string) => open.filter(o => tblParts(o.table).includes(k)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const secs = [...new Set(all.map(t => t.section || ""))];
  // Change Table: an occupied table moves to a free one. Merge Tables: the first table's orders join the second's order, and the first becomes free.
  const pick = (k: string) => {
    const busy = orders(k).length; setMsg("");
    if (!tm!.from) { if (!busy) return setMsg("Pick a table with an open order"); return setTm({ ...tm!, from: k }); }
    if (k === tm!.from) return setTm({ mode: tm!.mode });
    if (tm!.mode === "move") { if (busy) return setMsg("Pick a free table"); return setConfirm(k); }
    if (!busy) return setMsg("Pick a table with an open order");
    const dst = orders(k)[0]; if (!orders(tm!.from).some(o => o.id !== dst.id)) return setMsg("These tables are already on one order");
    setConfirm(k);
  };
  const run = (k: string) => { const from = tm!.from!, now = new Date().toISOString();
    if (tm!.mode === "move") orders(from).forEach(o => write("orders", o.id, { table: tblParts(o.table).map(y => (y === from ? k : y)).join("+"), updatedAt: now }));
    else { const dst = orders(k)[0], srcs = orders(from).filter(o => o.id !== dst.id), items = [...(dst.items || []), ...srcs.flatMap(o => o.items || [])];
      const y: Ctx = { ...x, otype: "dinein" }, t = totals(y, items, +dst.discount ? (dst.discountType === "amt" ? { type: "amt", value: +dst.discount } : { type: "pct", value: +dst.discountPct || 0 }) : null, (dst.charges || []).map((c: any) => c.id), Object.fromEntries((dst.charges || []).filter((c: any) => c.type === "open").map((c: any) => [c.id, +c.amount])));
      const f: any = orderFields(y, items, t, { table: String(dst.table || k), guests: [dst, ...srcs].reduce((a, o) => a + (+o.guests || 0), 0), receiptNotes: dst.receiptNotes, notes: dst.notes }); delete f.customerName; delete f.phone; delete f.address;
      write("orders", dst.id, { ...f, updatedAt: now });
      srcs.forEach(o => write("orders", o.id, { status: "declined", voidReason: "Merged into " + (dst.no || dst.ref), doneAt: now, updatedAt: now })); }
    setMsg(tm!.mode === "move" ? `${tblLbl(from)} moved to ${tblLbl(k)}` : `${tblLbl(from)} merged into ${tblLbl(k)}`); setTm(null); setConfirm(null); };
  const mins = (t: string) => Math.max(0, Math.round((Date.now() - +new Date(t)) / 60000)), dur = (m: number) => m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min";
  const [sec, setSec] = useState("");
  const busyN = all.filter(t => orders(t.name).length).length;
  const [, tick] = useState(0); useEffect(() => { const h = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(h); }, []);   // colours follow the clock
  const tap = (k: string) => { if (tm) return pick(k); const os = orders(k), own = os.filter(o => tblParts(o.table)[0] === k); if (!os.length) return onFree(k); onOpen(own[0] || os[0]); };
  const hold = (k: string) => { if (tm) return; if (orders(k).length) { setMsg(""); setTm({ mode: "move", from: k }); } };
  const shown = all.filter(t => !sec || (t.section || "") === sec);
  return (
    // opens in the menu's place like Discount: the cart stays on the left
    <Panel area={area} onClose={onClose} className="flex flex-col p-0" title={!tm ? "Tables" : tm.mode === "move" ? (tm.from ? `Move ${tblLbl(tm.from)} to a free table` : "Pick the table to move") : (tm.from ? `Merge ${tblLbl(tm.from)} into another table` : "Pick the first table to merge")}
      sub={`${busyN} of ${all.length} occupied`}
      action={<>
        <Main variant={tm?.mode === "move" ? "primary" : "secondary"} onClick={() => { setMsg(""); setConfirm(null); setTm(tm?.mode === "move" ? null : { mode: "move" }); }}>{tm?.mode === "move" ? "Cancel" : "Change table"}</Main>
        <Main variant={tm?.mode === "merge" ? "primary" : "secondary"} onClick={() => { setMsg(""); setConfirm(null); setTm(tm?.mode === "merge" ? null : { mode: "merge" }); }}>{tm?.mode === "merge" ? "Cancel" : "Merge"}</Main></>}>
      {msg || confirm ? <Callout className="mx-4 mt-3 text-[16px]" variant={confirm ? "default" : "neutral"} title={confirm ? (tm!.mode === "move" ? `Move ${tblLbl(tm!.from)} to ${tblLbl(confirm)}?` : `Merge ${tblLbl(tm!.from)} into ${tblLbl(confirm)}?`) : msg}>
        {confirm ? <>{tm!.mode === "merge" ? <p>Its items move to {tblLbl(confirm)} and {tblLbl(tm!.from)} becomes free.</p> : null}
          <div className="mt-3 flex gap-2.5 [&>button]:h-14 [&>button]:rounded-[14px] [&>button]:px-7 [&>button]:text-[17px]"><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button onClick={() => run(confirm)}>{tm!.mode === "move" ? "Move" : "Merge"}</Button></div></> : null}</Callout> : null}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {secs.length > 1 ? <div className="mb-4 flex gap-2.5 overflow-x-auto [scrollbar-width:none]">{["", ...secs].map(k => { const l = all.filter(t => !k || (t.section || "") === k);
          return <Chip key={k || "all"} on={sec === k} onClick={() => setSec(k)}>{`${k || "All"} ${l.filter(t => orders(t.name).length).length}/${l.length}`}</Chip>; })}</div> : null}
        {!all.length ? <p className="text-sm text-gray-500">No tables set up for this store yet. Add them in the back office under Manage → Stores → the store → Sections & Tables.</p> :
          <div className="grid flex-1 grid-cols-4 content-start gap-3.5 overflow-y-auto pb-3">{shown.map(t => { const os = orders(t.name), own = os.filter(o => tblParts(o.table)[0] === t.name), m = os[0] ? mins(os[0].createdAt) : 0;
            const busy = os.length > 0, merged = busy && !own.length, on = tm?.from === t.name;
            const age = !busy ? AGE[0] : merged ? MERGED : AGE[m < 15 ? 1 : m < 30 ? 2 : m < 60 ? 3 : 4];
            return <Card key={t.name} asChild className={cx("flex h-[140px] select-none flex-col justify-between rounded-[18px] border-[2.5px] p-4 text-left", age.c, on && "ring-4 ring-blue-500")}>
              <button type="button" aria-label={tblLbl(t.name) + (busy ? ", occupied" : ", free")} {...press(() => tap(t.name), () => hold(t.name))}>
                <span className="flex items-center justify-between"><span className="text-xl font-semibold text-gray-900 dark:text-gray-50">{tblLbl(t.name)}</span>
                  {busy && +(own[0] || os[0]).guests ? <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"><Icon name="user" className="size-3.5" />{+(own[0] || os[0]).guests}</span> : null}</span>
                {!busy ? <span className={cx("text-[15px] font-medium", age.t)}>Free</span> : merged ? <span className={cx("text-xs", age.t)}>Merged with {tblLbl(tblParts(os[0].table)[0])}</span> : <span>
                  <span className="block text-xl font-semibold text-gray-900 dark:text-gray-50">{money(x.S, own.reduce((a, o) => a + (+o.total || 0), 0))}</span>
                  <span className={cx("block text-sm font-semibold", age.t)}>#{own[0].no || "—"}{own.length > 1 ? ` +${own.length - 1}` : ""} · {dur(m)}</span>
                  {tblParts(own[0].table).length > 1 ? <span className="block text-xs text-violet-700 dark:text-violet-400">With {tblParts(own[0].table).filter(y => y !== t.name).map(y => tblLbl(y)).join(", ")}</span> : null}</span>}
              </button></Card>; })}</div>}
        <div className="flex flex-wrap items-center gap-4 pb-3 pt-2">{[...AGE, MERGED].map(a => <span key={a.l} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400"><span className={cx("size-4 rounded border-2", a.c)} />{a.l}</span>)}
          <span className="text-sm text-gray-500">Hold an occupied table to move it.</span></div>
      </div>
    </Panel>);
}
