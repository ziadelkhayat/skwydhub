// A new tablet: type the 6-digit code from Manage → Devices. There is no sign-in.
import { useState } from "react";
import { View } from "react-native";
import { activate } from "../lib/db";
import { C } from "../lib/theme";
import { Card, Pad, T } from "./kit";

export function Activate({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const press = async (k: string) => {
    if (busy) return;
    const next = k === "c" ? "" : k === "b" ? code.slice(0, -1) : code.length < 6 ? code + k : code;
    setCode(next); setErr("");
    if (next.length === 6) { setBusy(true); const r = await activate(next); setBusy(false); if (r.error) { setErr(r.error); setCode(""); } else onDone(); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
      <Card style={{ padding: 32, alignItems: "center", gap: 18 }}>
        <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}><T w="b" size={24} color="#fff">S</T></View>
        <T w="s" size={22}>Activate This Device</T>
        <T color={C.mut} style={{ textAlign: "center", maxWidth: 300 }}>Type the 6-digit code shown for this device in Manage → Devices.</T>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={{ width: 44, height: 54, borderRadius: 8, borderWidth: 1, borderColor: i === code.length ? C.brand : C.field, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
              <T w="s" size={24}>{code[i] || ""}</T>
            </View>))}
        </View>
        <T size={14} color={C.bad} style={{ minHeight: 20 }}>{busy ? "" : err}</T>
        {busy ? <T color={C.mut}>Activating…</T> : <Pad onKey={press} />}
      </Card>
    </View>
  );
}
