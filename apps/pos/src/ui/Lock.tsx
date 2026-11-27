// The PIN sign-in (option I): a navy screen, the white skwyd pos logo, lime PIN dots, big round white keys, Sync Users, and the store and register under it.
// Users of this branch (and owners/admins) sign in with their 4–5 digit PIN.
import { useState } from "react";
import { Pressable, ScrollView, useWindowDimensions } from "react-native";
import { SkwydLogo } from "./Logo";
import { pinUser, posUsers } from "../lib/pos";
import { useStore } from "../lib/store";
import { Dots, Pad, T } from "./kit";

export function Lock() {
  const { S, device, branch, setCashier, reload } = useStore();
  const [pin, setPin] = useState(""), [err, setErr] = useState(""), [syncing, setSyncing] = useState(false);
  const brand = branch && S.brands.find(b => b.id === branch.brandId);
  const acct = S.settings.find(x => x.id === "company")?.accountNo;
  const press = async (k: string) => {
    const next = k === "c" ? "" : k === "b" ? pin.slice(0, -1) : pin.length < 5 ? pin + k : pin;
    setPin(next); setErr("");
    if (next.length >= 4) {
      const u = await pinUser(posUsers(S, device!.branchId), next);
      if (u) { setPin(""); setCashier(u); } else if (next.length === 5) { setPin(""); setErr("Wrong PIN. Try again."); }
    }
  };
  const devName = (device as any)?.name as string | undefined;
  const { height } = useWindowDimensions(), key = Math.min(92, Math.floor(height * 0.105));
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#24409A" }} contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
      <SkwydLogo label="pos" ink="#fff" />
      <T w="s" size={21} color="#fff" style={{ marginTop: 4 }}>Enter Your PIN</T>
      <Dots n={pin.length} onDark />
      <T size={14} color="#FCA5A5" style={{ minHeight: 18 }}>{err}</T>
      <Pad onKey={press} size={key} round />
      <Pressable accessibilityRole="button" onPress={() => { setSyncing(true); reload(); setTimeout(() => setSyncing(false), 1500); }}
        style={({ pressed }) => ({ height: 44, paddingHorizontal: 16, borderRadius: 6, backgroundColor: pressed ? "rgba(255,255,255,0.12)" : "transparent", alignItems: "center", justifyContent: "center" })}>
        <T w="m" size={15} color="#fff">{syncing ? "Syncing…" : "↻  Sync Users"}</T></Pressable>
      <T size={13} color="rgba(255,255,255,0.7)">{[brand?.name, branch?.name, devName].filter(Boolean).join(" · ")}{acct ? "  ·  Account " + acct : ""}</T>
    </ScrollView>
  );
}
