// Order tags (Manage → Tags, type Order): picked on the register, saved on the order (settings "tags" on.order[orderId]).
import { useState } from "react";
import { Pressable, View } from "react-native";
import type { Data } from "../lib/db";
import { C, R } from "../lib/theme";
import { Btn, T } from "./kit";
import { Sheet } from "./Pickers";

export const tagDoc = (S: Data) => (S.settings.find(x => x.id === "tags") || {}) as any;
export const orderTags = (S: Data) => (tagDoc(S).list || []).filter((t: any) => t.type === "order" && !t.deleted) as { id: string; name: string }[];
export function TagsDialog({ S, init, onDone }: { S: Data; init: string[]; onDone: (ids: string[] | null) => void }) {
  const l = orderTags(S), [sel, setSel] = useState(init);
  return (
    <Sheet title="Tags" width={560} onClose={() => onDone(null)} footer={<><View style={{ flex: 1 }} /><Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Apply" onPress={() => onDone(sel)} /></>}>
      {!l.length ? <T color={C.mut}>No order tags yet. Add them in the back office under Manage → Tags.</T> :
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{l.map(t => { const on = sel.includes(t.id); return (
          <Pressable key={t.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => setSel(v => (on ? v.filter(y => y !== t.id) : [...v, t.id]))}
            style={{ paddingHorizontal: 16, height: 44, justifyContent: "center", borderRadius: R.sm, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brand50 : "#fff" }}>
            <T w={on ? "s" : "m"}>{t.name}</T></Pressable>); })}</View>}
    </Sheet>
  );
}
