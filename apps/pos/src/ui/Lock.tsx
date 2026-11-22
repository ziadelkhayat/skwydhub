// The PIN sign-in: users of this branch (and owners/admins) sign in with their 4–5 digit PIN.
import { useState } from "react";
import { View } from "react-native";
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
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 18 }}>
      <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}><T w="b" size={24} color="#fff">S</T></View>
      <T w="s" size={20}>Enter Your Login PIN</T>
      <Dots n={pin.length} />
      <T size={14} color={C.bad} style={{ minHeight: 20 }}>{err}</T>
      <Pad onKey={press} />
      <Btn kind="ghost" label={syncing ? "Syncing…" : "Sync Users"} onPress={() => { setSyncing(true); reload(); setTimeout(() => setSyncing(false), 1500); }} />
      <View style={{ position: "absolute", left: 24, bottom: 20 }}>
        {[acct, brand?.name, branch?.name].filter(Boolean).map((l, i) => <T key={i} size={13} color={C.mut}>{String(l)}</T>)}
      </View>
    </View>
  );
}
