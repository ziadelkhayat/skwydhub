// The PIN sign-in: a light-blue screen, the skwyd logo, PIN dots, white keys with navy numbers, Sync Users, and the store and register under it.
// Users of this branch (and owners/admins) sign in with their 4–5 digit PIN.
import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { pinUser, posUsers } from "../lib/pos";
import { useStore } from "../lib/store";
import { C } from "../lib/theme";
import { Btn, Dots, Pad, T } from "./kit";

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
  return (
    <View style={{ flex: 1, backgroundColor: "#EFF5FE", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Image source={require("../../assets/logo.png")} style={{ width: 64, height: 64, borderRadius: 12 }} />
      <T w="s" size={21}>Enter Your PIN</T>
      <Dots n={pin.length} />
      <T size={14} color={C.bad} style={{ minHeight: 18, marginTop: -6 }}>{err}</T>
      <Pad onKey={press} size={84} flatFn navy />
      <Pressable accessibilityRole="button" onPress={() => { setSyncing(true); reload(); setTimeout(() => setSyncing(false), 1500); }}
        style={({ pressed }) => ({ height: 44, paddingHorizontal: 20, borderRadius: 6, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brand50 : "#fff", alignItems: "center", justifyContent: "center" })}>
        <T w="m" size={15} color={C.brand}>{syncing ? "Syncing…" : "Sync Users"}</T></Pressable>
      <T size={13} color={C.mut}>{[brand?.name, branch?.name, devName].filter(Boolean).join(" · ")}{acct ? "  ·  Account " + acct : ""}</T>
    </View>
  );
}}
