// Driver app: delivery orders assigned on the POS (team.html drvPoll / paintDeliv / orderSheet).
// New order → alert; accept / decline; picture when leaving the store; the customer follows the driver while on the way; paid & delivered.
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Vibration, View } from "react-native";
import { hm, isNet, rpc, sb } from "../lib/sb";
import { useTeam } from "../lib/team";
import { C, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Card, Pill, T } from "./kit";
import { Sheet } from "./Sheet";

const ORDER_HOST = "https://dev.order.skwydhub.com";   // the system runs as the development copy; "" prefix when the live system launches
const DS: Record<string, string> = { assigned: "New order", accepted: "Accepted", picked: "On the way", delivered: "Delivered" };
const money = (n: any) => "$" + (+n || 0).toFixed(2);
const addrShort = (a: any) => String(a || "").replace(/^\[[^\]]*\]\s*/, "");
const digits = (v: any) => String(v || "").replace(/[^\d]/g, "");
const mapUrl = (o: any) => o.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}` : o.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrShort(o.address))}` : "";
const key = (o: any) => JSON.stringify([o.items ? o.items.map((i: any) => [i.name, +i.qty, (i.options || []).map((x: any) => x.name || x.id), i.note || ""]) : null, +o.total || 0, +o.deliveryFee || 0, o.address || "", o.notes || "", o.phone || "", o.customerName || "", o.payment || null]);
const ask = (title: string, msg: string, yes: string, danger = false) => new Promise<boolean>(r => Alert.alert(title, msg, [{ text: "Cancel", style: "cancel", onPress: () => r(false) }, { text: yes, style: danger ? "destructive" : "default", onPress: () => r(true) }], { cancelable: true, onDismiss: () => r(false) }));
const buzz = () => Vibration.vibrate([0, 300, 120, 300, 120, 300]);

// polled every 10 s by the app shell, so alerts come on every tab
export function useDriver(on: boolean) {
  const { me } = useTeam(), [l, setL] = useState<any[] | null>(null), [alert, setAlert] = useState<{ kind: "new" | "changed" | "gone"; o: any; was?: any } | null>(null);
  const known = useRef<Set<string> | null>(null), sig = useRef<Map<string, { k: string; o: any }> | null>(null), watch = useRef<Location.LocationSubscription | null>(null), last = useRef(0);
  const track = async (go: boolean) => {   // the customer follows the driver while an order is on its way
    if (go && !watch.current) { const p = await Location.requestForegroundPermissionsAsync().catch(() => null); if (p?.status !== "granted" || watch.current) return;
      watch.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 20000, distanceInterval: 30 }, p => { if (Date.now() - last.current < 20000) return; last.current = Date.now(); rpc("skwyd_drv_location", { p_lat: p.coords.latitude, p_lng: p.coords.longitude }).catch(() => {}); }); }
    if (!go && watch.current) { watch.current.remove(); watch.current = null; } };
  const poll = async () => {
    if (!on || !me) return; let v: any[]; try { v = await rpc<any[]>("skwyd_drv_orders"); } catch { return; } setL(v);
    const fresh = v.filter(o => o.driverStatus === "assigned"), ids = new Set(fresh.map(o => o.id));
    if (known.current) { const n = fresh.filter(o => !known.current!.has(o.id)); if (n.length) { buzz(); setAlert({ kind: "new", o: n[0] }); } }
    known.current = ids;
    // an order the driver already has that is changed or cancelled
    const now = new Map(v.filter(o => o.driverStatus !== "delivered" && o.status !== "closed").map(o => [o.id, { k: key(o), o }]));
    if (sig.current) { const old = sig.current;
      const chg = [...now.values()].filter(x => old.has(x.o.id) && old.get(x.o.id)!.k !== x.k && x.o.driverStatus !== "assigned");
      const gone = [...old.values()].filter(x => !now.has(x.o.id) && !v.some(o => o.id === x.o.id && (o.driverStatus === "delivered" || o.status === "closed")) && x.o.driverStatus !== "assigned");
      if (chg.length) { buzz(); setAlert({ kind: "changed", o: chg[0].o, was: old.get(chg[0].o.id)!.o }); } else if (gone.length) { buzz(); setAlert({ kind: "gone", o: gone[0].o }); } }
    sig.current = now;
    track(v.some(o => o.driverStatus === "picked" && o.status !== "closed"));
  };
  useEffect(() => { if (!on) return; poll(); const t = setInterval(poll, 10000); return () => { clearInterval(t); track(false); }; }, [on, me?.id]);
  return { l, poll, alert, setAlert, dot: (l || []).some(o => o.driverStatus === "assigned") };
}
export type Drv = ReturnType<typeof useDriver>;

export function DriverAlert({ d, onView }: { d: Drv; onView: (o: any) => void }) {
  const { setNote } = useTeam(), a = d.alert; if (!a) return null; const o = a.o, close = () => d.setAlert(null);
  const act = async (x: "accept" | "decline") => { if (x === "decline" && !(await ask("Decline this order?", "The store will assign another driver.", "Decline", true))) return;
    try { const r: any = await rpc("skwyd_drv_action", { p_order: o.id, p_action: x }); if (r?.error) return setNote(r.error); close(); setNote(x === "accept" ? "Order accepted" : "Order declined"); await d.poll(); if (x === "accept") onView({ ...o, driverStatus: "accepted" }); }
    catch (e) { setNote(isNet(e) ? "No internet connection." : "Something went wrong"); } };
  const what: string[] = [];
  if (a.kind === "changed" && a.was) { const w = a.was;
    if (JSON.stringify(o.items) !== JSON.stringify(w.items)) what.push("Items");
    if ((+o.total || 0) !== (+w.total || 0)) what.push(`Total ${money(w.total)} → ${money(o.total)}`);
    if ((o.address || "") !== (w.address || "")) what.push("Address: " + (addrShort(o.address) || "—"));
    if ((o.notes || "") !== (w.notes || "")) what.push("Notes: " + (o.notes || "—"));
    if ((o.phone || "") !== (w.phone || "") || (o.customerName || "") !== (w.customerName || "")) what.push("Customer: " + [o.customerName, o.phone].filter(Boolean).join(" · "));
    if (JSON.stringify(o.payment || null) !== JSON.stringify(w.payment || null)) what.push("Payment"); }
  const title = a.kind === "new" ? "New delivery order" : a.kind === "changed" ? "Order changed" : "Order cancelled";
  return (
    <Sheet title={title} onClose={close} footer={a.kind === "new" ? <><Btn height={48} style={{ flex: 1 }} textStyle={{ color: C.bad }} label="Decline" onPress={() => act("decline")} /><Btn kind="primary" height={48} style={{ flex: 1 }} label="Accept" onPress={() => act("accept")} /></>
      : a.kind === "changed" ? <Btn kind="primary" height={48} style={{ flex: 1 }} label="View Order" onPress={() => { close(); onView(o); }} /> : <Btn kind="primary" height={48} style={{ flex: 1 }} label="OK" onPress={close} />}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: a.kind === "new" ? C.brand50 : "#FFF4E5", alignItems: "center", justifyContent: "center" }}>{a.kind === "new" ? <Icon name="bike" size={32} color={C.brand} /> : <T w="b" size={30} color="#B54708">!</T>}</View>
        {a.kind === "new" ? <><T color={C.mut}>{[o.branch?.name, o.no ? "Order " + o.no : ""].filter(Boolean).join(" · ")} · {money(o.total)}</T><T style={{ textAlign: "center" }}>{addrShort(o.address) || "No address"}</T></>
        : a.kind === "changed" ? <><T color={C.mut}>{[o.no ? "Order " + o.no : "", o.customerName].filter(Boolean).join(" · ")}</T>{what.map(w => <T key={w} style={{ textAlign: "center" }}>{w}</T>)}</>
        : <T color={C.mut} style={{ textAlign: "center" }}>{[o.no ? "Order " + o.no : "", o.customerName].filter(Boolean).join(" · ")} was cancelled or taken off you. Don't deliver it.</T>}
      </View>
    </Sheet>
  );
}

export function Deliveries({ d, open, setOpen }: { d: Drv; open: any; setOpen: (o: any) => void }) {
  const { setNote } = useTeam(), l = d.l || [], live = l.filter(o => o.status !== "closed" && o.driverStatus !== "delivered"), done = l.filter(o => o.driverStatus === "delivered");
  const act = async (o: any, x: "accept" | "decline") => { if (x === "decline" && !(await ask("Decline this order?", "The store will assign another driver.", "Decline", true))) return;
    try { const r: any = await rpc("skwyd_drv_action", { p_order: o.id, p_action: x }); if (r?.error) return setNote(r.error); setNote(x === "accept" ? "Order accepted" : "Order declined"); await d.poll(); if (x === "accept") setOpen({ ...o, driverStatus: "accepted" }); }
    catch (e) { setNote(isNet(e) ? "No internet connection." : "Something went wrong"); } };
  const cur = open ? l.find(o => o.id === open.id) || open : null;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}><T w="s" size={20} style={{ flex: 1 }}>My Orders</T><Btn height={38} label="Refresh" onPress={d.poll} /></View>
      {d.l === null ? <Card style={{ padding: 16 }}><T color={C.mut}>Loading…</T></Card> : live.length ? live.map(o => (
        <Pressable key={o.id} onPress={() => setOpen(o)}><Card style={{ padding: 14, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><T w="s" size={17}>{o.no ? "Order " + o.no : "Order"}</T><Pill text={DS[o.driverStatus] || o.driverStatus} tone={o.driverStatus === "picked" ? "ok" : o.driverStatus === "assigned" ? "warn" : "brand"} /><View style={{ flex: 1 }} /><T w="s">{money(o.total)}</T></View>
          <T size={13} color={C.mut}>{o.customerName || "Customer"} · {addrShort(o.address) || "No address"}</T>
          <T size={13} color={C.mut}>{o.branch?.name || ""}{o.assignedAt ? " · assigned " + hm(o.assignedAt) : ""}</T>
          {o.driverStatus === "assigned" ? <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}><Btn height={44} style={{ flex: 1 }} textStyle={{ color: C.bad }} label="Decline" onPress={() => act(o, "decline")} /><Btn kind="primary" height={44} style={{ flex: 1 }} label="Accept" onPress={() => act(o, "accept")} /></View> : null}
        </Card></Pressable>)) : <Card style={{ padding: 16 }}><T color={C.mut} style={{ textAlign: "center" }}>No orders assigned to you right now.</T></Card>}
      <Card style={{ padding: 14, gap: 6 }}>
        <View style={{ flexDirection: "row" }}><View style={{ flex: 1 }}><T size={13} color={C.mut}>Delivered today</T><T w="b" size={22}>{done.length}</T></View>
          <View style={{ alignItems: "flex-end" }}><T size={13} color={C.mut}>Cash collected</T><T w="b" size={22}>{money(done.reduce((s, o) => s + (+o.total || 0), 0))}</T></View></View>
        {done.slice(0, 10).map(o => <View key={o.id} style={{ flexDirection: "row", justifyContent: "space-between" }}><T color={C.mut}>{o.no ? "Order " + o.no : "Order"} · {hm(o.deliveredAt)}</T><T w="s">{money(o.total)}</T></View>)}
      </Card>
      {cur ? <OrderSheet o={cur} d={d} onClose={() => setOpen(null)} /> : null}
    </ScrollView>
  );
}

function OrderSheet({ o, d, onClose }: { o: any; d: Drv; onClose: () => void }) {
  const { setNote } = useTeam(), [busy, setBusy] = useState(""), [err, setErr] = useState(""), st = o.driverStatus, ph = digits(o.phone), mu = mapUrl(o), track = `${ORDER_HOST}/track/${o.track}`;
  const pick = async () => { setErr("");
    const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) return setErr("Allow the camera to take the picture of the order.");
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.5, allowsEditing: false }); if (r.canceled || !r.assets?.[0]) return;
    setBusy("pick");
    try { const buf = await (await fetch(r.assets[0].uri)).arrayBuffer(), path = `${o.id}-${Date.now()}.jpg`;
      const up = await sb.storage.from("pickups").upload(path, buf, { contentType: "image/jpeg", upsert: false }); if (up.error) throw up.error;
      const x: any = await rpc("skwyd_drv_action", { p_order: o.id, p_action: "picked", p_photo: path }); if (x?.error) throw new Error(x.error);
      setNote("Order picked up · the customer can follow you"); await d.poll(); }
    catch (e) { setErr(isNet(e) ? "No internet connection. Try again." : (e as any)?.message || "Couldn't save the picture."); }
    setBusy(""); };
  const deliver = async () => { if (!(await ask("Delivered?", `Collected ${money(o.total)} and delivered the order?`, "Delivered"))) return; setBusy("dl"); setErr("");
    try { const x: any = await rpc("skwyd_drv_action", { p_order: o.id, p_action: "delivered" }); if (x?.error) throw new Error(x.error); setNote("Delivered · order closed"); await d.poll(); }
    catch (e) { setErr(isNet(e) ? "No internet connection. Try again." : (e as any)?.message || "Couldn't close the order."); } setBusy(""); };
  const wa = (msg: string) => Linking.openURL(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`);
  const Kv = ({ l, r }: { l: string; r: string }) => <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderColor: C.line2 }}><T color={C.mut}>{l}</T><T w="s" style={{ flexShrink: 1, textAlign: "right" }}>{r}</T></View>;
  return (
    <Sheet title={o.no ? "Order " + o.no : "Order"} onClose={onClose} footer={<Btn height={46} style={{ flex: 1 }} label="Close" onPress={onClose} />}>
      <View style={{ gap: 2 }}>
        <View style={{ alignSelf: "flex-start", marginBottom: 6 }}><Pill text={DS[st] || st} tone={st === "picked" ? "ok" : "brand"} /></View>
        <Kv l="Customer" r={o.customerName || "—"} />{o.phone ? <Kv l="Phone" r={o.phone} /> : null}
        <Kv l="Address" r={addrShort(o.address) || "—"} /><Kv l="Pick up at" r={o.branch?.name || "—"} />{o.notes ? <Kv l="Note" r={o.notes} /> : null}
        {(o.items || []).length ? <T w="s" style={{ marginTop: 10 }}>Items</T> : null}
        {(o.items || []).map((i: any, k: number) => <Kv key={k} l={`${+i.qty || 1}× ${i.name}`} r={money((+i.price || 0) * (+i.qty || 1))} />)}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}><T w="s" size={17}>Collect</T><T w="b" size={17}>{o.payment && o.status === "closed" ? "Paid" : money(o.total)}</T></View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          {mu ? <Btn height={44} style={{ flex: 1 }} label="Map" onPress={() => Linking.openURL(mu)} /> : null}
          {o.phone ? <Btn height={44} style={{ flex: 1 }} label="Call" onPress={() => Linking.openURL("tel:" + o.phone)} /> : null}
        </View>
        {err ? <T color={C.bad} style={{ marginTop: 8 }}>{err}</T> : null}
        {st === "accepted" ? <><Btn kind="primary" height={52} style={{ marginTop: 12 }} label={busy === "pick" ? "Uploading…" : "Order Picked Up"} disabled={!!busy} onPress={pick} />
          <T size={13} color={C.mut} style={{ textAlign: "center", marginTop: 6 }}>Take a picture of the order when you leave the store.</T></> : null}
        {st === "picked" ? <>{ph && o.channel !== "online" ? <Btn height={46} style={{ marginTop: 12 }} label="Send Tracking Link" onPress={() => wa("Your order is on its way! Track it here: " + track)} /> : null}
          <Btn kind="primary" height={52} style={{ marginTop: 10, backgroundColor: C.ok, borderColor: C.ok }} label={busy === "dl" ? "Saving…" : "Paid & Delivered"} disabled={!!busy} onPress={deliver} /></> : null}
        {st === "delivered" && ph && o.channel !== "online" ? <Btn height={46} style={{ marginTop: 12 }} label="Send Rating Link" onPress={() => wa("Thank you! Please rate your order and driver: " + track)} /> : null}
      </View>
    </Sheet>
  );
}
