// An order opened from Orders, Call Center or a customer: its own page, laid out like the other detail pages
// (back button, details tiles, then customer, items with totals, payment, and links to its return or original order).
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCol } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDate, money, openWin } from "@/lib/util";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { TD, TR } from "../ui/kit";
import { Head, Info, None, Sec } from "./Details";
// the item list is kept compact: short rows, small type
const ITH = "px-3 py-2 text-start text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400", ITD = "px-3 py-1.5 text-sm text-gray-700 dark:text-gray-400", ITR = "border-t border-gray-100 dark:border-white/5";
import { CHL, chkNo, ORD_ST, ordRef, srcOf, ST_COLOR, tel, TYPE_LBL, camel } from "./Orders";

const tm = (t?: string) => t ? fmtDate(t) + " " + new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";
const q2 = (n: any) => (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OrderPage() {
  const id = useSearchParams()[0].get("id") || "";
  const branches = useCol("branches") || [], brands = useCol("brands") || [], users = useCol("users") || [];
  const [o, setO] = useState<any>(undefined), [rel, setRel] = useState<any[]>([]);
  useEffect(() => { let off = false; setO(undefined); setRel([]);
    (async () => {
      const { data } = await sb.from("orders").select("*").eq("id", id).maybeSingle(); if (off) return;
      const x = data ? camel(data) : null; setO(x); if (!x) return;
      // its returns, or the order it returns
      const r = x.refundOf ? await sb.from("orders").select("id,ref,no,invoice_no,return_no,status,total,created_at").eq("id", x.refundOf)
        : await sb.from("orders").select("id,ref,no,invoice_no,return_no,status,total,created_at").eq("refund_of", x.id);
      if (!off) setRel((r.data || []).map(camel));
    })();
    return () => { off = true; }; }, [id]);
  const back = <Head back="Orders" backTo="/orders" title={o ? ordRef(o) : "Order"} />;
  if (o === undefined) return <>{back}<None t="Loading the order…" /></>;
  if (!o) return <>{back}<None t="This order wasn't found." /></>;
  const items: any[] = o.items || [], pay = o.payment || {}, ret = o.status === "refund";
  const who = (v?: string) => users.find(u => u.id === v || u.userId === v)?.name || v || "—";
  const charges: any[] = (o.charges || []).filter((c: any) => +c.amount);
  return <>
    <Head back="Orders" backTo="/orders" title={ordRef(o)}><Badge variant="light" color={ST_COLOR[o.status] || "gray"}>{ORD_ST[o.status] || o.status}</Badge></Head>
    <Info rows={[["Reference", o.ref || "—"], ["Check Number", chkNo(o)], ["Order Number", o.no || "—"], ["Status", ORD_ST[o.status] || o.status],
      ["Brand", brands.find(b => b.id === o.brandId)?.name || "—"], ["Store", branches.find(b => b.id === o.branchId)?.name || "—"],
      ["Sales Channel", CHL[o.channel] || o.channel || "—"], ["Order Type", (TYPE_LBL[o.type] || o.type || "—") + (o.type === "dinein" && o.table ? " · " + (/^\d+$/.test(String(o.table).trim()) ? "Table " + o.table : o.table) : "")],
      ["Order Source", srcOf(o) || "—"], ["Business Date", fmtDate(o.createdAt)], ["Opened At", tm(o.createdAt)], ["Closed At", tm(o.doneAt || o.closedAt)],
      ["Payment Type", pay.method || "—"], ["Created By", who(o.agent)], ...(o.handledBy ? [["Handled By", who(o.handledBy)] as [string, string]] : []),
      ...(ret && o.returnReason ? [["Return Reason", o.returnReason] as [string, string]] : []), ...(o.voidReason ? [["Void Reason", o.voidReason] as [string, string]] : [])]} />

    {(o.customerName || o.phone || o.address) && <Sec title="Customer" act={o.customerId ? <Button size="sm" variant="outline" onClick={() => openWin("/customer?id=" + o.customerId)}>Open Customer</Button> : undefined}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div><span className="block text-sm text-gray-500">Name</span><b className="text-sm font-medium text-gray-800 dark:text-white/90">{o.customerName || "—"}</b></div>
        <div><span className="block text-sm text-gray-500">Phone</span>{o.phone ? <a className="text-sm font-medium text-brand-500" href={"tel:" + o.phone}>{tel(o.phone)}</a> : "—"}</div>
        {o.address && <div><span className="block text-sm text-gray-500">Address</span><b className="text-sm font-medium break-words text-gray-800 dark:text-white/90">{o.address}</b></div>}
      </div></Sec>}

    <Sec title="Items">
      {!items.length ? <None t="No items." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={ITH}>Item</th><th className={ITH + " text-end"}>Quantity</th><th className={ITH + " text-end"}>Price</th><th className={ITH + " text-end"}>Total</th></tr></thead><tbody>
        {items.map((it, i) => <tr key={i} className={ITR + (it.voided ? " opacity-60" : "")}>
          <td className={ITD}><span className={"font-medium text-gray-800 dark:text-white/90" + (it.voided ? " line-through" : "")}>{it.name}</span>{it.voided && <Badge className="ms-2" variant="light" color="error">Void</Badge>}
            {it.mods && <span className="block text-xs text-gray-500">{String(it.mods)}</span>}{it.note && <span className="block text-xs text-gray-500">Note: {it.note}</span>}</td>
          <td className={ITD + " text-end"}>{q2(it.qty)}</td><td className={ITD + " text-end"}>{money(it.price)}</td><td className={ITD + " text-end"}>{money((+it.price || 0) * (+it.qty || 0) - (+it.disc || 0))}</td></tr>)}
        {([["Subtotal", o.subtotal], ["Discount", -(+o.discount || 0)], ...charges.map(c => [c.name, c.amount]), ["Delivery Fee", o.deliveryFee], ["Tax", o.tax]] as [string, any][])
          .filter(([, v]) => v != null && +v !== 0).map(([l, v]) => <tr key={l}><td colSpan={3} className={ITD + " text-end text-gray-500"}>{l}</td><td className={ITD + " text-end"}>{money(v)}</td></tr>)}
        <tr><td colSpan={3} className={ITD + " text-end font-semibold text-gray-800 dark:text-white/90"}>Total</td><td className={ITD + " text-end font-semibold text-gray-800 dark:text-white/90"}>{money(o.total)}</td></tr>
      </tbody></table></div>}
    </Sec>

    {(pay.method || (pay.split || []).length) && <Sec title="Payment">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div><span className="block text-sm text-gray-500">Method</span><b className="text-sm font-medium text-gray-800 dark:text-white/90">{pay.method || "—"}</b></div>
        {pay.tendered != null && <div><span className="block text-sm text-gray-500">Tendered</span><b className="text-sm font-medium text-gray-800 dark:text-white/90">{money(pay.tendered)}</b></div>}
        {+pay.change ? <div><span className="block text-sm text-gray-500">Change</span><b className="text-sm font-medium text-gray-800 dark:text-white/90">{money(pay.change)}</b></div> : null}
      </div></Sec>}

    {o.notes && <Sec title="Notes"><p className="text-sm whitespace-pre-line text-gray-700 dark:text-gray-300">{o.notes}</p></Sec>}

    {rel.length > 0 && <Sec title={ret ? "Original Order" : "Returns"}>
      <table className="w-full"><tbody>{rel.map(r => <tr key={r.id} className={TR}>
        <td className={TD}><Link className="font-medium text-brand-500 hover:underline" to={"/order?id=" + r.id}>{ordRef(r)}</Link></td><td className={TD}>Check {chkNo(r)}</td>
        <td className={TD}>{fmtDate(r.createdAt)}</td><td className={TD + " text-end"}>{money(r.total)}</td></tr>)}</tbody></table></Sec>}
  </>;
}
