import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { TeamProvider } from "../lib/team";
import { C } from "../lib/theme";

export default function Layout() {
  const [ok] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!ok) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <TeamProvider driver={process.env.EXPO_PUBLIC_SKWYD_APP === "driver"}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: C.bg } }} />
    </TeamProvider>
  );
}
