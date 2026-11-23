// Clock in / out at the store (team.html viewClock / clockPress): the phone's GPS must be within 150 m (+ accuracy, up to 100 m)
// of an assigned store. Without internet the punch is kept on the phone (time + GPS) and sent later, in order.
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { addD, distM, dmy, hm, isNet, rpc, t5, ymd } from "../lib/sb";
import { useTeam } from "../lib/team";
import { C, R } from "../lib/theme";
import { Btn, Card, T } from "./kit";

export function Clock({ onHours }: { onHours: () => void }) {
  const { me, queue, addPunch, refresh, setNote } = useTeam();
  const [now, setNow] = useState(new Date()), [next, setNext] = useState<any>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(t); }, []);
  useEffect(() => { const d = new Date(); rpc<any[]>("skwyd_team_shifts", { p_from: ymd(d), p_to: ymd(addD(d, 14)) }).then(l => setNext(l.find(x => new Date(x.day + "T" + t5(x.end) + ":00") > new Date() || x.day > ymd(d)) || null)).catch(() => {}); }, []);
  // clocked in right now: the server's answer, then any punches still waiting to be sent
  let open: any = me?.open || null; queue.forEach(p => { open = p.in ? { at: p.at, branchId: p.branchId, pending: true } : null; });
  const br = open ? me!.branches.find(b => b.id === open.branchId)?.name || "" : "";
  const press = async () => {
    const goIn = !open; setBusy(true); setMsg("");
    const fail = (m: string) => { setBusy(false); setMsg(m); setNote(m); };
    let c: Location.LocationObjectCoords;
    try {
      const p = await Location.requestForegroundPermissionsAsync(); if (p.status !== "granted") return fail("Allow location for SKWYD Team to clock in (phone Settings → Apps → SKWYD Team → Permissions).");
      c = (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).coords;
    } catch { return fail("Couldn't get your location. Turn on Location and try again."); }
    // the distance is checked on the phone too, so an offline punch isn't saved from the wrong place
    const near = (me!.branches || []).filter(b => b.lat != null && b.lng != null).map(b => ({ ...b, m: distM(c.latitude, c.longitude, +b.lat!, +b.lng!) })).sort((a, z) => a.m - z.m)[0];
    if (!near) return fail("Your store has no location yet. Ask your manager to set it in Manage → Stores.");
    if (near.m > 150 + Math.min(c.accuracy || 0, 100)) return fail(`You are ${Math.round(near.m)} m from ${near.name}. Clock in at the store.`);
    const punch = { lat: c.latitude, lng: c.longitude, acc: c.accuracy || 0, at: new Date().toISOString(), in: goIn, branchId: near.id };
    const keep = () => { addPunch(punch); setNote(`${goIn ? "Clocked in" : "Clocked out"} at ${hm(punch.at)} · saved on this phone, will sync when you're online`); setBusy(false); };
    if (queue.length) return keep();   // older punches still waiting: keep the order
    try { const r: any = await rpc("skwyd_team_punch", { p_lat: punch.lat, p_lng: punch.lng, p_acc: punch.acc, p_at: punch.at, p_in: punch.in });
      if (r?.error) return fail(r.error);
      setNote(r.clockedIn ? `Clocked in at ${r.branch}${r.late ? " · " + r.late + " min late" : ""}` : `Clocked out · ${r.branch}`); await refresh(); setBusy(false); }
    catch (e) { if (isNet(e)) return keep(); fail((e as any)?.message || "Something went wrong"); }
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <T w="s" size={20}>Today</T>
      <Card style={{ padding: 22, alignItems: "center", gap: 10 }}>
        <T w="b" size={48}>{hm(now)}</T>
        <T color={C.mut}>{now.toLocaleDateString("en-GB", { weekday: "long" })} · {dmy(now)}</T>
        <Btn kind={open ? "outline" : "primary"} height={64} style={{ alignSelf: "stretch", borderRadius: R.lg }} textStyle={{ fontSize: 18 }} label={busy ? "Checking location…" : open ? "Clock Out" : "Clock In"} disabled={busy} onPress={press} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: open ? C.ok : C.mut2 }} />
          <T w="m" color={open ? C.ok : C.mut}>{open ? `Clocked in since ${hm(open.at)}${br ? " · " + br : ""}` : "Not clocked in"}</T></View>
        {queue.length ? <T size={13} w="m" color={C.warn}>{queue.length} punch{queue.length > 1 ? "es" : ""} saved on this phone · will sync when you're online</T> : null}
        <T size={13} color={msg ? C.bad : C.mut} style={{ textAlign: "center" }}>{msg || "Your location is checked when you press the button"}</T>
      </Card>
      <Btn height={48} label="My Hours" onPress={onHours} />
      <Card style={{ padding: 16, gap: 8 }}>
        <T w="s" size={16}>Next Shift</T>
        {next ? <>
          <Row l="Day" r={next.day === ymd(new Date()) ? "Today" : new Date(next.day + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" }) + " " + dmy(next.day)} />
          <Row l="Time" r={`${t5(next.start)} – ${t5(next.end)}`} />{next.branch ? <Row l="Store" r={next.branch} /> : null}{next.jobTitle ? <Row l="Job" r={next.jobTitle} /> : null}
        </> : <T color={C.mut}>No shift in the next two weeks.</T>}
      </Card>
    </ScrollView>
  );
}
export const Row = ({ l, r }: { l: string; r: string }) => <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><T color={C.mut}>{l}</T><T w="m" style={{ flexShrink: 1, textAlign: "right" }}>{r}</T></View>;
