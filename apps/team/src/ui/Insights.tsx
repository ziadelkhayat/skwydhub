// The Insights app (EXPO_PUBLIC_SKWYD_APP=insights): the owner's phone view of the business, live.
// Same features as the old insights.html: sales (today / week / month, by hour or day, by store, top items), today's orders,
// the team (clocked in, today's schedule, requests to approve), chats (write in groups and channels), tasks and guides (who read them).
// Sign in: the account number, then the phone number with a code on WhatsApp (or email and password); only the owner and admins get in.
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { dmy, hm, LS, sb, ymd } from "../lib/sb";
import { C, F, R } from "../lib/theme";
import { Icon } from "./Icon";
import { SkwydLogo } from "./Logo";
import { Btn, Card, Pill, T } from "./kit";

type Row = Record<string, any>;
const camel = (r: Row) => { const o: Row = {}; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; return o; };
const ini = (n: any) => String(n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const inp = { height: 48, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 16, color: C.ink, backgroundColor: "#fff" } as const;
const newId = (p: string) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- sign in ----------
function Login({ onIn, msg }: { onIn: () => void; msg: string }) {
  const [acct, setAcct] = useState(""), [cc, setCc] = useState("+961"), [n, setN] = useState(""), [sent, setSent] = useState(""), [code, setCode] = useState("");
  const [pw, setPw] = useState(false), [em, setEm] = useState(""), [pass, setPass] = useState(""), [err, setErr] = useState(msg), [busy, setBusy] = useState(false);
  useEffect(() => { LS.get("skwyd_acct", "").then(setAcct); LS.get("skwyd_team_phone", { cc: "+961", n: "" }).then(v => { setCc(v.cc); setN(v.n); }); }, []);
  const go = async () => {
    const a = acct.replace(/\s+/g, ""); if (!a) return setErr("Enter your account number.");
    setErr(""); setBusy(true);
    try {
      if (pw) { const { error } = await sb.auth.signInWithPassword({ email: em.trim(), password: pass }); if (error) throw new Error(error.message === "Invalid login credentials" ? "Wrong account number, email or password." : error.message); }
      else {
        const num = n.replace(/\D/g, "").replace(/^0+/, ""), ph = cc + num; if (num.length < 6) throw new Error("Enter your phone number.");
        if (sent !== ph) { const { error } = await sb.auth.signInWithOtp({ phone: ph, options: { shouldCreateUser: false } }); if (error) throw new Error(/not found|signups|user/i.test(error.message) ? "This number has no login." : error.message);
          setSent(ph); LS.set("skwyd_team_phone", { cc, n: num }); setBusy(false); return setErr("We sent a code on WhatsApp."); }
        if (code.replace(/\D/g, "").length < 6) throw new Error("Enter the 6-digit code.");
        const { error } = await sb.auth.verifyOtp({ phone: ph, token: code.replace(/\D/g, ""), type: "sms" }); if (error) throw new Error(/expired|invalid/i.test(error.message) ? "Wrong or expired code." : error.message);
      }
      // the business's account number must match (skwyd hub admins can open any)
      const { data: co } = await sb.from("settings").select("data").eq("id", "company").maybeSingle(), want = String((co as any)?.data?.accountNo || "").replace(/\s+/g, "");
      if (want && want !== a && !(await sb.rpc("slick_is_platform_admin")).data) { await sb.auth.signOut(); throw new Error("Wrong account number."); }
      LS.set("skwyd_acct", a); onIn();
    } catch (e: any) { setErr(e?.message || "Couldn't sign in."); } finally { setBusy(false); }
  };
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: "center", gap: 10, marginBottom: 16 }}>
        <SkwydLogo label="insights" />
        <T color={C.mut}>For the owner and admins</T>
      </View>
      <T w="m" size={14} color={C.ink2}>Account number</T>
      <TextInput value={acct} onChangeText={setAcct} keyboardType="number-pad" accessibilityLabel="Account number" style={inp} />
      {pw ? <>
        <T w="m" size={14} color={C.ink2}>Email</T><TextInput value={em} onChangeText={setEm} autoCapitalize="none" keyboardType="email-address" accessibilityLabel="Email" style={inp} />
        <T w="m" size={14} color={C.ink2}>Password</T><TextInput value={pass} onChangeText={setPass} secureTextEntry accessibilityLabel="Password" style={inp} onSubmitEditing={go} />
      </> : <>
        <T w="m" size={14} color={C.ink2}>Phone number</T>
        <View style={{ flexDirection: "row", gap: 8 }}><TextInput value={cc} onChangeText={setCc} accessibilityLabel="Country code" style={[inp, { width: 84 }]} /><TextInput value={n} onChangeText={v => { setN(v); setSent(""); }} keyboardType="phone-pad" placeholder="70 123 456" placeholderTextColor={C.mut2} accessibilityLabel="Phone number" style={[inp, { flex: 1 }]} /></View>
        {sent ? <><T w="m" size={14} color={C.ink2}>Code sent on WhatsApp</T><TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="6 digits" placeholderTextColor={C.mut2} accessibilityLabel="Code" style={[inp, { textAlign: "center", letterSpacing: 6, fontFamily: F.s }]} onSubmitEditing={go} /></> : null}
      </>}
      <T size={14} color={/sent a code/.test(err) ? C.ok : C.bad} style={{ minHeight: 20 }}>{err}</T>
      <Btn kind="primary" height={50} label={busy ? "Please wait…" : pw || sent ? "Sign In" : "Send Code On WhatsApp"} disabled={busy} onPress={go} />
      <Btn kind="ghost" label={pw ? "Sign in with your phone number instead" : "Sign in with email and password instead"} onPress={() => { setPw(!pw); setErr(""); setSent(""); }} />
    </ScrollView>
  );
}

// ---------- live data ----------
function useData(on: boolean) {
  const [D, setD] = useState<Row>({}), t = useRef<any>(null);
  const load = async () => {
    const from = new Date(); from.setDate(1); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - 7);   // this month, and the days of a week that started last month
    const q = (tb: string, cols = "*", f?: (x: any) => any) => { let x: any = sb.from(tb).select(cols); if (f) x = f(x); return x.then((r: any) => (r.data || []).map(camel)); };
    const [st, br, od, us, sh, rq, cg, cm, tk, ka, kr] = await Promise.all([
      sb.from("settings").select("id,data").in("id", ["company", "timeclock"]).then(r => r.data || []),
      q("branches", "id,name,active"),
      q("orders", "id,ref,no,status,type,branch_id,customer_name,total,items,created_at,closed_at,voided_at", x => x.gte("created_at", from.toISOString()).order("created_at", { ascending: false }).limit(4000)),
      q("staff_users", "id,name,role,role_id,role_ids,branch_ids,active,deleted"),
      q("staff_shifts", "*", x => x.eq("day", ymd(new Date())).eq("deleted", false)),
      q("staff_requests", "*", x => x.eq("status", "pending").eq("deleted", false)),
      q("chat_groups", "*", x => x.eq("deleted", false)),
      q("chat_messages", "*", x => x.eq("deleted", false).order("created_at", { ascending: false }).limit(600)),
      q("tasks", "*", x => x.eq("deleted", false)),
      q("kb_articles", "*", x => x.eq("deleted", false)),
      q("kb_reads", "*"),
    ]);
    const S = Object.fromEntries((st as any[]).map(r => [r.id, r.data || {}]));
    setD({ co: S.company || {}, tc: S.timeclock || {}, branches: br.filter((b: Row) => b.active !== false), orders: od, users: us.filter((u: Row) => !u.deleted && u.active !== false && u.role !== "owner"),
      shifts: sh.filter((x: Row) => x.published !== false), reqs: rq, groups: cg, msgs: cm.reverse(), tasks: tk, kb: ka.filter((a: Row) => !a.archived), reads: kr });
  };
  useEffect(() => {
    if (!on) return; load().catch(() => {});
    const later = () => { clearTimeout(t.current); t.current = setTimeout(() => load().catch(() => {}), 400); };
    const ch = sb.channel("insights"); ["orders", "chat_messages", "staff_requests", "tasks", "settings"].forEach(tb => ch.on("postgres_changes" as any, { event: "*", schema: "public", table: tb }, later)); ch.subscribe();
    const iv = setInterval(later, 60000);
    return () => { sb.removeChannel(ch); clearInterval(iv); clearTimeout(t.current); };
  }, [on]);
  return { D, load };
}

// ---------- small parts ----------
const Seg = ({ v, on, items }: { v: string; on: (k: string) => void; items: [string, string][] }) => (
  <View style={{ flexDirection: "row", backgroundColor: C.line2, borderRadius: R.sm, padding: 3, gap: 2, marginBottom: 12 }}>
    {items.map(([k, l]) => <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: v === k }} onPress={() => on(k)} style={{ flex: 1, height: 36, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: v === k ? "#fff" : "transparent" }}>
      <T w="m" size={13} color={v === k ? C.ink : C.mut} numberOfLines={1}>{l}</T></Pressable>)}
  </View>);
const Kpi = ({ l, v, tone }: { l: string; v: string; tone?: string }) => (
  <Card style={{ flexBasis: "47%", flexGrow: 1, padding: 14 }}><T size={13} color={C.mut}>{l}</T><T w="s" size={22} color={tone || C.ink} style={{ marginTop: 4 }}>{v}</T></Card>);
const Row2 = ({ a, b, sub, right, av, onPress }: { a: string; b?: string; sub?: string; right?: React.ReactNode; av?: string; onPress?: () => void }) => (
  <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: 1, borderColor: C.line2, backgroundColor: pressed ? C.bg : "transparent" })}>
    {av ? <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }}><T w="m" size={12} color={C.mut}>{av}</T></View> : null}
    <View style={{ flex: 1 }}><T w="m" numberOfLines={1}>{a}</T>{b ? <T size={13} color={C.mut} numberOfLines={2}>{b}</T> : null}{sub ? <T size={12} color={C.mut2}>{sub}</T> : null}</View>{right}
  </Pressable>);
const H = ({ t }: { t: string }) => <T w="s" size={15} style={{ marginTop: 16, marginBottom: 8 }}>{t}</T>;
const Empty = ({ t }: { t: string }) => <T color={C.mut2} style={{ textAlign: "center", padding: 20 }}>{t}</T>;
const Back = ({ t, on }: { t: string; on: () => void }) => <Pressable accessibilityRole="button" onPress={on} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8 }}><Icon name="back" size={18} color={C.ink2} /><T w="m">{t}</T></Pressable>;
const ST: Record<string, [string, any]> = { review: ["Waiting · call center", "warn"], pending: ["Waiting · store", "warn"], active: ["Preparing", "brand"], closed: ["Done", "ok"], void: ["Void", "bad"], declined: ["Declined", "bad"], returned: ["Returned", "bad"], refund: ["Refund", "bad"], draft: ["Draft", "gray"] };
const TYP: Record<string, string> = { dinein: "In Store", fast: "In Store", pickup: "Pickup", takeaway: "Pickup", delivery: "Delivery" };

// ---------- the app ----------
type Tab = "sales" | "orders" | "team" | "chat" | "tasks" | "kb";
export function InsightsApp() {
  const [phase, setPhase] = useState<"boot" | "login" | "ready">("boot"), [msg, setMsg] = useState(""), [me, setMe] = useState("Owner");
  const check = async () => {
    const { data: { session } } = await sb.auth.getSession(); if (!session) return setPhase("login");
    const r: any = await sb.rpc("staff_role").then(x => x, () => ({ data: null }));
    if (!["owner", "admin"].includes(String(r?.data || ""))) { await sb.auth.signOut(); setMsg("SKWYD Insights is for the owner and admins. Employees use the Team app."); return setPhase("login"); }
    setMe(session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Owner"); setPhase("ready");
  };
  useEffect(() => { check().catch(() => setPhase("login")); }, []);
  const { D } = useData(phase === "ready");
  const [tab, setTab] = useState<Tab>("sales"), [br, setBr] = useState(""), [range, setRange] = useState("today"), [of, setOf] = useState("live"), [tf, setTf] = useState("open");
  const [chat, setChat] = useState(""), [kbOpen, setKb] = useState(""), [newTask, setNewTask] = useState(false), [note, setNote0] = useState("");
  const say = (s: string) => { setNote0(s); setTimeout(() => setNote0(x => (x === s ? "" : x)), 2600); };
  const co = D.co || {}, dec = co.priceDecimals === 0 || co.priceDecimals === "0" ? 0 : +co.priceDecimals || 2;
  const money = (v: any) => (String(co.currencySymbol || "").trim() || co.currency || "$") + (+v || 0).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const brName = (id: string) => (D.branches || []).find((b: Row) => b.id === id)?.name || "—", inBr = (id: string) => !br || id === br;
  const uName = (id: string) => (D.users || []).find((u: Row) => u.id === id)?.name || "—";
  const today = ymd(new Date());
  const rFrom = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); if (range === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); if (range === "month") d.setDate(1); return d; }, [range]);

  if (phase === "boot") return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (phase === "login") return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}><Login msg={msg} onIn={() => { setMsg(""); check(); }} /></SafeAreaView>;
  const orders: Row[] = D.orders || [];
  let body: React.ReactNode = null;
  if (tab === "sales") {
    const l = orders.filter(o => o.status === "closed" && inBr(o.branchId) && new Date(o.closedAt || o.createdAt) >= rFrom), tot = l.reduce((s, o) => s + (+o.total || 0), 0), n = l.length;
    const open = orders.filter(o => ["pending", "active", "review"].includes(o.status) && inBr(o.branchId)).length, voids = orders.filter(o => o.status === "void" && inBr(o.branchId) && new Date(o.voidedAt || o.createdAt) >= rFrom);
    const byBr = (D.branches || []).map((b: Row) => [b.name, l.filter(o => o.branchId === b.id).reduce((s, o) => s + (+o.total || 0), 0)] as [string, number]).filter((x: any) => x[1] > 0).sort((a: any, b: any) => b[1] - a[1]), mx = Math.max(1, ...byBr.map((x: any) => x[1]));
    const items: Record<string, { q: number; v: number }> = {}; l.forEach(o => (o.items || []).forEach((i: Row) => { const k = i.name || "Item"; (items[k] ||= { q: 0, v: 0 }); items[k].q += +i.qty || 1; items[k].v += (+i.price || 0) * (+i.qty || 1); }));
    const top = Object.entries(items).sort((a, b) => b[1].v - a[1].v).slice(0, 8);
    let bars: [string, number][] = [];
    if (range === "today") { const h = Array(24).fill(0); l.forEach(o => { h[new Date(o.closedAt || o.createdAt).getHours()] += +o.total || 0; }); const a = h.findIndex(v => v), b = 23 - [...h].reverse().findIndex(v => v); if (a >= 0) bars = h.slice(a, b + 1).map((v, i) => [String(((a + i) % 12) || 12), v]); }
    else { const d: Record<string, number> = {}; l.forEach(o => { const k = ymd(new Date(o.closedAt || o.createdAt)); d[k] = (d[k] || 0) + (+o.total || 0); }); bars = Object.keys(d).sort().map(k => [k.slice(8), d[k]]); }
    const mb = Math.max(1, ...bars.map(b => b[1]));
    body = <>
      <Seg v={range} on={setRange} items={[["today", "Today"], ["week", "This Week"], ["month", "This Month"]]} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}><Kpi l="Sales" v={money(tot)} /><Kpi l="Orders" v={String(n)} /><Kpi l="Average" v={money(n ? tot / n : 0)} /><Kpi l="Open now" v={String(open)} /><Kpi l="Voids" v={`${voids.length} · ${money(voids.reduce((s, o) => s + (+o.total || 0), 0))}`} tone={voids.length ? C.bad : undefined} /></View>
      {bars.length ? <Card style={{ padding: 14, marginTop: 12 }}><T w="s">{range === "today" ? "Sales by hour" : "Sales by day"}</T>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 130, marginTop: 12 }}>{bars.map(([k, v], i) => <View key={i} style={{ flex: 1, alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}><View style={{ width: "100%", maxWidth: 22, height: `${Math.max(2, v / mb * 85)}%`, backgroundColor: C.brand, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} /><T size={10} color={C.mut2}>{k}</T></View>)}</View></Card> : null}
      {!br && byBr.length ? <Card style={{ padding: 14, marginTop: 12 }}><T w="s" style={{ marginBottom: 8 }}>By store</T>{byBr.map(([nm, v]: any) => <View key={nm} style={{ marginTop: 6 }}><View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${v / mx * 100}%`, backgroundColor: C.brand50, borderRadius: 4 }} /><View style={{ flexDirection: "row", justifyContent: "space-between", padding: 7 }}><T size={14}>{nm}</T><T w="m" size={14}>{money(v)}</T></View></View>)}</Card> : null}
      <H t="Top items" /><Card>{top.length ? top.map(([nm, x]) => <Row2 key={nm} a={nm} b={`${x.q} sold`} right={<T w="m">{money(x.v)}</T>} />) : <Empty t="No sales yet." />}</Card>
    </>;
  } else if (tab === "orders") {
    const l = orders.filter(o => inBr(o.branchId) && o.status !== "draft" && ymd(new Date(o.createdAt)) === today), live = (o: Row) => ["review", "pending", "active"].includes(o.status);
    const f = (k: string) => (o: Row) => k === "all" || (k === "live" ? live(o) : o.status === k), show = l.filter(f(of));
    body = <><Seg v={of} on={setOf} items={[["live", "Live"], ["closed", "Done"], ["void", "Void"], ["all", "All"]].map(([k, t]) => [k, `${t} ${l.filter(f(k)).length}`] as [string, string])} />
      <Card>{show.length ? show.map(o => <Row2 key={o.id} a={`${o.ref || o.no || "Order"} · ${TYP[o.type] || o.type || ""}`} b={[brName(o.branchId), o.customerName, hm(o.createdAt)].filter(Boolean).join(" · ")}
        right={<View style={{ alignItems: "flex-end", gap: 4 }}><T w="m">{money(o.total)}</T><Pill text={ST[o.status]?.[0] || o.status} tone={ST[o.status]?.[1] || "gray"} /></View>} />) : <Empty t="No orders here today." />}</Card></>;
  } else if (tab === "team") {
    const open = Object.entries((D.tc || {}).open || {}).map(([userId, o]: any) => ({ userId, ...o })).filter((o: Row) => inBr(o.branchId));
    const sh = (D.shifts || []).filter((x: Row) => inBr(x.branchId)).sort((a: Row, b: Row) => String(a.startTime).localeCompare(String(b.startTime)));
    const onIds = new Set(open.map((o: Row) => o.userId)), now = new Date().toTimeString().slice(0, 5), late = sh.filter((x: Row) => x.employeeId && !onIds.has(x.employeeId) && String(x.startTime).slice(0, 5) < now);
    const LT: Record<string, string> = { annual: "Annual leave", sick: "Sick leave", unpaid: "Unpaid leave" }, rq = D.reqs || [];
    const decide = async (r: Row, st: string) => { const { error } = await sb.from("staff_requests").update({ status: st, decided_by: me, decided_at: new Date().toISOString() }).eq("id", r.id); say(error ? "Couldn't save." : st === "approved" ? "Request approved" : "Request declined"); };
    body = <><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}><Kpi l="Clocked in" v={String(open.length)} tone={C.ok} /><Kpi l="On schedule" v={String(sh.length)} /><Kpi l="Not in yet" v={String(late.length)} tone={late.length ? C.bad : undefined} /><Kpi l="Requests" v={String(rq.length)} tone={rq.length ? C.warn : undefined} /></View>
      <H t="Clocked in now" /><Card>{open.length ? open.map((o: Row) => <Row2 key={o.userId} av={ini(uName(o.userId))} a={uName(o.userId) !== "—" ? uName(o.userId) : o.name || "—"} b={`${brName(o.branchId)} · since ${hm(o.at)}`} right={<T w="m" color={C.ok}>{((Date.now() - +new Date(o.at)) / 3600000).toFixed(1)} h</T>} />) : <Empty t="Nobody is clocked in." />}</Card>
      <H t="Today's schedule" /><Card>{sh.length ? sh.map((x: Row) => <Row2 key={x.id} av={ini(x.employeeId ? uName(x.employeeId) : "Open")} a={x.employeeId ? uName(x.employeeId) : "Open shift"} b={`${brName(x.branchId)} · ${String(x.startTime).slice(0, 5)} – ${String(x.endTime).slice(0, 5)}`}
        right={x.employeeId ? <Pill text={onIds.has(x.employeeId) ? "In" : late.includes(x) ? "Not in" : "Later"} tone={onIds.has(x.employeeId) ? "ok" : late.includes(x) ? "bad" : "gray"} /> : null} />) : <Empty t="No shifts today." />}</Card>
      <H t="Waiting requests" /><Card>{rq.length ? rq.map((r: Row) => <View key={r.id} style={{ padding: 12, borderBottomWidth: 1, borderColor: C.line2, gap: 8 }}>
        <T w="m">{uName(r.employeeId)}</T><T size={13} color={C.mut}>{r.kind === "swap" ? "Shift swap" : (LT[r.leaveType] || "Time off") + " · " + dmy(String(r.fromDay).slice(0, 10)) + (r.toDay && r.toDay !== r.fromDay ? " – " + dmy(String(r.toDay).slice(0, 10)) : "")}{r.note ? " · " + r.note : ""}</T>
        <View style={{ flexDirection: "row", gap: 8 }}><Btn height={40} style={{ flex: 1 }} label="Decline" onPress={() => decide(r, "declined")} /><Btn kind="primary" height={40} style={{ flex: 1 }} label="Approve" onPress={() => decide(r, "approved")} /></View></View>) : <Empty t="No requests waiting." />}</Card></>;
  } else if (tab === "chat") {
    const name = (g: Row) => g.kind === "direct" ? (g.memberIds || []).map(uName).join(" & ") : g.name, msgs = (id: string) => (D.msgs || []).filter((m: Row) => m.groupId === id);
    const g = chat && (D.groups || []).find((x: Row) => x.id === chat);
    if (g) body = <ChatRoom g={g} name={name(g)} msgs={msgs(g.id)} me={me} onBack={() => setChat("")} say={say} />;
    else { const gs = (D.groups || []).map((x: Row) => ({ g: x, l: msgs(x.id).slice(-1)[0] })).sort((a: Row, b: Row) => String(b.l?.createdAt || b.g.createdAt).localeCompare(String(a.l?.createdAt || a.g.createdAt)));
      body = <Card>{gs.length ? gs.map(({ g: x, l }: Row) => <Row2 key={x.id} av={ini(name(x))} a={name(x)} b={l ? (l.fromOffice ? "You: " : (l.senderName || "") + ": ") + l.body : "No messages yet"} right={x.kind !== "group" ? <Pill text={x.kind === "channel" ? "Channel" : "Private"} /> : null} onPress={() => setChat(x.id)} />) : <Empty t="No chats yet." />}</Card>; }
  } else if (tab === "tasks") {
    const l = (D.tasks || []).filter((t: Row) => !br || !t.branchId || t.branchId === br), f = (k: string) => (t: Row) => k === "all" || (k === "done") === (t.status === "done");
    const who = (t: Row) => (t.assigneeIds || []).length ? t.assigneeIds.map(uName).join(", ") : t.branchId ? "Everyone at " + brName(t.branchId) : "Everyone";
    body = newTask ? <NewTask D={D} br={br} me={me} onDone={(m: string) => { setNewTask(false); if (m) say(m); }} />
      : <><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ flex: 1 }}><Seg v={tf} on={setTf} items={[["open", "Open"], ["done", "Done"], ["all", "All"]].map(([k, t]) => [k, `${t} ${l.filter(f(k)).length}`] as [string, string])} /></View></View>
        <Btn kind="primary" height={44} label="New Task" onPress={() => setNewTask(true)} style={{ marginBottom: 12 }} />
        <Card>{l.filter(f(tf)).sort((a: Row, b: Row) => String(a.dueDay || "9999").localeCompare(String(b.dueDay || "9999"))).map((t: Row) => { const late = t.status !== "done" && t.dueDay && String(t.dueDay).slice(0, 10) < today;
          return <Row2 key={t.id} a={t.title} b={who(t)} sub={t.status === "done" ? `Done by ${t.doneBy || "—"} · ${dmy(t.doneAt)}` : t.dueDay ? (late ? "Late · due " : "Due ") + dmy(String(t.dueDay).slice(0, 10)) : undefined} right={<Pill text={t.status === "done" ? "Done" : late ? "Late" : "Open"} tone={t.status === "done" ? "ok" : late ? "bad" : "gray"} />} />; })}
          {!l.filter(f(tf)).length ? <Empty t="No tasks here." /> : null}</Card></>;
  } else {
    const reads = (id: string) => (D.reads || []).filter((r: Row) => r.articleId === id), users: Row[] = D.users || [];
    const aud = (a: Row) => { const rs = a.roleIds || [], bs = a.branchIds || [], es = a.employeeIds || [], grp = !es.length || rs.length || bs.length; const rids = (u: Row) => [...new Set([u.roleId, ...(u.roleIds || [])].filter(Boolean))];
      return users.filter(u => es.includes(u.id) || (grp && (!rs.length || rids(u).some(r => rs.includes(r))) && (!bs.length || !(u.branchIds || []).length || (u.branchIds || []).some((b: string) => bs.includes(b))))); };
    const a = kbOpen && (D.kb || []).find((x: Row) => x.id === kbOpen);
    if (a) { const au = aud(a), rd = Object.fromEntries(reads(a.id).map((r: Row) => [r.staffId, r]));
      body = <><Back t="Guides" on={() => setKb("")} /><T w="s" size={18} style={{ marginBottom: 10 }}>{a.title}</T>
        <View style={{ flexDirection: "row", gap: 10 }}><Kpi l={a.ack ? "Confirmed" : "Opened"} v={`${au.filter(u => rd[u.id]).length} / ${au.length}`} /><Kpi l="Views" v={String(reads(a.id).reduce((s: number, r: Row) => s + (+r.views || 1), 0))} /></View>
        {a.body ? <Card style={{ padding: 14, marginTop: 12 }}><T style={{ lineHeight: 22 }}>{String(a.body).replace(/^#+ /gm, "").replace(/\*\*(.+?)\*\*/g, "$1")}</T></Card> : null}
        <H t="Who read it" /><Card>{au.map(u => <Row2 key={u.id} av={ini(u.name)} a={u.name} b={rd[u.id] ? `Last ${dmy(rd[u.id].lastViewedAt || rd[u.id].readAt)} · ${+rd[u.id].views || 1} views` : "Not yet"} right={<Pill text={rd[u.id] ? "Read" : "Not yet"} tone={rd[u.id] ? "ok" : "gray"} />} />)}{!au.length ? <Empty t="Nobody is set to read it." /> : null}</Card></>; }
    else body = <Card>{(D.kb || []).length ? (D.kb || []).map((x: Row) => { const au = aud(x), n = reads(x.id).filter((r: Row) => au.some(u => u.id === r.staffId)).length;
      return <Row2 key={x.id} a={x.title} b={[x.category, x.status === "draft" ? "Draft" : ""].filter(Boolean).join(" · ") || undefined} right={<T w="m" color={au.length && n >= au.length ? C.ok : C.ink2}>{n}/{au.length}</T>} onPress={() => setKb(x.id)} />; }) : <Empty t="No guides yet." />}</Card>;
  }
  const TABS: [Tab, string, string][] = [["sales", "Sales", "chart"], ["orders", "Orders", "list"], ["team", "Team", "grp"], ["chat", "Chats", "chat"], ["tasks", "Tasks", "task"], ["kb", "Guides", "kb"]];
  const title = TABS.find(x => x[0] === tab)![1];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderColor: C.line, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ flex: 1 }}><T w="s" size={18}>{title}</T><T size={12} color={C.mut} numberOfLines={1}>{co.name || "Insights"}</T></View>
          <Btn height={34} label="Sign Out" onPress={async () => { await sb.auth.signOut(); setPhase("login"); }} textStyle={{ fontSize: 13 }} /></View>
        {(D.branches || []).length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{[["", "All stores"], ...(D.branches || []).map((b: Row) => [b.id, b.name])].map(([k, l]) =>
          <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: br === k }} onPress={() => setBr(k)} style={{ height: 32, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: br === k ? C.brand : C.field, backgroundColor: br === k ? C.brand50 : "#fff", justifyContent: "center" }}>
            <T w="m" size={13} color={br === k ? C.brand600 : C.ink2}>{l}</T></Pressable>)}</ScrollView> : null}
      </View>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {D.orders ? <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">{body}</ScrollView> : <Empty t="Loading…" />}
        {note ? <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 12, padding: 12, borderRadius: R.sm, backgroundColor: C.ink }}><T color="#fff" style={{ textAlign: "center" }}>{note}</T></View> : null}
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: C.line, padding: 6 }}>
        {TABS.map(([k, t, i]) => { const on = tab === k, red = k === "team" && (D.reqs || []).length > 0;
          return <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { setTab(k); setChat(""); setKb(""); setNewTask(false); }} style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 7, borderRadius: R.sm }}>
            <Icon name={i} size={22} color={on ? C.brand : C.mut} /><T size={11} w="m" color={on ? C.brand : C.mut}>{t}</T>
            {red ? <View style={{ position: "absolute", top: 4, right: "28%", width: 8, height: 8, borderRadius: 4, backgroundColor: C.bad }} /> : null}</Pressable>; })}
      </View>
    </SafeAreaView>
  );
}

function ChatRoom({ g, name, msgs, me, onBack, say }: { g: Row; name: string; msgs: Row[]; me: string; onBack: () => void; say: (s: string) => void }) {
  const [txt, setTxt] = useState(""), direct = g.kind === "direct";
  const send = async () => { const body = txt.trim(); if (!body) return; setTxt("");
    const { error } = await sb.from("chat_messages").insert({ id: newId("cm"), group_id: g.id, body, from_office: true, sender_name: me, deleted: false }); if (error) { setTxt(body); say("Couldn't send the message."); } };
  return <><Back t="Chats" on={onBack} /><T w="s" size={18}>{name}</T>{direct ? <T size={13} color={C.mut}>Private chat · read only</T> : null}
    <View style={{ gap: 8, marginTop: 12 }}>{msgs.map(m => <View key={m.id} style={{ alignSelf: m.fromOffice ? "flex-end" : "flex-start", maxWidth: "82%", padding: 10, borderRadius: R.lg, backgroundColor: m.fromOffice ? C.brand : "#fff", borderWidth: m.fromOffice ? 0 : 1, borderColor: C.line }}>
      {!m.fromOffice ? <T w="m" size={12} color={C.mut}>{m.senderName || "—"}</T> : null}<T color={m.fromOffice ? "#fff" : C.ink}>{m.body}</T>
      <T size={11} color={m.fromOffice ? "#DBEAFE" : C.mut2}>{dmy(m.createdAt) === dmy(new Date()) ? hm(m.createdAt) : dmy(m.createdAt) + " " + hm(m.createdAt)}</T></View>)}
      {!msgs.length ? <Empty t="No messages yet." /> : null}</View>
    {!direct ? <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}><TextInput value={txt} onChangeText={setTxt} placeholder="Write a message" placeholderTextColor={C.mut2} accessibilityLabel="Message" style={[inp, { flex: 1 }]} onSubmitEditing={send} /><Btn kind="primary" label="Send" onPress={send} /></View> : null}</>;
}

function NewTask({ D, br, me, onDone }: { D: Row; br: string; me: string; onDone: (m: string) => void }) {
  const [title, setTitle] = useState(""), [notes, setNotes] = useState(""), [b, setB] = useState(br), [who, setWho] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const add = async () => { if (!title.trim()) return setErr("Enter the task."); setBusy(true);
    const { error } = await sb.from("tasks").insert({ id: newId("tk"), title: title.trim(), notes: notes.trim() || null, branch_id: b || null, assignee_ids: who ? [who] : [], status: "open", created_by: me, deleted: false });
    setBusy(false); if (error) return setErr("Couldn't add the task."); onDone("Task added"); };
  const chip = (on: boolean, l: string, p: () => void, k: string) => <Pressable key={k} onPress={p} style={{ height: 34, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: on ? C.brand : C.field, backgroundColor: on ? C.brand50 : "#fff", justifyContent: "center" }}><T w="m" size={13} color={on ? C.brand600 : C.ink2}>{l}</T></Pressable>;
  return <><Back t="Tasks" on={() => onDone("")} /><T w="s" size={18} style={{ marginBottom: 12 }}>New task</T>
    <View style={{ gap: 10 }}>
      <TextInput value={title} onChangeText={setTitle} placeholder="Task, e.g. Clean the fryer" placeholderTextColor={C.mut2} accessibilityLabel="Task" maxLength={200} style={inp} />
      <TextInput value={notes} onChangeText={setNotes} placeholder="Notes" placeholderTextColor={C.mut2} accessibilityLabel="Notes" multiline style={[inp, { height: 84, paddingTop: 10, textAlignVertical: "top" }]} />
      <T w="m" size={14} color={C.ink2}>Store</T><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{[["", "All stores"], ...(D.branches || []).map((x: Row) => [x.id, x.name])].map(([k, l]) => chip(b === k, l, () => setB(k), k || "all"))}</View>
      <T w="m" size={14} color={C.ink2}>Who</T><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{[["", "Everyone at the store"], ...(D.users || []).filter((u: Row) => !b || !(u.branchIds || []).length || u.branchIds.includes(b)).map((u: Row) => [u.id, u.name])].map(([k, l]) => chip(who === k, l, () => setWho(k), k || "all"))}</View>
      <T size={14} color={C.bad} style={{ minHeight: 18 }}>{err}</T>
      <Btn kind="primary" height={48} label={busy ? "Adding…" : "Add Task"} disabled={busy} onPress={add} />
    </View></>;
}
