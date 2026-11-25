// Order tags (Manage → Tags, type Order): picked on the register, saved on the order (settings "tags" on.order[orderId]).
import { useState } from "react";
import { Pressable, View } from "react-native";
import { TextInput } from "./Keyboard";
import type { Data } from "../lib/db";
import { C, F, R } from "../lib/theme";
import { Btn, T } from "./kit";
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
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, height: 42, borderRadius: 999, borderWidth: 1, borderColor: on ? C.brand : C.field, backgroundColor: on ? C.brand50 : "#fff" }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} /><T w="m" color={on ? C.brand600 : C.ink}>{t.name}{on ? "  ✓" : ""}</T></Pressable>); })}</View></View>}
    </Sheet>
  );
}
