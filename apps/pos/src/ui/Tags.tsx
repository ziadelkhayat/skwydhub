// Order tags (Manage → Tags, type Order): picked on the register, saved on the order (settings "tags" on.order[orderId]).
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { TextInput } from "./Keyboard";
import type { Data } from "../lib/db";
import { C, F, R } from "../lib/theme";
import { Btn, T } from "./kit";
import { Icon } from "./Icon";
import { Sheet } from "./Pickers";

export const tagDoc = (S: Data) => (S.settings.find(x => x.id === "tags") || {}) as any;
export const orderTags = (S: Data) => (tagDoc(S).list || []).filter((t: any) => t.type === "order" && !t.deleted) as { id: string; name: string }[];
const DOT = ["#F79009", "#EE46BC", "#F04438", "#3B82F6", "#12B76A", "#7A5AF8", "#6B7280", "#0BA5EC"];
export function TagsDialog({ S, init, onDone }: { S: Data; init: string[]; onDone: (ids: string[] | null) => void }) {
  const l = orderTags(S), [sel, setSel] = useState(init), [q, setQ] = useState(""), shown = l.filter(t => !q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Sheet title="Tags" width={620} onClose={() => onDone(null)} footer={<><T size={13} color={C.mut} style={{ flex: 1 }}>{sel.length ? sel.length + (sel.length === 1 ? " tag selected" : " tags selected") : ""}</T><Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Save" onPress={() => onDone(sel)} /></>}>
      {!l.length ? <T color={C.mut}>No order tags yet. Add them in the back office under Manage → Tags.</T> : <View style={{ gap: 14 }}>
        {l.length > 8 ? <TextInput value={q} onChangeText={setQ} placeholder="Search tags" placeholderTextColor={C.mut2} style={{ height: 44, borderWidth: 1, borderColor: C.field, borderRadius: R.md, paddingHorizontal: 12, fontFamily: F.r, fontSize: 15, color: C.ink }} /> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{shown.map(t => { const on = sel.includes(t.id), dot = DOT[l.indexOf(t) % DOT.length]; return (
          <Pressable key={t.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setSel(v => (on ? v.filter(y => y !== t.id) : [...v, t.id]))}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, height: 42, borderRadius: 6, borderWidth: 1, borderColor: on ? C.brand : C.field, backgroundColor: on ? C.brand50 : "#fff" }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} /><T w="m" color={on ? C.brand600 : C.ink}>{t.name}{on ? "  ✓" : ""}</T></Pressable>); })}</View></View>}
    </Sheet>
  );
}

// Tags (option A): a list under the Tags button, a colour dot and a tick on each row; Done keeps the ticks, a tap outside leaves the tags as they were
export function TagsPop({ S, init, maxH, onDone }: { S: Data; init: string[]; maxH: number; onDone: (ids: string[] | null) => void }) {
  const l = orderTags(S), [sel, setSel] = useState(init);
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
        <T w="s" size={16} style={{ flex: 1 }}>Tags</T>
      </View>
      {!l.length ? <T color={C.mut} style={{ padding: 12 }}>No order tags yet. Add them in the back office under Manage → Tags.</T> :
      <ScrollView style={{ maxHeight: Math.max(170, maxH) }}>
        {l.map((t, i) => { const on = sel.includes(t.id), dot = (t as any).color || DOT[i % DOT.length]; return (
          <Pressable key={t.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setSel(v => (on ? v.filter(y => y !== t.id) : [...v, t.id]))}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: C.line2, backgroundColor: pressed ? C.bg2 : "#fff" })}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot }} />
            <T w="m" size={16} style={{ flex: 1 }} numberOfLines={1}>{t.name}</T>
            <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: on ? 0 : 1.5, borderColor: C.field, backgroundColor: on ? C.brand600 : "#fff", alignItems: "center", justifyContent: "center" }}>{on ? <Icon name="check" size={15} color="#fff" /> : null}</View>
          </Pressable>); })}
      </ScrollView>}
      <View style={{ padding: 8, paddingTop: 10 }}><Btn kind="primary" height={52} label="Done" onPress={() => onDone(sel)} /></View>
    </View>
  );
}
