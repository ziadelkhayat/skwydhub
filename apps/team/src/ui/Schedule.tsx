// Schedule (my shifts by week, ask to swap one), Requests (leave balance, time off, other) and My Hours (team.html viewSched / viewReqs / viewHrs).
import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { addD, dmy, hm, mon, rpc, t5, ymd } from "../lib/sb";
import { useTeam } from "../lib/team";
import { C, F, R } from "../lib/theme";
import { Btn, Card, Pill, T } from "./kit";
import { Sheet } from "./Sheet";

const LEAVE: Record<string, string> = { annual: "Annual Leave", sick: "Sick Leave", unpaid: "Unpaid Leave", other: "Other" };
const ST: Record<string, string> = { pending: "Pending", approved: "Approved", declined: "Declined" };
const inp = { minHeight: 46, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 16, color: C.ink } as const;
const Week = ({ a, set }: { a: Date; set: (d: Date) => void }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
    <Btn height={40} label="‹" onPress={() => set(addD(a, -7))} /><T w="s" style={{ flex: 1, textAlign: "center" }}>{dmy(a)} – {dmy(addD(a, 6))}</T><Btn height={40} label="›" onPress={() => set(addD(a, 7))} />
  </View>);

export function Schedule() {
  const { setNote } = useTeam(), [a, setA] = useState(mon(new Date())), [shifts, setShifts] = useState<any[] | null>(null), [reqs, setReqs] = useState<any[]>([]), [swap, setSwap] = useState<any>(null);
  const load = () => { setShifts(null); rpc<any[]>("skwyd_team_shifts", { p_from: ymd(a), p_to: ymd(addD(a, 6)) }).then(setShifts).catch(() => setShifts([])); rpc<any[]>("skwyd_team_requests").then(setReqs).catch(() => {}); };
  useEffect(load, [a]);
  const pend = new Set(reqs.filter(r => r.kind === "swap" && r.status === "pending").map(r => r.shiftId)), today = ymd(new Date());
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <T w="s" size={20}>Schedule</T><Week a={a} set={setA} />
      <Card style={{ padding: 6 }}>
        {shifts === null ? <T color={C.mut} style={{ padding: 16 }}>Loading…</T> : [...Array(7)].map((_, i) => { const d = addD(a, i), k = ymd(d), l = shifts.filter(x => x.day === k);
          return (
            <View key={k} style={{ flexDirection: "row", gap: 12, padding: 10, borderRadius: R.md, backgroundColor: k === today ? C.brand50 : "transparent" }}>
              <View style={{ width: 44, alignItems: "center" }}><T size={12} color={C.mut}>{d.toLocaleDateString("en-GB", { weekday: "short" })}</T><T w="s" size={18}>{d.getDate()}</T></View>
              <View style={{ flex: 1, gap: 6, justifyContent: "center" }}>{l.length ? l.map(x => (
                <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1 }}><T w="s">{t5(x.start)} – {t5(x.end)}</T><T size={12} color={C.mut}>{[x.branch, x.jobTitle].filter(Boolean).join(" · ")}</T></View>
                  {pend.has(x.id) ? <Pill text="Swap pending" tone="warn" /> : new Date(x.day + "T" + t5(x.start)) > new Date() ? <Btn height={34} label="Swap" onPress={() => setSwap(x)} /> : null}
                </View>)) : <T size={13} color={C.mut2}>Off</T>}</View>
            </View>); })}
      </Card>
      {swap ? <SwapSheet x={swap} onDone={m => { setSwap(null); if (m) { setNote(m); load(); } }} /> : null}
    </ScrollView>
  );
}
function SwapSheet({ x, onDone }: { x: any; onDone: (msg?: string) => void }) {
  const [mates, setMates] = useState<any[] | null>(null), [w, setW] = useState(""), [n, setN] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { rpc<any[]>("skwyd_team_colleagues").then(setMates).catch(() => setMates([])); }, []);
  const send = async () => { if (!w) return setErr("Choose a colleague."); setBusy(true);
    try { const r: any = await rpc("skwyd_team_request", { p: { kind: "swap", shiftId: x.id, swapWith: w, note: n } }); if (r?.error) { setErr(r.error); return setBusy(false); } onDone("Swap request sent"); }
    catch { setErr("Couldn't send the request."); setBusy(false); } };
  return (
    <Sheet title="Swap Shift" onClose={() => onDone()} footer={<><T size={13} color={C.bad} style={{ flex: 1 }}>{err}</T><Btn label="Cancel" height={46} onPress={() => onDone()} /><Btn kind="primary" height={46} label="Send Request" disabled={busy} onPress={send} /></>}>
      <T color={C.mut} style={{ marginBottom: 12 }}>{dmy(x.day)} · {t5(x.start)} – {t5(x.end)}{x.branch ? " · " + x.branch : ""}</T>
      <T size={13} color={C.ink2} style={{ marginBottom: 6 }}>Give it to *</T>
      <View style={{ gap: 6, marginBottom: 12 }}>{mates === null ? <T color={C.mut}>Loading…</T> : !mates.length ? <T color={C.mut}>No colleagues to swap with.</T> : mates.map(m => (
        <Pressable key={m.id} onPress={() => setW(m.id)} style={{ padding: 12, borderRadius: R.sm, borderWidth: w === m.id ? 2 : 1, borderColor: w === m.id ? C.brand : C.line, backgroundColor: w === m.id ? C.brand50 : "#fff" }}>
          <T w="m">{m.name}{m.jobTitle ? <T color={C.mut}> · {m.jobTitle}</T> : null}</T></Pressable>))}</View>
      <TextInput value={n} onChangeText={setN} placeholder="Note (optional)" placeholderTextColor={C.mut2} accessibilityLabel="Note" style={inp} />
    </Sheet>
  );
}

export function Requests() {
  const { me, setNote } = useTeam(), [tab, setTab] = useState<"all" | "pending" | "done">("all"), [reqs, setReqs] = useState<any[] | null>(null), [nw, setNw] = useState(false);
  const load = () => rpc<any[]>("skwyd_team_requests").then(setReqs).catch(() => setReqs([]));
  useEffect(() => { load(); }, []);
  const left = me?.leaveDays != null ? Math.max(0, +me.leaveDays - +(me.leaveUsed || 0)) : null;
  const l = (reqs || []).filter(r => tab === "all" || (tab === "pending" ? r.status === "pending" : r.status !== "pending"));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}><T w="s" size={18} style={{ flex: 1 }}>Leave</T><Btn kind="primary" height={38} label="+ New Request" onPress={() => setNw(true)} /></View>
        <View style={{ flexDirection: "row", gap: 8 }}>{[[left != null ? String(left) : "—", "Days left"], [String(+(me?.leaveUsed || 0)), "Used this year"], [me?.leaveDays != null ? String(+me.leaveDays) : "—", "Per year"]].map(([v, k]) =>
          <View key={k} style={{ flex: 1, alignItems: "center", padding: 10, borderRadius: R.md, backgroundColor: C.bg }}><T w="b" size={20}>{v}</T><T size={12} color={C.mut}>{k}</T></View>)}</View>
      </Card>
      <View style={{ flexDirection: "row", gap: 8 }}>{([["all", "All"], ["pending", "Pending"], ["done", "Answered"]] as const).map(([k, t]) => <Btn key={k} kind={tab === k ? "primary" : "outline"} height={40} style={{ flex: 1 }} label={t} onPress={() => setTab(k)} />)}</View>
      <Card style={{ padding: 6 }}>{reqs === null ? <T color={C.mut} style={{ padding: 16 }}>Loading…</T> : !l.length ? <T color={C.mut} style={{ padding: 16, textAlign: "center" }}>No requests</T> : l.map(r => (
        <View key={r.id} style={{ flexDirection: "row", gap: 10, padding: 12, borderBottomWidth: 1, borderColor: C.line2 }}>
          <View style={{ flex: 1, gap: 2 }}><T w="s">{r.kind === "leave" ? LEAVE[r.leaveType] || "Time Off" : r.kind === "swap" ? "Shift Swap" : "Request"}</T>
            <T size={13} color={C.mut}>{r.kind === "swap" ? `${dmy(r.from)} · with ${r.swapWith || "—"}` : r.from ? dmy(r.from) + (r.to && r.to !== r.from ? " → " + dmy(r.to) : "") : "Sent " + dmy(r.createdAt)}</T>
            {r.note ? <T size={13} color={C.mut}>{r.note}</T> : null}{r.decisionNote ? <T size={13}><T w="s">Manager:</T> {r.decisionNote}</T> : null}</View>
          <Pill text={ST[r.status] || r.status} tone={r.status === "approved" ? "ok" : r.status === "declined" ? "bad" : "warn"} />
        </View>))}</Card>
      {nw ? <NewRequest onDone={m => { setNw(false); if (m) { setNote(m); setTab("all"); load(); } }} /> : null}
    </ScrollView>
  );
}
function NewRequest({ onDone }: { onDone: (msg?: string) => void }) {
  const t = ymd(new Date()), [k, setK] = useState<"leave" | "other">("leave"), [type, setType] = useState("annual"), [from, setFrom] = useState(t), [to, setTo] = useState(t), [n, setN] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const shift = (v: string, d: number) => ymd(addD(new Date(v + "T12:00:00"), d));
  const send = async () => { const p = k === "leave" ? { kind: "leave", leaveType: type, from, to, note: n } : { kind: "other", note: n };
    if (k === "other" && !n.trim()) return setErr("Write your request."); setBusy(true);
    try { const r: any = await rpc("skwyd_team_request", { p }); if (r?.error) { setErr(r.error); return setBusy(false); } onDone("Request sent"); } catch { setErr("Couldn't send the request."); setBusy(false); } };
  const Day = ({ l, v, set, min }: { l: string; v: string; set: (s: string) => void; min: string }) => (
    <View style={{ flex: 1, gap: 4 }}><T size={13} color={C.ink2}>{l} *</T><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Btn height={40} label="‹" disabled={v <= min} onPress={() => set(shift(v, -1))} /><T w="m" style={{ flex: 1, textAlign: "center" }}>{dmy(v)}</T><Btn height={40} label="›" onPress={() => set(shift(v, 1))} /></View></View>);
  return (
    <Sheet title="New Request" onClose={() => onDone()} footer={<><T size={13} color={C.bad} style={{ flex: 1 }}>{err}</T><Btn label="Cancel" height={46} onPress={() => onDone()} /><Btn kind="primary" height={46} label="Send Request" disabled={busy} onPress={send} /></>}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 8 }}><Btn kind={k === "leave" ? "primary" : "outline"} height={40} style={{ flex: 1 }} label="Time Off" onPress={() => setK("leave")} /><Btn kind={k === "other" ? "primary" : "outline"} height={40} style={{ flex: 1 }} label="Other" onPress={() => setK("other")} /></View>
        {k === "leave" ? <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{Object.entries(LEAVE).map(([v, l]) => <Btn key={v} kind={type === v ? "soft" : "outline"} height={38} label={l} onPress={() => setType(v)} />)}</View>
          <View style={{ flexDirection: "row", gap: 12 }}><Day l="From" v={from} min={t} set={v => { setFrom(v); if (to < v) setTo(v); }} /><Day l="To" v={to} min={from} set={setTo} /></View>
        </> : null}
        <TextInput value={n} onChangeText={setN} multiline placeholder={k === "other" ? "Write your request" : "Note (optional)"} placeholderTextColor={C.mut2} accessibilityLabel="Note" style={[inp, { minHeight: 80, paddingTop: 10, textAlignVertical: "top" }]} />
      </View>
    </Sheet>
  );
}

export function Hours({ onBack }: { onBack: () => void }) {
  const { me, queue } = useTeam(), [a, setA] = useState(mon(new Date())), [l, setL] = useState<any[] | null>(null);
  useEffect(() => { setL(null); rpc<any[]>("skwyd_team_timesheet", { p_from: ymd(a), p_to: ymd(addD(a, 6)) }).then(setL).catch(() => setL([])); }, [a]);
  let on: any = me?.open || null; queue.forEach(p => { on = p.in ? { at: p.at, branchId: p.branchId } : null; });
  const o = on && new Date(on.at) >= a && new Date(on.at) <= addD(a, 7) ? { in: on.at, out: null, branch: me!.branches.find(b => b.id === on.branchId)?.name, late: on.late } : null;
  const all = [...(o ? [o] : []), ...(l || [])], hrs = (x: any) => Math.max(0, ((x.out ? +new Date(x.out) : Date.now()) - +new Date(x.in)) / 3600000), tot = all.reduce((s, x) => s + hrs(x), 0);
  const days: Record<string, number> = {}; all.forEach(x => { const d = ymd(new Date(x.in)); days[d] = (days[d] || 0) + hrs(x); }); const ot = Object.values(days).reduce((s, v) => s + Math.max(0, v - 8), 0);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Btn height={38} label="‹ Back" onPress={onBack} /><T w="s" size={20}>My Hours</T></View>
      <Week a={a} set={setA} />
      <Card style={{ padding: 16, flexDirection: "row" }}>
        <View style={{ flex: 1 }}><T size={13} color={C.mut}>Total this week</T><T w="b" size={28}>{tot.toFixed(2)} h</T></View>
        <View style={{ alignItems: "flex-end" }}><T size={13} color={C.mut}>Days</T><T w="b" size={20}>{Object.keys(days).length}</T>{ot ? <T size={13} color={C.warn}>{ot.toFixed(2)} h overtime</T> : null}</View>
      </Card>
      <Card style={{ padding: 6 }}>{l === null ? <T color={C.mut} style={{ padding: 16 }}>Loading…</T> : !all.length ? <T color={C.mut} style={{ padding: 16, textAlign: "center" }}>No hours this week</T> : all.map((x, i) => (
        <View key={i} style={{ flexDirection: "row", padding: 12, borderBottomWidth: 1, borderColor: C.line2 }}>
          <View style={{ flex: 1 }}><T w="s">{new Date(x.in).toLocaleDateString("en-GB", { weekday: "short" })} {dmy(x.in)}{x.late ? <T size={12} color={C.warn}>  Late {+x.late}m</T> : null}</T>
            <T size={13} color={C.mut}>{hm(x.in)} – {x.out ? hm(x.out) : "now"}{x.branch ? " · " + x.branch : ""}</T></View>
          <T w="s">{hrs(x).toFixed(2)} h</T></View>))}</Card>
    </ScrollView>
  );
}
