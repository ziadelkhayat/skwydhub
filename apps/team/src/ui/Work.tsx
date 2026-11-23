// Tasks (given by the manager, ticked when done) and Guides (knowledge base written in the back office) — team.html viewTasks / viewKb / openKb.
import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import { dmy, LS, rpc, sb } from "../lib/sb";
import { useTeam } from "../lib/team";
import { C, F, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, Card, T } from "./kit";

export function Tasks() {
  const { setNote } = useTeam(), [l, setL] = useState<any[] | null>(null), [busy, setBusy] = useState("");
  const load = () => rpc<any[]>("skwyd_team_tasks").then(v => { setL(v); LS.set("skwyd_team_tasks", v); }).catch(async () => setL(await LS.get("skwyd_team_tasks", [])));
  useEffect(() => { load(); }, []);
  const tick = async (t: any) => { const d = t.status !== "done"; setBusy(t.id);
    try { const r: any = await rpc("skwyd_team_task_done", { p_task: t.id, p_done: d }); if (r?.error) setNote(r.error); else { if (d) setNote("Task done"); await load(); } } catch { setNote("Couldn't save. Try again."); } setBusy(""); };
  const today = new Date().toISOString().slice(0, 10), open = (l || []).filter(t => t.status !== "done"), done = (l || []).filter(t => t.status === "done");
  const Row = ({ t }: { t: any }) => { const dn = t.status === "done", late = !dn && t.dueDay && String(t.dueDay).slice(0, 10) < today;
    return (
      <Pressable onPress={() => tick(t)} disabled={busy === t.id} style={{ flexDirection: "row", gap: 12, padding: 12, alignItems: "flex-start", opacity: busy === t.id ? 0.5 : 1 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dn ? "#E7F7EC" : C.brand50, alignItems: "center", justifyContent: "center" }}><Icon name="task" size={20} color={dn ? C.ok : C.brand} /></View>
        <View style={{ flex: 1, gap: 2 }}><T w="s" color={dn ? C.mut : C.ink} style={dn ? { textDecorationLine: "line-through" } : undefined}>{t.title}</T>
          {t.notes ? <T size={13} color={C.mut}>{t.notes}</T> : null}
          <T size={13} w={late ? "s" : "r"} color={late ? C.bad : C.mut}>{dn ? "Done " + dmy(t.doneAt) : t.dueDay ? (late ? "Late · due " : "Due ") + dmy(t.dueDay) : ""}</T></View>
        <T w="s" color={dn ? C.mut : C.brand}>{dn ? "Undo" : "Done"}</T>
      </Pressable>); };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <T w="s" size={20}>Tasks</T>
      <Card style={{ padding: 4 }}>{l === null ? <T color={C.mut} style={{ padding: 16 }}>Loading…</T> : open.length ? open.map(t => <Row key={t.id} t={t} />) : <T color={C.mut} style={{ padding: 16, textAlign: "center" }}>No open tasks. Nice work!</T>}</Card>
      {done.length ? <><T w="s" size={16}>Done this week</T><Card style={{ padding: 4 }}>{done.map(t => <Row key={t.id} t={t} />)}</Card></> : null}
    </ScrollView>
  );
}

// the back office's simple formatting: ## heading, ### small heading, **bold**, - list
function Rich({ text }: { text: string }) {
  const bold = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((p, i) => i % 2 ? <T key={i} w="s">{p}</T> : p);
  return <View style={{ gap: 4 }}>{String(text || "").split("\n").map((ln, i) =>
    /^### /.test(ln) ? <T key={i} w="s" size={16} style={{ marginTop: 6 }}>{ln.slice(4)}</T>
    : /^## /.test(ln) ? <T key={i} w="b" size={18} style={{ marginTop: 8 }}>{ln.slice(3)}</T>
    : /^- /.test(ln) ? <View key={i} style={{ flexDirection: "row", gap: 8 }}><T>•</T><T style={{ flex: 1, lineHeight: 22 }}>{bold(ln.slice(2))}</T></View>
    : <T key={i} style={{ lineHeight: 22 }}>{bold(ln)}</T>)}</View>;
}
const signed = async (f: any) => { const { data, error } = await sb.storage.from("kb").createSignedUrl(f.path, 600); if (error) throw error; return data.signedUrl; };
function Pic({ f }: { f: any }) {
  const [u, setU] = useState<string | null>(null), [bad, setBad] = useState(false);
  useEffect(() => { signed(f).then(setU).catch(() => setBad(true)); }, [f.path]);
  return bad ? <T color={C.mut}>Picture not available offline.</T> : u ? <Image source={{ uri: u }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: R.md, marginTop: 10 }} resizeMode="contain" accessibilityLabel={f.name} /> : null;
}
function Tree({ items, parent, depth }: { items: any[]; parent: string; depth: number }) {
  const { setNote } = useTeam(), [shut, setShut] = useState<Record<string, boolean>>({});
  return <>{items.filter(f => (f.parent || "") === parent).map((f, i) => { const k = f.kind || "file";
    if (k === "folder") { const closed = shut[f.id] ?? depth > 0;
      return <View key={f.id || i} style={{ marginTop: 12, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 10 }}>
        <Pressable onPress={() => setShut(s => ({ ...s, [f.id]: !closed }))}><T w="s">{closed ? "▸ " : "▾ "}{f.name}</T></Pressable>
        {closed ? null : <Tree items={items} parent={f.id} depth={depth + 1} />}</View>; }
    if (k === "text") return <View key={f.id || i} style={{ marginTop: 12 }}>{f.name ? <T w="s" size={17} style={{ marginBottom: 6 }}>{f.name}</T> : null}<Rich text={f.body} /></View>;
    if (k === "link") return <Btn key={f.id || i} style={{ marginTop: 10 }} label={f.name || f.url} onPress={() => Linking.openURL(/^https?:\/\//i.test(f.url || "") ? f.url : "https://" + (f.url || ""))} />;
    return /^image\//.test(f.type || "") ? <Pic key={f.path || i} f={f} /> : <Btn key={f.path || i} style={{ marginTop: 10 }} label={f.name} onPress={() => signed(f).then(Linking.openURL).catch(() => setNote("Couldn't open the file."))} />;
  })}</>;
}

export function Guides({ onDot }: { onDot: (n: boolean) => void }) {
  const { setNote } = useTeam(), [kb, setKb] = useState<any[] | null>(null), [q, setQ] = useState(""), [cat, setCat] = useState(""), [open, setOpen] = useState<any>(null), [busy, setBusy] = useState(false);
  const load = async () => { let l: any[]; try { l = await rpc<any[]>("skwyd_team_kb"); LS.set("skwyd_team_kb", l); } catch { l = await LS.get<any[]>("skwyd_team_kb", []); } setKb(l); onDot(l.some(a => a.ack && !a.readAt)); return l; };
  useEffect(() => { LS.get<any[] | null>("skwyd_team_kb", null).then(v => v && setKb(k => k || v)); load(); }, []);
  const view = (a: any) => { setOpen(a); if (!a.ack) rpc("skwyd_team_kb_read", { p_article: a.id }).catch(() => {}); };   // opening it counts as read
  const ack = async () => { setBusy(true); try { const r: any = await rpc("skwyd_team_kb_read", { p_article: open.id }); if (r?.error) setNote(r.error); else { setNote("Thank you"); setOpen({ ...open, readAt: r.readAt }); load(); } } catch { setNote("Couldn't save. Try again."); } setBusy(false); };
  if (open) return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Btn height={38} style={{ alignSelf: "flex-start" }} label="‹ Guides" onPress={() => setOpen(null)} />
      <Card style={{ padding: 16 }}>
        <T size={13} w="s" color={C.brand}>{open.category}</T><T w="b" size={22} style={{ marginTop: 4, marginBottom: 10 }}>{open.title}</T>
        {open.body ? <Rich text={open.body} /> : null}<Tree items={open.files || []} parent="" depth={0} />
        <T size={12} color={C.mut} style={{ marginTop: 14 }}>Updated {dmy(open.updatedAt)}</T>
      </Card>
      {open.ack ? open.readAt ? <T color={C.mut} style={{ textAlign: "center" }}>You confirmed you read this on {dmy(open.readAt)}.</T> : <Btn kind="primary" height={52} label="I Have Read This" disabled={busy} onPress={ack} /> : null}
    </ScrollView>);
  const l = kb || [], s = q.trim().toLowerCase(), cats = [...new Set(l.map(a => a.category))], todo = l.filter(a => a.ack && !a.readAt).length;
  const f = l.filter(a => (!cat || a.category === cat) && (!s || (a.title + " " + (a.body || "")).toLowerCase().includes(s)));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <T w="s" size={20}>Guides</T>
      {todo ? <View style={{ padding: 12, borderRadius: R.md, backgroundColor: "#FFF7E6", borderWidth: 1, borderColor: "#F5D9A8" }}><T w="s">{todo} to read</T><T size={13} color={C.ink2}>Your manager asks you to confirm you read {todo === 1 ? "this article" : "these articles"}.</T></View> : null}
      <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={C.mut2} accessibilityLabel="Search" style={{ height: 46, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 16, color: C.ink, backgroundColor: "#fff" }} />
      {cats.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{["", ...cats].map(c => <Btn key={c || "all"} kind={cat === c ? "primary" : "outline"} height={36} label={c || "All"} onPress={() => setCat(c)} />)}</ScrollView> : null}
      <Card style={{ padding: 4 }}>{kb === null ? <T color={C.mut} style={{ padding: 16 }}>Loading…</T> : f.length ? f.map(a => (
        <Pressable key={a.id} onPress={() => view(a)} style={{ flexDirection: "row", gap: 12, padding: 12, alignItems: "center" }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.brand50, alignItems: "center", justifyContent: "center" }}><Icon name="kb" size={20} color={C.brand} /></View>
          <View style={{ flex: 1 }}><T w="s">{a.title}</T><T size={13} color={C.mut}>{a.category}{a.pinned ? " · Pinned" : ""}</T></View>
          {a.ack && !a.readAt ? <T w="b" size={13} color={C.bad}>To read</T> : null}
        </Pressable>)) : <T color={C.mut} style={{ padding: 16, textAlign: "center" }}>{l.length ? "Nothing matches." : "No guides yet."}</T>}</Card>
    </ScrollView>
  );
}
