"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// The sale screen, from Tremor: the cart on the left (a third of the screen), the menu on the right (action buttons, search, 6×3 tiles),
// the bottom bar: Functions, Orders, Tables, Pickup & Delivery, New. Same rules as the Android POS it replaces.
import { Badge } from "@/components/tremor/Badge";
import { Button } from "@/components/tremor/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/tremor/Dropdown";
import { Input } from "@/components/tremor/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tremor/Popover";
import { cx } from "@/components/tremor/utils";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Row } from "../lib/db";
import kv from "../lib/kv";
import { addrJoin, allowedTypes, can, chg2, CUR2, custMissing, fullyBack, kidsOf, lineKey, lineNet, menu, modData, modLabel, money, money2, newId, nextOrderNo, num2, openShift, orderFields, posSources, prodOos, prodPrice, saleBlock, tilePrice, totals, pinsOn, type Ctx, type Cust, type Disc, type Line, type OType } from "../lib/pos";
import { appSet, kitchenText, printerHas, printJob, receiptText } from "../lib/print";
import { useStore } from "../lib/store";
import { onAlertOpen, pendingCount } from "./Alert";
import { OrdersList, ordRef, PDBoard } from "./Boards";
import { CustomerDialog } from "./Customer";
import { DriversDialog } from "./Drivers";
import { useHold } from "./hold";
import { Icon } from "./Icon";
import { PrintersDialog, ReportsDialog, VoidReturnDialog } from "./Manage";
import { notify } from "./notify";
import { ChangeShown, EndDayDialog, endDayBlock, PayDialog, SplitDialog, TillDialog, type Paid } from "./Pay";
import { LineExtras, ModPicker, NumberAsk, Sheet, VariantPicker, type LineEdit, type Picked } from "./Pickers";
import { ChargesPop, DiscountPop, HeldPop, NotesPop, orderTags, ReasonAsk, tagDoc, TagsPop, type Held } from "./Pops";
import { TablesDialog, tblLbl } from "./Tables";

const TYPE_LBL: Record<OType, string> = { dinein: "In Store", takeaway: "Pickup", delivery: "Delivery" };
const CART_W = "33vw", COLS = 6, ROWS = 3, TG = 10;
const CART0: Cust = { name: "", phone: "", source: "", addr: {} };

export function Register() {
  const { S, device, branch, online, cashier, setCashier, write, pending, reload, sb } = useStore();
  const types = allowedTypes(S, device!.branchId);
  const [otype, setOtype] = useState<OType>(types[0] || "dinein");
  const [cart, setCart] = useState<Line[]>([]), [table, setTable] = useState(""), [eo, setEo] = useState<Row | null>(null), [cust, setCust] = useState<Cust>(CART0);   // eo: the order opened from Orders
  const [cat, setCat] = useState(""), [q, setQ] = useState("");
  const [disc, setDisc] = useState<Disc>(null), [picked, setPicked] = useState<string[]>([]), [openCh, setOpenCh] = useState<Record<string, number>>({}), [notes, setNotes] = useState({ receipt: "", kitchen: "" }), [tags, setTags] = useState<string[] | null>(null), [guests, setGuests] = useState(0);
  const x: Ctx = { S, device: device!, branch, otype };
  const live_eo = eo ? S.orders.find(o => o.id === eo.id) || eo : null, ro = !!live_eo && !["active", "pending"].includes(live_eo.status);
  const m = useMemo(() => menu(x), [S, otype, device]); // eslint-disable-line react-hooks/exhaustive-deps
  const top = cat && m.cats.some(c => c.id === cat) ? cat : "";   // "" = the category tiles; a tile opens its items, Back goes up
  const t = totals(x, cart, disc, picked, openCh, live_eo && otype === "delivery" ? +live_eo.deliveryFee || 0 : 0);   // a web or call-center delivery keeps its delivery fee
  const area = { cartW: CART_W };
  const [pop, setPop] = useState<string | null>(null);
  const say = (s: string) => notify(s);
  const press = useHold();

  // a window over the sale (variant, modifiers, open price…) that answers once
  const [dlg, setDlg] = useState<ReactNode>(null);
  const ask = <V,>(make: (done: (v: V) => void) => ReactNode) => new Promise<V>(res => setDlg(make(v => { setDlg(null); res(v); })));
  const cur = (n: number) => money(S, n);

  // variant first, then open price, then modifiers and the item note; the same item again joins its line
  const add = async (p: any): Promise<void> => {
    if (ro) return say("This order is done");
    if (live_eo?.status === "pending") return say("Accept the order first");
    if (prodOos(x, p)) return say(p.name + " is out of stock");
    const kids = kidsOf(x, p);
    if (kids.length) {
      const id = await ask<string | null>(done => <VariantPicker name={p.name} setName={(p.variants || []).find((v: any) => v.group)?.group} money={cur}
        list={kids.map(k => ({ name: k.name, price: prodPrice(x, k.p), id: k.p.id, oos: prodOos(x, k.p) }))} onDone={done} />);
      if (id) return add(kids.find(k => k.p.id === id)!.p);
      return;
    }
    let price = prodPrice(x, p);
    if (p.pricingMethod === "open") { const v = await ask<number | null>(done => <NumberAsk title={"Price for " + p.name} money={cur} onDone={done} />); if (v == null) return; price = v; }
    let r: Picked | null = { options: [], unitPrice: price, mods: "", note: "" };
    const md = modData(x, p);
    if (md.links.length) { r = await ask<Picked | null>(done => <ModPicker name={p.name} basePrice={price} data={md} money={cur} area={area} onDone={done} />); if (!r) return; }
    const pk = r;
    setCart(c => {
      const k = lineKey(p.id, pk.options), i = pk.note ? -1 : c.findIndex(l => !l.note && !l.saved && lineKey(l.productId, l.options) === k && l.price === pk.unitPrice);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + (pk.qty || 1) } : l));
      return [...c, { productId: p.id, name: p.name, price: pk.unitPrice, qty: pk.qty || 1, ...(pk.options.length ? { options: pk.options } : {}), ...(pk.note ? { note: pk.note } : {}), ...(pk.options.length || pk.note ? { mods: modLabel(pk.mods, pk.note) } : {}) }];
    });
  };
  // the store's next call number; the last one is kept on the tablet so the sequence carries on offline
  const takeNo = async () => { const k = "skwydNo_" + device!.branchId; let last = null; try { last = JSON.parse((await kv.getItem(k)) || "null"); } catch { /* none yet */ }
    const r = nextOrderNo(x, last); kv.setItem(k, JSON.stringify({ since: r.since, n: r.n })).catch(() => {}); return r.no; };
  const reset = () => { setOtype(types[0] || "dinein"); setCart([]); setTable(""); setQ(""); setEo(null); setCust(CART0); setDisc(null); setPicked([]); setOpenCh({}); setNotes({ receipt: "", kitchen: "" }); setTags(null); setGuests(0); };
  // an order from Orders: its lines (already sent ones marked), type and table
  const openOrder = (o: Row) => { setDlg(null); setEo(o); setNotes({ receipt: o.receiptNotes || "", kitchen: o.notes || "" }); setPicked((o.charges || []).map((c: any) => c.id)); setOpenCh(Object.fromEntries((o.charges || []).filter((c: any) => c.type === "open").map((c: any) => [c.id, +c.amount])));
    setGuests(+o.guests || 0); setDisc(+o.discount ? (o.discountType === "amt" ? { type: "amt", value: +o.discount } : { type: "pct", value: +o.discountPct || 0 }) : null); setCart((o.items || []).map((i: any) => ({ ...i, saved: +i.qty || 1 }))); setTable(String(o.table || "")); setOtype(o.type === "pickup" ? "takeaway" : o.type === "delivery" ? "delivery" : "dinein"); };
  // an existing order keeps its customer, address, source and channel
  const fields = () => { const f: any = orderFields(x, cart, t, { table, guests, customerName: cust.name, phone: cust.phone, disc, receiptNotes: notes.receipt, notes: notes.kitchen });
    if (otype !== "dinein") { f.address = otype === "delivery" ? addrJoin(cust.addr) : ""; if (cust.source) f.source = cust.source; }
    if (live_eo) { delete f.customerName; delete f.phone; delete f.address; delete f.source; } return f; };
  const askCust = async (tp: OType) => { const r = await ask<{ type: OType; cust: Cust } | null>(done => <CustomerDialog type={tp} types={types} init={cust} onDone={done} />); if (r) { setCust(r.cust); switchType(r.type); } };
  const who = () => cashier?.name || device!.name;
  const appSetOf = () => appSet(S, branch?.brandId);
  const accept = async () => { const o = live_eo!, now = new Date().toISOString();
    write("orders", o.id, { status: "active", updatedAt: now, acceptedAt: o.acceptedAt || now, handledBy: who(), ...(o.no ? {} : { no: await takeNo(), deviceId: device!.id }) }); say("Order accepted"); reset(); };
  const lines = (v: any, def: string) => String(v ?? def).split("\n").map(r => r.trim()).filter(Boolean);
  const decline = async () => { const reason = await ask<string | null>(done => <ReasonAsk title="Decline order: reason" ok="Decline" reasons={lines(appSetOf().rejectReasons, "Item not available\nStore too busy\nOrder already prepared")} onDone={done} />); if (!reason) return;
    const now = new Date().toISOString(); write("orders", live_eo!.id, { status: "declined", updatedAt: now, doneAt: now, voidReason: reason, handledBy: who() }); say("Order declined"); reset(); };
  // the call center asked to change an open order: approve (the change goes to the kitchen) or reject with a reason
  const erPending = (o: Row | null) => !!(o && o.editRequest && o.editRequest.status === "pending");
  const erDecide = async (yes: boolean) => { const o = live_eo!, er = o.editRequest, now = new Date().toISOString(), by = who();
    if (yes && o.status !== "active") { write("orders", o.id, { editRequest: { ...er, status: "rejected", reason: "Order already closed", decidedAt: now, decidedBy: by } }); say("This order is not editable"); return reset(); }
    if (!yes) { const reason = await ask<string | null>(done => <ReasonAsk title="Reject order edit: reason" reasons={lines(appSetOf().editRejectReasons, "Order already prepared\nItem not available\nAlready out for delivery")} onDone={done} />); if (!reason) return;
      write("orders", o.id, { editRequest: { ...er, status: "rejected", reason, decidedAt: now, decidedBy: by } }); say("Order edit rejected"); return reset(); }
    const d = er.data || {}, sm = er.summary || {};
    write("orders", o.id, { ...d, ...(sm.voidAll ? { approvedBy: by } : {}), updatedAt: now, editRequest: { ...er, status: "approved", decidedAt: now, decidedBy: by } });
    const kitchen = (its: any[]) => printJob(S, device!, "kitchen", pr => { const l = its.filter(i => printerHas(S, pr, i)); return l.length ? kitchenText({ ...o, ...d, items: l }, S, branch?.brandId) : null; });
    if (sm.voidAll) kitchen((o.items || []).map((i: any) => ({ ...i, name: "VOID " + i.name })));
    else { if ((sm.added || []).length) await kitchen(sm.added); if ((sm.voided || []).length) kitchen(sm.voided.map((i: any) => ({ ...i, name: "VOID " + i.name }))); }
    say(sm.voidAll ? "Order voided" : "Order edit approved"); reset(); };
  // the checks before an order is saved or paid
  const tillDlg = () => setDlg(<TillDialog x={x} onDone={msg => { setDlg(null); if (msg) say(msg); }} />);
  const ready = (paying: boolean) => {
    const blk = saleBlock(x); if (blk) { say(blk); return false; }
    if (!openShift(x)) { say(paying ? "Open the till before taking payments" : "Open till"); tillDlg(); return false; }
    if (otype !== "dinein" && !live_eo && custMissing(otype, cust, posSources(S).length > 0)) { say("Add the customer first"); askCust(otype); return false; }
    return true;
  };
  const base = (no: string) => ({ no, channel: "pos", source: "", brandId: branch?.brandId || null, branchId: device!.branchId, deviceId: device!.id, shiftId: openShift(x)?.id || null, agent: cashier?.name || device!.name });
  // the order's tags are kept in settings "tags": on.order[orderId] = [tagIds]
  const saveTags = (oid: string, ids: string[] | null = tags) => { if (ids == null) return; const d = tagDoc(S), on = JSON.parse(JSON.stringify(d.on || {})); const mm = (on.order ||= {}); if (ids.length) mm[oid] = ids; else delete mm[oid]; write("settings", "tags", { list: d.list || [], on }); };
  // Save: the order goes to the kitchen open (active), billed later from Orders. keep: Kitchen saves it but leaves it in the cart
  const saveOrder = async (keep = false) => {
    if (!cart.length || !ready(false)) return;
    if (live_eo) { const upd = { ...fields(), updatedAt: new Date().toISOString() }; write("orders", live_eo.id, upd); saveTags(live_eo.id);
      if (keep) { openOrder({ ...live_eo, ...upd }); return say("Sent to the kitchen · order " + ordRef(live_eo)); }
      say("Saved · order " + ordRef(live_eo)); reset(); return; }
    if (otype === "dinein" && !table.trim()) return say("Pick a table to save this order, or take the payment");
    const no = await takeNo(), now = new Date().toISOString();
    const nid = newId("pos"), row = { ...base(no), ...fields(), status: "active", createdAt: now, updatedAt: now }; write("orders", nid, row, "set"); saveTags(nid);
    if (keep) { openOrder({ id: nid, ...row } as Row); return say(`Order #${no} sent to the kitchen`); }
    reset(); say(`Order #${no} saved`);
  };
  const pay = async () => {
    if (!cart.length || !ready(true)) return;
    const p = await ask<Paid | null | "split">(done => <PayDialog x={x} total={t.total} phone={live_eo?.phone || cust.phone} onDone={done} onSplit={() => done("split")} />);
    if (!p) return;
    const now = new Date().toISOString(), total = t.total;
    // split check: every part is its own sale, linked by payment.split; each carries its share of the items
    if (p === "split") {
      const parts = await ask<number[] | null>(done => <SplitDialog x={x} total={total} cur={cur} onDone={done} />); if (!parts) return;
      const paid: Paid[] = [];
      for (let i = 0; i < parts.length; i++) {
        const r = await ask<Paid | null>(done => <PayDialog x={x} total={parts[i]} title={`Part ${i + 1} of ${parts.length}`} onDone={done} />);
        if (!r) return say(i ? `Parts 1–${i} were not saved: pay all parts to complete the split` : "Split cancelled");
        paid.push(r);
        if (r.type === "cash" && i < parts.length - 1) await ask<void>(done => <ChangeShown amount={r.change} title={`Part ${i + 1} paid`} money={cur} onClose={() => done()} />);
      }
      const f0 = fields(), grp = newId("spl"), no = live_eo?.no || await takeNo(), T = total || 1;
      parts.forEach((amount, i) => { const f = amount / T, sc = (v: any) => +((+v || 0) * f).toFixed(2);
        const po = { ...f0, items: f0.items.map((it: any) => ({ ...it, qty: +((+it.qty || 1) * f).toFixed(3), ...(+it.disc ? { disc: sc(it.disc) } : {}) })), subtotal: sc(f0.subtotal), discount: sc(f0.discount),
          charges: (f0.charges || []).map((c: any) => ({ ...c, amount: sc(c.amount) })), chargesTotal: sc(f0.chargesTotal), tax: sc(f0.tax), total: +amount.toFixed(2),
          status: "closed", updatedAt: now, closedAt: now, payment: { ...paid[i], split: { part: i + 1, of: parts.length, group: grp } } };
        if (i === 0 && live_eo) write("orders", live_eo.id, { ...po, no, shiftId: openShift(x)?.id || null, handledBy: who() });
        else write("orders", newId("pos") + "_" + (i + 1), { ...base(no), ...po, createdAt: live_eo?.createdAt || now }, "set"); });
      reset();
      const last = paid[paid.length - 1];
      if (last.type === "cash") await ask<void>(done => <ChangeShown amount={last.change} title={`Sale complete · ${parts.length} checks`} money={cur} onClose={() => done()} />); else say(`Sale complete · ${money(S, total)} · ${parts.length} checks`);
      if (device!.settings?.lockAfterSale && pinsOn(S)) setCashier(null);
      return;
    }
    const { haId, ...pp } = p, payment = { ...pp, ...(t.rnd ? { rounding: t.rnd } : {}) }, oid = live_eo ? live_eo.id : newId("pos"), no = live_eo?.no || await takeNo();
    if (haId && sb) { const { error } = await sb.from("house_account_txns").insert({ customer_id: haId, kind: "charge", amount: +total.toFixed(2), method: "House Account", order_id: oid, order_ref: String(no), branch_id: device!.branchId, created_by: who() });
      if (error) say("Sale saved, but the house account charge failed: " + error.message); }
    if (live_eo) write("orders", live_eo.id, { ...fields(), ...(live_eo.no ? {} : { no }), shiftId: openShift(x)?.id || null, handledBy: who(), status: "closed", updatedAt: now, closedAt: now, payment });   // billing an open order: it keeps its number and channel
    else write("orders", oid, { ...base(no), ...fields(), status: "closed", createdAt: now, updatedAt: now, closedAt: now, payment }, "set");
    saveTags(oid);
    reset();
    if (p.type === "cash") await ask<void>(done => <ChangeShown amount={p.change} title={"Sale complete · " + money(S, total)} money={cur} second={CUR2(S) ? CUR2(S)!.code + " " + num2(chg2(S, p.change), CUR2(S)!.dec) : ""} onClose={() => done()} />);
    else say("Sale complete · " + money(S, total));
    if (device!.settings?.lockAfterSale && pinsOn(S)) setTimeout(() => setCashier(null), p.type === "cash" ? 0 : 1500);   // Device settings: log out after each sale
  };
  const askTable = async () => { const v = await ask<number | null>(done => <NumberAsk title="Table number" initial={table} onDone={done} />); if (v != null) { setTable(v ? String(v) : ""); if (v && otype !== "dinein") switchType("dinein"); } };

  // Hold: the cart is put aside on this register (H1, H2…) and retrieved later
  const HK = "skwyd_held_" + device!.id;
  const heldList = async (): Promise<Held[]> => { try { return JSON.parse((await kv.getItem(HK)) || "[]"); } catch { return []; } };
  const hold = async () => { if (!cart.length || live_eo) return say(live_eo ? "Save the open order instead" : "Nothing to hold");
    const l = await heldList(), n = Math.max(0, ...l.map(h => h.n)) + 1;
    await kv.setItem(HK, JSON.stringify([...l, { id: newId("h"), n, at: new Date().toISOString(), total: t.total, data: { cart, otype, table, cust, disc, picked, openCh, notes } }]));
    reset(); say("Order held as H" + n); };
  const [held, setHeld] = useState<Held[]>([]), [heldN, setHeldN] = useState(0);
  const [tagInit, setTagInit] = useState<string[]>([]);
  const tagsDone = (r: string[] | null) => { setPop(null); if (r) { setTags(r); if (live_eo && ro) saveTags(live_eo.id, r); } };
  const heldLabel = (h: Held) => { const d = h.data || {}; return d.table ? tblLbl(d.table) : [TYPE_LBL[d.otype as OType] || d.otype, d.cust?.name].filter(Boolean).join(" · "); };
  const delHeld = async (h: Held) => { const l = (await heldList()).filter(y => y.id !== h.id); await kv.setItem(HK, JSON.stringify(l)); setHeld(l); setHeldN(l.length); if (!l.length) setPop(null); };
  const retrieve = async (h: Held) => { setPop(null); const l = await heldList();
    if (cart.length) return say("Finish or hold the current order first");
    const d = h.data; setCart(d.cart); setOtype(d.otype); setTable(d.table); setCust(d.cust); setDisc(d.disc); setPicked(d.picked); setOpenCh(d.openCh); setNotes(d.notes);
    await kv.setItem(HK, JSON.stringify(l.filter(y => y.id !== h.id))); setHeldN(l.length - 1); };
  useEffect(() => { heldList().then(l => setHeldN(l.length)); }, [cart.length, dlg]); // eslint-disable-line react-hooks/exhaustive-deps

  const action = async (a: string) => {
    if (a === "Void" || a === "Return") { // a saved open order is voided, a done one returned
      if (!live_eo) return say("Open an order from Orders to " + a.toLowerCase() + " it");
      if (a === "Void" && live_eo.status === "closed") return say("This order is done. Use Return.");
      if (a === "Return" && live_eo.status !== "closed") return say("Only done orders can be returned");
      if (live_eo.status === "closed" && fullyBack(live_eo)) return say("Nothing left to return on this order");
      if (!["active", "pending", "closed"].includes(live_eo.status)) return say("This order can't be voided");
      return setDlg(<VoidReturnDialog x={x} o={live_eo} onDone={msg => { setDlg(null); if (msg) { say(msg); reset(); } }} />); }
    if (ro && a !== "Print" && a !== "Tags") return say("This order is done");
    if (a === "Discount") { if (!allowPct && !allowAmt) return say("Your role doesn't allow discounts."); return setPop(a); }
    if (a === "Charges") { if (!can(S, cashier, "pos_charges")) return say("Your role doesn't allow charges."); return setPop(a); }
    if (a === "Notes") return setPop(a);
    if (a === "Print") return doPrint("receipt");
    // Kitchen sends what wasn't sent yet and saves the order at the same time
    if (a === "Kitchen") { if (!cart.some(l => l.qty > (l.saved || 0))) return say("Nothing new to send"); await doPrint("kitchen"); return saveOrder(true); }
    if (a === "Tags") { setTagInit(tags ?? (live_eo ? tagDoc(S).on?.order?.[live_eo.id] || [] : [])); return setPop(a); }
    if (a === "Hold") return hold();
    if (a === "Retrieve") { if (cart.length) return say("Finish or hold the current order first"); setHeld(await heldList()); return setPop(a); }
  };
  // Print: the bill of this order (or its receipt when done); Kitchen: the ticket of what wasn't sent yet (all of it on a new order)
  const doPrint = async (kind: "receipt" | "kitchen") => {
    if (!cart.length && !live_eo) return say("Nothing to print");
    if (kind === "receipt" && !can(S, cashier, live_eo?.status === "closed" ? "pos_reprint" : "pos_print_check")) return say("Your role doesn't allow printing this.");
    const now = new Date().toISOString(), o: any = live_eo && ro ? live_eo : { ...(live_eo || { no: "", createdAt: now }), ...fields(), ...(live_eo ? { customerName: live_eo.customerName, phone: live_eo.phone } : {}), items: cart.map(({ saved: _s, ...i }) => i) };
    const items = kind === "kitchen" && live_eo && !ro ? cart.filter(l => l.qty > (l.saved || 0)).map(({ saved, ...l }) => ({ ...l, qty: +(l.qty - (saved || 0)).toFixed(3) })) : o.items;
    const r = await printJob(S, device!, kind, pr => { if (kind === "receipt") return receiptText(S, branch, o); const its = items.filter((i: any) => printerHas(S, pr, i)); return its.length ? kitchenText({ ...o, items: its }, S, branch?.brandId) : null; });
    if (r.preview != null) return setDlg(<Sheet title={kind === "receipt" ? "Receipt (preview)" : "Kitchen ticket (preview)"} width={440} onClose={() => setDlg(null)}><pre className="whitespace-pre-wrap font-mono text-[13px] text-gray-900 dark:text-gray-50">{r.preview}</pre></Sheet>);
    if (r.bad.length) return setDlg(<Sheet title="Printing failed" width={460} onClose={() => setDlg(null)}><p className="whitespace-pre-line text-sm text-red-600 dark:text-red-500">{r.bad.join("\n")}</p></Sheet>);
    say(r.n > 1 ? `Sent to ${r.n} printers` : "Printed");
  };
  // Pickup & Delivery: today's pickup and delivery orders, a new one, and the drivers
  const pdBoard = () => setDlg(<PDBoard x={x} onOpen={openOrder} onClose={() => setDlg(null)} onNew={() => { setDlg(null); reset(); askCust(types.find(k => k !== "dinein") || "takeaway"); }}
    onDrivers={() => setDlg(<DriversDialog x={x} onOpen={openOrder} onClose={() => pdBoard()} />)} />);
  // Functions → Sound On / Off (kept on the tablet)
  const [sound, setSound] = useState(true);
  useEffect(() => { kv.getItem("skwyd_sound").then(v => setSound(v !== "off")); }, []);
  useEffect(() => onAlertOpen(o => { if (cart.length && !live_eo) return say("Finish or hold the current order first"); openOrder(o); }), [cart.length, live_eo?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // the master register can accept web orders by itself (Device settings: Auto accept); a scheduled one waits until an hour before its time
  const auto = useRef(new Set<string>());
  useEffect(() => {
    const pend = S.orders.filter(o => o.branchId === device!.branchId && o.channel !== "pos" && o.status === "pending");
    const master = (() => { const ms = S.devices.filter(d => !d.deleted && d.branchId === device!.branchId && d.settings?.master); return !ms.length || ms.some(d => d.id === device!.id); })();
    if (device!.settings?.autoAccept && master) {
      pend.filter(o => o.channel !== "callcenter" && !auto.current.has(o.id) && !(o.scheduledAt && +new Date(o.scheduledAt) - Date.now() > 3600000)).forEach(async o => {
        auto.current.add(o.id); const now = new Date().toISOString();
        write("orders", o.id, { status: "active", updatedAt: now, ...(o.acceptedAt ? {} : { acceptedAt: now }), handledBy: who() + " (auto)", ...(o.no ? {} : { no: await takeNo(), deviceId: device!.id }) });
        say("New web order accepted automatically"); });
    }
  }, [S.orders]); // eslint-disable-line react-hooks/exhaustive-deps
  // signed out after a few idle minutes (Device settings: lock minutes, else the brand's logout minutes)
  const lastTouch = useRef(Date.now());
  useEffect(() => { const mins = +(device!.settings?.lockMinutes ?? appSetOf().logoutMinutes ?? 10); if (!(mins > 0) || !pinsOn(S)) return;
    const h = setInterval(() => { if (Date.now() - lastTouch.current > mins * 60000 && !cart.length) setCashier(null); }, 15000); return () => clearInterval(h); }, [cart.length, S.users]); // eslint-disable-line react-hooks/exhaustive-deps

  const qty = (i: number, d: number) => { const l = cart[i];
    if (ro || live_eo?.status === "pending") return say(live_eo?.status === "pending" ? "Accept the order first" : "This order is done");
    if (d < 0 && l?.saved && l.qty - 1 < l.saved) return action("Void");   // an item already sent is voided, with a manager's approval
    setCart(c => c.flatMap((y, j) => (j !== i ? [y] : y.qty + d <= 0 ? [] : [reDisc({ ...y, qty: +(y.qty + d).toFixed(3) })]))); };
  const reDisc = (l: Line): Line => l.discPct ? { ...l, disc: +(l.price * l.qty * Math.min(100, l.discPct) / 100).toFixed(2) } : l.disc ? { ...l, disc: Math.min(l.disc, +(l.price * l.qty).toFixed(2)) } : l;
  // a tap on a cart line: its note (one tap opens the note, for every item); a long press: its discount
  const editLine = (i: number) => { const l = cart[i];
    if (ro || live_eo?.status === "pending") return say(live_eo?.status === "pending" ? "Accept the order first" : "This order is done");
    if (l.saved) return say("This item was sent to the kitchen. Void it to change it.");
    return lineExtras(i, "note"); };
  const lineExtras = async (i: number, part?: "note" | "disc") => { const l = cart[i]; if (ro || live_eo?.status === "pending") return say(live_eo?.status === "pending" ? "Accept the order first" : "This order is done");
    const r = await ask<LineEdit | null>(done => <LineExtras name={l.name} unit={l.price} qty={l.qty} note={l.note} disc={l.disc} discPct={l.discPct} money={cur} canPct={allowPct} canAmt={allowAmt} area={area} minQty={l.saved || 0} part={part} onDone={done} />); if (!r) return;
    if (r.remove) return setCart(c => c.filter((_, j) => j !== i));
    setCart(c => c.map((y, j) => { if (j !== i) return y; const z: Line = { ...y }; delete z.disc; delete z.discPct; if (r.disc) z.disc = r.disc; if (r.discPct) z.discPct = r.discPct; if (r.qty) z.qty = r.qty;
      if (r.note) z.note = r.note; else delete z.note; z.mods = modLabel((y.options || []).length ? optRows(y.options!).map(o => (o.n > 1 ? o.n + "× " : "") + o.name).join(", ") : "", r.note); if (!z.mods) delete z.mods; return reDisc(z); })); };
  const switchType = (k: OType) => { setOtype(k); const y = { ...x, otype: k }; setCart(c => c.map(l => { const p = S.products.find(z => z.id === l.productId); return p && p.pricingMethod !== "open" ? { ...l, price: +(prodPrice(y, p) + (l.options || []).reduce((a: number, o: any) => a + (+o.price || 0), 0)).toFixed(2) } : l; })); };

  const items = q.trim() ? m.search(q) : top ? [...m.subsOf(top).map(c => ({ sub: c })), ...m.itemsOf(top)] : m.tops.map(c => ({ sub: c }));
  const tiles: any[] = [...(top && !q.trim() ? [{ back: true }] : []), ...items];
  // the menu grid: 6 across, 3 down, filling the space exactly; more tiles scroll a page (3 rows) at a time
  const gridRef = useRef<HTMLDivElement>(null), [gh, setGh] = useState(0);
  useEffect(() => { const el = gridRef.current; if (!el) return; const ro2 = new ResizeObserver(() => setGh(el.clientHeight)); ro2.observe(el); return () => ro2.disconnect(); }, []);
  const tileH = gh ? (gh - TG * (ROWS - 1)) / ROWS : 160;
  useEffect(() => { gridRef.current?.scrollTo({ top: 0 }); }, [top, q]);

  // the top buttons follow the order: new, saved (open), done, or returned / voided
  const st = live_eo?.status, unsent = cart.some(l => l.qty > (l.saved || 0)), noTable = otype === "dinein" && !table.trim();
  const BTN: Record<string, string> = { Print: "print", Kitchen: "chef", Hold: "pause", Retrieve: "ret", Discount: "pct", Charges: "dollar", Notes: "note", Tags: "tag", Void: "void", Return: "ret" };
  const acts: string[] = !live_eo ? (!cart.length ? [...(heldN ? ["Retrieve"] : []), "Discount", "Charges", "Notes", "Tags"]
      : [...(noTable ? [] : ["Print", "Kitchen"]), "Hold", ...(heldN ? ["Retrieve"] : []), "Discount", "Charges", "Notes", "Tags"])
    : ["active", "pending"].includes(st) ? ["Print", ...(unsent ? ["Kitchen"] : []), "Void", "Discount", "Charges", "Notes", "Tags"]
    : st === "closed" ? ["Print", ...(fullyBack(live_eo) ? [] : ["Return"]), "Tags"] : ["Print", "Tags"];
  const pdN = pendingCount(S, device!.branchId);
  const sym = String(S.settings.find(z => z.id === "company")?.currencySymbol || "$");
  const allowPct = can(S, cashier, "pos_disc_pct") || can(S, cashier, "pos_discount"), allowAmt = can(S, cashier, "pos_disc_amount") || can(S, cashier, "pos_discount");
  const c = live_eo ? { name: live_eo.customerName, phone: live_eo.phone, addr: live_eo.address } : { name: cust.name, phone: cust.phone, addr: otype === "delivery" ? addrJoin(cust.addr) : "" };
  const STL: Record<string, [string, "success" | "error" | "warning"]> = { closed: ["Done", "success"], void: ["Void", "error"], returned: ["Returned", "error"], refund: ["Returned", "error"], declined: ["Declined", "error"], pending: ["Waiting for you", "warning"] };
  const tg = (tags ?? (live_eo ? tagDoc(S).on?.order?.[live_eo.id] : null) ?? []).map((id: string) => orderTags(S).find(z => z.id === id)?.name).filter(Boolean) as string[];
  const popW: Record<string, number> = { Discount: 560, Retrieve: 600, Tags: 400, Charges: 400, Notes: 380 };

  return (
    <div className="flex h-full bg-gray-200 portal:bg-[var(--portal-canvas)] dark:bg-gray-900 dark:portal:bg-gray-900" onPointerDownCapture={() => { lastTouch.current = Date.now(); }}>
      {/* ---------- cart: the full height on the left ---------- */}
      <aside className="relative z-[1] flex h-full flex-col border-r border-gray-200 bg-white portal:border-r-0 portal:shadow-[4px_0_18px_rgb(16_24_40/0.06)] dark:border-gray-800 dark:bg-gray-950 dark:portal:border-r" style={{ width: CART_W }}>
        <div className="flex items-start gap-2 px-4 pt-3">
          {live_eo && STL[st] ? <Badge variant={STL[st][1]}>{STL[st][0]}</Badge> : null}
          <Icon name={otype === "delivery" ? "scooter" : otype === "dinein" ? "store" : "bag"} className="size-5 text-blue-600 dark:text-blue-500" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span className="font-semibold text-gray-900 dark:text-gray-50">{TYPE_LBL[otype] || otype}</span>
            {otype === "dinein" && table ? <span className="flex items-center gap-1">
              <button type="button" disabled={!!live_eo} onClick={askTable} className="font-semibold text-blue-600 dark:text-blue-500" aria-label="Change table">· {tblLbl(table)}</button>
              {guests ? <span className="text-sm text-gray-500">{guests} guests</span> : null}
              {!live_eo ? <Button variant="ghost" className="p-1" aria-label="Remove table" onClick={() => { setTable(""); setGuests(0); }}><Icon name="x" className="size-4 text-red-600" /></Button> : null}</span> : null}
          </div>
          {!online || pending ? <Badge variant="warning">{!online ? (pending ? `Offline · ${pending}` : "Offline") : `Syncing ${pending}`}</Badge> : null}
          <div className="text-right"><p className="text-[11px] text-gray-500">Order</p><p className="font-semibold text-gray-900 dark:text-gray-50">{live_eo?.no || "New"}</p></div>
          {live_eo?.ref ? <div className="ms-2 text-right"><p className="text-[11px] text-gray-500">Reference</p><p className="font-semibold text-gray-900 dark:text-gray-50">{live_eo.ref}</p></div> : null}
        </div>
        <div className="flex gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-800">
          <Button variant="secondary" disabled={!!live_eo} onClick={() => askCust(otype)} className="h-12 flex-1 justify-start gap-2 px-3 text-left">
            <Icon name="user" className="size-5 shrink-0 text-gray-600 dark:text-gray-400" />
            <span className="min-w-0 flex-1">{c.name || c.phone ? <><span className="block truncate text-sm font-semibold">{c.name || c.phone}</span>{c.name && c.phone ? <span className="block truncate text-xs font-normal text-gray-500">{c.phone}</span> : null}</> : <span className="text-sm font-normal text-gray-500">Add customer</span>}</span>
          </Button>
          {cust.name && !live_eo && otype === "dinein" ? <Button variant="ghost" aria-label="Remove customer" className="h-12" onClick={() => setCust(CART0)}><Icon name="x" className="size-4 text-red-600" /></Button> : null}
        </div>
        {c.addr ? <p className="line-clamp-2 px-4 pt-2 text-xs text-gray-500">{c.addr}</p> : null}
        {/* the order's tags and notes, at the top of the cart under the customer */}
        {tg.length || notes.kitchen || notes.receipt ? <div className="space-y-1.5 border-b border-gray-100 px-4 py-2 dark:border-gray-900">
          {tg.length ? <div className="flex flex-wrap gap-1.5">{tg.map(n => <Badge key={n} className="gap-1"><Icon name="tag" className="size-3" />{n}</Badge>)}</div> : null}
          {notes.kitchen ? <p className="flex gap-1.5 text-xs text-gray-700 dark:text-gray-300"><Icon name="chef" className="size-3.5 shrink-0 text-gray-400" /><span className="line-clamp-2">{notes.kitchen}</span></p> : null}
          {notes.receipt ? <p className="flex gap-1.5 text-xs text-gray-700 dark:text-gray-300"><Icon name="note" className="size-3.5 shrink-0 text-gray-400" /><span className="line-clamp-2">{notes.receipt}</span></p> : null}
        </div> : null}
        {erPending(live_eo) ? <div className="mx-4 mt-2 rounded-md bg-amber-50 p-2.5 text-sm dark:bg-amber-500/10">
          <p className="font-semibold text-amber-800 dark:text-amber-400">The call center asked to change this order</p>
          {(() => { const sm = live_eo!.editRequest?.summary || {}; return sm.voidAll ? <p>Void whole order{sm.reason ? ": " + sm.reason : ""}</p> : <>{(sm.added || []).map((i: any, k: number) => <p key={"a" + k}>+ {i.qty} × {i.name}</p>)}{(sm.voided || []).map((i: any, k: number) => <p key={"v" + k}>Void {i.qty} × {i.name}</p>)}</>; })()}
        </div> : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {cart.map((l, i) => { const sent = !!l.saved && l.qty <= (l.saved || 0), tag = live_eo ? (st === "void" ? ["Void", "text-red-600"] : st === "returned" || st === "refund" ? ["Returned", "text-red-600"] : sent && ["active", "pending"].includes(st) ? ["Sent", "text-emerald-600"] : null) : null;
            const left = l.qty - (l.saved || 0);
            // swipe an unsent line left to delete it; − stops at 1
            return <SwipeRow key={i} enabled={!ro && !sent} onDelete={() => qty(i, -left)} className={cx("flex items-center gap-2.5 border-b border-gray-100 px-4 py-2.5 dark:border-gray-900", live_eo && !l.saved && !ro ? "bg-blue-50 dark:bg-blue-500/10" : "bg-white dark:bg-gray-950")}>
              {ro || sent ? <span className="min-w-6 text-sm text-gray-500">{l.qty}×</span> : null}
              <button type="button" aria-label={l.name} className="min-w-0 flex-1 text-left" {...press(() => editLine(i), () => lineExtras(i, "disc"))}>
                <span className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-50">{l.name}{tag ? <span className={cx("ms-2 text-[11px] font-semibold", tag[1])}>{tag[0]}</span> : null}</span>
                {/* the modifiers one under the other, each with its price on the right */}
                {(l.options || []).length ? optRows(l.options!).map((o, k) => <span key={k} className="flex gap-2 ps-3 text-xs text-gray-500"><span className="flex-1 truncate">{(o.n > 1 ? o.n + "× " : "") + o.name}</span>{o.price ? <span>+{money(S, o.price)}</span> : null}</span>)
                  : l.mods && !l.note ? <span className="block ps-3 text-xs text-gray-500">{l.mods}</span> : null}
                {l.disc ? <span className="block text-xs text-emerald-600">Discount{l.discPct ? " " + l.discPct + "%" : ""} −{money(S, l.disc)}</span> : null}
                {/* the item's note is the last line under the item */}
                {l.note ? <span className="block text-xs italic text-gray-500">Note: {l.note}</span> : null}
              </button>
              {ro || sent ? null : <div className="flex items-center rounded-md border border-gray-300 dark:border-gray-800">
                <Button variant="ghost" className="size-9 p-0" aria-label={"Less " + l.name} disabled={left <= 1} onClick={() => qty(i, -1)}><Icon name="minus" className="size-4" /></Button>
                <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-50">{left}</span>
                <Button variant="ghost" className="size-9 p-0" aria-label={"More " + l.name} onClick={() => qty(i, 1)}><Icon name="plus" className="size-4" /></Button></div>}
              <span className="w-20 text-right text-sm font-medium tabular-nums text-gray-900 dark:text-gray-50">{money(S, lineNet(l))}</span>
            </SwipeRow>; })}
        </div>
        <div className="space-y-1 border-t border-gray-200 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-800">
          {t.disc ? <Sum l={t.promo ? t.promo.name : disc?.name ? disc.name : disc?.type === "pct" ? `Discount ${disc.value}%` : "Discount"} r={"−" + money(S, t.disc)} /> : null}
          {t.charges.map(ch => <Sum key={ch.id} l={ch.name} r={money(S, ch.amount)} />)}
          <Sum l="Subtotal" r={money(S, t.net)} />
          <Sum l="Tax" r={money(S, t.tax)} />
          {t.rnd ? <Sum l="Rounding" r={money(S, t.rnd)} /> : null}
          {money2(S, t.total) ? <Sum l="" r={"≈ " + money2(S, t.total)} /> : null}
        </div>
        <div className="flex gap-2.5 px-4 pb-4 pt-0.5">
          {erPending(live_eo) ? <>
            <Button variant="destructive" className="h-14 flex-1 text-base" onClick={() => erDecide(false)}>Reject</Button>
            <Button className="h-14 flex-[2] text-base portal:rounded-xl" onClick={() => erDecide(true)}>Approve</Button>
          </> : st === "pending" ? <>
            <Button variant="destructive" className="h-14 flex-1 text-base" onClick={decline}>Decline</Button>
            <Button className="h-14 flex-[2] text-base portal:rounded-xl" onClick={accept}>Accept</Button>
          </> : ro ? <div className={cx("flex h-14 flex-1 items-center justify-between gap-3 rounded-md border px-4", st === "closed" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400" : st === "void" ? "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-400")}>
              <span className="truncate text-sm font-medium">{st === "closed" ? ["Paid", live_eo!.payment?.method || live_eo!.payment?.type, live_eo!.invoiceNo ? "Check " + live_eo!.invoiceNo : ""].filter(Boolean).join(" · ") : st === "void" ? ["Voided", live_eo!.voidReason, live_eo!.handledBy ? "by " + live_eo!.handledBy : ""].filter(Boolean).join(" · ") : ["Returned", live_eo!.voidReason].filter(Boolean).join(" · ")}</span>
              <span className={cx("text-lg font-semibold tabular-nums", st === "void" && "line-through")}>{(st === "closed" || st === "void" ? "" : "−") + money(S, t.total)}</span></div>
          : <>
            {/* Save: keeps the order open and starts a new one (an In Store order needs a table); Kitchen saves too but leaves the order in the cart */}
            {live_eo || !noTable ? <Button variant="secondary" className="h-14 flex-1 text-base" disabled={!cart.length} onClick={() => saveOrder()}>Save</Button> : null}
            <Button className="h-14 flex-[2] justify-between px-5 text-base portal:rounded-xl" disabled={!cart.length} onClick={pay}><span>TOTAL</span><span className="tabular-nums">{money(S, t.total)}</span></Button>
          </>}
        </div>
      </aside>

      {/* ---------- menu ---------- */}
      <main className="flex h-full min-w-0 flex-1 flex-col gap-3 px-4 pt-3">
        <div className="grid grid-cols-8 gap-2">
          {acts.map(a => {
            const btn = <Button key={a} className={cx("relative aspect-square h-auto flex-col gap-1.5 p-0 text-[13px] portal:rounded-[14px] portal:shadow-[0_2px_4px_rgb(79_70_229/0.25),0_8px_18px_rgb(79_70_229/0.18)]", pop === a && "ring-[3px] ring-blue-300")} onClick={() => action(a)}>
              <Icon name={BTN[a]} className="size-6" />{a}
              {a === "Retrieve" && heldN ? <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-gray-200 bg-red-600 px-1 text-[11px] font-bold dark:border-gray-900">{heldN}</span> : null}</Button>;
            if (!["Discount", "Charges", "Notes", "Tags", "Retrieve"].includes(a)) return btn;
            return <Popover key={a} open={pop === a} onOpenChange={o => { if (!o) setPop(null); }}>
              <PopoverTrigger asChild>{btn}</PopoverTrigger>
              <PopoverContent sideOffset={8} collisionPadding={8} className="max-h-[80dvh] overflow-y-auto p-2" style={{ width: popW[a] }} onOpenAutoFocus={e => e.preventDefault()}>
                {a === "Tags" ? <TagsPop S={S} init={tagInit} onDone={tagsDone} />
                  : a === "Retrieve" ? <HeldPop held={held} cur={cur} label={heldLabel} onPick={retrieve} onDelete={delHeld} onClose={() => setPop(null)} />
                  : a === "Discount" ? <DiscountPop x={x} cart={cart} cur={cur} sym={sym} allowPct={allowPct} allowAmt={allowAmt} init={disc} onDone={d => { setPop(null); if (d !== undefined) setDisc(d); }} />
                  : a === "Charges" ? <ChargesPop x={x} cur={cur} picked={picked} open={openCh} onDone={r => { setPop(null); if (r) { setPicked(r.picked); setOpenCh(r.open); } }} />
                  : <NotesPop init={notes} onDone={r => { setPop(null); if (r) setNotes(r); }} />}
              </PopoverContent></Popover>;
          })}
        </div>
        <Input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search items" aria-label="Search items" className="[&>input]:h-11 portal:[&>input]:rounded-[10px] portal:[&>input]:border-transparent portal:[&>input]:shadow-[0_1px_2px_rgb(16_24_40/0.06),0_4px_12px_rgb(16_24_40/0.05)]" />
        <div ref={gridRef} className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto">
          {!m.tops.length ? <p className="p-5 text-sm text-gray-500">No POS menu at this store.</p> : null}
          {q.trim() && !items.length ? <p className="p-5 text-sm text-gray-500">No items match.</p> : null}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: TG, gridAutoRows: tileH }}>
            {tiles.map((it: any, k: number) => it.back
              ? <Button key="back" variant="secondary" className="h-full snap-start flex-col gap-1 border-dashed" onClick={() => setCat(m.parentOf(top))}><Icon name="back" className="size-6" />Back</Button>
              : it.sub ? <Tile key={it.sub.id} name={it.sub.name} img={it.sub.imageUrl} snap={k % (COLS * ROWS) < COLS} onClick={() => { setQ(""); setCat(it.sub.id); }} />
              : <Tile key={it.id + k} name={it.name} img={it.imageUrl} oos={prodOos(x, it)} snap={k % (COLS * ROWS) < COLS} sub={it.pricingMethod === "open" ? "Open price" : (kidsOf(x, it).length ? "From " : "") + money(S, tilePrice(x, it))} onClick={() => add(it)} />)}
          </div>
        </div>
        <nav className="mb-4 flex h-14 items-center justify-evenly rounded-md border border-gray-200 bg-white portal:rounded-2xl portal:border-transparent portal:shadow-[0_1px_2px_rgb(16_24_40/0.06),0_6px_16px_rgb(16_24_40/0.08)] dark:border-gray-800 dark:bg-gray-950">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-12 gap-2 text-[15px]"><Icon name="grid" className="size-5" />Functions</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-72">
              <DropdownMenuLabel><span className="block text-sm font-semibold normal-case text-gray-900 dark:text-gray-50">{cashier?.name || device!.name}</span><span className="block text-xs font-normal normal-case">{[branch?.name, device!.name].filter(Boolean).join(" · ")}</span></DropdownMenuLabel>
              <Fn icon="till" label={openShift(x) ? "Close Till" : "Open Till"} onSelect={() => { if (!can(S, cashier, "pos_shift")) return say("Your role doesn't allow opening or closing the till."); tillDlg(); }} />
              <Fn icon="dayend" label="End of Day" onSelect={() => { if (!can(S, cashier, "pos_endday")) return say("Your role doesn't allow ending the day."); const b = endDayBlock(x); if (b) return say(b); setDlg(<EndDayDialog x={x} onDone={msg => { setDlg(null); if (msg) say(msg); }} />); }} />
              <Fn icon="chart" label="Reports" onSelect={() => { if (!can(S, cashier, "pos_reports") && !can(S, cashier, "pos_endday")) return say("Your role doesn't allow POS reports."); setDlg(<ReportsDialog x={x} say={say} onClose={() => setDlg(null)} />); }} />
              <Fn icon="device" label="Printers & Devices" onSelect={() => { if (!can(S, cashier, "pos_settings")) return say("Your role doesn't allow device settings."); setDlg(<PrintersDialog x={x} onClose={() => setDlg(null)} />); }} />
              <Fn icon={sound ? "sound" : "mute"} label={sound ? "Sound On" : "Sound Off"} onSelect={e => { e.preventDefault(); const v = !sound; setSound(v); kv.setItem("skwyd_sound", v ? "on" : "off"); }} />
              <Fn icon="sync" label="Sync Now" onSelect={() => { reload(); say(online ? "Syncing…" : "No connection"); }} />
              <DropdownMenuSeparator />
              <Fn icon="logout" label="Sign Out" bad onSelect={() => { reset(); setCashier(null); }} />
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" className="h-12 gap-2 text-[15px]" onClick={() => setDlg(<OrdersList x={x} onOpen={openOrder} onClose={() => setDlg(null)} />)}><Icon name="list" className="size-5" />Orders</Button>
          <Button variant="ghost" className="h-12 gap-2 text-[15px]" onClick={() => setDlg(<TablesDialog x={x} onClose={() => setDlg(null)} onOpen={openOrder} onFree={async n => { setDlg(null); if (live_eo) reset(); setTable(n); if (otype !== "dinein") switchType("dinein");
            const g = await ask<number | null>(done => <NumberAsk title={"Guests at " + tblLbl(n)} onDone={done} />); if (g != null) setGuests(Math.max(0, Math.round(g))); }} />)}><Icon name="table" className="size-5" />Tables</Button>
          <Button variant="ghost" className="relative h-12 gap-2 text-[15px]" onClick={pdBoard}><Icon name="scooter" className="size-5" />Pickup & Delivery
            {pdN ? <span className="absolute -right-1 top-0 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[11px] font-bold text-white dark:border-gray-950">{pdN}</span> : null}</Button>
          <Button variant="ghost" className="h-12 gap-2 text-[15px]" onClick={reset}><Icon name="plus" className="size-5" />New</Button>
        </nav>
      </main>
      {dlg}
    </div>
  );
}

const Sum = ({ l, r }: { l: string; r: string }) => <div className="flex justify-between"><span>{l}</span><span className="tabular-nums">{r}</span></div>;
const Fn = ({ icon, label, onSelect, bad }: { icon: string; label: string; onSelect: (e: Event) => void; bad?: boolean }) => (
  <DropdownMenuItem onSelect={onSelect} className={cx("h-11 gap-3 text-[15px]", bad && "text-red-600 dark:text-red-500")}><Icon name={icon} className={cx("size-5", bad ? "text-red-600" : "text-blue-600 dark:text-blue-500")} />{label}</DropdownMenuItem>);

// a menu tile: a Tremor card with the photo across its top (cropped to fit), the name on up to 3 lines and the price in blue
function Tile({ name, img, sub, oos, snap, onClick }: { name: string; img?: string; sub?: string; oos?: boolean; snap?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={oos} onClick={onClick} aria-label={name + (sub ? ", " + sub : "")}
      className={cx("flex h-full flex-col overflow-hidden rounded-md bg-white text-center shadow-xs portal:rounded-[14px] portal:shadow-[0_1px_2px_rgb(16_24_40/0.06),0_6px_16px_rgb(16_24_40/0.07)] hover:bg-blue-50 disabled:opacity-50 dark:bg-gray-950 dark:hover:bg-blue-500/10", snap && "snap-start")}>
      <span className="flex min-h-0 w-full flex-1 items-center justify-center bg-amber-50/60 dark:bg-gray-900">{img ? <img src={img} alt="" className="size-full object-cover" /> : <Icon name="bowl" className="size-7 text-gray-400" />}</span>
      <span className="flex h-[66px] shrink-0 flex-col justify-between px-1.5 pb-1.5 pt-1">
        <span className="line-clamp-2 text-[12.5px] font-medium leading-[15px] text-gray-900 dark:text-gray-50">{name}</span>
        {sub ? <span className={cx("truncate text-[12.5px] font-semibold", oos ? "text-red-600" : "text-blue-600 dark:text-blue-500")}>{oos ? "Out of stock" : sub}</span> : null}</span>
    </button>);
}
// a line's options, the same ones counted together: [{ name, n, price }]
const optRows = (opts: { name: string; price?: number }[]) => { const r: { name: string; n: number; price: number }[] = [];
  opts.forEach(o => { const z = r.find(y => y.name === o.name); if (z) { z.n++; z.price += +(o.price || 0); } else r.push({ name: o.name, n: 1, price: +(o.price || 0) }); }); return r; };

// a cart line that can be swiped left to show a red Delete button (no animation: the line follows the finger, then sits open or closed)
const SW = 88;
function SwipeRow({ enabled, onDelete, className, children }: { enabled: boolean; onDelete: () => void; className?: string; children: ReactNode }) {
  const [dx, setDx] = useState(0), st = useRef<{ x: number; y: number; base: number; on: boolean } | null>(null), open = useRef(false);
  if (!enabled && dx) { open.current = false; setDx(0); }
  return (
    <div className="relative overflow-hidden">
      {dx < 0 ? <button type="button" onClick={() => { open.current = false; setDx(0); onDelete(); }} className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600 text-sm font-semibold text-white" style={{ width: SW }}>Delete</button> : null}
      <div className={className} style={{ transform: `translateX(${dx}px)`, touchAction: "pan-y" }}
        onPointerDown={e => { if (enabled) st.current = { x: e.clientX, y: e.clientY, base: open.current ? -SW : 0, on: false }; }}
        onPointerMove={e => { const s = st.current; if (!s) return; const mx = e.clientX - s.x, my = e.clientY - s.y;
          if (!s.on) { if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.5) { s.on = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } else return; }
          setDx(Math.max(-SW, Math.min(0, s.base + mx))); }}
        onPointerUp={() => { const s = st.current; st.current = null; if (!s?.on) return; open.current = dx < -SW / 2; setDx(open.current ? -SW : 0); }}
        onPointerCancel={() => { st.current = null; setDx(open.current ? -SW : 0); }}
        onClickCapture={e => { if (dx) { e.stopPropagation(); e.preventDefault(); open.current = false; setDx(0); } }}>{children}</div>
    </div>);
}
