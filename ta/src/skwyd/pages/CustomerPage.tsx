// A customer's page, as in the current portal: insights (orders, spent, average, favourite item and store,
// first and last order, customer since), details, addresses (saved and from orders), tags, house account, and every order.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { useCol } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDate, money, openWin } from "@/lib/util";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { BOX, F, SEL, TD, TH, TR } from "../ui/kit";
import { askYes } from "../ui/confirm";
import { PickMany } from "../ui/PickMany";
import { toast } from "../ui/toast";
import { addrJoin, addrSplit, type Addr } from "./CallCenterOrder";
import { CustomerDialog } from "./Customers";
import { Head, Info, None, Sec } from "./Details";
import { camel, chkNo, ORD_ST, ordRef, srcOf, ST_COLOR, tel, TYPE_LBL } from "./Orders";

const ORDER_COLS = "id,ref,no,invoice_no,return_no,created_at,branch_id,channel,type,table_no,source,payment,status,total,discount,items,address";
const top = (m: Record<string, number>) => { let best = "", n = 0; for (const [k, v] of Object.entries(m)) if (v > n) { best = k; n = v; } return best; };
const num = (v: any) => v && typeof v === "object" ? +(v.amount ?? v.value ?? 0) || 0 : +v || 0;

export default function CustomerPage() {
  const id = useSearchParams()[0].get("id") || "";
  const branches = useCol("branches") || [], zones = useCol("zones") || [], sets = useCol("settings") || [];
  const [aed, setAed] = useState<{ ix: number | null; v: string; zoneId?: string } | null>(null);
  const [c, setC] = useState<any>(undefined), [orders, setOrders] = useState<any[]>([]), [ha, setHa] = useState<any[]>([]), [edit, setEdit] = useState(false), [tick, setTick] = useState(0);
  useEffect(() => { let off = false;
    Promise.all([sb.from("customers").select("*").eq("id", id).maybeSingle(),
      sb.from("orders").select(ORDER_COLS).eq("customer_id", id).order("created_at", { ascending: false }).limit(500),
      sb.from("house_account_txns").select("*").eq("customer_id", id).order("created_at", { ascending: false }).limit(500)])
      .then(([a, b, h]) => { if (off) return; setC(a.data || null); setOrders((b.data || []).map(camel)); setHa(h.error ? [] : h.data || []); });
    return () => { off = true; }; }, [id, tick]);
  const back = <Head back="Customers" backTo="/customers" title={c?.name || "Customer"} />;
  if (c === undefined) return <>{back}<None t="Loading the customer…" /></>;
  if (!c) return <>{back}<None t="This customer wasn't found." /></>;

  const done = orders.filter(o => o.status === "closed"), spent = done.reduce((s, o) => s + (+o.total || 0), 0), disc = done.reduce((s, o) => s + num(o.discount), 0);
  const prod: Record<string, number> = {}, brs: Record<string, number> = {};
  done.forEach(o => { brs[o.branchId] = (brs[o.branchId] || 0) + 1; (o.items || []).forEach((i: any) => { if (!i.voided) prod[i.name || "—"] = (prod[i.name || "—"] || 0) + (+i.qty || 1); }); });
  const bName = (b?: string) => branches.find(x => x.id === b)?.name || "—", first = orders[orders.length - 1], last = orders[0];
  const since = first?.createdAt && (!c.created_at || first.createdAt < c.created_at) ? first.createdAt : c.created_at;
  const haBal = +ha.reduce((s, t) => s + (t.kind === "payment" ? +t.amount : -t.amount), 0).toFixed(2);
  // addresses: the saved ones, then any address used on an order that isn't saved yet
  const addrs: any[] = c.addresses || [], key = (v: any) => String(v || "").trim().replace(/^\[.*?\]\s*/, "").toLowerCase().replace(/[:·,]/g, " ").replace(/\s+/g, " ").trim();
  const seen = new Set(addrs.map(a => key(a.address))), used: string[] = [];
  orders.forEach(o => { const v = String(o.address || "").trim(), k = key(v); if (v && !seen.has(k)) { seen.add(k); used.push(v); } });
  const upd = async (d: Record<string, any>, msg: string) => { const { error } = await sb.from("customers").update({ ...d, updated_at: new Date().toISOString() }).eq("id", c.id); if (error) { toast("Couldn't save.", "error"); return false; } toast(msg); setTick(t => t + 1); return true; };
  const saveAddr = (v: string) => upd({ addresses: [...addrs, { address: v, createdAt: new Date().toISOString() }] }, "Address saved");
  const tagList: string[] = (((sets.find(x => x.id === "tags") as any)?.list || []) as any[]).filter(t => t.type === "customer" && !t.deleted).map(t => t.name), myTags: string[] = c.tags || [];

  const stats: [string, string][] = [["Done Orders", String(done.length)], ["Total Spent", money(spent)], ["Average Order", money(done.length ? spent / done.length : 0)], ["Total Discounts", money(disc)],
    ["Favourite Item", top(prod) || "—"], ["Favourite Store", top(brs) ? bName(top(brs)) : "—"], ["First Order", first ? fmtDate(first.createdAt) : "—"], ["Last Order", last ? fmtDate(last.createdAt) : "—"],
    ...(c.house_account || ha.length ? [["Account Balance", money(haBal)] as [string, string]] : [])];

  return <>
    <Head back="Customers" backTo="/customers" title={c.name || tel(c.phone)}>
      {c.blacklisted && <Badge variant="light" color="error">Blacklisted</Badge>}
      <Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Customer</Button></Head>

    <div className={BOX + " mb-6 p-5"}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-base font-medium text-gray-900 dark:text-gray-50">Customer Insights</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">Customer since {since ? fmtDate(since) : "—"}</span></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([l, v]) => <div key={l} className="rounded-md bg-gray-50 p-4 dark:bg-[#090E1A]">
        <span className="block text-xs text-gray-500 dark:text-gray-400">{l}</span><b className="mt-1 block text-base font-semibold break-words text-gray-900 dark:text-gray-50">{v}</b></div>)}</div>
    </div>

    <Info rows={[["Name", c.name || "—"], ["Phone", c.phone ? <a className="text-blue-500" href={"tel:" + c.phone}>{tel(c.phone)}</a> : "—"], ["Email", c.email || "—"], ["Birth Date", c.birthday ? fmtDate(c.birthday + "T12:00:00") : "—"],
      ["Gender", ({ male: "Male", female: "Female" } as any)[c.gender] || "—"], ["Loyalty", c.loyalty ? "Enabled" : "Disabled"], ["House Account", c.house_account ? "Enabled" : "Disabled"], ["Created", fmtDate(c.created_at)],
      ...(c.notes ? [["Customer Notes", c.notes] as [string, string]] : [])]} />

    <Sec title="Addresses" act={<Button size="sm" onClick={() => setAed({ ix: null, v: "" })}><PlusIcon className="size-4" />Add Address</Button>}>
      {!addrs.length && !used.length ? <None t="No addresses yet." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Address", "Delivery Zone", "Added", ""].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
        {addrs.map((a, i) => <tr key={"s" + i} className={TR}><td className={TD + " whitespace-normal text-gray-900 dark:text-gray-50"}>{a.address}</td><td className={TD}>{zones.find(z => z.id === a.zoneId)?.name || "—"}</td><td className={TD}>{a.createdAt ? fmtDate(a.createdAt) : "—"}</td>
          <td className={TD + " text-end whitespace-nowrap"}><Button size="icon-sm" variant="ghost" aria-label="Edit address" onClick={() => setAed({ ix: i, v: a.address, zoneId: a.zoneId })}><PencilIcon className="size-4" /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Delete address" onClick={async () => { if (await askYes("Delete this address?", "Delete", true)) upd({ addresses: addrs.filter((_, j) => j !== i) }, "Address deleted"); }}><TrashBinIcon className="size-4 text-error-500" /></Button></td></tr>)}
        {used.map((v, i) => <tr key={"u" + i} className={TR}><td className={TD + " whitespace-normal"}>{v} <Badge variant="light" color="light">From orders</Badge></td><td className={TD}>—</td><td className={TD}>—</td>
          <td className={TD + " text-end whitespace-nowrap"}><Button size="icon-sm" variant="ghost" aria-label="Edit and save address" onClick={() => setAed({ ix: null, v })}><PencilIcon className="size-4" /></Button><Button size="sm" variant="outline" onClick={() => saveAddr(v)}>Save</Button></td></tr>)}
      </tbody></table></div>}
    </Sec>
    {aed && <AddrDialog init={aed} zones={zones.filter((z: any) => !z.deleted && z.active !== false)} onClose={() => setAed(null)}
      onSave={async (v, zoneId) => { const row = { address: v, ...(zoneId ? { zoneId } : {}) }; const l = aed.ix == null ? [...addrs, { ...row, createdAt: new Date().toISOString() }] : addrs.map((a, j) => j === aed.ix ? { ...a, ...row, ...(zoneId ? {} : { zoneId: undefined }) } : a);
        if (await upd({ addresses: l }, aed.ix == null ? "Address added" : "Address saved")) setAed(null); }} />}

    <Sec title="Tags" act={<PickMany label="Add tag" opts={tagList.filter(t => !myTags.includes(t)).map(t => ({ id: t, name: t }))} onAdd={ids => upd({ tags: [...myTags, ...ids] }, ids.length > 1 ? "Tags added" : "Tag added")} />}>
      {!myTags.length ? <None t={tagList.length ? "No tags." : "No tags. Customer tags are created in Manage → Tags."} /> : <div className="flex flex-wrap gap-2">{myTags.map(t => <Badge key={t} variant="light" color="primary" className="gap-1.5">{t}
        <button type="button" aria-label={"Remove tag " + t} className="text-blue-400 hover:text-error-500" onClick={() => upd({ tags: myTags.filter(x => x !== t) }, "Tag removed")}>×</button></Badge>)}</div>}
    </Sec>

    {(c.house_account || ha.length > 0) && <Sec title="House Account">
      {!ha.length ? <None t="No charges or payments yet." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Date", "Type", "Payment Type", "Reference", "Store", "Amount"].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
        {ha.map(t => <tr key={t.id} className={TR}><td className={TD}>{fmtDate(t.created_at)}</td><td className={TD}>{t.kind === "payment" ? "Payment" : "Order"}</td><td className={TD}>{t.method || "—"}</td><td className={TD}>{t.order_ref || t.note || "—"}</td><td className={TD}>{t.branch_id ? bName(t.branch_id) : "—"}</td><td className={TD}>{money(t.amount)}</td></tr>)}
      </tbody></table></div>}
    </Sec>}

    <Sec title={`Orders (${orders.length})`}>
      {!orders.length ? <None t="No orders yet." /> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Reference", "Check Number", "Order", "Business Date", "Store", "Order Type", "Order Source", "Payment Type", "Status", "Total"].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>
        {orders.map(o => <tr key={o.id} className={TR + " cursor-pointer hover:bg-gray-50 dark:hover:bg-white/2"} onClick={() => openWin("/order?id=" + o.id)}>
          <td className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{ordRef(o)}</td><td className={TD}>{chkNo(o)}</td><td className={TD}>{o.no || "—"}</td><td className={TD}>{fmtDate(o.createdAt)}</td>
          <td className={TD}>{bName(o.branchId)}</td><td className={TD}>{TYPE_LBL[o.type] || o.type || "—"}</td><td className={TD}>{srcOf(o) || "—"}</td><td className={TD}>{o.payment?.method || "—"}</td>
          <td className={TD}><Badge variant="light" color={ST_COLOR[o.status] || "gray"}>{ORD_ST[o.status] || o.status}</Badge></td><td className={TD}>{money(o.total)}</td></tr>)}
      </tbody></table></div>}
    </Sec>
    {edit && <CustomerDialog c={c} onClose={() => setEdit(false)} onSaved={() => setTick(t => t + 1)} />}
  </>;
}

// add or edit one saved address: the same parts as the call center (type, street, building, floor, door, instructions) and its delivery zone
function AddrDialog({ init, zones, onClose, onSave }: { init: { ix: number | null; v: string; zoneId?: string }; zones: any[]; onClose: () => void; onSave: (v: string, zoneId: string) => void }) {
  const [a, setA] = useState<Addr>(addrSplit(init.v)), [z, setZ] = useState(init.zoneId || ""), [err, setErr] = useState("");
  const L: [keyof Addr, string, boolean][] = [["label", "Address Type (Home, Work…)", false], ["street", "Area / Street", true], ["building", "Building Name / No.", true], ["floor", "Floor / Apartment No.", true], ["door", "Door Details / Name on Intercom", false], ["extra", "Instructions", false]];
  return <Dialog open onOpenChange={x => !x && onClose()}><DialogContent className="w-full p-6 sm:max-w-lg"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{init.ix == null ? "Add Address" : "Edit Address"}</DialogTitle></DialogHeader>
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{L.map(([k, l, req]) => <div key={k} className={k === "street" || k === "extra" ? "sm:col-span-2" : ""}><F l={l} req={req}><Input className="h-9" value={a[k]} onChange={e => setA({ ...a, [k]: e.target.value })} /></F></div>)}
      {zones.length > 0 && <div className="sm:col-span-2"><F l="Delivery Zone"><select className={SEL} value={z} onChange={e => setZ(e.target.value)}><option value="">None</option>{zones.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></F></div>}</div>
    {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => { if (!a.street.trim() || !a.building.trim() || !a.floor.trim()) return setErr("Fill the area / street, building and floor."); onSave(addrJoin(a), z); }}>Save</Button></div>
  </DialogContent></Dialog>;
}
