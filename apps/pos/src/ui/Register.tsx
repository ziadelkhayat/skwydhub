// The sale screen, laid out like the current POS (cart on the left, menu on the right, 5×4 square tiles,
// search above the menu, square action buttons, bottom navigation with names) in the TailAdmin look.
// The action buttons and the bottom bar are the current POS's: Print, Kitchen, Void, Hold, Retrieve, Discount, Charges, Tags, Notes;
// Functions, Orders, Tables, Pickup & Delivery, New.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { useScreen } from "../lib/screen";
import { can, type Disc, addrJoin, custMissing, posSources, type Cust, allowedTypes, newId, nextOrderNo, openShift, orderFields, saleBlock, kidsOf, lineKey, lineNet, menu, modData, modLabel, money, money2, prodOos, prodPrice, tilePrice, totals, type Ctx, type Line, type OType } from "../lib/pos";
import { LineExtras, ModPicker, NumberAsk, VariantPicker, type Picked } from "./Pickers";
import { ChangeShown, PayDialog, type Paid } from "./Pay";
import { TillDialog } from "./Till";
import { EndDayDialog, endDayBlock } from "./EndDay";
import { VoidReturnDialog } from "./VoidReturn";
import { TablesDialog, tblLbl } from "./Tables";
import { DRV_ST, DriverPick, DriversDialog } from "./Drivers";
import { SplitDialog } from "./Split";
import { TagsDialog, orderTags, tagDoc } from "./Tags";
import { PrintersDialog } from "./Printers";
import { ReportsDialog } from "./Reports";
import { chg2, CUR2, fullyBack, num2 } from "../lib/pos";
import { OrdersDialog, ordRef } from "./Orders";
import { CustomerDialog } from "./Customer";
import { appSet, kitchenText, printJob, printerHas, receiptText } from "../lib/print";
import { usePins } from "../lib/pos";
import { Sheet } from "./Pickers";
import { Bubble, notify, touched } from "./Bubble";
import { OrdersList, PDBoard } from "./Boards";
import { ChargesDialog, DiscountDialog, NotesDialog, ReasonAsk, RetrieveDialog, type Held } from "./Extras";
import type { Row } from "../lib/db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import { useStore } from "../lib/store";
import { C, F, R, shadowXs } from "../lib/theme";
import { Icon } from "./Icon";
import { ChargesPop, DiscountPop, NotesPop, Popover } from "./Pops";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { onAlertOpen, pendingCount } from "./Alert";
import { Btn, Card, Pill, T } from "./kit";

const TYPE_LBL: Record<OType, string> = { dinein: "In Store", takeaway: "Pickup", delivery: "Delivery" };
const GAP = 12, PADX = 16, TG = 10, AG = 8;   // CART_W: the cart card is 360 wide, like the call center's   // TG: the gap between menu tiles (5 across, 4 down)

const MENU_BG = "#E5E7EB";   // the grey behind the menu, top buttons and bottom bar (Tailwind gray-200)
export function Register() {
  const { S, device, branch, online, cashier, setCashier, write, pending, reload, sb } = useStore();
  const { width: W, height: H } = useScreen();
  const types = allowedTypes(S, device!.branchId);
  const [otype, setOtype] = useState<OType>(types[0] || "dinein");
  const [cart, setCart] = useState<Line[]>([]), [table, setTable] = useState(""), [eo, setEo] = useState<Row | null>(null), [cust, setCust] = useState<Cust>({ name: "", phone: "", source: "", addr: {} });   // eo: the order opened from Orders
  const [cat, setCat] = useState(""), [q, setQ] = useState(""), [more, setMore] = useState(false);
  const [disc, setDisc] = useState<Disc>(null), [picked, setPicked] = useState<string[]>([]), [openCh, setOpenCh] = useState<Record<string, number>>({}), [notes, setNotes] = useState({ receipt: "", kitchen: "" }), [tags, setTags] = useState<string[] | null>(null), [guests, setGuests] = useState(0);
  const x: Ctx = { S, device: device!, branch, otype };
  const live_eo = eo ? S.orders.find(o => o.id === eo.id) || eo : null, ro = !!live_eo && !["active", "pending"].includes(live_eo.status);
  const m = useMemo(() => menu(x), [S, otype, device]);
  const top = cat && m.cats.some(c => c.id === cat) ? cat : "";   // "" = the category tiles; a tile opens its items, Back goes up
  const t = totals(x, cart, disc, picked, openCh, live_eo && otype === "delivery" ? +live_eo.deliveryFee || 0 : 0);   // a web or call-center delivery keeps its delivery fee

  // the cart takes a third of the screen; the menu the rest. The 8 top buttons are squares filling the menu's width
  const insTop = useSafeAreaInsets().top, CART_W = Math.round(W * 0.33), menuW = W - CART_W, ab = Math.floor((menuW - PADX * 2 - AG * 7) / 8);
  const [grid, setGrid] = useState({ w: 0, h: 0 }), fit = fitTiles(grid.w, grid.h);
  const [pop, setPop] = useState<null | { k: string; ax: number }>(null), [page, setPage] = useState(0);
  // messages: a bubble pointing at the button just pressed (Bubble.tsx)
  // messages: a bubble pointing at the button just pressed (Bubble.tsx)
  const say = (s: string) => notify(s);

  // a window over the sale (variant, modifiers, open price) that answers once
  const [dlg, setDlg] = useState<ReactNode>(null);
  const [nav, setNav] = useState<string | null>(null); // the bottom-bar screen that is open, shown in light blue
  const ask = <V,>(make: (done: (v: V) => void) => ReactNode) => new Promise<V>(res => setDlg(make(v => { setDlg(null); res(v); })));
  const cur = (n: number) => money(S, n);

  // as in pos.html addProduct: variant first, then open price, then modifiers and the item note; the same item again joins its line
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
    if (md.links.length) { r = await ask<Picked | null>(done => <ModPicker name={p.name} basePrice={price} data={md} money={cur} onDone={done} />); if (!r) return; }
    const pk = r;
    setCart(c => {
      const k = lineKey(p.id, pk.options), i = pk.note ? -1 : c.findIndex(l => !l.note && !l.saved && lineKey(l.productId, l.options) === k && l.price === pk.unitPrice);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { productId: p.id, name: p.name, price: pk.unitPrice, qty: 1, ...(pk.options.length ? { options: pk.options } : {}), ...(pk.note ? { note: pk.note } : {}), ...(pk.options.length || pk.note ? { mods: modLabel(pk.mods, pk.note) } : {}) }];
    });
  };
  // the store's next call number; the last one is kept on the tablet so the sequence carries on offline
  const takeNo = async () => { const k = "skwydNo_" + device!.branchId; let last = null; try { last = JSON.parse((await AsyncStorage.getItem(k)) || "null"); } catch {}
    const r = nextOrderNo(x, last); AsyncStorage.setItem(k, JSON.stringify({ since: r.since, n: r.n })).catch(() => {}); return r.no; };
  const reset = () => { setOtype(types[0] || "dinein"); setCart([]); setTable(""); setQ(""); setEo(null); setCust({ name: "", phone: "", source: "", addr: {} }); setDisc(null); setPicked([]); setOpenCh({}); setNotes({ receipt: "", kitchen: "" }); setTags(null); setGuests(0); };
  // an order from Orders: its lines (already sent ones marked), type and table
  const openOrder = (o: Row) => { setDlg(null); setEo(o); setNotes({ receipt: o.receiptNotes || "", kitchen: o.notes || "" }); setPicked((o.charges || []).map((c: any) => c.id)); setOpenCh(Object.fromEntries((o.charges || []).filter((c: any) => c.type === "open").map((c: any) => [c.id, +c.amount])));
    setGuests(+o.guests || 0); setDisc(+o.discount ? (o.discountType === "amt" ? { type: "amt", value: +o.discount } : { type: "pct", value: +o.discountPct || 0 }) : null); setCart((o.items || []).map((i: any) => ({ ...i, saved: +i.qty || 1 }))); setTable(String(o.table || "")); setOtype(o.type === "pickup" ? "takeaway" : o.type === "delivery" ? "delivery" : "dinein"); };
  // an existing order keeps its customer, address, source and channel
  const fields = () => { const f: any = orderFields(x, cart, t, { table, guests, customerName: cust.name, phone: cust.phone, disc, receiptNotes: notes.receipt, notes: notes.kitchen });
    if (otype !== "dinein") { f.address = otype === "delivery" ? addrJoin(cust.addr) : ""; if (cust.source) f.source = cust.source; }
    if (live_eo) { delete f.customerName; delete f.phone; delete f.address; delete f.source; } return f; };
  const askCust = async (tp: OType) => { const r = await ask<{ type: OType; cust: Cust } | null>(done => <CustomerDialog type={tp} types={types} init={cust} onDone={done} />); if (r) { setCust(r.cust); switchType(r.type); } };
  const who = () => cashier?.name || device!.name;
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
  // the checks before an order is saved or paid (pos.html saleBlock, openShift, orderInfoOk)
  const ready = (paying: boolean) => {
    const blk = saleBlock(x); if (blk) { say(blk); return false; }
    if (!openShift(x)) { say(paying ? "Open the till before taking payments" : "Open till"); tillDlg(); return false; }
    if (otype !== "dinein" && !live_eo && custMissing(otype, cust, posSources(S).length > 0)) { say("Add the customer first"); askCust(otype); return false; }
    return true;
  };
  const base = (no: string) => ({ no, channel: "pos", source: "", brandId: branch?.brandId || null, branchId: device!.branchId, deviceId: device!.id, shiftId: openShift(x)?.id || null, agent: cashier?.name || device!.name });
  // Save: the order goes to the kitchen open (active), to be billed later from Orders
  const saveOrder = async () => {
    if (!cart.length || !ready(false)) return;
    if (live_eo) { write("orders", live_eo.id, { ...fields(), updatedAt: new Date().toISOString() }); saveTags(live_eo.id); say("Saved · order " + ordRef(live_eo)); reset(); return; }
    if (otype === "dinein" && !table.trim()) return say("Pick a table to save this order, or take the payment");
    const no = await takeNo(), now = new Date().toISOString();
    const nid = newId("pos"); write("orders", nid, { ...base(no), ...fields(), status: "active", createdAt: now, updatedAt: now }, "set"); saveTags(nid);
    reset(); say(`Order #${no} sent to the kitchen`);
  };
  const pay = async () => {
    if (!cart.length || !ready(true)) return;
    let split = false;
    const p = await ask<Paid | null | "split">(done => <PayDialog x={x} total={t.total} phone={live_eo?.phone || cust.phone} onDone={done} onSplit={() => done("split")} />);
    if (!p) return;
    const now = new Date().toISOString(), total = t.total;
    // split check (pos.html): every part is its own sale with its own number from the server, linked by payment.split; each carries its share of the items
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
      reset(); split = true;
      const last = paid[paid.length - 1];
      if (last.type === "cash") await ask<void>(done => <ChangeShown amount={last.change} title={`Sale complete · ${parts.length} checks`} money={cur} onClose={() => done()} />); else say(`Sale complete · ${money(S, total)} · ${parts.length} checks`);
    }
    if (split || p === "split") { if (device!.settings?.lockAfterSale && usePins(S)) setCashier(null); return; }
    const { haId, ...pp } = p, payment = { ...pp, ...(t.rnd ? { rounding: t.rnd } : {}) }, oid = live_eo ? live_eo.id : newId("pos"), no = live_eo?.no || await takeNo();
    if (haId && sb) { const { error } = await sb.from("house_account_txns").insert({ customer_id: haId, kind: "charge", amount: +total.toFixed(2), method: "House Account", order_id: oid, order_ref: String(no), branch_id: device!.branchId, created_by: who() });
      if (error) say("Sale saved, but the house account charge failed: " + error.message); }
    if (live_eo) write("orders", live_eo.id, { ...fields(), ...(live_eo.no ? {} : { no }), shiftId: openShift(x)?.id || null, handledBy: who(), status: "closed", updatedAt: now, closedAt: now, payment });   // billing an open order: it keeps its number and channel
    else write("orders", oid, { ...base(no), ...fields(), status: "closed", createdAt: now, updatedAt: now, closedAt: now, payment }, "set");
    saveTags(oid);
    reset();
    if (p.type === "cash") await ask<void>(done => <ChangeShown amount={p.change} title={"Sale complete · " + money(S, total)} money={cur} second={CUR2(S) ? CUR2(S)!.code + " " + num2(chg2(S, p.change), CUR2(S)!.dec) : ""} onClose={() => done()} />);
    else say("Sale complete · " + money(S, total));
    if (device!.settings?.lockAfterSale && usePins(S)) setTimeout(() => setCashier(null), p.type === "cash" ? 0 : 1500);   // Device settings: log out after each sale
  };
  const askTable = async () => { const v = await ask<number | null>(done => <NumberAsk title="Table number" initial={table} onDone={done} />); if (v != null) { setTable(v ? String(v) : ""); if (v && otype !== "dinein") switchType("dinein"); } };

  // Hold: the cart is put aside on this register (H1, H2…) and retrieved later
  const HK = "skwyd_held_" + device!.id;
  const heldList = async (): Promise<Held[]> => { try { return JSON.parse((await AsyncStorage.getItem(HK)) || "[]"); } catch { return []; } };
  const hold = async () => { if (!cart.length || live_eo) return say(live_eo ? "Save the open order instead" : "Nothing to hold");
    const l = await heldList(), n = Math.max(0, ...l.map(h => h.n)) + 1;
    await AsyncStorage.setItem(HK, JSON.stringify([...l, { id: newId("h"), n, at: new Date().toISOString(), total: t.total, data: { cart, otype, table, cust, disc, picked, openCh, notes } }]));
    reset(); say("Order held as H" + n); };
  const retrieve = async () => { const l = await heldList(); const h = await ask<Held | null>(done => <RetrieveDialog held={l} cur={cur} onDone={done} />); if (!h) return;
    if (cart.length) return say("Finish or hold the current order first");
    const d = h.data; setCart(d.cart); setOtype(d.otype); setTable(d.table); setCust(d.cust); setDisc(d.disc); setPicked(d.picked); setOpenCh(d.openCh); setNotes(d.notes);
    await AsyncStorage.setItem(HK, JSON.stringify(l.filter(y => y.id !== h.id))); };
  const [heldN, setHeldN] = useState(0);
  useEffect(() => { heldList().then(l => setHeldN(l.length)); }, [cart.length, dlg]); // eslint-disable-line react-hooks/exhaustive-deps
  const usable = (a: string) => {
    const unsent = cart.some(l => l.qty > (l.saved || 0)), edit = !ro;   // discount, charges, notes and tags can be set before the first item
    switch (a) {
      case "Print": return (cart.length > 0 || !!live_eo) && can(S, cashier, live_eo?.status === "closed" ? "pos_reprint" : "pos_print_check");
      case "Kitchen": return !ro && unsent;
      case "Void": return !!live_eo && ["active", "pending"].includes(live_eo.status);   // void is for saved orders that aren't done yet
      case "Return": return !!live_eo && live_eo.status === "closed" && !fullyBack(live_eo);   // a done order is returned, never voided
      case "Hold": return cart.length > 0 && !live_eo;
      case "Retrieve": return !cart.length && heldN > 0;
      case "Discount": return edit && (can(S, cashier, "pos_disc_pct") || can(S, cashier, "pos_disc_amount") || can(S, cashier, "pos_discount"));
      case "Charges": return edit && can(S, cashier, "pos_charges");
      case "Tags": return (tagDoc(S).list || []).some((z: any) => z.type === "order" && !z.deleted);
      case "Notes": return edit;
    } return true; };
  const action = async (a: string, ax = 0) => {
    if (a === "Void" || a === "Return") { // a saved open order is voided, a done one returned
      if (!live_eo) return say("Open an order from Orders to " + a.toLowerCase() + " it");
      if (a === "Void" && live_eo.status === "closed") return say("This order is done. Use Return.");
      if (a === "Return" && live_eo.status !== "closed") return say("Only done orders can be returned");
      if (live_eo.status === "closed" && fullyBack(live_eo)) return say("Nothing left to return on this order");
      if (!["active", "pending", "closed"].includes(live_eo.status)) return say("This order can't be voided");
      return setDlg(<VoidReturnDialog x={x} o={live_eo} onDone={m => { setDlg(null); if (m) { say(m); reset(); } }} />); }
    if (ro && a !== "Print") return say("This order is done");
    if (a === "Discount") { const p = can(S, cashier, "pos_disc_pct") || can(S, cashier, "pos_discount"), am = can(S, cashier, "pos_disc_amount") || can(S, cashier, "pos_discount");
      if (!p && !am) return say("Your role doesn't allow discounts."); return setPop({ k: a, ax }); }
    if (a === "Charges") { if (!can(S, cashier, "pos_charges")) return say("Your role doesn't allow charges."); return setPop({ k: a, ax }); }
    if (a === "Notes") return setPop({ k: a, ax });
    if (a === "Print") return doPrint("receipt");
    // Kitchen sends what wasn't sent yet and saves the order at the same time
    if (a === "Kitchen") { if (!cart.some(l => l.qty > (l.saved || 0))) return say("Nothing new to send"); await doPrint("kitchen"); return saveOrder(); }
    if (a === "Tags") { const cur0 = tags ?? (live_eo ? tagDoc(S).on?.order?.[live_eo.id] || [] : []); const r = await ask<string[] | null>(done => <TagsDialog S={S} init={cur0} onDone={done} />);
      if (r) { setTags(r); if (live_eo && ro) saveTags(live_eo.id, r); } return; }
    if (a === "Hold") return hold();
    if (a === "Retrieve") { if (cart.length) return say("Finish or hold the current order first"); return retrieve(); }
    say(a + " comes in the next step.");
  };
  // Print: the bill of this order (or its receipt when done); Kitchen: the ticket of what wasn't sent yet (all of it on a new order)
  const doPrint = async (kind: "receipt" | "kitchen") => {
    if (!cart.length && !live_eo) return say("Nothing to print");
    if (kind === "receipt" && !can(S, cashier, live_eo?.status === "closed" ? "pos_reprint" : "pos_print_check") ) return say("Your role doesn't allow printing this.");
    const now = new Date().toISOString(), o: any = live_eo && ro ? live_eo : { ...(live_eo || { no: "", createdAt: now }), ...fields(), ...(live_eo ? { customerName: live_eo.customerName, phone: live_eo.phone } : {}), items: cart.map(({ saved, ...i }) => i) };
    const items = kind === "kitchen" && live_eo && !ro ? cart.filter(l => l.qty > (l.saved || 0)).map(({ saved, ...l }) => ({ ...l, qty: +(l.qty - (saved || 0)).toFixed(3) })) : o.items;
    const r = await printJob(S, device!, kind, pr => { if (kind === "receipt") return receiptText(S, branch, o); const its = items.filter((i: any) => printerHas(S, pr, i)); return its.length ? kitchenText({ ...o, items: its }, S, branch?.brandId) : null; });
    if (r.preview != null) return setDlg(<Sheet title={kind === "receipt" ? "Receipt (preview)" : "Kitchen ticket (preview)"} width={420} onClose={() => setDlg(null)}><T style={{ fontFamily: "monospace", fontSize: 13 }}>{r.preview}</T></Sheet>);
    if (r.bad.length) return setDlg(<Sheet title="Printing failed" width={460} onClose={() => setDlg(null)}><T color={C.bad} style={{ lineHeight: 22 }}>{r.bad.join("\n")}</T></Sheet>);
    say(r.n > 1 ? `Sent to ${r.n} printers` : "Printed");
  };
  // Pickup & Delivery: today's pickup and delivery orders, a new one, and the drivers
  const pdBoard = () => setDlg(<PDBoard x={x} onOpen={openOrder} onClose={() => setDlg(null)} onNew={() => { setDlg(null); reset(); askCust(types.find(k => k !== "dinein") || "takeaway"); }}
    onDrivers={() => setDlg(<DriversDialog x={x} onOpen={openOrder} onClose={() => pdBoard()} />)} />);
  const dispatch = () => { const now = new Date().toISOString(); write("orders", live_eo!.id, { dispatchedAt: now, dispatchedBy: who(), updatedAt: now }); say("Order " + ordRef(live_eo!) + " dispatched" + (live_eo!.driverName ? " with " + live_eo!.driverName : "")); reset(); };
  // new web and call center orders: a banner to open them (pos.html incoming); the master register can accept web orders by itself (Device settings: Auto accept)
  // the "wheet-whee-oo" of the current POS for new orders and order edits; Functions → Sound On / Off (kept on the tablet)
  const whistle = useAudioPlayer(require("../../assets/new-order.wav")), [sound, setSound] = useState(true);
  useEffect(() => { AsyncStorage.getItem("skwyd_sound").then(v => setSound(v !== "off")); }, []);
  useEffect(() => onAlertOpen(o => { if (cart.length && !live_eo) return say("Finish or hold the current order first"); openOrder(o); }), [cart.length, live_eo?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const seen = useRef<Set<string> | null>(null), auto = useRef(new Set<string>()), [incoming, setIncoming] = useState<Row | null>(null);
  useEffect(() => {
    const pend = S.orders.filter(o => o.branchId === device!.branchId && o.channel !== "pos" && o.status === "pending");
    const edits = S.orders.filter(o => o.branchId === device!.branchId && o.editRequest?.status === "pending"), ek = (o: Row) => "er:" + (o.editRequest.id || o.id + o.editRequest.at);
    if (!seen.current) { seen.current = new Set([...pend.map(o => o.id), ...edits.map(ek)]); return; }
    const fresh = pend.filter(o => !seen.current!.has(o.id)); fresh.forEach(o => seen.current!.add(o.id));
    const freshE = edits.filter(o => !seen.current!.has(ek(o))); freshE.forEach(o => seen.current!.add(ek(o)));
    void freshE;
    const master = (() => { const m = S.devices.filter(d => !d.deleted && d.branchId === device!.branchId && d.settings?.master); return !m.length || m.some(d => d.id === device!.id); })();
    if (device!.settings?.autoAccept && master) {
      pend.filter(o => o.channel !== "callcenter" && !auto.current.has(o.id) && !(o.scheduledAt && +new Date(o.scheduledAt) - Date.now() > 3600000)).forEach(async o => {   // a scheduled order waits until an hour before its time
        auto.current.add(o.id); const now = new Date().toISOString();
        write("orders", o.id, { status: "active", updatedAt: now, ...(o.acceptedAt ? {} : { acceptedAt: now }), handledBy: who() + " (auto)", ...(o.no ? {} : { no: await takeNo(), deviceId: device!.id }) });
        say("New web order accepted automatically"); });
    }
  }, [S.orders]);
  // logged out after a few idle minutes (Device settings: lock minutes, else the brand's logout minutes)
  const lastTouch = useRef(Date.now());
  useEffect(() => { const mins = +(device!.settings?.lockMinutes ?? appSetOf().logoutMinutes ?? 10); if (!(mins > 0) || !usePins(S)) return;
    const t = setInterval(() => { if (Date.now() - lastTouch.current > mins * 60000 && !cart.length) setCashier(null); }, 15000); return () => clearInterval(t); }, [cart.length, S.users]);
  const appSetOf = () => appSet(S, branch?.brandId);
  // the order's tags are kept in settings "tags": on.order[orderId] = [tagIds]
  const saveTags = (oid: string, ids: string[] | null = tags) => { if (ids == null) return; const d = tagDoc(S), on = JSON.parse(JSON.stringify(d.on || {})); const m = (on.order ||= {}); if (ids.length) m[oid] = ids; else delete m[oid]; write("settings", "tags", { list: d.list || [], on }); };
  const tillDlg = () => setDlg(<TillDialog x={x} onDone={m => { setDlg(null); if (m) say(m); }} />);

  const qty = (i: number, d: number) => { const l = cart[i];
    if (ro || live_eo?.status === "pending") return say(live_eo?.status === "pending" ? "Accept the order first" : "This order is done");
    if (d < 0 && l?.saved && l.qty - 1 < l.saved) return action("Void");   // an item already sent is voided, with a manager's approval
    setQty(i, d); };
  const setQty = (i: number, d: number) => setCart(c => c.flatMap((l, j) => (j !== i ? [l] : l.qty + d <= 0 ? [] : [reDisc({ ...l, qty: +(l.qty + d).toFixed(3) })])));
  const reDisc = (l: Line): Line => l.discPct ? { ...l, disc: +(l.price * l.qty * Math.min(100, l.discPct) / 100).toFixed(2) } : l.disc ? { ...l, disc: Math.min(l.disc, +(l.price * l.qty).toFixed(2)) } : l;
  // a tap on a cart line: an item with modifiers opens its window again to change them
  const editLine = async (i: number) => { const l = cart[i], p = S.products.find(z => z.id === l.productId); if (!p) return;
    if (ro || live_eo?.status === "pending") return say(live_eo?.status === "pending" ? "Accept the order first" : "This order is done");
    if (l.saved) return say("This item was sent to the kitchen. Void it to change it.");
    const md = modData(x, p); if (!md.links.length) return;
    const base = p.pricingMethod === "open" ? +(l.price - (l.options || []).reduce((a: number, o: any) => a + (+o.price || 0), 0)).toFixed(2) : prodPrice(x, p);
    const r = await ask<Picked | null>(done => <ModPicker name={l.name} basePrice={base} data={md} money={cur} edit={{ options: l.options || [], note: l.note }} onDone={done} />); if (!r) return;
    setCart(c => c.map((y, j) => { if (j !== i) return y; const z: Line = { ...y, price: r.unitPrice, mods: modLabel(r.mods, r.note) }; if (r.options.length) z.options = r.options; else delete z.options; if (r.note) z.note = r.note; else delete z.note; if (!z.mods) delete z.mods; return reDisc(z); })); };
  // a long press: the line's note and discount
  const lineExtras = async (i: number) => { const l = cart[i]; if (ro || live_eo?.status === "pending") return say(live_eo?.status === "pending" ? "Accept the order first" : "This order is done");
    const canPct = can(S, cashier, "pos_disc_pct") || can(S, cashier, "pos_discount"), canAmt = can(S, cashier, "pos_disc_amount") || can(S, cashier, "pos_discount");
    const r = await ask<{ note: string; disc?: number; discPct?: number } | null>(done => <LineExtras name={l.name} unit={l.price} qty={l.qty} note={l.note} disc={l.disc} discPct={l.discPct} money={cur} canPct={canPct} canAmt={canAmt} onDone={done} />); if (!r) return;
    setCart(c => c.map((y, j) => { if (j !== i) return y; const z: Line = { ...y }; delete z.disc; delete z.discPct; if (r.disc) z.disc = r.disc; if (r.discPct) z.discPct = r.discPct;
      if (r.note) z.note = r.note; else delete z.note; z.mods = modLabel((y.options || []).length ? optRows(y.options!).map(o => (o.n > 1 ? o.n + "× " : "") + o.name).join(", ") : "", r.note); if (!z.mods) delete z.mods; return z; })); };
  const switchType = (k: OType) => { setOtype(k); const y = { ...x, otype: k }; setCart(c => c.map(l => { const p = S.products.find(z => z.id === l.productId); return p && p.pricingMethod !== "open" ? { ...l, price: +(prodPrice(y, p) + (l.options || []).reduce((a: number, o: any) => a + (+o.price || 0), 0)).toFixed(2) } : l; })); };

  const items = q.trim() ? m.search(q) : top ? [...m.subsOf(top).map(c => ({ sub: c })), ...m.itemsOf(top)] : m.tops.map(c => ({ sub: c }));
  const tiles: any[] = [...(top && !q.trim() ? [{ back: true }] : []), ...items], per = fit.cols * fit.rows, pages = Math.max(1, Math.ceil(tiles.length / Math.max(1, per)));
  useEffect(() => setPage(0), [top, q]);

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
  const STL: Record<string, [string, "ok" | "bad" | "warn" | "brand"]> = { closed: ["Done", "ok"], void: ["Void", "bad"], returned: ["Returned", "bad"], refund: ["Returned", "bad"], declined: ["Declined", "bad"], pending: ["Waiting for you", "warn"] };
  const box = { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: 8, height: 46, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: "#fff" };

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: MENU_BG, paddingTop: insTop }} onTouchStart={(e: any) => { lastTouch.current = Date.now(); touched(e); }} onPointerDown={(e: any) => { lastTouch.current = Date.now(); touched(e); }}>
      {/* ---------- cart: the full height on the left ---------- */}
      <View style={{ width: CART_W, backgroundColor: "#fff", borderRightWidth: 1, borderColor: C.line }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          {live_eo && STL[st] ? <Pill text={STL[st][0]} tone={STL[st][1]} /> : null}
          <Icon name={otype === "delivery" ? "scooter" : otype === "dinein" ? "store" : "bag"} size={20} color={C.brand600} />
          <T w="s" size={16} style={{ flex: 1 }}>{TYPE_LBL[otype] || otype}</T>
          {!online || pending ? <Pill text={!online ? (pending ? `Offline · ${pending}` : "Offline") : `Syncing ${pending}`} tone="warn" /> : null}
          <View style={{ alignItems: "flex-end" }}><T size={11} color={C.mut}>Order</T><T w="s" size={15}>{live_eo?.no || "New"}</T></View>
          {live_eo?.ref ? <View style={{ alignItems: "flex-end", marginLeft: 8 }}><T size={11} color={C.mut}>Reference</T><T w="s" size={15}>{live_eo.ref}</T></View> : null}
        </View>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: C.line }}>
          {otype === "dinein" ? <Pressable accessibilityRole="button" disabled={!!live_eo} onPress={askTable} style={box}>
            <Icon name="table" size={18} color={C.ink2} /><T size={14} style={{ flex: 1 }} numberOfLines={1}>{table ? tblLbl(table) + (guests ? " · " + guests + " guests" : "") : "Add table"}</T>
            {table && !live_eo ? <Pressable accessibilityLabel="Remove table" hitSlop={8} onPress={() => { setTable(""); setGuests(0); }}><Icon name="x" size={16} color={C.bad} /></Pressable> : null}</Pressable> : null}
          <Pressable accessibilityRole="button" disabled={!!live_eo} onPress={() => askCust(otype)} style={box}>
            <Icon name="user" size={18} color={C.ink2} />
            <View style={{ flex: 1, minWidth: 0 }}>{c.name || c.phone ? <><T w="s" size={14} numberOfLines={1}>{c.name || c.phone}</T>{c.name && c.phone ? <T size={11.5} color={C.mut} numberOfLines={1}>{c.phone}</T> : null}</> : <T size={14} color={C.mut}>Add customer</T>}</View>
            {cust.name && !live_eo && otype === "dinein" ? <Pressable accessibilityLabel="Remove customer" hitSlop={8} onPress={() => setCust({ name: "", phone: "", source: "", addr: {} })}><Icon name="x" size={16} color={C.bad} /></Pressable> : null}</Pressable>
        </View>
        {c.addr ? <T size={12.5} color={C.mut} numberOfLines={2} style={{ paddingHorizontal: 16, paddingTop: 8 }}>{c.addr}</T> : null}
        {erPending(live_eo) ? <View style={{ marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: R.md, backgroundColor: C.warnBg, gap: 2 }}>
          <T w="s" size={14} color={C.warn}>The call center asked to change this order</T>
          {(() => { const sm = live_eo!.editRequest?.summary || {}; return sm.voidAll ? [<T key="v" size={13}>Void whole order{sm.reason ? ": " + sm.reason : ""}</T>] : [...(sm.added || []).map((i: any, k: number) => <T key={"a" + k} size={13}>+ {i.qty} × {i.name}</T>), ...(sm.voided || []).map((i: any, k: number) => <T key={"v" + k} size={13}>Void {i.qty} × {i.name}</T>)]; })()}
        </View> : null}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          {!cart.length ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="bowl" size={36} color={C.mut2} /><T color={C.mut}>Tap an item to start the order.</T></View>
            : cart.map((l, i) => { const sent = !!l.saved && l.qty <= (l.saved || 0), tag = live_eo ? (st === "void" ? ["Void", C.bad] : st === "returned" || st === "refund" ? ["Returned", C.bad] : sent && ["active", "pending"].includes(st) ? ["Sent", C.ok] : !l.saved ? ["New", C.brand600] : null) : null;
              return <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderColor: C.line2, backgroundColor: live_eo && !l.saved && !ro ? C.brand50 : "#fff" }}>
                {ro || sent ? <T size={14} color={C.mut} style={{ minWidth: 26 }}>{l.qty}×</T> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={l.name} onPress={() => editLine(i)} onLongPress={() => lineExtras(i)} delayLongPress={450} style={{ flex: 1, minWidth: 0 }}>
                  <T w="m" size={14.5} numberOfLines={2}>{l.name}{tag ? <T w="s" size={11} color={tag[1] as string}>{"  " + tag[0]}</T> : null}</T>
                  {/* the modifiers one under the other, pushed in under the name, each with its price on the right */}
                  {(l.options || []).length ? optRows(l.options!).map((o, k) => <View key={k} style={{ flexDirection: "row", gap: 8, paddingLeft: 12 }}>
                      <T size={12.5} color={C.mut} style={{ flex: 1 }} numberOfLines={1}>{(o.n > 1 ? o.n + "× " : "") + o.name}</T>{o.price ? <T size={12.5} color={C.mut}>+{money(S, o.price)}</T> : null}</View>)
                    : l.mods && !l.note ? <T size={12.5} color={C.mut} style={{ paddingLeft: 12 }}>{l.mods}</T> : null}
                  {l.note ? <T size={12.5} color={C.mut} style={{ fontStyle: "italic" }}>Note: {l.note}</T> : null}
                  {l.disc ? <T size={12.5} color={C.ok}>Discount{l.discPct ? " " + l.discPct + "%" : ""} −{money(S, l.disc)}</T> : null}</Pressable>
                {ro || sent ? null : <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.field, borderRadius: R.sm }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={"Less " + l.name} onPress={() => qty(i, -1)} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Icon name={l.qty - (l.saved || 0) <= 1 ? "trash" : "minus"} size={17} color={l.qty - (l.saved || 0) <= 1 ? C.bad : C.ink2} /></Pressable>
                  <T w="s" style={{ minWidth: 24, textAlign: "center" }}>{l.qty - (l.saved || 0)}</T>
                  <Pressable accessibilityRole="button" accessibilityLabel={"More " + l.name} onPress={() => qty(i, 1)} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={17} color={C.ink2} /></Pressable></View>}
                <T w="m" size={14.5} style={{ width: 72, textAlign: "right" }}>{money(S, lineNet(l))}</T>
              </View>; })}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: C.line, gap: 4 }}>
          {t.disc ? <Row l={t.promo ? t.promo.name : disc?.name ? disc.name : disc?.type === "pct" ? `Discount ${disc.value}%` : "Discount"} r={"−" + money(S, t.disc)} muted /> : null}
          {t.charges.map(ch => <Row key={ch.id} l={ch.name} r={money(S, ch.amount)} muted />)}
          {(tags ?? (live_eo ? tagDoc(S).on?.order?.[live_eo.id] : null) ?? []).length ? <T size={12.5} color={C.mut}>Tag: {(tags ?? tagDoc(S).on?.order?.[live_eo!.id] ?? []).map((id: string) => orderTags(S).find(z => z.id === id)?.name).filter(Boolean).join(", ")}</T> : null}
          {notes.kitchen || notes.receipt ? <T size={12.5} color={C.mut} numberOfLines={2}>{[notes.kitchen && "Kitchen: " + notes.kitchen, notes.receipt && "Note: " + notes.receipt].filter(Boolean).join(" · ")}</T> : null}
          <Row l="Subtotal" r={money(S, t.net)} muted />
          <Row l="Tax" r={money(S, t.tax)} muted />
          {t.rnd ? <Row l="Rounding" r={money(S, t.rnd)} muted /> : null}
          {money2(S, t.total) ? <Row l="" r={"≈ " + money2(S, t.total)} muted /> : null}
        </View>
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 }}>
          {erPending(live_eo) ? <>
            <Btn kind="danger" height={56} style={{ flex: 1 }} label="Reject" onPress={() => erDecide(false)} />
            <Btn kind="primary" height={56} style={{ flex: 2 }} label="Approve" onPress={() => erDecide(true)} />
          </> : st === "pending" ? <>
            <Btn kind="danger" height={56} style={{ flex: 1 }} label="Decline" onPress={decline} />
            <Btn kind="primary" height={56} style={{ flex: 2 }} label="Accept" onPress={accept} />
          </> : ro ? <View style={{ flex: 1, height: 56, borderRadius: R.sm, borderWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              borderColor: st === "closed" ? "#A7F3D0" : st === "void" ? C.line : "#FECACA", backgroundColor: st === "closed" ? C.okBg : st === "void" ? "#F3F4F6" : C.badBg }}>
            <T w="m" size={14} numberOfLines={1} style={{ flex: 1 }} color={st === "closed" ? C.ok : st === "void" ? C.ink2 : C.bad800}>
              {st === "closed" ? ["Paid", live_eo!.payment?.method || live_eo!.payment?.type, live_eo!.invoiceNo ? "Check " + live_eo!.invoiceNo : ""].filter(Boolean).join(" · ") : st === "void" ? ["Voided", live_eo!.voidReason, live_eo!.handledBy ? "by " + live_eo!.handledBy : ""].filter(Boolean).join(" · ") : ["Returned", live_eo!.voidReason].filter(Boolean).join(" · ")}</T>
            <T w="s" size={17} color={st === "closed" ? C.ok : st === "void" ? C.ink2 : C.bad800} style={st === "void" ? { textDecorationLine: "line-through" } : undefined}>{(st === "closed" || st === "void" ? "" : "−") + money(S, t.total)}</T></View>
          : <>
            {/* Save only on a new order that can be kept open: an In-Store order needs a table; a saved order is saved by Kitchen */}
            {!live_eo && !noTable ? <Btn height={56} style={{ flex: 1 }} label="Save" disabled={!cart.length} onPress={saveOrder} /> : null}
            <Pressable accessibilityRole="button" disabled={!cart.length} onPress={pay}
              style={({ pressed }) => ({ flex: 2, height: 56, borderRadius: R.sm, backgroundColor: pressed ? C.brand500 : C.brand600, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, opacity: cart.length ? 1 : 0.45 })}>
              <T w="s" size={17} color="#fff">TOTAL</T><T w="s" size={17} color="#fff">{money(S, t.total)}</T></Pressable>
          </>}
        </View>
      </View>

      {/* ---------- menu ---------- */}
      <View style={{ width: menuW, paddingHorizontal: PADX, paddingTop: 12, gap: GAP }}>
        <View style={{ flexDirection: "row", gap: AG }}>
          {acts.map((a, i) => (
            <Pressable key={a} accessibilityRole="button" onPress={() => action(a, CART_W + PADX + i * (ab + AG) + ab / 2)}
              style={({ pressed }) => ({ width: ab, height: ab, borderRadius: R.lg, backgroundColor: pressed ? C.brand500 : C.brand600, alignItems: "center", justifyContent: "center", gap: 7,
                borderWidth: pop?.k === a ? 3 : 0, borderColor: "#93C5FD" })}>
              <Icon name={BTN[a]} size={24} color="#fff" /><T w="m" size={13} color="#fff">{a}</T>
              {a === "Retrieve" && heldN ? <View style={{ position: "absolute", top: -6, right: -6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.bad, borderWidth: 2, borderColor: C.bg2, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}><T w="b" size={11} color="#fff">{heldN}</T></View> : null}
            </Pressable>))}
        </View>
        <View style={[{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 14, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: "#fff" }, shadowXs]}>
          <Icon name="search" size={20} color={C.mut} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search items" placeholderTextColor={C.mut2} accessibilityLabel="Search items" style={{ flex: 1, fontFamily: F.r, fontSize: 15, color: C.ink, height: 42 }} />
          {q ? <Pressable accessibilityLabel="Clear search" onPress={() => setQ("")}><Icon name="x" size={18} /></Pressable> : null}
        </View>
        <View style={{ flex: 1 }} onLayout={e => setGrid({ w: Math.floor(e.nativeEvent.layout.width), h: Math.floor(e.nativeEvent.layout.height) })}>
          {!m.tops.length ? <T color={C.mut} style={{ padding: 20 }}>No POS menu at this store.</T> : null}
          {q.trim() && !items.length ? <T color={C.mut} style={{ padding: 20 }}>No items match.</T> : null}
          {grid.w ? <ScrollView pagingEnabled={false} snapToInterval={fit.h * fit.rows + TG * fit.rows} decelerationRate="fast" showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.y / (fit.h * fit.rows + TG * fit.rows)))}
            contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", columnGap: TG, rowGap: TG }}>
            {tiles.map((it: any, k: number) => it.back
              ? <Pressable key="back" accessibilityRole="button" accessibilityLabel="Back" onPress={() => setCat(m.parentOf(top))}
                  style={({ pressed }) => ({ width: fit.w, height: fit.h, borderRadius: R.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.mut2, backgroundColor: pressed ? C.bg2 : "#fff", alignItems: "center", justifyContent: "center", gap: 4 })}>
                  <Icon name="back" size={26} color={C.ink2} /><T w="m" size={14}>Back</T></Pressable>
              : it.sub ? <Tile key={it.sub.id} w={fit.w} h={fit.h} name={it.sub.name} img={it.sub.imageUrl} sub={(m.itemsOf(it.sub.id).length + m.subsOf(it.sub.id).length) + " items"} onPress={() => { setQ(""); setCat(it.sub.id); }} />
              : <Tile key={it.id + k} w={fit.w} h={fit.h} name={it.name} img={it.imageUrl} oos={prodOos(x, it)} sub={it.pricingMethod === "open" ? "Open price" : (kidsOf(x, it).length ? "From " : "") + money(S, tilePrice(x, it))}
                  n={cart.filter(l => l.productId === it.id).reduce((a, l) => a + l.qty, 0)} onPress={() => add(it)} />)}
          </ScrollView> : null}
        </View>
        {pages > 1 ? <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: -6 }}>{Array.from({ length: pages }, (_, i) => <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i === page ? C.brand600 : C.line }} />)}</View> : null}
        <View style={{ flexDirection: "row", height: 56, marginBottom: 16, backgroundColor: "#fff", borderRadius: R.sm, borderWidth: 1, borderColor: C.line, justifyContent: "space-evenly", alignItems: "center" }}>
          {([["grid", "Functions"], ["list", "Orders"], ["table", "Tables"], ["scooter", "Pickup & Delivery"], ["plus", "New"]] as const).map(([ic, l]) => (
            <Pressable key={l} accessibilityRole="button" onPress={() => (setNav(l), l === "New" ? reset() : l === "Orders" ? setDlg(<OrdersList x={x} onOpen={openOrder} onClose={() => setDlg(null)} />) : l === "Functions" ? setMore(v => !v)
                : l === "Tables" ? setDlg(<TablesDialog x={x} onClose={() => setDlg(null)} onOpen={openOrder} onFree={async n => { setDlg(null); if (live_eo) reset(); setTable(n); if (otype !== "dinein") switchType("dinein");
                  const g = await ask<number | null>(done => <NumberAsk title={"Guests at " + tblLbl(n)} onDone={done} />); if (g != null) setGuests(Math.max(0, Math.round(g))); }} />) : pdBoard())}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 10, borderRadius: R.sm, backgroundColor: pressed ? C.brand50 : "transparent" })}>
              <Icon name={ic} size={20} color={C.brand600} /><T w="m" size={14.5} color={C.brand600} numberOfLines={1}>{l}</T>
              {l === "Pickup & Delivery" && pdN ? <View style={{ position: "absolute", top: -2, right: -8, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.bad, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}><T w="b" size={11} color="#fff">{pdN}</T></View> : null}
            </Pressable>))}
        </View>
      </View>

      {pop ? <Popover ax={pop.ax} top={insTop + 12 + ab} width={pop.k === "Discount" ? 540 : 370} maxX={W} onClose={() => setPop(null)}>
        {pop.k === "Discount" ? <DiscountPop x={x} cart={cart} cur={cur} sym={sym} allowPct={allowPct} allowAmt={allowAmt} init={disc} onDone={d => { setPop(null); if (d !== undefined) setDisc(d); }} />
          : pop.k === "Charges" ? <ChargesPop x={x} cur={cur} picked={picked} open={openCh} onDone={r => { setPop(null); if (r) { setPicked(r.picked); setOpenCh(r.open); } }} />
          : <NotesPop init={notes} onDone={r => { setPop(null); if (r) setNotes(r); }} />}
      </Popover> : null}

      {more && (
        <Pressable accessibilityLabel="Close menu" style={{ position: "absolute", inset: 0 } as any} onPress={() => setMore(false)}>
          <Card style={{ position: "absolute", left: CART_W + PADX, bottom: 80, width: 280, padding: 6, borderRadius: R.lg, shadowColor: "#000000", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line2, marginBottom: 4 }}><T w="s" size={15}>{cashier?.name || device!.name}</T><T size={12.5} color={C.mut}>{[branch?.name, device!.name].filter(Boolean).join(" · ")}</T></View>
            <FnItem icon="till" label={openShift(x) ? "Close Till" : "Open Till"} onPress={() => { setMore(false); if (!can(S, cashier, "pos_shift")) return say("Your role doesn't allow opening or closing the till."); tillDlg(); }} />
            <FnItem icon="dayend" label="End of Day" onPress={() => { setMore(false); if (!can(S, cashier, "pos_endday")) return say("Your role doesn't allow ending the day."); const b = endDayBlock(x); if (b) return say(b); setDlg(<EndDayDialog x={x} onDone={m => { setDlg(null); if (m) say(m); }} />); }} />
            <FnItem icon="chart" label="Reports" onPress={() => { setMore(false); if (!can(S, cashier, "pos_reports") && !can(S, cashier, "pos_endday")) return say("Your role doesn't allow POS reports."); setDlg(<ReportsDialog x={x} say={say} onClose={() => setDlg(null)} />); }} />
            <FnItem icon="device" label="Printers & Devices" onPress={() => { setMore(false); if (!can(S, cashier, "pos_settings")) return say("Your role doesn't allow device settings."); setDlg(<PrintersDialog x={x} onClose={() => setDlg(null)} />); }} />
            <FnItem icon={sound ? "sound" : "mute"} label={sound ? "Sound On" : "Sound Off"} onPress={() => { const v = !sound; setSound(v); AsyncStorage.setItem("skwyd_sound", v ? "on" : "off"); }} />
            <FnItem icon="sync" label="Sync Now" onPress={() => { setMore(false); reload(); say(online ? "Syncing…" : "No connection"); }} />
            <View style={{ height: 1, backgroundColor: C.line, marginVertical: 4, marginHorizontal: 8 }} />
            <FnItem icon="logout" label="Sign Out" onPress={() => { setMore(false); reset(); setCashier(null); }} />
          </Card>
        </Pressable>)}
      {dlg}
      <Bubble />
    </View>
  );
}

const Row = ({ l, r, muted }: { l: string; r: string; muted?: boolean }) =>
  <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T size={muted ? 13 : 15} color={muted ? C.mut : C.ink}>{l}</T><T size={muted ? 13 : 15} color={muted ? C.mut : C.ink}>{r}</T></View>;

// menu tiles (style D): tall tiles, a framed square photo on top, the name (2 lines) and price centred under it.
// The grid fills the menu exactly with the same gap across and down: the column / row count is the one where the label under the photo comes closest to 48 px.
export function fitTiles(W: number, H: number, gap = TG) {
  let best = { cols: 6, rows: 3, w: 100, h: 150, sc: 1e9 };
  if (!W || !H) return best;
  for (let cols = 4; cols <= 8; cols++) for (let rows = 2; rows <= 5; rows++) {
    const w = (W - gap * (cols - 1)) / cols, h = (H - gap * (rows - 1)) / rows, L = h - w;
    if (L < 36 || L > 70) continue;
    const sc = Math.abs(L - 48) + Math.abs(cols - 6) * 4;
    if (sc < best.sc) best = { cols, rows, w, h, sc };
  }
  if (best.sc === 1e9) { const cols = 6, w = (W - gap * 5) / 6, rows = Math.max(1, Math.round((H + gap) / (w + 48 + gap))); best = { cols, rows, w, h: (H - gap * (rows - 1)) / rows, sc: 0 }; }
  return best;
}
function Tile({ w, h, name, img, sub, oos, n, onPress }: { w: number; h: number; name: string; img?: string; sub?: string; oos?: boolean; n?: number; onPress: () => void }) {
  const ph = Math.max(10, Math.min(w - 12, h - 50));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name + (sub ? ", " + sub : "")} disabled={oos} onPress={onPress}
      style={({ pressed }) => [{ width: w, height: h, borderRadius: R.lg, borderWidth: n ? 2 : 1, borderColor: n ? C.brand500 : C.line, backgroundColor: pressed ? C.bg2 : "#fff", padding: 6, alignItems: "center", opacity: oos ? 0.5 : 1 }, shadowXs]}>
      <View style={{ width: ph, height: ph, borderRadius: 6, overflow: "hidden", backgroundColor: "#FBF6EE", alignItems: "center", justifyContent: "center" }}>
        {img ? <Image source={{ uri: img }} style={{ width: ph, height: ph }} resizeMode="cover" /> : <Icon name="bowl" size={28} color="#9CA3AF" />}</View>
      <View style={{ flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", paddingTop: 3 }}>
        <T w="m" size={12.5} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: "center", lineHeight: 15 }}>{name}</T>
        {sub ? <T size={12} color={oos ? C.bad : C.mut} numberOfLines={1}>{oos ? "Out of stock" : sub}</T> : null}</View>
      {n ? <View style={{ position: "absolute", top: 2, right: 2, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.brand600, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }}><T w="s" size={12} color="#fff">{n}</T></View> : null}
    </Pressable>
  );
}
// a line's options, the same ones counted together: [{ name, n, price }]
const optRows = (opts: { name: string; price?: number }[]) => { const r: { name: string; n: number; price: number }[] = [];
  opts.forEach(o => { const x = r.find(y => y.name === o.name); if (x) { x.n++; x.price += +(o.price || 0); } else r.push({ name: o.name, n: 1, price: +(o.price || 0) }); }); return r; };
// a line of the Functions menu: its icon, then its name
const FnItem = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, height: 46, paddingHorizontal: 12, borderRadius: R.sm, backgroundColor: pressed ? C.brand50 : "transparent" })}>
    <Icon name={icon} size={20} color={icon === "logout" ? C.bad : C.brand} /><T w="m" size={15} color={icon === "logout" ? C.bad : C.ink}>{label}</T></Pressable>);
