// One screen decides what the tablet shows: activation, the PIN sign-in, or the register.
import { ActivityIndicator, View } from "react-native";
import { usePins } from "../lib/pos";
import { useStore } from "../lib/store";
import { C } from "../lib/theme";
import { Activate } from "../ui/Activate";
import { T } from "../ui/kit";
import { Lock } from "../ui/Lock";
import { Register } from "../ui/Register";

export default function Home() {
  const { phase, S, device, cashier, restart } = useStore();
  if (phase === "activate") return <Activate onDone={restart} />;
  if (phase === "boot" || !device) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: C.bg }}>
      <ActivityIndicator color={C.brand} /><T color={C.mut}>Loading the register…</T>
    </View>);
  if (usePins(S) && !cashier) return <Lock />;
  return <Register />;
}
