// Search across the back office from the top bar: pick what to search (Menu, Customers, Orders, Inventory…), type, open the result.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { RiArrowDownSLine, RiSearchLine } from "@remixicon/react";
import { useAccess } from "@/lib/access";
import { useCol, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { cx } from "@/components/tremor/utils";

type Hit = { id: string; label: string; sub?: string; to: string };
const KINDS: [string, string, string][] = [
  ["menu", "Menu", "/products"], ["customers", "Customers", "/customers"], ["orders", "Orders", "/orders"], ["inventory", "Inventory", "/inv-items"],
  ["employees", "Employees", "/users"], ["stores", "Stores", "/branches"], ["suppliers", "Suppliers", "/suppliers"]];
const low = (x: unknown) => String(x ?? "").toLowerCase();
const has = (q: string, ...v: unknown[]) => v.some(x => low(x).includes(q));
const live = (r: Row) => !r.deleted;

/** hits from a list already kept in the browser (items, inventory, employees, stores, suppliers) */
function useLocal(col: string, on: boolean, q: string, map: (r: Row) => Hit | null, also?: string): Hit[] {
  const rows = useCol(on ? col : "brands"), extra = useCol(on && also ? also : "brands");
  if (!on || !q || !rows) return [];
  const all = [...rows, ...(also && extra ? extra : [])];
  return all.filter(live).map(r => ({ r, h: map(r) })).filter(x => x.h && has(q, x.h.label, x.h.sub, x.r.sku, x.r.barcode, x.r.phone, x.r.email, x.r.code, x.r.reference, x.r.nameAr)).slice(0, 8).map(x => x.h!);
}

export function GlobalSearch() {
  const { canOpen } = useAccess(), nav = useNavigate();
  const kinds = KINDS.filter(k => canOpen(k[2]));
  const [kind, setKind] = useState(kinds[0]?.[0] || "menu"), [q, setQ] = useState(""), [open, setOpen] = useState(false), [remote, setRemote] = useState<Hit[] | null>(null), [act, setAct] = useState(0);
  const box = useRef<HTMLDivElement>(null), qq = q.trim().toLowerCase();
  const menu = useLocal("products", kind === "menu", qq, r => ({ id: r.id, label: r.name, sub: r.sku || "Item", to: "/item?id=" + r.id }));
  const opts = useLocal("modifier_options", kind === "menu", qq, r => ({ id: r.id, label: r.name, sub: (r.sku ? r.sku + " · " : "") + "Modifier option", to: "/option?id=" + r.id }));
  const inv = useLocal("inv_items", kind === "inventory", qq, r => ({ id: r.id, label: r.name, sub: r.sku || "Inventory product", to: "/inv-item?id=" + r.id }));
  const emp = useLocal("users", kind === "employees", qq, r => r.role === "owner" || r.role === "admin" ? null : ({ id: r.id, label: r.name, sub: r.phone || r.email || "", to: "/employee?id=" + r.id }));
  const st = useLocal("branches", kind === "stores", qq, r => ({ id: r.id, label: r.name, sub: r.code || "", to: "/store?id=" + r.id }));
  const sup = useLocal("suppliers", kind === "suppliers", qq, r => ({ id: r.id, label: r.name, sub: r.code || r.phone || "", to: "/supplier?id=" + r.id }));
  // customers and orders are searched on the server (there can be many)
  useEffect(() => {
    setRemote(null); if (!qq || (kind !== "customers" && kind !== "orders")) return;
    let off = false; const t = setTimeout(async () => {
      const like = "%" + q.trim().replace(/[%,()]/g, "") + "%", num = /^\d+$/.test(q.trim());
      if (kind === "customers") {
        const { data } = await sb.from("customers").select("id,name,phone").is("deleted_at", null).or(`name.ilike.${like},phone.ilike.${like.replace(/\s/g, "")}`).limit(8);
        if (!off) setRemote((data || []).map((c: any) => ({ id: c.id, label: c.name || "Unnamed", sub: c.phone, to: "/customer?id=" + c.id })));
      } else {
        const f = num ? `ref.eq.${q.trim()},invoice_no.eq.${q.trim()},phone.ilike.${like}` : `customer_name.ilike.${like},phone.ilike.${like},ref.ilike.${like}`;
        const { data } = await sb.from("orders").select("id,ref,invoice_no,customer_name,total,created_at").or(f).order("created_at", { ascending: false }).limit(8);
        if (!off) setRemote((data || []).map((o: any) => ({ id: o.id, label: "Order " + (o.ref || o.invoice_no || ""), sub: [o.customer_name, new Date(o.created_at).toLocaleDateString()].filter(Boolean).join(" · "), to: "/order?id=" + o.id })));
      } }, 250);
    return () => { off = true; clearTimeout(t); };
  }, [qq, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  const hits: Hit[] = kind === "menu" ? [...menu, ...opts].slice(0, 8) : kind === "inventory" ? inv : kind === "employees" ? emp : kind === "stores" ? st : kind === "suppliers" ? sup : remote || [];
  const go = (h?: Hit) => { if (!h) return; setOpen(false); setQ(""); nav(h.to); };
  if (!kinds.length) return null;
  return (
    <div ref={box} className="relative w-full max-w-md">
      <div className="flex h-9 items-center rounded-lg border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 dark:border-gray-800 dark:bg-gray-950 dark:focus-within:ring-blue-500/30">
        <label className="relative flex h-full shrink-0 items-center gap-1.5 border-e border-gray-200 ps-3 pe-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300">
          <RiSearchLine className="size-4 text-gray-500" aria-hidden="true" />{kinds.find(k => k[0] === kind)?.[1]}<RiArrowDownSLine className="size-4 text-gray-500" aria-hidden="true" />
          <select aria-label="Search in" value={kind} onChange={e => { setKind(e.target.value); setAct(0); setOpen(!!q); }} className="absolute inset-0 cursor-pointer opacity-0">
            {kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); setAct(0); }} onFocus={() => q && setOpen(true)} placeholder={"Search " + (kinds.find(k => k[0] === kind)?.[1] || "").toLowerCase() + "…"}
          onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); setAct(a => Math.min(a + 1, hits.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setAct(a => Math.max(a - 1, 0)); } else if (e.key === "Enter") go(hits[act]); else if (e.key === "Escape") setOpen(false); }}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-0 dark:text-gray-50 dark:placeholder-gray-500" aria-label="Search" />
      </div>
      {open && qq && <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-950">
        {!hits.length ? <p className="px-3 py-2.5 text-sm text-gray-500">{(kind === "customers" || kind === "orders") && remote === null ? "Searching…" : "No matches."}</p>
          : hits.map((h, i) => <button key={h.id} type="button" onMouseEnter={() => setAct(i)} onClick={() => go(h)}
            className={cx("flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm", i === act ? "bg-gray-100 dark:bg-gray-900" : "")}>
            <span className="truncate font-medium text-gray-900 dark:text-gray-50">{h.label}</span>{h.sub && <span className="shrink-0 truncate text-xs text-gray-500">{h.sub}</span>}</button>)}
      </div>}
    </div>
  );
}
