// A store's page (Manage → Stores → a store) and its full form, as in the current portal: details, delivery zones, users, sections & tables,
// devices, charges, inactive payment methods, deleting its orders / inventory transactions, deleting the store. The form has general details,
// location on a map, business day, opening hours by day, tags, receipt texts and taking call center / web orders.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { newId, put, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { money } from "@/lib/util";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, SEL, TD, TH, TR } from "../ui/kit";
import { baseMap, LB, loadLeaflet } from "../ui/leaflet";
import { PickDialog } from "../ui/PickDialog";
import { toast } from "../ui/toast";

const DAYS: [string, string][] = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];
const TYPE_LBL: Record<string, string> = { dinein: "In Store", fast: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery" };
const times = (maxH = 24) => { const l: string[] = []; for (let q = 0; q < maxH * 4; q++) l.push(`${String(q / 4 | 0).padStart(2, "0")}:${String(q % 4 * 15).padStart(2, "0")}`); return l; };
const t12 = (v?: string) => { if (!v) return "—"; const [h, m] = v.split(":").map(Number); return `${(h % 12) || 12}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const isAdminRow = (r: Row) => r.role === "owner" || r.role === "admin";
const tblLbl = (n: any) => /^\d+$/.test(String(n).trim()) ? "Table " + String(n).trim() : String(n);
const TimeSel = ({ v, set, maxH, label, dis }: { v: string; set: (x: string) => void; maxH?: number; label: string; dis?: boolean }) => {
  const l = times(maxH); if (v && !l.includes(v)) l.unshift(v);
  return <select aria-label={label} className={SEL} disabled={dis} value={v} onChange={e => set(e.target.value)}>{l.map(t => <option key={t} value={t}>{t12(t)}</option>)}</select>; };

/* tables: settings "tables" { [storeId]: [{ id, name, section, seats }], [storeId + "__sections"]: [names] } */
const tblOf = (s: S, b: string) => { const d: any = s.settings.find(x => x.id === "tables") || {}, list: any[] = (d[b] || []).slice(), secs: string[] = [...(d[b + "__sections"] || [])];
  list.forEach(t => { if (!secs.includes(t.section || "")) secs.push(t.section || ""); }); return { list, secs: secs.filter((x, i, a) => a.indexOf(x) === i && (x || list.some(t => !t.section))) }; };
const tblSave = async (b: string, list: any[], secs?: string[]) => { await put("settings", "tables", { [b]: list, ...(secs ? { [b + "__sections"]: secs } : {}) }); };
const nextNo = (l: any[]) => l.reduce((m, t) => Math.max(m, /^\d+$/.test(String(t.name)) ? +t.name : 0), 0) + 1;

export default function StorePage() {
  const s = useS(["branches", "brands", "tax_groups", "zones", "users", "devices", "charges", "payment_methods", "settings"]), [sp] = useSearchParams(), nav = useNavigate();
  const [edit, setEdit] = useState(false), [sec, setSec] = useState<string | null | undefined>(undefined), [pays, setPays] = useState(false), [zonesDlg, setZonesDlg] = useState(false), [cnt, setCnt] = useState<{ orders: number | null; inv: number | null }>({ orders: null, inv: null }), [busy, setBusy] = useState(false);
  const id = sp.get("id") || "";
  const count = async () => { const safe = (q: any) => Promise.resolve(q).then((r: any) => r, (e: any) => ({ error: e }));
    const [o, ...inv] = await Promise.all([safe(sb.from("orders").select("id", { count: "exact", head: true }).eq("branch_id", id)), safe(sb.from("inventory_docs").select("id", { count: "exact", head: true }).or(`location_id.eq.${id},dest_id.eq.${id}`)),
      safe(sb.from("order_transactions").select("id", { count: "exact", head: true }).eq("branch_id", id)), safe(sb.from("stock_counts").select("id", { count: "exact", head: true }).eq("branch_id", id))]);
    const c = { orders: o.error || o.count == null ? null : o.count, inv: inv.reduce((a: number, r: any) => a + (r.error ? 0 : r.count || 0), 0) }; setCnt(c); return c; };
  useEffect(() => { if (id) count(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const b = s.branches.find(x => x.id === id);
  if (!b) return <><PageBreadcrumb pageTitle="Stores" /><EmptyState text="This store wasn't found."><Button variant="outline" onClick={() => nav("/branches")}>Stores</Button></EmptyState></>;
  const st = b.settings || {}, mon = st.hours?.mon || {}, tg = s.tax_groups.find(g => g.id === st.taxGroup)?.name;
  const zones = s.zones.filter(z => live(z) && z.branchId === b.id), users = s.users.filter(u => live(u) && !isAdminRow(u) && (!(u.branchIds || []).length || (u.branchIds || []).includes(b.id)));
  const devs = s.devices.filter(d => live(d) && d.branchId === b.id), chs = s.charges.filter(c => live(c) && (!(c.branchIds || []).length || c.branchIds.includes(b.id)));
  const { list: tl, secs } = tblOf(s, b.id), pms = s.payment_methods.filter(m => live(m) && m.active !== false), offPay: string[] = st.inactivePayments || [];
  const dch: any = (s.settings.find(x => x.id === "dcharges") as any)?.map || {}, chOf = (z: Row) => s.charges.find(c => c.id === dch[z.id] && live(c));
  const deleted = b.active === false || b.deleted;
  const saveSt = async (patch: any, msg: string) => { try { await put("branches", b.id, { settings: { ...st, ...patch }, updatedAt: new Date().toISOString() }); toast(msg); } catch { toast("Couldn't save. You may not have edit access.", "error"); } };
  const Tbl = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => !rows.length ? <p className="text-sm text-gray-500">No data to display</p> : <div className="overflow-x-auto"><table className="w-full"><thead><tr>{head.map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className={TR}>{r.map((c, j) => <td key={j} className={TD}>{c}</td>)}</tr>)}</tbody></table></div>;
  const Sec = ({ title, act, children }: { title: string; act?: React.ReactNode; children: React.ReactNode }) => <div className={BOX + " mb-6"}><div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h3 className="text-base font-medium text-gray-900 dark:text-gray-50">{title}</h3>{act}</div><div className="p-5">{children}</div></div>;
  async function wipe(kind: "orders" | "inv") {
    const c = await count(), what = kind === "orders" ? `all ${c.orders} orders` : `all ${c.inv} inventory transactions`;
    const typed = window.prompt(`This permanently deletes ${what} of ${b!.name}. It can't be undone.${kind === "orders" ? "\n\nReference numbers keep counting. This store's check numbers start again at 100001 and returns at RET-100001." : ""}\n\nType the store name to confirm:`);
    if (typed == null) return; if (typed.trim().toLowerCase() !== b!.name.trim().toLowerCase()) return toast("The name didn't match · nothing was deleted", "error");
    setBusy(true);
    try { const chk = (r: any) => { if (r.error && !/does not exist|schema cache/i.test(r.error.message || "")) throw r.error; };
      if (kind === "orders") chk(await sb.rpc("skwyd_wipe_branch_orders", { p_branch: String(b!.id) }));
      else { chk(await sb.from("inventory_docs").delete().or(`location_id.eq.${b!.id},dest_id.eq.${b!.id}`)); chk(await sb.from("order_transactions").delete().eq("branch_id", b!.id)); chk(await sb.from("stock_counts").delete().eq("branch_id", b!.id)); }
      const left = await count(), n = kind === "orders" ? left.orders : left.inv;
      toast(n ? `${n} record${n === 1 ? "" : "s"} couldn't be deleted. Only the owner or an admin can delete them.` : kind === "orders" ? `Orders of ${b!.name} deleted` : `Inventory transactions of ${b!.name} deleted`, n ? "error" : undefined);
    } catch { toast("Couldn't delete. Only the owner or an admin can do this.", "error"); } finally { setBusy(false); }
  }
  async function delStore() {
    const c = await count(); if (c.orders == null) return toast("Couldn't check this store's data. Try again.", "error");
    if (c.orders || c.inv) return toast(`Delete this store's ${c.orders ? `${c.orders} order${c.orders === 1 ? "" : "s"}` : ""}${c.orders && c.inv ? " and " : ""}${c.inv ? `${c.inv} inventory transaction${c.inv === 1 ? "" : "s"}` : ""} first.`, "error");
    if (!(await askYes(`This moves ${b!.name} to Deleted. You can restore it from there.`, "Delete", true))) return;
    try { await put("branches", b!.id, { active: false, settings: { ...st, deletedAt: new Date().toISOString() } }); toast("Store deleted"); nav("/branches"); } catch { toast("Couldn't delete the store", "error"); }
  }
  const restore = async () => { const x = { ...st }; delete x.deletedAt; try { await put("branches", b.id, { active: true, deleted: false, settings: x }); toast("Store restored"); } catch { toast("Couldn't restore", "error"); } };
  return <>
    <PageBreadcrumb pageTitle="Stores" current={b.name} />
    <div className="mb-6 flex flex-wrap items-center gap-3"><Button variant="outline" render={<Link to="/branches" />}><ArrowLeftIcon className="size-5" />Stores</Button>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{b.name}</h2>{b.code && <Badge variant="light" color="light">{b.code}</Badge>}{deleted && <Badge variant="light" color="error">Deleted</Badge>}
      <div className="ms-auto flex gap-3">{deleted ? <Button onClick={restore}>Restore</Button> : <Button onClick={() => setEdit(true)}><PencilIcon className="size-5" />Edit Store</Button>}</div></div>
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">{[["Delivery zones", zones.length], ["Employees", users.length], ["Devices", devs.length], ["Tables", tl.length], ["Charges", chs.length]].map(([l, v]) =>
      <div key={l} className={BOX + " p-4"}><span className="text-sm text-gray-500">{l}</span><b className="mt-1 block text-xl font-semibold text-gray-900 dark:text-gray-50">{v}</b></div>)}</div>
    <div className={BOX + " mb-6 grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4"}>{([["Name", b.name], ["Name Localized", b.nameAr || "—"], ["Reference", b.code || "—"], ["Brand", s.brands.find(x => x.id === b.brandId)?.name || "—"],
      ["Opening From", t12(mon.open || b.open)], ["Opening To", t12(mon.close || b.close)], ["Business day starts", t12(st.dayStart || "00:00")], ["Inventory End of Day", t12(st.invEnd || st.dayStart || "00:00")],
      ["Tax Group", tg || "—"], ["Tax Registration Name", st.taxName || "—"], ["Tax Number", b.taxNumber || "—"], ["Phone", b.phone || "—"], ["Address", b.address || "—"],
      ["Location", b.lat && b.lng ? <a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}>{b.lat}, {b.lng}</a> : "—"],
      ["Receive Call Center, Web & API Orders", b.callCenter ? "Yes" : "No"], ["Automatic end of day", st.autoDayEnd === false ? "No" : "Yes"]] as [string, React.ReactNode][]).map(([l, v]) =>
      <div key={l}><span className="block text-sm text-gray-500 dark:text-gray-400">{l}</span><b className="text-sm font-medium break-words text-gray-900 dark:text-gray-50">{v}</b></div>)}</div>
    <Sec title="Delivery Zones" act={<Button size="sm" variant="outline" onClick={() => setZonesDlg(true)}>Delivery Zones</Button>}><Tbl head={["Name", "Delivery charge", "Min. order"]} rows={zones.map(z => { const c = chOf(z); return [z.name, c ? `${c.name} · ${money(+c.value || 0)}` : "—", money(+z.minOrder || 0)]; })} /></Sec>
    <Sec title="Users"><Tbl head={["Name", "Email", "Phone"]} rows={users.map(u => [<Link key="n" className="text-blue-500 hover:underline" to={"/employee?id=" + u.id}>{u.name}</Link>, u.email || "—", u.phone || "—"])} /></Sec>
    <Sec title="Sections" act={<Button size="sm" variant="outline" onClick={() => setSec(null)}><PlusIcon className="size-4" />Add Section</Button>}>
      {!secs.length ? <p className="text-sm text-gray-500">No data to display</p> : <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className={TH}>Name</th><th className={TH}>Tables</th><th className={TH}>Table names</th></tr></thead><tbody>
        {secs.map(sc => { const l = tl.filter(t => (t.section || "") === sc); return <tr key={sc || "_"} className={TR + " cursor-pointer hover:bg-gray-50 dark:hover:bg-white/3"} onClick={() => setSec(sc)}><td className={TD + " font-medium text-gray-900 dark:text-gray-50"}>{sc || "No section"}</td><td className={TD}>{l.length}</td><td className={TD}>{l.map(t => tblLbl(t.name)).join(", ") || "—"}</td></tr>; })}</tbody></table></div>}</Sec>
    <Sec title="Assigned Devices"><Tbl head={["Name", "Reference", "Type"]} rows={devs.map(d => [d.name, d.reference || "—", String(d.type || "").toUpperCase()])} /></Sec>
    <Sec title="Assigned Charges"><Tbl head={["Name", "Value", "Applies On"]} rows={chs.map(c => [c.name, c.type === "percent" ? (+c.value || 0) + "%" : money(+c.value || 0), (c.orderTypes || []).length ? [...new Set((c.orderTypes as string[]).map(t => TYPE_LBL[t] || t))].join(", ") : "All order types"])} /></Sec>
    <Sec title="Inactive Payment Methods" act={<Button size="sm" variant="outline" onClick={() => setPays(true)}>Payment Methods</Button>}>
      {!offPay.filter(x => pms.some(m => m.id === x)).length ? <p className="text-sm text-gray-500">All payment methods are available at this store</p> : <div className="flex flex-wrap gap-2">{offPay.map(x => pms.find(m => m.id === x)).filter(Boolean).map(m => <Badge key={m!.id} variant="light" color="warning">{m!.name}</Badge>)}</div>}</Sec>
    <Sec title="Delete Store Orders"><p className="mb-4 text-sm text-gray-500">{cnt.orders === 0 ? "This store has no orders to delete." : `If you delete this store's orders (${cnt.orders ?? "…"} order${cnt.orders === 1 ? "" : "s"}, with their shifts and end-of-day records), all the data will be permanently deleted.`}</p><Button variant="destructive" disabled={!cnt.orders || busy} onClick={() => wipe("orders")}>Delete Orders</Button></Sec>
    <Sec title="Delete Store Inventory Transactions"><p className="mb-4 text-sm text-gray-500">{cnt.inv === 0 ? "This store has no inventory transactions to delete." : `If you delete this store's inventory transactions (${cnt.inv ?? "…"} record${cnt.inv === 1 ? "" : "s"}: purchases, transfers, adjustments, production, counts and consumption), all the data will be permanently deleted.`}</p><Button variant="destructive" disabled={!cnt.inv || busy} onClick={() => wipe("inv")}>Delete Transactions</Button></Sec>
    {!deleted && <Sec title="Delete Store"><p className="mb-4 text-sm text-gray-500">If you delete this store, all of its data will be permanently deleted. A store can be deleted once it has no orders and no inventory transactions.</p><Button variant="destructive" onClick={delStore}>Delete</Button></Sec>}

    {edit && <StoreForm s={s} row={b} onClose={() => setEdit(false)} />}
    {sec !== undefined && <SectionDialog s={s} b={b.id} sc={sec} onClose={() => setSec(undefined)} />}
    {pays && <PickDialog title="Inactive Payment Methods" opts={pms.map(m => [m.id, m.name])} value={offPay} onClose={() => setPays(false)} onSave={async ids => { await saveSt({ inactivePayments: ids }, "Payment methods saved"); setPays(false); }} />}
    {zonesDlg && <PickDialog title="Delivery Zones" opts={s.zones.filter(live).sort((a, z) => String(a.name).localeCompare(String(z.name))).map(z => [z.id, z.name, z.branchId && z.branchId !== b.id ? "now " + (s.branches.find(x => x.id === z.branchId)?.name || "") : ""])} value={zones.map(z => z.id)} onClose={() => setZonesDlg(false)}
      onSave={async ids => { try { for (const z of s.zones.filter(live)) { const on = ids.includes(z.id); if (on && z.branchId !== b.id) await put("zones", z.id, { branchId: b.id }); else if (!on && z.branchId === b.id) await put("zones", z.id, { branchId: null }); } toast("Delivery zones saved"); setZonesDlg(false); } catch { toast("Couldn't save. You may not have edit access.", "error"); return false; } }} />}
  </>;
}

/* Add Section (name and number of tables) / Edit Section (rename, tables with seats, delete) */
function SectionDialog({ s, b, sc, onClose }: { s: S; b: string; sc: string | null; onClose: () => void }) {
  const { list, secs } = tblOf(s, b), isNew = sc === null;
  const [name, setName] = useState(sc || ""), [n, setN] = useState("4"), [rows, setRows] = useState<any[]>(() => isNew ? [] : list.filter(t => (t.section || "") === sc).map(t => ({ ...t }))), [err, setErr] = useState("");
  async function save() {
    setErr(""); const nm = name.trim(), others = secs.filter(Boolean);
    try {
      if (isNew) { const k = Math.floor(+n || 0); if (!nm) return setErr("Enter the section name."); if (others.some(x => x.toLowerCase() === nm.toLowerCase())) return setErr("That section already exists."); if (!(k >= 1 && k <= 100)) return setErr("Enter 1 to 100 tables.");
        let no = nextNo(list); const add = Array.from({ length: k }, () => ({ id: newId("tb"), name: String(no++), section: nm })); await tblSave(b, [...list, ...add], [...others, nm]); toast("Section added"); return onClose(); }
      if (sc && !nm) return setErr("Enter the section name."); if (nm && nm !== sc && others.some(x => x.toLowerCase() === nm.toLowerCase())) return setErr("That section already exists.");
      if (rows.some(r => !String(r.name).trim())) return setErr("Every table needs a name or number.");
      const names = rows.map(r => String(r.name).trim().toLowerCase()), rest = list.filter(t => (t.section || "") !== sc);
      if (new Set(names).size !== names.length || rest.some(t => names.includes(String(t.name).toLowerCase()))) return setErr("Two tables have the same name.");
      const sec2 = sc ? nm : ""; await tblSave(b, [...rest, ...rows.map(r => ({ ...r, name: String(r.name).trim(), section: sec2 }))], others.map(x => x === sc ? nm : x)); toast("Section saved"); onClose();
    } catch { setErr("Couldn't save. Only the owner or an admin can change tables."); }
  }
  async function del() { if (!(await askYes(rows.length ? `Delete the section ${sc} and its ${rows.length} tables?` : `Delete the section ${sc}?`, "Delete", true))) return;
    try { await tblSave(b, list.filter(t => (t.section || "") !== sc), secs.filter(x => x && x !== sc)); toast("Section deleted"); onClose(); } catch { setErr("Couldn't save."); } }
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-full p-6 sm:max-w-xl"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{isNew ? "Add Section" : "Edit Section"}</DialogTitle></DialogHeader>
    <div className="mt-4 space-y-4">
      <F l="Name" req={isNew || !!sc}><Input className="h-9" value={name} placeholder={sc === "" ? "No section" : "e.g. Family section, Terrace"} onChange={e => setName(e.target.value)} autoFocus /></F>
      {isNew ? <F l="Number of Tables" req><Input className="h-9" type="number" min="1" max="100" value={n} onChange={e => setN(e.target.value)} /></F> : <div>
        <div className="mb-2 flex items-center"><b className="text-sm font-medium text-gray-900 dark:text-gray-50">Tables</b><Button size="sm" variant="outline" className="ms-auto" onClick={() => setRows(r => [...r, { id: newId("tb"), name: String(nextNo([...list, ...r])), section: sc, seats: null }])}><PlusIcon className="size-4" />Add Table</Button></div>
        {!rows.length ? <p className="text-sm text-gray-500">No tables yet.</p> : <table className="w-full"><thead><tr><th className={TH}>Name</th><th className={TH}>Seats</th><th /></tr></thead><tbody>{rows.map((r, i) => <tr key={r.id} className={TR}>
          <td className={TD}><Input className="h-9" aria-label="Table name" value={r.name} onChange={e => setRows(o => o.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></td>
          <td className={TD}><Input className="h-9 w-24" type="number" min="0" aria-label="Seats" placeholder="—" value={r.seats ?? ""} onChange={e => setRows(o => o.map((x, j) => j === i ? { ...x, seats: e.target.value === "" ? null : Math.max(0, +e.target.value) } : x))} /></td>
          <td className={TD + " text-end"}><Button size="icon-sm" variant="ghost" aria-label="Remove table" onClick={() => setRows(o => o.filter((_, j) => j !== i))}><TrashBinIcon className="size-5 text-red-500" /></Button></td></tr>)}</tbody></table>}</div>}
      {err && <p className="text-sm text-red-500">{err}</p>}</div>
    <div className="mt-6 flex gap-3">{!isNew && sc && <Button variant="destructive" onClick={del}>Delete</Button>}<Button className="ms-auto" onClick={save}>Save</Button></div></DialogContent></Dialog>;
}

/* pin the store on a map: tap the map or drag the pin (OpenStreetMap, like the portal without a Google key) */
function MapPick({ lat, lng, set }: { lat: string; lng: string; set: (a: string, b: string) => void }) {
  const el = useRef<HTMLDivElement>(null), mk = useRef<any>(null), mp = useRef<any>(null), [err, setErr] = useState("");
  useEffect(() => { let m: any; loadLeaflet().then(L => { if (!el.current) return; m = baseMap(L, el.current); mp.current = m; const p = lat && lng ? [+lat, +lng] : null; m.setView(p || LB, p ? 16 : 11);
    const pin = (a: number, b: number) => { if (!mk.current) { mk.current = L.marker([a, b], { draggable: true }).addTo(m); mk.current.on("dragend", (e: any) => { const ll = e.target.getLatLng(); set(ll.lat.toFixed(6), ll.lng.toFixed(6)); }); } else mk.current.setLatLng([a, b]); };
    if (p) pin(p[0], p[1]); m.on("click", (e: any) => { pin(e.latlng.lat, e.latlng.lng); set(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6)); }); setTimeout(() => m.invalidateSize(), 150); }).catch(e => setErr(e.message));
    return () => { try { m?.remove(); } catch { /* gone */ } mk.current = null; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div>{err ? <p className="text-sm text-gray-500">{err}</p> : <div ref={el} className="h-56 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800" />}
    <div className="mt-2 grid grid-cols-2 gap-3"><Input className="h-10" placeholder="Latitude" value={lat} onChange={e => set(e.target.value, lng)} /><Input className="h-10" placeholder="Longitude" value={lng} onChange={e => set(lat, e.target.value)} /></div>
    <p className="mt-1.5 text-xs text-gray-500">Tap the map to drop the pin, or paste the coordinates (e.g. 33.89 and 35.50).</p></div>;
}

/** the full store form (add or edit), the same fields and checks as the portal's branch form */
export function StoreForm({ s, row, onClose }: { s: S; row: Row | null; onClose: () => void }) {
  const st = row?.settings || {}, co: any = s.settings.find(x => x.id === "company") || {}, brands = s.brands.filter(live);
  const tagDoc: any = s.settings.find(x => x.id === "tags") || {}, tagList = (tagDoc.list || []).filter((t: any) => t.type === "branch" && !t.deleted);
  const nextCode = () => "B" + String(Math.max(0, ...s.branches.map(b => +((/^B(\d+)$/i.exec(b.code || "") || [])[1] ?? 0))) + 1).padStart(2, "0");
  const o0 = row?.open || "11:00", c0 = row?.close || "23:30";
  const [v, setV] = useState<Record<string, any>>({ brandId: row?.brandId || (brands.length === 1 ? brands[0].id : ""), name: row?.name || "", nameAr: row?.nameAr || "", code: row ? row.code || nextCode() : nextCode(), taxGroup: st.taxGroup || "", taxName: st.taxName || "", taxNumber: row?.taxNumber || "",
    phone: row?.phone || "", address: row?.address || "", city: row?.city || "", lat: row?.lat != null ? String(row.lat) : "", lng: row?.lng != null ? String(row.lng) : "", dayStart: st.dayStart || co.dayEnd || "00:00", invEnd: st.invEnd || st.dayStart || co.dayEnd || "00:00",
    autoDayEnd: st.autoDayEnd !== false, receiptHeader: st.receiptHeader || "", receiptFooter: st.receiptFooter || "", callCenter: row ? !!row.callCenter : true,
    tags: row ? ((tagDoc.on || {}).branch || {})[row.id] || [] : [] });
  const [hours, setHours] = useState<Record<string, any>>(() => Object.fromEntries(DAYS.map(([k]) => [k, { open: o0, close: c0, closed: false, ...(st.hours?.[k] || {}) }])));
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), set = (k: string, x: any) => setV(o => ({ ...o, [k]: x }));
  async function save() {
    setErr(""); const name = v.name.trim(), code = v.code.trim().toUpperCase();
    if (!code) return setErr("Reference code is required."); if (!name) return setErr("Store name is required.");
    if (brands.length && !v.brandId) return setErr("Choose the brand this store belongs to.");
    if (s.branches.some(b => b.id !== row?.id && b.brandId === v.brandId && b.active !== false && String(b.name).toLowerCase() === name.toLowerCase())) return setErr("This brand already has a store with this name.");
    if (s.branches.some(b => b.id !== row?.id && String(b.code || "").toUpperCase() === code)) return setErr("That reference code is already used.");
    if ((v.lat && isNaN(+v.lat)) || (v.lng && isNaN(+v.lng))) return setErr("Location must be numbers, e.g. 33.89 and 35.50.");
    if (+String(v.dayStart).split(":")[0] >= 12) return setErr("The business day must start between 12:00 AM and 11:59 AM.");
    const mon = hours.mon || {};
    const data: any = { name, code, brandId: v.brandId, address: v.address.trim(), city: v.city.trim(), phone: v.phone.trim(), nameAr: v.nameAr.trim(), taxNumber: v.taxNumber.trim(), lat: v.lat ? +v.lat : null, lng: v.lng ? +v.lng : null,
      settings: { ...st, hours, orderTypes: null, receiptHeader: v.receiptHeader.trim(), receiptFooter: v.receiptFooter.trim(), dayStart: v.dayStart, autoDayEnd: v.autoDayEnd, taxName: v.taxName.trim(), invEnd: v.invEnd || "", taxGroup: v.taxGroup || null },
      open: mon.closed ? o0 : mon.open || o0, close: mon.closed ? c0 : mon.close || c0, active: true, callCenter: v.callCenter, production: false, updatedAt: new Date().toISOString() };
    setBusy(true);
    try { const id = row?.id || "br_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); if (!row) data.createdAt = new Date().toISOString();
      await put("branches", id, data);
      const on = JSON.parse(JSON.stringify(tagDoc.on || {})); (on.branch ||= {})[id] = v.tags; if (JSON.stringify(on) !== JSON.stringify(tagDoc.on || {})) await put("settings", "tags", { on });
      toast(row ? "Store updated" : `${name} added`); onClose(); }
    catch { setErr("Couldn't save. You may not have edit access to this page."); } finally { setBusy(false); }
  }
  const H = ({ t }: { t: string }) => <h4 className="col-span-full mt-2 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-gray-50">{t}</h4>;
  return <Dialog open onOpenChange={x => !x && onClose()}><DialogContent className="w-full p-6 sm:max-w-3xl"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">{row ? "Edit Store" : "Add Store"}</DialogTitle></DialogHeader>
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <H t="General" />
      <F l="Brand" req><select className={SEL} value={v.brandId} onChange={e => set("brandId", e.target.value)}><option value="">Choose brand…</option>{brands.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></F>
      <F l="Store name" req><Input className="h-9" maxLength={60} placeholder="e.g. Hamra" value={v.name} onChange={e => set("name", e.target.value)} /></F>
      <F l="Name Localized"><Input className="h-9" dir="auto" maxLength={60} value={v.nameAr} onChange={e => set("nameAr", e.target.value)} /></F>
      <F l="Reference code" req><Input className="h-9" maxLength={20} placeholder="e.g. B01" value={v.code} onChange={e => set("code", e.target.value)} /></F>
      <F l="Tax group" help="Used for items that have no tax group of their own."><select className={SEL} value={v.taxGroup} onChange={e => set("taxGroup", e.target.value)}><option value="">Choose…</option>{s.tax_groups.filter(live).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></F>
      <F l="Store tax registration name"><Input className="h-9" maxLength={80} placeholder="Leave empty to use the company's" value={v.taxName} onChange={e => set("taxName", e.target.value)} /></F>
      <F l="Store tax number"><Input className="h-9" maxLength={40} placeholder="Leave empty to use the company's" value={v.taxNumber} onChange={e => set("taxNumber", e.target.value)} /></F>
      <F l="Phone"><Input className="h-9" maxLength={30} value={v.phone} onChange={e => set("phone", e.target.value)} /></F>
      <F l="Address" full><Input className="h-9" maxLength={160} value={v.address} onChange={e => set("address", e.target.value)} /></F>
      <F l="Area / city"><Input className="h-9" maxLength={60} placeholder="e.g. Beirut" value={v.city} onChange={e => set("city", e.target.value)} /></F>
      <div className="col-span-full"><F l="Location"><MapPick lat={v.lat} lng={v.lng} set={(a, b) => setV(o => ({ ...o, lat: a, lng: b }))} /></F></div>
      <H t="Business day" />
      <F l="New business day starts at" help="Sales before this time count on the previous business day. Set it after your closing time, e.g. 03:00 if you close at 2 AM. Must be between 12:00 AM and 11:59 AM."><TimeSel label="Business day starts" maxH={12} v={v.dayStart} set={x => set("dayStart", x)} /></F>
      <F l="Inventory end of day" help="Inventory transactions after this time are added to the next business day."><TimeSel label="Inventory end of day" v={v.invEnd} set={x => set("invEnd", x)} /></F>
      <label className="col-span-full flex cursor-pointer items-start gap-3 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" className="mt-0.5 size-4 accent-blue-500" checked={v.autoDayEnd} onChange={e => set("autoDayEnd", e.target.checked)} />
        <span>Automatic end of day<span className="block text-xs text-gray-500">At the start time, if the previous day wasn't ended manually and all its orders are closed, the store's POS ends it automatically.</span></span></label>
      <H t="Opening hours" />
      <div className="col-span-full space-y-2">{DAYS.map(([k, t], i) => { const d = hours[k]; return <div key={k} className="flex flex-wrap items-center gap-2 sm:flex-nowrap"><b className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">{t}</b>
        <div className="w-36"><TimeSel label={t + " opens"} dis={d.closed} v={d.open} set={x => setHours(o => ({ ...o, [k]: { ...o[k], open: x } }))} /></div><span className="text-sm text-gray-500">to</span>
        <div className="w-36"><TimeSel label={t + " closes"} dis={d.closed} v={d.close} set={x => setHours(o => ({ ...o, [k]: { ...o[k], close: x } }))} /></div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" className="size-4 accent-blue-500" checked={!!d.closed} onChange={e => setHours(o => ({ ...o, [k]: { ...o[k], closed: e.target.checked } }))} />Closed</label>
        {i === 0 && <button type="button" className="text-sm text-blue-500 sm:ms-auto" onClick={() => setHours(o => Object.fromEntries(DAYS.map(([x]) => [x, { ...o.mon }])))}>Apply to all days</button>}</div>; })}</div>
      <H t="Tags" />
      <div className="col-span-full">{!tagList.length ? <p className="text-sm text-gray-500">Store tags are created in Manage → Tags.</p> : <div className="flex flex-wrap gap-x-5 gap-y-2">{tagList.map((t: any) => <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" className="size-4 accent-blue-500" checked={v.tags.includes(t.id)} onChange={e => set("tags", e.target.checked ? [...v.tags, t.id] : v.tags.filter((x: string) => x !== t.id))} />{t.name}</label>)}</div>}</div>
      <H t="Receipt" />
      <F l="Receipt header" full><Textarea rows={2} maxLength={300} placeholder="e.g. Welcome to The Wok Hamra" value={v.receiptHeader} onChange={e => set("receiptHeader", e.target.value)} /></F>
      <F l="Receipt footer" full><Textarea rows={2} maxLength={300} placeholder="e.g. Thank you! Follow us @thewok" value={v.receiptFooter} onChange={e => set("receiptFooter", e.target.value)} /></F>
      <H t="Options" />
      <label className="col-span-full flex cursor-pointer items-center gap-3 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" className="size-4 accent-blue-500" checked={v.callCenter} onChange={e => set("callCenter", e.target.checked)} />Receive Call Center, Web &amp; API Orders</label>
      {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
    </div>
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></div></DialogContent></Dialog>;
}
