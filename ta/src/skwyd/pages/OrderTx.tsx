import { InfoList, PageHead } from "../ui/Record";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
// Order Transactions: what each completed sale took out of stock (Consumption From Order) and what voided sales put back (Return From Order).
// Read from the order_transactions table, 50 per page, newest first, for the chosen store; a transaction opens as its own page with its items.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, DownloadIcon } from "@/icons";
import { sb } from "@/lib/supabase";
import { fmtDateTime, money } from "@/lib/util";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { live, useS } from "../crud/CrudPage";
import { EmptyState } from "../ui/EmptyState";
import { TD, TH, TR } from "../ui/kit";
import { Pager } from "../ui/Pager";
import { toast } from "../ui/toast";
import { csv } from "./em";
import { StoreFilter } from "./Team";

const PER = 50;
const n2 = (v: any) => (+v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const cutOf = (v?: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ""); return m ? Math.min(719, (+m[1]) * 60 + (+m[2])) : 0; };
const isoDay = (d: Date) => new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dmy = (d: string) => d ? d.slice(0, 10).split("-").reverse().join("-") : "—";
const kindName = (k: string) => k === "return" ? "Return From Order" : "Consumption From Order";

export default function OrderTxPage() {
  const s = useS(["branches", "brands", "inv_items", "settings", "day_closes"]);
  const [sp, setSp] = useSearchParams(), openId = sp.get("id");
  const [brand, setBrand] = useState(""), [branch, setBranch] = useState(""), [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[] | null>(null), [count, setCount] = useState(0), [err, setErr] = useState(""), [one, setOne] = useState<any>(null);
  const brIds = s ? s.branches.filter(b => live(b) && (!brand || brand.split(",").includes(b.brandId))).map(b => b.id) : [];
  useEffect(() => { if (!s) return; let off = false; setRows(null);
    let q = sb.from("order_transactions").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);
    if (branch) q = q.in("branch_id", branch.split(",")); else if (brand) q = q.in("branch_id", brIds.length ? brIds : ["-"]);
    q.then(({ data, error, count }) => { if (off) return; if (error) { setErr(error.message); setRows([]); } else { setErr(""); setRows(data || []); setCount(count ?? (page - 1) * PER + (data || []).length); } });
    return () => { off = true; }; }, [!!s, brand, branch, page]); // eslint-disable-line react-hooks/exhaustive-deps
  // an opened transaction that isn't on this page (a shared link) is loaded on its own
  useEffect(() => { if (!openId) { setOne(null); return; } const r = rows?.find(x => x.id === openId); if (r) { setOne(r); return; }
    sb.from("order_transactions").select("*").eq("id", openId).maybeSingle().then(({ data }) => setOne(data || false)); }, [openId, rows]);
  if (!s) return null;
  const bName = (id: string) => s.branches.find(b => b.id === id)?.name || "—";
  const co: any = s.settings.find(x => x.id === "company") || {};
  // the business day of the sale: a store's day starts at its day start (or the company's day end); a day ended early starts the next one
  const bizDate = (t: any, bid?: string) => { if (!t) return ""; const ms = +new Date(t); let d = isoDay(new Date(ms - cutOf(s.branches.find(b => b.id === bid)?.settings?.dayStart || co.dayEnd) * 60000));
    for (let i = 0; i < 3 && bid; i++) { const c = s.day_closes.find(x => x.branchId === bid && String(x.businessDate).slice(0, 10) === d); if (c && +new Date(c.closedAt) <= ms) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + 1); d = isoDay(x); } else break; } return d; };
  const bd = (r: any) => dmy(r.business_date || bizDate(r.created_at, r.branch_id) || String(r.created_at || "").slice(0, 10));
  const open = (id: string | null) => { const n = new URLSearchParams(sp); if (id) n.set("id", id); else n.delete("id"); setSp(n); scrollTo(0, 0); };

  if (openId) {
    if (one === null) return null;
    if (one === false) return <><PageBreadcrumb pageTitle="Order Transactions" /><EmptyState text="This transaction wasn't found."><Button variant="outline" onClick={() => open(null)}>Back</Button></EmptyState></>;
    const r = one, ret = r.kind === "return", item = (id: string) => s.inv_items.find(i => i.id === id);
    const print = () => { const w = window.open("", "_blank", "width=820,height=900"); if (!w) return toast("Allow pop-ups to print", "error");
      const e = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);
      w.document.write(`<title>${e(r.ref)}</title><style>body{font:14px system-ui;padding:24px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}td:last-child,th:last-child{text-align:right}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.g span{display:block;color:#666;font-size:12px}</style>
        <h1>${ret ? "Return" : "Consumption"} from order (${e(r.ref)})</h1><div class="g">${[["Store", bName(r.branch_id)], ["Business Date", bd(r)], ["Submitted At", fmtDateTime(r.created_at)], ["Order Reference", r.order_no || "—"], ["Total Cost", money(r.total_cost)]].map(([l, v]) => `<div><span>${l}</span>${e(v)}</div>`).join("")}</div>
        <Table><TableHead><TableRow><TableHeaderCell>Name</TableHeaderCell><TableHeaderCell>Quantity</TableHeaderCell></TableRow></TableHead><TableBody>${(r.items || []).map((x: any) => { const it = item(x.itemId); return `<TableRow><TableCell>${e(it?.name || "(deleted item)")}</TableCell><TableCell>${n2(x.qty)} ${e(it?.storageUnit || "")}</TableCell></TableRow>`; }).join("")}</TableBody></Table><script>window.onload=()=>window.print()<\/script>`); w.document.close(); };
    return <>
      <PageBreadcrumb pageTitle="Order Transactions" current={r.ref} />
      <PageHead back={<><Button variant="outline" size="sm" onClick={() => open(null)}><ArrowLeftIcon className="size-4" />Order Transactions</Button></>} title={<>{ret ? "Return" : "Consumption"} from order ({r.ref})</>} badges={<><Badge variant="light" color="success">Closed</Badge>
        <Button variant="outline" className="ms-auto" onClick={print}>Print</Button></>} />
      <InfoList rows={[["Store", bName(r.branch_id)], ["Business Date", bd(r)], ["Submitted At", fmtDateTime(r.created_at)], ["Order Reference", r.order_no ? String(r.order_no) : "—"], ["Type", kindName(r.kind)], ["Total Cost", money(r.total_cost)]] as [string, React.ReactNode][]} />
      <div className="space-y-3"><h3 className="border-b border-gray-200 px-5 py-4 text-base font-medium text-gray-800 dark:border-gray-800 dark:text-gray-50">Items</h3>
        <div className="overflow-x-auto"><Table className="w-full"><TableHead><TableRow><TableHeaderCell className={TH}>Name</TableHeaderCell><TableHeaderCell className={TH + " text-end"}>Quantity</TableHeaderCell></TableRow></TableHead><TableBody>
          {(r.items || []).map((x: any, i: number) => { const it = item(x.itemId); return <TableRow key={i} className={TR}><TableCell className={TD}>{it?.name || "(deleted item)"}</TableCell><TableCell className={TD + " text-end"}>{n2(x.qty)} {it?.storageUnit || ""}</TableCell></TableRow>; })}
          {!(r.items || []).length && <TableRow><TableCell colSpan={2} className={TD + " text-center text-gray-500"}>No items.</TableCell></TableRow>}</TableBody></Table></div></div>
    </>;
  }

  const pages = Math.max(1, Math.ceil(count / PER));
  return <>
    <PageBreadcrumb pageTitle="Order Transactions" />
    <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">Every completed sale takes its recipe ingredients (item and options, for its order type) out of the store's stock. Voided sales put them back.</p>
    <div className="space-y-3">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center dark:border-gray-800">
        <StoreFilter s={s as any} brand={brand} setBrand={v => { setBrand(v); setPage(1); }} branch={branch} setBranch={v => { setBranch(v); setPage(1); }} />
        <Button variant="outline" className="sm:ms-auto" disabled={!rows?.length} onClick={() => csv("order-transactions.csv", [["Reference", "Store", "Order Reference", "Type", "Business Date", "Created"], ...(rows || []).map(r => [r.ref, bName(r.branch_id), r.order_no || "", kindName(r.kind), bd(r), fmtDateTime(r.created_at)])])}><DownloadIcon className="size-5" />Export</Button>
      </div>
      {err ? <EmptyState text={"Couldn't load the transactions: " + err} /> : rows === null ? <p className="p-10 text-center text-sm text-gray-500">Loading…</p> : !rows.length ? <EmptyState text="No transactions yet" /> :
        <div className="overflow-x-auto"><Table className="w-full min-w-[760px]"><TableHead><TableRow>{["Reference", "Store", "Order Reference", "Type", "Business Date", "Created"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}</TableRow></TableHead><TableBody>
          {rows.map(r => <TableRow key={r.id} className={TR + " cursor-pointer hover:bg-gray-50 dark:hover:bg-white/3"} onClick={() => open(r.id)}>
            <TableCell className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{r.ref}</TableCell><TableCell className={TD}>{bName(r.branch_id)}</TableCell><TableCell className={TD}>{r.order_no || "—"}</TableCell>
            <TableCell className={TD}><Badge variant="light" color={r.kind === "return" ? "warning" : "primary"}>{kindName(r.kind)}</Badge></TableCell><TableCell className={TD}>{bd(r)}</TableCell><TableCell className={TD}>{fmtDateTime(r.created_at)}</TableCell></TableRow>)}</TableBody></Table></div>}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row dark:border-gray-800">
        <span className="text-sm text-gray-500">{count} transaction{count === 1 ? "" : "s"}</span>{pages > 1 && <Pager currentPage={page} totalPages={pages} onPageChange={setPage} />}</div>
    </div>
  </>;
}
