// The sale screen, laid out like the current POS (cart on the left, menu on the right, 5×4 square tiles,
// search above the menu, square action buttons, bottom navigation with names) in the TailAdmin look.
// Step 1: browse the POS menu of this branch, build the cart, see the totals. Saving and paying come next.
import { useMemo, useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { allowedTypes, newId, nextOrderNo, openShift, orderFields, saleBlock, kidsOf, lineKey, lineNet, menu, modData, modLabel, money, money2, prodOos, prodPrice, tilePrice, totals, type Ctx, type Line, type OType } from "../lib/pos";
import { ModPicker, NumberAsk, VariantPicker, type Picked } from "./Pickers";
import { ChangeShown, PayDialog, type Paid } from "./Pay";
import { TillDialog } from "./Till";
import { OrdersDialog, ordRef } from "./Orders";
import type { Row } from "../lib/db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStore } from "../lib/store";
import { C, F, R, shadowXs } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Card, Pill, T } from "./kit";

const TYPE_LBL: Record<OType, string> = { dinein: "Dine-in", takeaway: "Pickup", delivery: "Delivery" };
const GAP = 12, PADX = 16;

export function Register() {
  const { S, device, branch, online, cashier, setCashier, write, pending } = useStore();
  const { width: W, height: H } = useWindowDimensions();
  const types = allowedTypes(S, device!.branchId);
  const [otype, setOtype] = useState<OType>(types[0] || "dinein");
  const [cart, setCart] = useState<Line[]>([]), [table, setTable] = useState(""), [eo, setEo] = useState<Row | null>(null);   // eo: the order opened from Orders
  const [cat, setCat] = useState(""), [q, setQ] = useState(""), [note, setNote] = useState(""), [more, setMore] = useState(false);
  const x: Ctx = { S, device: device!, branch, otype };
  const m = useMemo(() => menu(x), [S, otype, device]);
  const top = cat || m.tops[0]?.id || "", curTop = m.parentOf(top) || top;
  const t = totals(x, cart);

  // tile size: 4 rows fit the height, 5 across; the cart takes the rest of the width
  const fixedH = 76 + 44 + 40 + 76 + GAP * 4 + 24;
  const tile = Math.max(88, Math.min(150, Math.floor((H - fixedH - GAP * 3) / 4)));
  const menuW = Math.min(W * 0.62, tile * 5 + GAP * 4 + PADX * 2);
  const say = (s: string) => { setNote(s); setTimeout(() => setNote(n => (n === s ? "" : n)), 2500); };

  // a window over the sale (variant, modifiers, open price) that answers once
  const [dlg, setDlg] = useState<ReactNode>(null);
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
  const reset = () => { setCart([]); setTable(""); setQ(""); setEo(null); };
  const live_eo = eo ? S.orders.find(o => o.id === eo.id) || eo : null, ro = !!live_eo && !["active", "pending"].includes(live_eo.status);
  // an order from Orders: its lines (already sent ones marked), type and table
  const openOrder = (o: Row) => { setDlg(null); setEo(o); setCart((o.items || []).map((i: any) => ({ ...i, saved: +i.qty || 1 }))); setTable(String(o.table || "")); setOtype(o.type === "pickup" ? "takeaway" : o.type === "delivery" ? "delivery" : "dinein"); };
  // an existing order keeps its customer, address, source and channel
  const fields = () => { const f: any = orderFields(x, cart, t, { table }); if (live_eo) { delete f.customerName; delete f.phone; delete f.address; } return f; };
  const who = () => cashier?.name || device!.name;
  const accept = async () => { const o = live_eo!, now = new Date().toISOString();
    write("orders", o.id, { status: "active", updatedAt: now, acceptedAt: o.acceptedAt || now, handledBy: who(), ...(o.no ? {} : { no: await takeNo(), deviceId: device!.id }) }); say("Order accepted"); reset(); };
  const decline = () => { write("orders", live_eo!.id, { status: "declined", updatedAt: new Date().toISOString(), handledBy: who() }); say("Order declined"); reset(); };
  // the checks before an order is saved or paid (pos.html saleBlock, openShift, orderInfoOk)
  const ready = (paying: boolean) => {
    const blk = saleBlock(x); if (blk) { say(blk); return false; }
    if (!openShift(x)) { say(paying ? "Open the till before taking payments" : "Open till"); setDlg(<TillDialog x={x} onDone={m => { setDlg(null); if (m) say(m); }} />); return false; }
    if (otype !== "dinein" && !live_eo) { say("Add the customer first (coming next for pickup and delivery)"); return false; }
    return true;
  };
  const base = (no: string) => ({ no, channel: "pos", source: "", brandId: branch?.brandId || null, branchId: device!.branchId, deviceId: device!.id, shiftId: openShift(x)?.id || null, agent: cashier?.name || device!.name });
  // Save: the order goes to the kitchen open (active), to be billed later from Orders
  const saveOrder = async () => {
    if (!cart.length || !ready(false)) return;
    if (live_eo) { write("orders", live_eo.id, { ...fields(), updatedAt: new Date().toISOString() }); say("Saved · order " + ordRef(live_eo)); reset(); return; }
    if (otype === "dinein" && !table.trim()) return say("Pick a table to save this order, or take the payment");
    const no = await takeNo(), now = new Date().toISOString();
    write("orders", newId("pos"), { ...base(no), ...orderFields(x, cart, t, { table }), status: "active", createdAt: now, updatedAt: now }, "set");
    reset(); say(`Order #${no} sent to the kitchen`);
  };
  const pay = async () => {
    if (!cart.length || !ready(true)) return;
    const p = await ask<Paid | null>(done => <PayDialog x={x} total={t.total} onDone={done} />); if (!p) return;
    const now = new Date().toISOString(), total = t.total, payment = { ...p, ...(t.rnd ? { rounding: t.rnd } : {}) };
    if (live_eo) write("orders", live_eo.id, { ...fields(), ...(live_eo.no ? {} : { no: await takeNo() }), shiftId: openShift(x)?.id || null, handledBy: who(), status: "closed", updatedAt: now, closedAt: now, payment });   // billing an open order: it keeps its number and channel
    else write("orders", newId("pos"), { ...base(await takeNo()), ...orderFields(x, cart, t, { table }), status: "closed", createdAt: now, updatedAt: now, closedAt: now, payment }, "set");
    reset();
    if (p.type === "cash") await ask<void>(done => <ChangeShown amount={p.change} title={"Sale complete · " + money(S, total)} money={cur} onClose={() => done()} />);
    else say("Sale complete · " + money(S, total));
  };
  const askTable = async () => { const v = await ask<number | null>(done => <NumberAsk title="Table number" initial={table} onDone={done} />); if (v != null) { setTable(v ? String(v) : ""); if (v && otype !== "dinein") switchType("dinein"); } };

  const qty = (i: number, d: number) => { const l = cart[i];
    if (ro || live_eo?.status === "pending") return say(live_eo?.status === "pending" ? "Accept the order first" : "This order is done");
    if (d < 0 && l?.saved && l.qty - 1 < l.saved) return say("Voiding items already sent comes next (manager approval)");
    setQty(i, d); };
  const setQty = (i: number, d: number) => setCart(c => c.flatMap((l, j) => (j !== i ? [l] : l.qty + d <= 0 ? [] : [{ ...l, qty: +(l.qty + d).toFixed(3) }])));
  const switchType = (k: OType) => { setOtype(k); const y = { ...x, otype: k }; setCart(c => c.map(l => { const p = S.products.find(z => z.id === l.productId); return p && p.pricingMethod !== "open" ? { ...l, price: +(prodPrice(y, p) + (l.options || []).reduce((a: number, o: any) => a + (+o.price || 0), 0)).toFixed(2) } : l; })); };

  const items = q.trim() ? m.search(q) : top ? [...m.subsOf(top).map(c => ({ sub: c })), ...m.itemsOf(top)] : [];
  const back = !q.trim() && m.parentOf(top);

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: C.bg }}>
      {/* ---------- cart ---------- */}
      <Card style={{ flex: 1, margin: 12, marginRight: 0, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line }}>
          <View style={{ width: 40, height: 40, borderRadius: R.md, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}><T w="s" size={18} color="#fff">S</T></View>
          <View style={{ flex: 1, minWidth: 0 }}><T w="s" numberOfLines={1}>{branch?.name || "—"}</T><T size={13} color={C.mut} numberOfLines={1}>{device?.name || "—"}</T></View>
          {table ? <Pill text={"Table " + table} /> : null}
          <Pill text={!online ? (pending ? `Offline · ${pending} to sync` : "Offline") : pending ? `Syncing ${pending}…` : "Online"} tone={online && !pending ? "brand" : "warn"} />
          {cashier ? <Pill text={cashier.name} /> : null}
        </View>
        {live_eo ? <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingTop: 12 }}>
          <T w="s">Order {ordRef(live_eo)}</T><Pill text={{ pending: "Waiting for you", active: "Preparing", closed: "Done", declined: "Declined", void: "Void" }[live_eo.status as string] || live_eo.status} tone={live_eo.status === "pending" ? "warn" : live_eo.status === "closed" ? "ok" : "brand"} />
          <View style={{ flex: 1 }} /><Btn kind="ghost" height={36} label="Close" onPress={reset} /></View> : null}
        {types.length > 1 && !live_eo && (
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingTop: 12 }}>
            {types.map(k => <Btn key={k} kind={otype === k ? "primary" : "outline"} height={44} style={{ flex: 1 }} label={TYPE_LBL[k]} onPress={() => switchType(k)} />)}
          </View>)}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 8, flexGrow: 1 }}>
          {!cart.length ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="bowl" size={36} color={C.mut2} /><T color={C.mut}>Tap an item to start the order.</T></View>
            : cart.map((l, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line2 }}>
                <View style={{ flex: 1, minWidth: 0 }}><T w="m" numberOfLines={2}>{l.name}</T>{l.mods ? <T size={13} color={C.mut}>{l.mods}</T> : null}</View>
                <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.field, borderRadius: R.sm }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={"Less " + l.name} onPress={() => qty(i, -1)} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Icon name={l.qty <= 1 ? "trash" : "minus"} size={18} color={l.qty <= 1 ? C.bad : C.ink2} /></Pressable>
                  <T w="s" style={{ minWidth: 28, textAlign: "center" }}>{l.qty}</T>
                  <Pressable accessibilityRole="button" accessibilityLabel={"More " + l.name} onPress={() => qty(i, 1)} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={18} color={C.ink2} /></Pressable>
                </View>
                <T w="m" style={{ width: 84, textAlign: "right" }}>{money(S, lineNet(l))}</T>
              </View>))}
        </ScrollView>
        <View style={{ paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderColor: C.line, gap: 6 }}>
          <Row l="Subtotal" r={money(S, t.net)} />
          <Row l="Tax" r={money(S, t.tax)} muted />
          {t.rnd ? <Row l="Rounding" r={money(S, t.rnd)} muted /> : null}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T w="b" size={18}>Total</T><T w="b" size={18}>{money(S, t.total)}</T></View>
          {money2(S, t.total) ? <Row l="" r={"≈ " + money2(S, t.total)} muted /> : null}
        </View>
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingBottom: 18 }}>
          {live_eo?.status === "pending" ? <>
            <Btn kind="danger" height={56} style={{ flex: 1 }} label="Decline" onPress={decline} />
            <Btn kind="primary" height={56} style={{ flex: 2 }} label="Accept" onPress={accept} />
          </> : ro ? <Btn height={56} style={{ flex: 1 }} label={"Done · " + ordRef(live_eo!) + " · New Order"} onPress={reset} /> : <>
            <Btn height={56} style={{ flex: 1 }} label="Save" disabled={!cart.length || (!!live_eo && !cart.some(l => l.qty > (l.saved || 0)))} onPress={saveOrder} />
            <Btn kind="primary" height={56} style={{ flex: 2 }} label={"Pay " + money(S, t.total)} textStyle={{ fontSize: 16 }} disabled={!cart.length} onPress={pay} />
          </>}
        </View>
      </Card>

      {/* ---------- menu ---------- */}
      <View style={{ width: menuW, paddingHorizontal: PADX, paddingVertical: 12, gap: GAP }}>
        <View style={{ flexDirection: "row", gap: 10, height: 76 }}>
          {([["table", "Table"], ["user", "Customer"], ["tag", "Discount"], ["note", "Notes"], ["void", "Void"], ["print", "Print"]] as const).map(([ic, l]) => (
            <Pressable key={l} accessibilityRole="button" onPress={() => (l === "Table" ? askTable() : say(l + " comes in the next step."))}
              style={({ pressed }) => [{ width: 76, height: 76, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brand50 : "#fff", alignItems: "center", justifyContent: "center", gap: 4 }]}>
              <Icon name={ic} color={C.brand} /><T w="m" size={12} color={C.ink2}>{l}</T>
            </Pressable>))}
        </View>
        <View style={[{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 14, borderRadius: R.sm, borderWidth: 1, borderColor: C.field, backgroundColor: "#fff" }, shadowXs]}>
          <Icon name="search" size={20} color={C.mut} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search items" placeholderTextColor={C.mut2} accessibilityLabel="Search items" style={{ flex: 1, fontFamily: F.r, fontSize: 15, color: C.ink, height: 42 }} />
          {q ? <Pressable accessibilityLabel="Clear search" onPress={() => setQ("")}><Icon name="x" size={18} /></Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, height: 40 }} contentContainerStyle={{ gap: 8 }}>
          {m.tops.map(c => <Btn key={c.id} kind={c.id === curTop && !q ? "soft" : "outline"} height={40} label={c.name} style={c.id === curTop && !q ? { borderColor: C.brand } : undefined} onPress={() => { setQ(""); setCat(c.id); }} />)}
        </ScrollView>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
          {!m.tops.length ? <T color={C.mut} style={{ padding: 20 }}>No POS menu at this branch.</T> : null}
          {back ? <Tile size={tile} onPress={() => setCat(m.parentOf(top))}><Icon name="back" size={26} color={C.ink2} /><T w="m" size={14}>Back</T></Tile> : null}
          {items.map((it: any) => it.sub
            ? <Tile key={it.sub.id} size={tile} onPress={() => setCat(it.sub.id)}><T w="m" size={14} numberOfLines={3}>{it.sub.name}</T><T size={12} color={C.mut}>{m.itemsOf(it.sub.id).length} items</T></Tile>
            : <ItemTile key={it.id} size={tile} name={it.name} img={it.imageUrl} oos={prodOos(x, it)} price={it.pricingMethod === "open" ? "Open price" : (kidsOf(x, it).length ? "From " : "") + money(S, tilePrice(x, it))}
                n={cart.filter(l => l.productId === it.id).reduce((a, l) => a + l.qty, 0)} onPress={() => add(it)} />)}
          {q.trim() && !items.length ? <T color={C.mut} style={{ padding: 20 }}>No items match.</T> : null}
        </ScrollView>
        <View style={{ flexDirection: "row", height: 76, backgroundColor: "#fff", borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 6, gap: 4 }}>
          {([["grid", "New"], ["list", "Orders"], ["scooter", "Pickup & Delivery"], ["table", "Tables"], ["till", "Till"], ["clock", "Time Clock"], ["more", "More"]] as const).map(([ic, l], i) => (
            <Pressable key={l} accessibilityRole="button" onPress={() => (l === "New" ? reset() : l === "Orders" ? setDlg(<OrdersDialog x={x} onOpen={openOrder} onClose={() => setDlg(null)} />) : l === "More" ? setMore(v => !v) : l === "Till" ? setDlg(<TillDialog x={x} onDone={m => { setDlg(null); if (m) say(m); }} />) : say(l + " comes in the next step."))}
              style={({ pressed }) => [{ flex: 1, borderRadius: R.md, alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: i === 0 ? C.brand50 : pressed ? C.line2 : "transparent" }]}>
              <Icon name={ic} color={i === 0 ? C.brand : C.mut} /><T w={i === 0 ? "s" : "m"} size={11} color={i === 0 ? C.brand600 : C.mut} numberOfLines={1}>{l}</T>
            </Pressable>))}
        </View>
      </View>

      {more && (
        <Pressable accessibilityLabel="Close menu" style={{ position: "absolute", inset: 0 } as any} onPress={() => setMore(false)}>
          <Card style={{ position: "absolute", right: PADX, bottom: 100, width: 220, padding: 6 }}>
            <Btn kind="ghost" label="Log out" style={{ justifyContent: "flex-start" }} onPress={() => { setMore(false); setCart([]); setCashier(null); }} />
          </Card>
        </Pressable>)}
      {dlg}
      {note ? <View pointerEvents="none" style={{ position: "absolute", top: 20, alignSelf: "center", backgroundColor: C.ink, borderRadius: R.sm, paddingHorizontal: 16, paddingVertical: 10 }}><T color="#fff" size={14}>{note}</T></View> : null}
    </View>
  );
}

const Row = ({ l, r, muted }: { l: string; r: string; muted?: boolean }) =>
  <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T size={muted ? 13 : 15} color={muted ? C.mut : C.ink}>{l}</T><T size={muted ? 13 : 15} color={muted ? C.mut : C.ink}>{r}</T></View>;

const Tile = ({ size, onPress, children }: { size: number; onPress: () => void; children: React.ReactNode }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [{ width: size, height: size, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brand50 : "#fff", padding: 12, justifyContent: "space-between" }]}>{children}</Pressable>
);
function ItemTile({ size, name, price, img, oos, n, onPress }: { size: number; name: string; price: string; img?: string; oos: boolean; n: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name + ", " + price} disabled={oos} onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: R.lg, borderWidth: 1, borderColor: n ? C.brand : C.line, backgroundColor: pressed ? C.brand50 : "#fff", overflow: "hidden", opacity: oos ? 0.5 : 1 }]}>
      {img ? <Image source={{ uri: img }} style={{ width: "100%", height: size * 0.48 }} resizeMode="cover" /> : null}
      <View style={{ flex: 1, padding: 10, justifyContent: "space-between" }}>
        <T w="m" size={14} numberOfLines={img ? 2 : 3} style={n ? { paddingRight: 22 } : undefined}>{name}</T>
        <T w="s" size={14} color={oos ? C.bad : C.brand}>{oos ? "Out of stock" : price}</T>
      </View>
      {n ? <View style={{ position: "absolute", top: 6, right: 6, minWidth: 24, height: 24, borderRadius: 12, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}><T w="s" size={12} color="#fff">{n}</T></View> : null}
    </Pressable>
  );
}
