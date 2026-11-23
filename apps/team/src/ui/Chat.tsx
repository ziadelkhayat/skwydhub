// Team chat (team.html viewChats / newChat / newGroup / openChat): group chats made by the manager, private chats, groups and channels.
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { dmy, hm, LS, rpc } from "../lib/sb";
import { useTeam } from "../lib/team";
import { C, F, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Card, T } from "./kit";

type G = { id: string; name: string; members?: number; direct?: boolean; channel?: boolean; canPost?: boolean; last?: { at: string; body: string; by?: string; mine?: boolean } };
const chT = (t: string) => { const d = new Date(t); return d.toDateString() === new Date().toDateString() ? hm(d) : dmy(d); };
const AVC = ["#f5b82e", "#d6334a", "#2fa39a", "#7c3aed", "#f08c2e", "#2563eb", "#0f9d58"];
const avc = (n: string) => AVC[[...String(n || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % AVC.length];
const inits = (n: string) => String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
const inp = { height: 46, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 16, color: C.ink, backgroundColor: "#fff" } as const;
export const isUnread = (g: G, seen: Record<string, string>) => !!g.last && !g.last.mine && (!seen[g.id] || g.last.at > seen[g.id]);
const Av = ({ name, bg = C.brand50, fg = C.brand, icon }: { name: string; bg?: string; fg?: string; icon?: string }) =>
  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>{icon ? <Icon name={icon} size={20} color={fg} /> : <T w="s" color={fg}>{name}</T>}</View>;

export function Chat({ onDot }: { onDot: (n: boolean) => void }) {
  const { me } = useTeam(), [view, setView] = useState<"list" | "new" | "group" | "channel">("list"), [chat, setChat] = useState<G | null>(null);
  if (chat) return <Room g={chat} onBack={() => { setChat(null); setView("list"); }} />;
  if (view === "new") return <NewChat onBack={() => setView("list")} onOpen={setChat} onGroup={c => setView(c ? "channel" : "group")} />;
  if (view === "group" || view === "channel") return <NewGroup chan={view === "channel"} onBack={() => setView("new")} onOpen={setChat} />;
  return <List onOpen={setChat} onNew={me?.canChat || me?.canGroup || me?.canChannel ? () => setView("new") : undefined} onDot={onDot} />;
}
function List({ onOpen, onNew, onDot }: { onOpen: (g: G) => void; onNew?: () => void; onDot: (n: boolean) => void }) {
  const { me } = useTeam(), [l, setL] = useState<G[] | null>(null), [seen, setSeen] = useState<Record<string, string>>({});
  useEffect(() => { (async () => { const s = await LS.get<Record<string, string>>("skwyd_team_seen", {}); setSeen(s); try { const v = await rpc<G[]>("skwyd_team_chats"); setL(v); onDot(v.some(g => isUnread(g, s))); } catch { setL([]); } })(); }, []);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}><T w="s" size={20} style={{ flex: 1 }}>Chat</T>{onNew ? <Btn kind="primary" height={38} label="+ New" onPress={onNew} /> : null}</View>
      <Card style={{ padding: 4 }}>{l === null ? <T color={C.mut} style={{ padding: 16 }}>Loading…</T> : l.length ? l.map(g => (
        <Pressable key={g.id} onPress={() => onOpen(g)} style={{ flexDirection: "row", gap: 12, padding: 12, alignItems: "center" }}>
          <Av name={(g.name || "?").trim()[0]?.toUpperCase() || "?"} />
          <View style={{ flex: 1 }}><T w="s" numberOfLines={1}>{g.name}</T><T size={13} color={C.mut} numberOfLines={1}>{g.last ? (g.last.mine ? "You: " : (g.last.by || "") + ": ") + g.last.body : g.direct ? "Private chat" : (g.channel ? "Channel · " : "") + (g.members || 0) + " members"}</T></View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>{g.last ? <T size={12} color={C.mut}>{chT(g.last.at)}</T> : null}{isUnread(g, seen) ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.bad }} /> : null}</View>
        </Pressable>)) : <T color={C.mut} style={{ padding: 16, textAlign: "center" }}>No chats yet.{me?.canChat ? " Press New to message a coworker." : " Your manager adds you to group chats."}</T>}</Card>
    </ScrollView>
  );
}
function NewChat({ onBack, onOpen, onGroup }: { onBack: () => void; onOpen: (g: G) => void; onGroup: (chan: boolean) => void }) {
  const { me, setNote } = useTeam(), [l, setL] = useState<any[] | null>(null), [q, setQ] = useState(""), [busy, setBusy] = useState("");
  useEffect(() => { if (me?.canChat) rpc<any[]>("skwyd_team_people").then(setL).catch(() => setL([])); }, []);
  const dm = async (p: any) => { setBusy(p.id); try { const r: any = await rpc("skwyd_team_dm", { p_with: p.id }); if (r?.error) { setNote(r.error); setBusy(""); return; } onOpen({ id: r.id, name: r.name, members: 2, direct: true }); } catch { setNote("Couldn't open the chat."); setBusy(""); } };
  const s = q.trim().toLowerCase(), f = (l || []).filter(p => !s || String(p.name).toLowerCase().includes(s) || String(p.jobTitle || "").toLowerCase().includes(s));
  let last = "";
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Btn height={38} label="‹" onPress={onBack} /><T w="s" size={20}>Add New</T></View>
      {me?.canChat ? <TextInput value={q} onChangeText={setQ} placeholder="Search name or job" placeholderTextColor={C.mut2} accessibilityLabel="Search" style={inp} /> : null}
      {me?.canGroup || me?.canChannel ? <Card style={{ padding: 4 }}>
        {me?.canGroup ? <Pressable onPress={() => onGroup(false)} style={{ flexDirection: "row", gap: 12, padding: 12, alignItems: "center" }}><Av name="" bg={C.ink} fg="#fff" icon="grp" /><T w="s">New Group</T></Pressable> : null}
        {me?.canChannel ? <Pressable onPress={() => onGroup(true)} style={{ flexDirection: "row", gap: 12, padding: 12, alignItems: "center" }}><Av name="" bg={C.ink} fg="#fff" icon="mega" /><T w="s">New Channel</T></Pressable> : null}
      </Card> : null}
      {me?.canChat ? <><T w="s" size={16}>Contacts</T><Card style={{ padding: 4 }}>{l === null ? <T color={C.mut} style={{ padding: 16 }}>Loading…</T> : f.length ? f.map(p => { const L = (String(p.name).trim()[0] || "#").toUpperCase(), h = L !== last; last = L;
        return <View key={p.id}>{h ? <T size={12} w="s" color={C.mut} style={{ paddingHorizontal: 12, paddingTop: 8 }}>{L}</T> : null}
          <Pressable onPress={() => dm(p)} disabled={!!busy} style={{ flexDirection: "row", gap: 12, padding: 12, alignItems: "center", opacity: busy === p.id ? 0.5 : 1 }}>
            <Av name={inits(p.name)} bg={avc(p.name)} fg="#fff" /><View style={{ flex: 1 }}><T w="s">{p.name}</T><T size={12} color={C.mut}>{String(p.jobTitle || "Employee").toUpperCase()}</T></View></Pressable></View>; })
        : <T color={C.mut} style={{ padding: 16, textAlign: "center" }}>{l.length ? "Nobody matches." : "None of your coworkers can chat in the app yet."}</T>}</Card></> : null}
    </ScrollView>
  );
}
function NewGroup({ chan, onBack, onOpen }: { chan: boolean; onBack: () => void; onOpen: (g: G) => void }) {
  const { setNote } = useTeam(), W = chan ? "Channel" : "Group", [l, setL] = useState<any[] | null>(null), [on, setOn] = useState<string[]>([]), [name, setName] = useState(""), [q, setQ] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { rpc<any[]>("skwyd_team_people", { p_for: "group" }).then(setL).catch(() => setL([])); }, []);
  const make = async () => { if (!name.trim()) return setNote(`Enter a ${W.toLowerCase()} name.`); if (!on.length) return setNote("Choose at least one coworker."); setBusy(true);
    try { const r: any = await rpc("skwyd_team_group", { p_name: name.trim(), p_members: on, p_kind: chan ? "channel" : "group" }); if (r?.error) { setNote(r.error); setBusy(false); return; } onOpen({ id: r.id, name: r.name, members: r.members, channel: chan, canPost: true }); }
    catch { setNote(`Couldn't create the ${W.toLowerCase()}.`); setBusy(false); } };
  const s = q.trim().toLowerCase(), f = (l || []).filter(p => !s || String(p.name).toLowerCase().includes(s));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Btn height={38} label="‹" onPress={onBack} /><T w="s" size={20}>New {W}</T></View>
      {chan ? <T color={C.ink2}>Only you can post in a channel. Members read your announcements.</T> : null}
      <T size={13} color={C.ink2}>{W} Name *</T>
      <TextInput value={name} onChangeText={setName} maxLength={80} placeholder={chan ? "e.g. Announcements" : "e.g. Morning shift"} placeholderTextColor={C.mut2} accessibilityLabel={`${W} name`} style={inp} />
      <TextInput value={q} onChangeText={setQ} placeholder="Search coworkers" placeholderTextColor={C.mut2} accessibilityLabel="Search" style={inp} />
      <Card style={{ padding: 4 }}>{l === null ? <T color={C.mut} style={{ padding: 16 }}>Loading…</T> : f.length ? f.map(p => { const sel = on.includes(p.id);
        return <Pressable key={p.id} onPress={() => setOn(o => sel ? o.filter(x => x !== p.id) : [...o, p.id])} style={{ flexDirection: "row", gap: 12, padding: 12, alignItems: "center" }}>
          <Av name={(p.name || "?").trim()[0]?.toUpperCase() || "?"} /><View style={{ flex: 1 }}><T w="s">{p.name}</T><T size={13} color={C.mut}>{[p.jobTitle, p.branch].filter(Boolean).join(" · ")}</T></View>
          <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: sel ? C.brand : C.field, backgroundColor: sel ? C.brand : "#fff", alignItems: "center", justifyContent: "center" }}>{sel ? <T w="b" size={14} color="#fff">✓</T> : null}</View>
        </Pressable>; }) : <T color={C.mut} style={{ padding: 16, textAlign: "center" }}>{l.length ? "Nobody matches." : "No coworkers use the app yet."}</T>}</Card>
      <Btn kind="primary" height={52} label={on.length ? `Create ${W} (${on.length + 1})` : `Create ${W}`} disabled={busy} onPress={make} />
    </ScrollView>
  );
}
function Room({ g, onBack }: { g: G; onBack: () => void }) {
  const { setNote } = useTeam(), [msgs, setMsgs] = useState<any[] | null>(null), [txt, setTxt] = useState(""), after = useRef<string | null>(null), sv = useRef<any>(null);
  const pull = async () => { try { const n = await rpc<any[]>("skwyd_team_messages", { p_group: g.id, p_after: after.current });
    if (n.length || !after.current) { setMsgs(m => { const all = after.current ? [...(m || []), ...n] : n; after.current = all.length ? all[all.length - 1].at : null; return all; });
      const s = await LS.get<Record<string, string>>("skwyd_team_seen", {}); s[g.id] = after.current || new Date().toISOString(); LS.set("skwyd_team_seen", s); } } catch {} };
  useEffect(() => { pull(); const t = setInterval(pull, 4000); return () => clearInterval(t); }, [g.id]);
  const send = async () => { const body = txt.trim(); if (!body) return; setTxt("");
    try { const r: any = await rpc("skwyd_team_send", { p_group: g.id, p_body: body }); if (r?.error) { setNote(r.error); setTxt(body); return; } pull(); } catch { setNote("Couldn't send the message."); setTxt(body); } };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderColor: C.line, backgroundColor: "#fff" }}>
        <Btn height={38} label="‹" onPress={onBack} /><View style={{ flex: 1 }}><T w="s" numberOfLines={1}>{g.name}</T><T size={12} color={C.mut}>{g.direct ? "Private chat" : (g.channel ? "Channel · " : "") + (g.members || 0) + " members"}</T></View>
      </View>
      <ScrollView ref={sv} style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 8 }} onContentSizeChange={() => sv.current?.scrollToEnd({ animated: false })}>
        {msgs === null ? <T color={C.mut} style={{ textAlign: "center", padding: 16 }}>Loading…</T> : !msgs.length ? <T color={C.mut} style={{ textAlign: "center", padding: 16 }}>No messages yet. Say hello!</T> : msgs.map((m, i) => (
          <View key={m.id || i} style={{ alignSelf: m.mine ? "flex-end" : "flex-start", maxWidth: "82%", alignItems: m.mine ? "flex-end" : "flex-start" }}>
            <View style={{ padding: 10, borderRadius: R.md, backgroundColor: m.mine ? C.brand : "#fff", borderWidth: m.mine ? 0 : 1, borderColor: C.line }}>
              {m.mine ? null : <T size={12} w="s" color={C.brand}>{m.office ? (m.by || "Manager") + " · Manager" : m.by}</T>}
              <T color={m.mine ? "#fff" : C.ink}>{m.body}</T></View>
            <T size={11} color={C.mut} style={{ marginTop: 2 }}>{chT(m.at)}</T>
          </View>))}
      </ScrollView>
      {g.channel && !g.canPost ? <T color={C.mut} style={{ textAlign: "center", padding: 12 }}>Only the channel's admins can post here.</T> :
        <View style={{ flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1, borderColor: C.line, backgroundColor: "#fff" }}>
          <TextInput value={txt} onChangeText={setTxt} placeholder="Message" placeholderTextColor={C.mut2} maxLength={2000} accessibilityLabel="Message" style={[inp, { flex: 1 }]} onSubmitEditing={send} returnKeyType="send" />
          <Pressable accessibilityLabel="Send" onPress={send} style={{ width: 46, height: 46, borderRadius: R.sm, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}><Icon name="send" size={20} color="#fff" /></Pressable>
        </View>}
    </KeyboardAvoidingView>
  );
}
