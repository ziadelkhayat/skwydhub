// A new tablet (option J): a light-blue screen, the skwyd pos logo, 6 round code circles and big round navy-outline keys. Type the code from Manage → Devices.
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { SkwydLogo } from "./Logo";
import { activate } from "../lib/db";
import { C } from "../lib/theme";
import { Pad, T } from "./kit";

export function Activate({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const { height } = useWindowDimensions(), key = Math.min(92, Math.floor(height * 0.105));
  const press = async (k: string) => {
    if (busy) return;
    const next = k === "c" ? "" : k === "b" ? code.slice(0, -1) : code.length < 6 ? code + k : code;
    setCode(next); setErr("");
    if (next.length === 6) { setBusy(true); const r = await activate(next); setBusy(false); if (r.error) { setErr(r.error); setCode(""); } else onDone(); }
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#EFF5FE" }} contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
      <SkwydLogo label="pos" />
      <T w="s" size={22} style={{ marginTop: 4 }}>Activate This Device</T>
      <T color={C.mut} style={{ textAlign: "center", maxWidth: 320 }}>Type the 6-digit code shown for this device in Manage → Devices.</T>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: i === code.length && !busy ? 2 : 1, borderColor: i === code.length && !busy ? "#24409A" : "#C7D2FE", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
            <T w="s" size={24} color="#24409A">{code[i] || ""}</T>
          </View>))}
      </View>
      <T size={14} color={C.bad} style={{ minHeight: 20, textAlign: "center", maxWidth: 360 }}>{busy ? "" : err}</T>
      {busy ? <T color={C.mut}>Activating…</T> : <Pad onKey={press} size={key} round />}
    </ScrollView>
  );
}
